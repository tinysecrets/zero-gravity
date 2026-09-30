import { NextResponse } from "next/server";
import { ensureDbInitialized } from "@/lib/db-seed";
import {
  executeCycle,
  getActiveCycle,
  requestStop,
  type CycleConfig,
} from "@/lib/autonomous-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureDbInitialized();
    const cycle = getActiveCycle();
    return NextResponse.json({ success: true, activeCycle: cycle });
  } catch (error) {
    console.error("Autonomous status error:", error);
    return NextResponse.json({ success: false, error: "Failed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDbInitialized();

    if (getActiveCycle()?.status === "running") {
      return NextResponse.json(
        { success: false, error: "A cycle is already running." },
        { status: 409 }
      );
    }

    let config: Partial<CycleConfig> = {};
    try {
      const body = await request.json();
      config = {
        ...(body.scoreThreshold != null && { scoreThreshold: Number(body.scoreThreshold) }),
        ...(body.autoCreateDeals != null && { autoCreateDeals: Boolean(body.autoCreateDeals) }),
        ...(body.autoGenerateOutreach != null && { autoGenerateOutreach: Boolean(body.autoGenerateOutreach) }),
        ...(body.autoCreateCheckout != null && { autoCreateCheckout: Boolean(body.autoCreateCheckout) }),
      };
    } catch { /* no body */ }

    executeCycle(config).catch((err) =>
      console.error("Autonomous cycle failed:", err)
    );

    await new Promise((r) => setTimeout(r, 200));
    const cycle = getActiveCycle();
    return NextResponse.json({ success: true, message: "Cycle started.", activeCycle: cycle });
  } catch (error) {
    console.error("Failed to start cycle:", error);
    return NextResponse.json({ success: false, error: "Failed." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const stopped = requestStop();
    if (!stopped) {
      return NextResponse.json({ success: false, error: "No running cycle." }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Stop requested." });
  } catch (error) {
    console.error("Failed to stop cycle:", error);
    return NextResponse.json({ success: false, error: "Failed." }, { status: 500 });
  }
}