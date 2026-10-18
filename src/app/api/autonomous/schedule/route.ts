import { NextResponse } from "next/server";
import { startScheduler, stopScheduler, saveSchedulerConfiguration, getStatus } from "@/lib/scheduler";
import { parseCycleConfig, parseIntervalMinutes } from "@/lib/automation-config";
import { validOperatorOrRunnerAuthorization } from "@/lib/request-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    // Reads never enable/restart the scheduler, including after Stop.
    return NextResponse.json({ success: true, scheduler: await getStatus() });
  } catch (error) {
    console.error("Scheduler status error:", error);
    return NextResponse.json({ success: false, error: "Scheduler unavailable. Check DATABASE_URL and deployment configuration." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!validOperatorOrRunnerAuthorization(request)) return NextResponse.json({ success: false, error: "Runner authorization required." }, { status: 401 });
  let body: Record<string, unknown>;
  let cycleConfig;
  let intervalMinutes;
  try {
    body = await request.json();
    cycleConfig = parseCycleConfig(body);
    if (body.enabled !== undefined && typeof body.enabled !== "boolean") throw new Error("enabled must be a boolean.");
    if (body.intervalMinutes !== undefined) intervalMinutes = parseIntervalMinutes(body.intervalMinutes);
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Invalid configuration." }, { status: 400 });
  }
  try {
    const patch = { intervalMinutes, cycleConfig };
    // Only an explicit enabled:true may start the scheduler. Config-only updates
    // preserve the current persisted state, and enabled:false saves safety flags
    // in the same database update that pauses the scheduler.
    const status = body.enabled === false
      ? await stopScheduler(patch)
      : body.enabled === true
        ? await startScheduler({ enabled: true, intervalMinutes, cycleConfig: { ...(await getStatus()).cycleConfig, ...cycleConfig } })
        : await saveSchedulerConfiguration(patch);
    return NextResponse.json({
      success: true,
      message: body.enabled === undefined
        ? `Settings saved; scheduler remains ${status.enabled ? "enabled" : "paused"}.`
        : !status.enabled ? "Scheduler paused."
          : status.mode === "vercel_cron"
            ? "Enabled. Vercel Cron runs daily at 13:00 UTC; use Run Single Cycle to run now."
            : `Enabled. Running every ${status.intervalMinutes} minutes.`,
      scheduler: status,
    });
  } catch (error) {
    console.error("Failed to configure scheduler:", error);
    return NextResponse.json({ success: false, error: "Unable to save scheduler configuration." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!validOperatorOrRunnerAuthorization(request)) return NextResponse.json({ success: false, error: "Runner authorization required." }, { status: 401 });
  try {
    return NextResponse.json({ success: true, message: "Scheduler paused; active cycle stop requested.", scheduler: await stopScheduler() });
  } catch (error) {
    console.error("Failed to stop scheduler:", error);
    return NextResponse.json({ success: false, error: "Unable to pause scheduler." }, { status: 503 });
  }
}
