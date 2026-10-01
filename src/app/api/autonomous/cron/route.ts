import { NextResponse } from "next/server";
import { runOnce } from "@/lib/scheduler";
import { validCronAuthorization } from "@/lib/request-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// Vercel invokes this daily at 13:00 UTC (vercel.json). Await the entire bounded
// cycle: serverless functions cannot keep an in-process timer/job alive afterward.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (!validCronAuthorization(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runOnce();
    const success = result.status !== "failed" && result.status !== "blocked";
    return NextResponse.json({ success, ...result }, {
      status: result.status === "failed" ? 500 : result.status === "blocked" ? 503 : 200,
    });
  } catch (error) {
    console.error("Cron execution failed:", error);
    return NextResponse.json({ success: false, error: "Cron execution failed. Check database configuration and server logs." }, { status: 500 });
  }
}
