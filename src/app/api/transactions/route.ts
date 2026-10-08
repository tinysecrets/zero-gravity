import { NextResponse } from "next/server";
import { db } from "@/db";
import { financialTransactions, opportunities } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDbInitialized();
    const txs = await db.select().from(financialTransactions).orderBy(desc(financialTransactions.createdAt));
    const deals = await db.select().from(opportunities);

    let grossVolume = 0;
    let totalPotentialPipeline = 0;
    let totalCapitalSpent = 0;

    deals.forEach((deal) => {
      totalPotentialPipeline += parseFloat(deal.potentialValue || "0");
      totalCapitalSpent += parseFloat(deal.capitalSpent || "0");
    });

    // Only verified settlement records count as gross receipts or revenue.
    const verifiedTransactions = txs.filter((tx) => tx.verified);
    grossVolume = verifiedTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || "0"), 0);
    const totalRealizedRevenue = verifiedTransactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amount || "0"),
      0
    );
    const netProfit = totalRealizedRevenue - totalCapitalSpent;
    const profitMargin = totalRealizedRevenue > 0 ? ((netProfit / totalRealizedRevenue) * 100).toFixed(1) : "0.0";

    return NextResponse.json({
      success: true,
      data: {
        transactions: txs,
        metrics: {
          grossVolume,
          totalRealizedRevenue,
          totalPotentialPipeline,
          totalCapitalSpent,
          netProfit,
          profitMargin: `${profitMargin}%`,
          activeDealsCount: deals.length,
          wonDealsCount: deals.filter((d) => d.status === "revenue_collected").length,
          verifiedSettlementCount: verifiedTransactions.length,
          pendingReconciliationCount: txs.filter((tx) => !tx.verified).length,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();

    const newTx = await db
      .insert(financialTransactions)
      .values({
        opportunityId: body.opportunityId ? parseInt(body.opportunityId, 10) : null,
        transactionType: body.transactionType || "rev_share_commission",
        amount: String(body.amount || "0.00"),
        paymentMethod: body.paymentMethod || "Stripe Direct",
        description: body.description || "Manual Transaction Entry",
        verified: false,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newTx[0],
      message: "Receipt logged as pending reconciliation. It will not count as revenue until verified.",
    });
  } catch (error) {
    console.error("Failed to add transaction:", error);
    return NextResponse.json({ success: false, error: "Failed to create transaction" }, { status: 500 });
  }
}
