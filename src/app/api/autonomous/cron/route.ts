import { NextResponse } from "next/server";
import { ensureDbInitialized } from "@/lib/db-seed";
import { runOnce } from "@/lib/scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Vercel Cron endpoint.
 *
 * vercel.json declares the schedule (every 15 minutes).
 *
 * Vercel sends a GET with Authorization: Bearer <CRON_SECRET>.
 * On non-Vercel deployments the cron route can be triggered manually
 * (e.g., by an external cron service) without the secret.
 */
export async function GET(request: Request) {
  // Authenticate: Vercel Cron sends Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await ensureDbInitialized();
    const status = await runOnce();
    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Cron execution failed:", error);
    return NextResponse.json(
      { success: false, error: "Cron execution failed." },
      { status: 500 }
    );
  }
}