import { NextResponse } from "next/server";
import { ensureDbInitialized } from "@/lib/db-seed";
import { db } from "@/db";
import { revenueEvents, opportunities, financialTransactions } from "@/db/schema";
import { sql, eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET — Revenue feedback loop.
 *
 * Returns attribution data that shows which combinations of
 * industry × offer × source × channel actually produce verified cash.
 *
 * This is the data layer that drives the "verified revenue / 1,000 prospects" KPI.
 */
export async function GET() {
  try {
    await ensureDbInitialized();

    // Revenue by industry
    const byIndustry = await db.execute(sql`
      SELECT
        COALESCE(re.industry, o.target_niche, 'unknown') as industry,
        COUNT(*) as event_count,
        SUM(CASE WHEN re.event_type = 'payment_verified' THEN re.amount::numeric ELSE 0 END) as verified_revenue,
        SUM(CASE WHEN re.event_type = 'checkout_created' THEN 1 ELSE 0 END) as checkouts,
        SUM(CASE WHEN re.event_type = 'payment_verified' THEN 1 ELSE 0 END) as payments
      FROM revenue_events re
      LEFT JOIN opportunities o ON o.id = re.opportunity_id
      GROUP BY 1
      ORDER BY verified_revenue DESC
    `);

    // Revenue by offer tier
    const byTier = await db.execute(sql`
      SELECT
        COALESCE(re.offer_tier, 'unknown') as offer_tier,
        COUNT(*) as event_count,
        SUM(CASE WHEN re.event_type = 'payment_verified' THEN re.amount::numeric ELSE 0 END) as verified_revenue,
        SUM(CASE WHEN re.event_type = 'checkout_created' THEN 1 ELSE 0 END) as checkouts,
        SUM(CASE WHEN re.event_type = 'payment_verified' THEN 1 ELSE 0 END) as payments
      FROM revenue_events re
      GROUP BY 1
      ORDER BY verified_revenue DESC
    `);

    // Revenue by acquisition source
    const bySource = await db.execute(sql`
      SELECT
        COALESCE(re.acquisition_source, 'unknown') as source,
        COUNT(*) as event_count,
        SUM(CASE WHEN re.event_type = 'payment_verified' THEN re.amount::numeric ELSE 0 END) as verified_revenue,
        SUM(CASE WHEN re.event_type = 'checkout_created' THEN 1 ELSE 0 END) as checkouts
      FROM revenue_events re
      GROUP BY 1
      ORDER BY verified_revenue DESC
    `);

    // Overall KPI
    const totalVerified = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as total
      FROM financial_transactions WHERE verified = true
    `);

    const totalProspects = await db.execute(sql`
      SELECT COUNT(*)::int as total FROM scan_targets
    `);

    const verifiedRevenue = Number((totalVerified.rows[0] as Record<string, unknown>)?.total || 0);
    const prospectCount = Number((totalProspects.rows[0] as Record<string, unknown>)?.total || 1);

    return NextResponse.json({
      success: true,
      kpi: {
        verifiedRevenue: verifiedRevenue,
        totalProspects: prospectCount,
        revenuePerThousand: prospectCount > 0
          ? ((verifiedRevenue / prospectCount) * 1000).toFixed(2)
          : "0.00",
      },
      byIndustry: byIndustry.rows,
      byTier: byTier.rows,
      bySource: bySource.rows,
    });
  } catch (error) {
    console.error("Feedback loop query failed:", error);
    return NextResponse.json({ success: false, error: "Failed." }, { status: 500 });
  }
}