import { NextResponse } from "next/server";
import { db } from "@/db";
import { opportunities } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const dealId = parseInt(id, 10);
    if (isNaN(dealId)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const res = await db.select().from(opportunities).where(eq(opportunities.id, dealId));
    if (res.length === 0) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: res[0] });
  } catch (error) {
    console.error("Failed to get opportunity:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const dealId = parseInt(id, 10);
    if (isNaN(dealId)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const existing = await db.select().from(opportunities).where(eq(opportunities.id, dealId));
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 });
    }

    // Browser edits may manage operational work, but they cannot book revenue.
    // `revenue_collected` and realized revenue are reserved for authenticated settlement handlers.
    if (
      (body.status === "revenue_collected" && existing[0].status !== "revenue_collected") ||
      (body.realizedRevenue !== undefined &&
        String(body.realizedRevenue) !== String(existing[0].realizedRevenue))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Cash collection can only be recorded by a verified payment provider event.",
        },
        { status: 403 }
      );
    }

    const updated = await db
      .update(opportunities)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.potentialValue !== undefined && { potentialValue: String(body.potentialValue) }),
        ...(body.grossTransactionValue !== undefined && { grossTransactionValue: String(body.grossTransactionValue) }),
        ...(body.operatorFeePercent !== undefined && { operatorFeePercent: String(body.operatorFeePercent) }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.outreachMessage !== undefined && { outreachMessage: body.outreachMessage }),
        ...(body.auditData !== undefined && {
          auditData: typeof body.auditData === "string" ? body.auditData : JSON.stringify(body.auditData),
        }),
        ...(body.contractTerms !== undefined && { contractTerms: body.contractTerms }),
        updatedAt: new Date(),
      })
      .where(eq(opportunities.id, dealId))
      .returning();

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error("Failed to update opportunity:", error);
    return NextResponse.json({ success: false, error: "Failed to update opportunity" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const dealId = parseInt(id, 10);
    if (isNaN(dealId)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    await db.delete(opportunities).where(eq(opportunities.id, dealId));
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    console.error("Failed to delete opportunity:", error);
    return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500 });
  }
}
