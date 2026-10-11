import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CycleConfig } from "@/lib/automation-config";
import type { CycleState } from "@/lib/autonomous-engine";

vi.mock("@/db", async () => { const fixture = await import("./database"); return { db: fixture.db }; });
vi.mock("@/lib/autonomous-engine", () => ({ executeCycle: vi.fn(), getActiveCycle: vi.fn(() => null) }));

import { client, db, resetDatabase, setupDatabase } from "./database";
import { autonomousRuns, schedulerSettings } from "@/db/schema";
import { executeCycle } from "@/lib/autonomous-engine";
import { ensureDbInitialized } from "@/lib/db-seed";
import { getStatus, runOnce, startScheduler, stopScheduler } from "@/lib/scheduler";
import { GET as cron } from "@/app/api/autonomous/cron/route";
import { GET as readSchedule, POST as configureSchedule } from "@/app/api/autonomous/schedule/route";

function completed(config: CycleConfig): CycleState {
  return { id: "fixture-run", status: "completed", startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), config, steps: [], summary: {
    domainsScanned: 0, opportunitiesFound: 0, dealsCreated: 0, outreachGenerated: 0, checkoutsCreated: 0, totalEstimatedValue: 0,
  } };
}

beforeAll(setupDatabase);
beforeEach(async () => {
  await resetDatabase();
  vi.mocked(executeCycle).mockReset().mockImplementation(async (config) => completed(config as CycleConfig));
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => client.close());

describe("persistent Vercel scheduler", () => {
  it("bootstraps opt-in configuration without executing on initialization/status reads", async () => {
    const status = await getStatus();
    expect(status).toMatchObject({ enabled: true, mode: "vercel_cron", intervalMinutes: 1440, cronSchedule: "0 13 * * *", totalRuns: 0 });
    expect(status.cycleConfig).toMatchObject({ autoCreateCheckout: true, autoSendOutreach: false });
    await readSchedule(); await ensureDbInitialized();
    expect(executeCycle).not.toHaveBeenCalled();
  });
  it("keeps Pause across page reads and simulated cold starts", async () => {
    await stopScheduler();
    await readSchedule();
    delete (globalThis as typeof globalThis & { __zeroGravityDbInitialization?: unknown }).__zeroGravityDbInitialization;
    await ensureDbInitialized();
    expect((await getStatus()).enabled).toBe(false);
    expect((await runOnce()).status).toBe("skipped");
    expect(executeCycle).not.toHaveBeenCalled();
  });
  it("bootstrap capability flags never reauthorize saved checkout/email opt-outs on a cold start", async () => {
    await ensureDbInitialized();
    await db.update(schedulerSettings).set({ autoCreateCheckout: false, autoSendOutreach: false });
    vi.stubEnv("AUTONOMOUS_CREATE_CHECKOUT", "true"); vi.stubEnv("AUTONOMOUS_SEND_OUTREACH", "true");
    delete (globalThis as typeof globalThis & { __zeroGravityDbInitialization?: unknown }).__zeroGravityDbInitialization;
    await ensureDbInitialized();
    expect((await getStatus()).cycleConfig).toMatchObject({ autoCreateCheckout: false, autoSendOutreach: false });
    expect(executeCycle).not.toHaveBeenCalled();
  });
  it("enables Vercel cron without launching detached work", async () => {
    await stopScheduler(); await startScheduler({ intervalMinutes: 5 });
    expect((await getStatus()).enabled).toBe(true);
    expect((await getStatus()).intervalMinutes).toBe(1440);
    expect(executeCycle).not.toHaveBeenCalled();
    expect((await runOnce()).status).toBe("completed");
    expect((await runOnce()).status).toBe("skipped");
    expect(executeCycle).toHaveBeenCalledTimes(1);
  });
  it("prevents overlapping runs and sees a remote stop request", async () => {
    let started!: () => void; let finish!: () => void;
    const running = new Promise<void>((resolve) => { started = resolve; });
    const release = new Promise<void>((resolve) => { finish = resolve; });
    vi.mocked(executeCycle).mockImplementationOnce(async (config, options) => {
      started(); await release;
      expect(await options?.shouldStop?.()).toBe(true);
      return { ...completed(config as CycleConfig), status: "stopped" };
    });
    const first = runOnce(); await running;
    expect((await getStatus()).cycleActive).toBe(true);
    expect((await runOnce({ force: true })).status).toBe("skipped");
    await stopScheduler(); finish();
    expect((await first).status).toBe("stopped");
    expect(await getStatus()).toMatchObject({ enabled: false, cycleActive: false, totalRuns: 1, nextRunAt: null });
  });
  it("recovers expired leases and marks terminated runs failed", async () => {
    await ensureDbInitialized();
    await db.update(schedulerSettings).set({ leaseOwner: "dead-instance", leaseExpiresAt: new Date(Date.now() - 60_000) });
    await db.insert(autonomousRuns).values({ id: "orphan", status: "running" });
    expect((await runOnce()).status).toBe("completed");
    expect((await db.select().from(autonomousRuns))[0]).toMatchObject({ id: "orphan", status: "failed" });
    expect((await getStatus()).cycleActive).toBe(false);
  });
  it("records returned cycle failures and releases the lease", async () => {
    vi.mocked(executeCycle).mockImplementationOnce(async (config) => ({ ...completed(config as CycleConfig), status: "failed" }));
    expect((await runOnce()).status).toBe("failed");
    expect(await getStatus()).toMatchObject({ consecutiveErrors: 1, lastRunStatus: "failed", cycleActive: false });
  });
  it("blocks incomplete checkout configuration before side effects and records why", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect(await runOnce()).toMatchObject({ status: "blocked" });
    expect(executeCycle).not.toHaveBeenCalled();
    const status = await getStatus();
    expect(status.totalRuns).toBe(0);
    expect(status.lastRunStatus).toBe("blocked");
    expect(status.lastRunReason).toContain("STRIPE_WEBHOOK_SECRET");
  });
  it("runs automated collection without a dashboard password", async () => {
    vi.stubEnv("DASHBOARD_PASSWORD", "");
    expect((await runOnce()).status).toBe("completed");
    expect(executeCycle).toHaveBeenCalledTimes(1);
  });
  it("honors the kill switch and skips automatic preview runs", async () => {
    vi.stubEnv("AUTONOMOUS_ENABLED", "false");
    expect((await runOnce({ force: true })).status).toBe("skipped");
    expect((await getStatus()).lastRunReason).toContain("AUTONOMOUS_ENABLED");
    vi.stubEnv("AUTONOMOUS_ENABLED", "true"); vi.stubEnv("VERCEL_ENV", "preview");
    expect((await runOnce()).status).toBe("skipped");
    expect((await getStatus()).lastRunReason).toContain("preview");
    expect(executeCycle).not.toHaveBeenCalled();
  });
  it("rejects malformed scheduler input rather than enabling unsafe defaults", async () => {
    vi.stubEnv("ZERO_GRAVITY_RUNNER_TOKEN", "runner-fixture");
    const response = await configureSchedule(new Request("https://zero-gravity.test/api/autonomous/schedule", { method: "POST", headers: { "x-zero-gravity-runner": "runner-fixture" }, body: JSON.stringify({ autoSendOutreach: "true", intervalMinutes: "bad" }) }));
    expect(response.status).toBe(400);
    expect(executeCycle).not.toHaveBeenCalled();
  });
});

describe("authenticated cron endpoint", () => {
  it("fails closed without a secret or with an invalid token", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await cron(new Request("https://zero-gravity.test/api/autonomous/cron"))).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "local-cron-fixture");
    expect((await cron(new Request("https://zero-gravity.test/api/autonomous/cron"))).status).toBe(401);
    expect(executeCycle).not.toHaveBeenCalled();
  });
  it("waits for the cycle before returning, rather than detaching serverless work", async () => {
    let started!: () => void; let finish!: () => void;
    const running = new Promise<void>((resolve) => { started = resolve; });
    const release = new Promise<void>((resolve) => { finish = resolve; });
    vi.mocked(executeCycle).mockImplementationOnce(async (config) => { started(); await release; return completed(config as CycleConfig); });
    let returned = false;
    const response = cron(new Request("https://zero-gravity.test/api/autonomous/cron", { headers: { authorization: "Bearer local-cron-fixture" } })).then((value) => { returned = true; return value; });
    await running; expect(returned).toBe(false); finish();
    const result = await response;
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ success: true, status: "completed" });
  });
});
