import { NextResponse } from "next/server";
import { ensureDbInitialized } from "@/lib/db-seed";
import { db } from "@/db";
import { scanTargets } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDbInitialized();
    const rows = await db
      .select()
      .from(scanTargets)
      .orderBy(scanTargets.priority, scanTargets.domain);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to fetch scan targets:", error);
    return NextResponse.json({ success: false, error: "Failed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const domain = String(body.domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    if (!domain || domain.length < 4) {
      return NextResponse.json({ success: false, error: "Valid domain required." }, { status: 400 });
    }

    const [created] = await db
      .insert(scanTargets)
      .values({
        domain,
        niche: String(body.niche || "B2B Services").trim(),
        industry: body.industry ? String(body.industry).trim() : null,
        source: "manual",
        priority: Number(body.priority) || 1,
      })
      .onConflictDoNothing()
      .returning();

    if (!created) {
      return NextResponse.json({ success: false, error: `"${domain}" already exists.` }, { status: 409 });
    }

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error("Failed to add scan target:", error);
    return NextResponse.json({ success: false, error: "Failed." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const id = Number(body.id);
    if (!id) return NextResponse.json({ success: false, error: "ID required." }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
    if (body.priority !== undefined) updates.priority = Number(body.priority);
    if (body.niche !== undefined) updates.niche = String(body.niche).trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "No fields." }, { status: 400 });
    }

    const [updated] = await db.update(scanTargets).set(updates).where(eq(scanTargets.id, id)).returning();
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update target:", error);
    return NextResponse.json({ success: false, error: "Failed." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ success: false, error: "ID required." }, { status: 400 });
    await db.delete(scanTargets).where(eq(scanTargets.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete target:", error);
    return NextResponse.json({ success: false, error: "Failed." }, { status: 500 });
  }
}