import { db } from "@/db";
import { autonomousRuns, opportunities, schedulerSettings } from "@/db/schema";
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { ensureDbInitialized } from "./db-seed";
import { executeCycle, type CycleState } from "./autonomous-engine";
import {
  automationReadiness,
  isVercel,
  nextVercelRun,
  parseCycleConfig,
  parseIntervalMinutes,
  RUN_LEASE_MS,
  VERCEL_CRON_SCHEDULE,
  type AutomationReadiness,
  type CycleConfig,
} from "./automation-config";

export interface SchedulerConfig {
  enabled: boolean;
  intervalMinutes: number;
  cycleConfig: CycleConfig;
}

export interface SchedulerStatus extends SchedulerConfig {
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunReason: string | null;
  cycleActive: boolean;
  totalRuns: number;
  consecutiveErrors: number;
  mode: "vercel_cron" | "in_process";
  cronSchedule: string | null;
  readiness: AutomationReadiness;
}

export interface RunResult {
  status: "completed" | "failed" | "stopped" | "skipped" | "blocked";
  reason?: string;
  cycle?: CycleState;
}

type Settings = typeof schedulerSettings.$inferSelect;
const globalForTimer = globalThis as typeof globalThis & {
  __zeroGravitySchedulerTimer?: ReturnType<typeof setTimeout>;
};

function cycleConfig(settings: Settings): CycleConfig {
  return {
    scoreThreshold: settings.scoreThreshold,
    autoCreateDeals: settings.autoCreateDeals,
    autoGenerateOutreach: settings.autoGenerateOutreach,
    autoSendOutreach: settings.autoSendOutreach,
    autoCreateCheckout: settings.autoCreateCheckout,
    maxDomainsPerCycle: settings.maxDomainsPerCycle,
  };
}

async function loadSettings(): Promise<Settings> {
  await ensureDbInitialized();
  const [settings] = await db.select().from(schedulerSettings).where(eq(schedulerSettings.id, 1));
  if (!settings) throw new Error("Scheduler configuration is missing.");
  return settings;
}

export async function getStatus(): Promise<SchedulerStatus> {
  const settings = await loadSettings();
  const enabled = settings.enabled && process.env.AUTONOMOUS_ENABLED !== "false";
  const config = cycleConfig(settings);
  const next = enabled
    ? settings.nextRunAt || (isVercel() ? nextVercelRun() : new Date())
    : null;
  return {
    enabled,
    intervalMinutes: isVercel() ? 1440 : settings.intervalMinutes,
    cycleConfig: config,
    nextRunAt: next?.toISOString() || null,
    lastRunAt: settings.lastRunAt?.toISOString() || null,
    lastRunStatus: settings.lastRunStatus,
    lastRunReason: settings.lastRunReason,
    cycleActive: Boolean(settings.leaseOwner && settings.leaseExpiresAt && settings.leaseExpiresAt > new Date()),
    totalRuns: settings.totalRuns,
    consecutiveErrors: settings.consecutiveErrors,
    mode: isVercel() ? "vercel_cron" : "in_process",
    cronSchedule: isVercel() ? VERCEL_CRON_SCHEDULE : null,
    readiness: automationReadiness(config),
  };
}

export async function startScheduler(partial: Partial<SchedulerConfig> = {}): Promise<SchedulerStatus> {
  if (partial.enabled === false) return stopScheduler();
  await loadSettings();
  const updates = parseCycleConfig(partial.cycleConfig || {});
  const intervalMinutes = isVercel() ? 1440 : partial.intervalMinutes === undefined
    ? undefined : parseIntervalMinutes(partial.intervalMinutes);
  await db.update(schedulerSettings).set({
    ...updates,
    ...(intervalMinutes === undefined ? {} : { intervalMinutes }),
    enabled: true,
    nextRunAt: null,
    updatedAt: new Date(),
  }).where(eq(schedulerSettings.id, 1));
  // On Vercel the next authenticated cron request runs the job; no detached task
  // or process timer can be relied on after a serverless response finishes.
  if (!isVercel()) await ensureSchedulerRunning();
  return getStatus();
}

export async function stopScheduler(): Promise<SchedulerStatus> {
  await loadSettings();
  await db.update(schedulerSettings).set({
    enabled: false,
    stopRequested: true,
    nextRunAt: null,
    updatedAt: new Date(),
  }).where(eq(schedulerSettings.id, 1));
  clearLocalTimer();
  return getStatus();
}

export async function requestCycleStop(): Promise<boolean> {
  await loadSettings();
  const rows = await db.update(schedulerSettings).set({ stopRequested: true, updatedAt: new Date() })
    .where(and(eq(schedulerSettings.id, 1), sql`${schedulerSettings.leaseExpiresAt} > NOW()`))
    .returning({ id: schedulerSettings.id });
  return rows.length > 0;
}

// Persist why an invocation did not start so the dashboard and schedule API can
// explain a stalled funnel without server-log access. Never overwrite the status
// of an in-flight run that still holds the lease.
async function recordOutcome(status: "skipped" | "blocked", reason: string): Promise<void> {
  await db.update(schedulerSettings).set({ lastRunStatus: status, lastRunReason: reason, updatedAt: new Date() })
    .where(and(eq(schedulerSettings.id, 1), or(isNull(schedulerSettings.leaseOwner), lte(schedulerSettings.leaseExpiresAt, new Date()))));
}

// A PostgreSQL lease, not module memory, prevents overlapping cron/manual runs
// across cold starts, concurrent function instances, and retries.
export async function runOnce(options: {
  force?: boolean;
  cycleConfig?: Partial<CycleConfig>;
} = {}): Promise<RunResult> {
  const settings = await loadSettings();
  if (process.env.AUTONOMOUS_ENABLED === "false") {
    const reason = "Disabled by AUTONOMOUS_ENABLED=false.";
    await recordOutcome("skipped", reason);
    return { status: "skipped", reason };
  }
  if (!options.force && (!settings.enabled || process.env.VERCEL_ENV === "preview")) {
    const reason = "Scheduler is paused or this is a preview deployment.";
    await recordOutcome("skipped", reason);
    return { status: "skipped", reason };
  }
  const config = { ...cycleConfig(settings), ...parseCycleConfig(options.cycleConfig || {}) };
  const readiness = automationReadiness(config);
  if (!readiness.ready) {
    await recordOutcome("blocked", readiness.blockers.join(" "));
    return { status: "blocked", reason: readiness.blockers.join(" ") };
  }

  const now = new Date();
  const owner = crypto.randomUUID();
  const [claimed] = await db.update(schedulerSettings).set({
    leaseOwner: owner,
    leaseExpiresAt: new Date(now.getTime() + RUN_LEASE_MS),
    stopRequested: false,
    lastRunAt: now,
    lastRunStatus: "running",
    lastRunReason: null,
    totalRuns: sql`${schedulerSettings.totalRuns} + 1`,
    updatedAt: now,
  }).where(and(
    eq(schedulerSettings.id, 1),
    options.force ? undefined : eq(schedulerSettings.enabled, true),
    or(isNull(schedulerSettings.leaseOwner), lte(schedulerSettings.leaseExpiresAt, now)),
    options.force ? undefined : or(isNull(schedulerSettings.nextRunAt), lte(schedulerSettings.nextRunAt, now)),
  )).returning();
  if (!claimed) return { status: "skipped", reason: "Another cycle is running or the next run is not due." };

  let result: RunResult = { status: "failed" };
  try {
    // Keep the existing rotating CT acquisition, inside the persisted cycle.
    const autonomousNiches = [
      ["roofing", "roofing"], ["dental", "dental"], ["hvac", "hvac"],
      ["plumbing", "plumbing"], ["landscaping", "landscaping"], ["legal", "legal"],
      ["accounting", "accounting"], ["medspa", "medspa"], ["realestate", "real_estate"],
      ["insurance", "insurance"],
    ] as const;
    const niche = autonomousNiches[Math.floor(Date.now() / 86_400_000) % autonomousNiches.length];
    // A terminated invocation may leave a run marked running after its lease expires.
    await db.update(autonomousRuns).set({
      status: "failed", error: "Execution lease expired before completion.", completedAt: now,
    }).where(eq(autonomousRuns.status, "running"));

    // A prior worker may have died after claiming an email. Never resend it.
    await db.update(opportunities).set({ outreachDeliveryStatus: "needs_review", updatedAt: now }).where(and(
      eq(opportunities.outreachDeliveryStatus, "sending"),
      or(isNull(opportunities.outreachAttemptedAt), lte(opportunities.outreachAttemptedAt, now)),
    ));

    const cycle = await executeCycle(config, {
      acquisition: { query: niche[0], industry: niche[1], maxResults: 25 },
      shouldStop: async () => {
        const [current] = await db.select().from(schedulerSettings).where(eq(schedulerSettings.id, 1));
        return !current || current.leaseOwner !== owner || current.stopRequested ||
          !current.leaseExpiresAt || current.leaseExpiresAt <= new Date();
      },
    });
    result = { status: cycle.status === "running" ? "failed" : cycle.status, cycle };
    return result;
  } catch (error) {
    console.error("[Scheduler] Cycle failed:", error);
    result = { status: "failed", reason: "Cycle execution failed. Check server logs." };
    return result;
  } finally {
    const consecutiveErrors = result.status === "failed" ? claimed.consecutiveErrors + 1 : 0;
    const nextRunAt = isVercel() ? nextVercelRun()
      : new Date(Date.now() + claimed.intervalMinutes * 60_000 * (1 << Math.min(consecutiveErrors, 4)));
    await db.update(schedulerSettings).set({
      leaseOwner: null,
      leaseExpiresAt: null,
      lastRunStatus: result.status,
      lastRunReason: result.status === "failed"
        ? result.reason || "Cycle execution failed. Review run history and server logs."
        : null,
      consecutiveErrors,
      nextRunAt: sql`CASE WHEN ${schedulerSettings.enabled} THEN ${nextRunAt.toISOString()}::timestamp ELSE NULL END`,
      updatedAt: new Date(),
    }).where(and(eq(schedulerSettings.id, 1), eq(schedulerSettings.leaseOwner, owner)));
    if (!isVercel()) await ensureSchedulerRunning();
  }
}

function clearLocalTimer() {
  if (globalForTimer.__zeroGravitySchedulerTimer) clearTimeout(globalForTimer.__zeroGravitySchedulerTimer);
  delete globalForTimer.__zeroGravitySchedulerTimer;
}

export async function ensureSchedulerRunning(): Promise<void> {
  if (isVercel()) return;
  const status = await getStatus();
  if (!status.enabled) { clearLocalTimer(); return; }
  if (status.cycleActive || globalForTimer.__zeroGravitySchedulerTimer) return;
  const delay = Math.max(0, new Date(status.nextRunAt || Date.now()).getTime() - Date.now());
  globalForTimer.__zeroGravitySchedulerTimer = setTimeout(() => {
    delete globalForTimer.__zeroGravitySchedulerTimer;
    runOnce().catch((error) => console.error("[Scheduler] Local run failed:", error));
  }, delay);
  globalForTimer.__zeroGravitySchedulerTimer.unref();
}
