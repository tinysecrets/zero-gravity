import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { contactLeads } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  try {
    await ensureDbInitialized();
    const leads = await db.select().from(contactLeads).orderBy(desc(contactLeads.createdAt), desc(contactLeads.id)).limit(100);
    return NextResponse.json({ success: true, leads }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ success: false, error: "Lead inbox unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
