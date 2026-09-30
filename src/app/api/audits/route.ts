import { NextResponse } from "next/server";
import { db } from "@/db";
import { audits } from "@/db/schema";
import { runDomainAudit } from "@/lib/audit-engine";
import { ensureDbInitialized } from "@/lib/db-seed";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDbInitialized();
    const rows = await db.select().from(audits).orderBy(desc(audits.createdAt)).limit(20);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to fetch audits:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch audits" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const domain = body.domain;
    const niche = body.niche;

    if (!domain) {
      return NextResponse.json({ success: false, error: "Domain is required" }, { status: 400 });
    }

    const auditResult = await runDomainAudit(domain, niche);

    // Save audit record to database
    const saved = await db
      .insert(audits)
      .values({
        domainOrTarget: auditResult.domain,
        auditType: "deliverability_leak",
        overallScore: auditResult.score,
        findings: JSON.stringify(auditResult.findings),
        estimatedMonthlyLeakage: String(auditResult.estimatedMonthlyLeakage),
        recommendedFixBounty: String(auditResult.recommendedFixBounty),
        status: "completed",
      })
      .returning();

    return NextResponse.json({
      success: true,
      audit: auditResult,
      savedRecord: saved[0],
    });
  } catch (error) {
    console.error("Audit failure:", error);
    return NextResponse.json({ success: false, error: "Audit execution failed" }, { status: 500 });
  }
}
