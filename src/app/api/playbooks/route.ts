import { NextResponse } from "next/server";
import { db } from "@/db";
import { playbooks } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { SEED_PLAYBOOKS } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDbInitialized();
    const rows = await db.select().from(playbooks);
    if (rows.length === 0) {
      return NextResponse.json({ success: true, data: SEED_PLAYBOOKS });
    }
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to fetch playbooks:", error);
    return NextResponse.json({ success: true, data: SEED_PLAYBOOKS });
  }
}
