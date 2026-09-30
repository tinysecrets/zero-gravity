import { NextResponse } from "next/server";
import { ensureDbInitialized } from "@/lib/db-seed";
import { db } from "@/db";
import { autonomousRuns } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDbInitialized();
    const rows = await db
      .select()
      .from(autonomousRuns)
      .orderBy(desc(autonomousRuns.startedAt))
      .limit(50);

    const runs = rows.map((row) => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : null,
    }));

    return NextResponse.json({ success: true, data: runs });
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return NextResponse.json({ success: false, error: "Failed." }, { status: 500 });
  }
}