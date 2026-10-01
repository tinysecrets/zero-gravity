import { NextResponse } from "next/server";
import { db } from "@/db";
import { autonomousRuns } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getActiveCycle, type CycleState } from "@/lib/autonomous-engine";
import { parseCycleConfig } from "@/lib/automation-config";
import { getStatus, requestCycleStop, runOnce } from "@/lib/scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  try {
    const scheduler = await getStatus();
    let cycle = scheduler.cycleActive ? getActiveCycle() : null;
    if (!cycle && scheduler.cycleActive) {
      const [run] = await db.select().from(autonomousRuns).where(eq(autonomousRuns.status, "running"))
        .orderBy(desc(autonomousRuns.startedAt)).limit(1);
      if (run) {
        const details = run.details ? JSON.parse(run.details) : null;
        cycle = {
          id: run.id, status: "running", startedAt: run.startedAt.toISOString(),
          config: details?.config || scheduler.cycleConfig,
          steps: details?.steps || [],
          summary: {
            domainsScanned: run.domainsScanned, opportunitiesFound: run.opportunitiesFound,
            dealsCreated: run.dealsCreated, outreachGenerated: run.outreachGenerated,
            checkoutsCreated: run.checkoutsCreated, totalEstimatedValue: Number(run.totalEstimatedValue),
          },
        } satisfies CycleState;
      }
    }
    return NextResponse.json({ success: true, activeCycle: cycle });
  } catch (error) {
    console.error("Autonomous status error:", error);
    return NextResponse.json({ success: false, error: "Cycle status unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let config;
  try { config = parseCycleConfig(await request.json()); }
  catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Invalid cycle configuration." }, { status: 400 });
  }
  try {
    const result = await runOnce({ force: true, cycleConfig: config });
    const success = result.status === "completed" || result.status === "stopped";
    return NextResponse.json({
      success, message: result.reason || `Cycle ${result.status}.`, error: success ? undefined : result.reason || "Cycle failed.",
      activeCycle: result.cycle || null,
    }, { status: result.status === "skipped" ? 409 : result.status === "blocked" ? 503 : result.status === "failed" ? 500 : 200 });
  } catch (error) {
    console.error("Failed to run cycle:", error);
    return NextResponse.json({ success: false, error: "Cycle failed. Check deployment configuration and server logs." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const stopped = await requestCycleStop();
    return NextResponse.json({ success: stopped, ...(stopped ? { message: "Stop requested." } : { error: "No running cycle." }) }, { status: stopped ? 200 : 404 });
  } catch (error) {
    console.error("Failed to stop cycle:", error);
    return NextResponse.json({ success: false, error: "Unable to request a stop." }, { status: 503 });
  }
}
