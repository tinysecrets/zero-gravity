import {
  executeCycle,
  getActiveCycle,
  type CycleConfig,
} from "./autonomous-engine";

// ---------------------------------------------------------------------------
// Scheduler
//
// Two modes:
//
// 1. Vercel Cron (production) — the /api/autonomous/cron route is called by
//    Vercel's infrastructure on a cron schedule configured in vercel.json.
//    The cron route calls runOnce() directly.
//
// 2. In-process timer (development / non-Vercel) — the scheduler self-
//    initializes lazily on the first /api/autonomous/schedule API touch.
//    Uses setTimeout recursion, stored on globalThis to survive HMR.
//
// Both modes share the same CycleConfig.
// ---------------------------------------------------------------------------

export interface SchedulerConfig {
  enabled: boolean;
  intervalMinutes: number;
  cycleConfig: CycleConfig;
}

export interface SchedulerStatus {
  enabled: boolean;
  intervalMinutes: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  cycleActive: boolean;
  totalRuns: number;
  consecutiveErrors: number;
  cycleConfig: CycleConfig;
  mode: "vercel_cron" | "in_process";
}

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

interface SchedulerState {
  timer: ReturnType<typeof setInterval> | null;
  config: SchedulerConfig;
  nextRunAt: number | null;
  lastRunAt: number | null;
  lastRunStatus: string | null;
  totalRuns: number;
  consecutiveErrors: number;
  runInProgress: boolean;
}

const GLOBAL_KEY = "__zeroGravityScheduler";

function getState(): SchedulerState {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      timer: null,
      config: {
        enabled: false,
        intervalMinutes: 15,
        cycleConfig: {
          scoreThreshold: 65,
          autoCreateDeals: true,
          autoGenerateOutreach: true,
          autoCreateCheckout: false,
        },
      },
      nextRunAt: null,
      lastRunAt: null,
      lastRunStatus: null,
      totalRuns: 0,
      consecutiveErrors: 0,
      runInProgress: false,
    } satisfies SchedulerState;
  }
  return g[GLOBAL_KEY] as SchedulerState;
}

// ---------------------------------------------------------------------------
// runOnce — called by both the in-process timer and the Vercel cron route
// ---------------------------------------------------------------------------

export async function runOnce(): Promise<string> {
  const state = getState();

  if (state.runInProgress || getActiveCycle()?.status === "running") {
    return "skipped: cycle already running";
  }

  state.runInProgress = true;
  state.lastRunAt = Date.now();
  state.totalRuns++;

  try {
    const result = await executeCycle(state.config.cycleConfig);
    state.lastRunStatus = result.status;
    state.consecutiveErrors = 0;
    return result.status;
  } catch (err) {
    state.lastRunStatus = "failed";
    state.consecutiveErrors++;
    console.error(`[Scheduler] Cycle #${state.totalRuns} failed:`, err);
    return "failed";
  } finally {
    state.runInProgress = false;
    if (state.config.enabled) {
      scheduleNext(state);
    }
  }
}

// ---------------------------------------------------------------------------
// In-process timer (for non-Vercel deployments)
// ---------------------------------------------------------------------------

function scheduleNext(state: SchedulerState): void {
  if (!state.config.enabled) {
    state.nextRunAt = null;
    return;
  }

  const backoff = state.consecutiveErrors > 0
    ? Math.min(state.consecutiveErrors, 4)
    : 0;
  const delayMinutes = state.config.intervalMinutes * (1 << backoff);

  state.nextRunAt = Date.now() + delayMinutes * 60_000;

  if (state.timer) clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    runOnce();
  }, delayMinutes * 60_000);
}

export function ensureSchedulerRunning(): void {
  const state = getState();
  if (state.config.enabled && !state.timer && !state.runInProgress) {
    runOnce();
  }
}

export function startScheduler(
  partial: Partial<SchedulerConfig> = {}
): SchedulerStatus {
  const state = getState();

  if (partial.enabled !== undefined) state.config.enabled = partial.enabled;
  if (partial.intervalMinutes !== undefined)
    state.config.intervalMinutes = Math.max(1, Math.round(partial.intervalMinutes));
  if (partial.cycleConfig) {
    state.config.cycleConfig = {
      ...state.config.cycleConfig,
      ...partial.cycleConfig,
    };
  }

  state.config.enabled = true;

  // Fire the first cycle in the background — don't block the caller
  if (!state.runInProgress) {
    runOnce().catch((err) => {
      console.error("[Scheduler] First cycle failed:", err);
    });
  }

  return getStatus();
}

export function stopScheduler(): SchedulerStatus {
  const state = getState();
  state.config.enabled = false;
  state.nextRunAt = null;

  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }

  return getStatus();
}

export function getStatus(): SchedulerStatus {
  const state = getState();
  return {
    enabled: state.config.enabled,
    intervalMinutes: state.config.intervalMinutes,
    nextRunAt: state.nextRunAt ? new Date(state.nextRunAt).toISOString() : null,
    lastRunAt: state.lastRunAt ? new Date(state.lastRunAt).toISOString() : null,
    lastRunStatus: state.lastRunStatus,
    cycleActive: getActiveCycle()?.status === "running" || state.runInProgress,
    totalRuns: state.totalRuns,
    consecutiveErrors: state.consecutiveErrors,
    cycleConfig: { ...state.config.cycleConfig },
    mode: isVercelCronConfigured() ? "vercel_cron" : "in_process",
  };
}

function isVercelCronConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET || process.env.VERCEL);
}