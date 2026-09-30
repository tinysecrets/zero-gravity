import { NextResponse } from "next/server";
import { ensureDbInitialized } from "@/lib/db-seed";
import {
  startScheduler,
  stopScheduler,
  getStatus,
  ensureSchedulerRunning,
  type SchedulerConfig,
} from "@/lib/scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureDbInitialized();
    ensureSchedulerRunning();
    return NextResponse.json({ success: true, scheduler: getStatus() });
  } catch (error) {
    console.error("Scheduler status error:", error);
    return NextResponse.json({ success: false, error: "Failed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDbInitialized();

    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { /* empty */ }

    if (body.enabled === false) {
      const status = stopScheduler();
      return NextResponse.json({ success: true, message: "Stopped.", scheduler: status });
    }

    const config: Partial<SchedulerConfig> = {
      enabled: true,
      ...(body.intervalMinutes != null && { intervalMinutes: Number(body.intervalMinutes) }),
      cycleConfig: {
        scoreThreshold: Number(body.scoreThreshold) || 65,
        autoCreateDeals: body.autoCreateDeals !== false,
        autoGenerateOutreach: body.autoGenerateOutreach !== false,
        autoCreateCheckout: Boolean(body.autoCreateCheckout),
      },
    };

    const status = startScheduler(config);
    return NextResponse.json({
      success: true,
      message: `Scheduler active. Running every ${status.intervalMinutes} min (${status.mode}).`,
      scheduler: status,
    });
  } catch (error) {
    console.error("Failed to start scheduler:", error);
    return NextResponse.json({ success: false, error: "Failed." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const status = stopScheduler();
    return NextResponse.json({ success: true, message: "Stopped.", scheduler: status });
  } catch (error) {
    console.error("Failed to stop scheduler:", error);
    return NextResponse.json({ success: false, error: "Failed." }, { status: 500 });
  }
}