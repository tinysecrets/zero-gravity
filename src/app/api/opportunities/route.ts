import { NextResponse } from "next/server";
import { db } from "@/db";
import { opportunities } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(request.url);
    const vector = searchParams.get("vector");
    const status = searchParams.get("status");

    let query = db.select().from(opportunities).orderBy(desc(opportunities.createdAt));

    let rows = await query;

    if (vector && vector !== "all") {
      rows = rows.filter((r) => r.vector === vector);
    }
    if (status && status !== "all") {
      rows = rows.filter((r) => r.status === status);
    }

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to fetch opportunities:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch opportunities" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    if (body.status === "revenue_collected" ||
      (body.realizedRevenue !== undefined && Number(body.realizedRevenue) !== 0)) {
      return NextResponse.json({ success: false, error: "Cash collection can only be recorded by a verified payment provider event." }, { status: 403 });
    }

    const newDeal = await db
      .insert(opportunities)
      .values({
        title: body.title || "Untitled Deal",
        vector: body.vector || "lead_reactivation",
        targetCompany: body.targetCompany || "Unknown Corp",
        targetContact: body.targetContact || "Owner",
        targetEmail: body.targetEmail || null,
        targetPhone: body.targetPhone || null,
        targetNiche: body.targetNiche || "General",
        status: body.status || "discovered",
        potentialValue: String(body.potentialValue || "1500"),
        operatorFeePercent: String(body.operatorFeePercent || "25.00"),
        grossTransactionValue: String(body.grossTransactionValue || "0"),
        realizedRevenue: "0.00",
        capitalSpent: "0.00",
        notes: body.notes || "",
        outreachMessage: body.outreachMessage || "",
        auditData: typeof body.auditData === "string" ? body.auditData : JSON.stringify(body.auditData || {}),
        contractTerms: body.contractTerms || "Standard Performance Fee Agreement (0% upfront)",
      })
      .returning();

    return NextResponse.json({ success: true, data: newDeal[0] });
  } catch (error) {
    console.error("Failed to create opportunity:", error);
    return NextResponse.json({ success: false, error: "Failed to create opportunity" }, { status: 500 });
  }
}
