import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contactLeads } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { runDomainAudit } from "@/lib/audit-engine";
import { validRequestedDomain } from "@/lib/public-request-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

// Operator-only report preparation. It is deliberately read-only and requires
// a provider-confirmed live payment; it does not email customers or mark work delivered.
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ success: false, error: "Invalid order ID." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    await ensureDbInitialized();
    const [lead] = await db.select().from(contactLeads).where(eq(contactLeads.id, Number(id))).limit(1);
    if (!lead) return NextResponse.json({ success: false, error: "Order not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    if (lead.kind !== "checkout" || lead.status !== "paid") {
      return NextResponse.json({ success: false, error: "A verified live payment is required before preparing a customer report." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    const domain = validRequestedDomain(lead.domain || "");
    if (!domain) return NextResponse.json({ success: false, error: "The paid order does not contain a valid domain." }, { status: 422, headers: { "Cache-Control": "no-store" } });

    const audit = await runDomainAudit(domain);
    const reportText = [
      "ZERO GRAVITY — DOMAIN SIGNALS REVIEW",
      "DRAFT FOR HUMAN REVIEW — NOT YET SENT TO CUSTOMER",
      "",
      "Customer: " + lead.name,
      "Domain: " + audit.domain,
      "Prepared: " + new Date().toISOString(),
      "Payment reference: " + (lead.paymentReference || "recorded"),
      "",
      "PUBLIC DNS OBSERVATIONS",
      "SPF record observed: " + (audit.spfPresent ? "Yes" : "No"),
      "SPF value: " + (audit.spfRecord || "No SPF record observed"),
      "DMARC record observed: " + (audit.dmarcPresent ? "Yes" : "No"),
      "DMARC policy: " + (audit.dmarcPresent ? audit.dmarcPolicy : "No DMARC record observed"),
      "MX record observed: " + (audit.mxPresent ? "Yes" : "No"),
      "MX values: " + (audit.mxRecords.length ? audit.mxRecords.join("; ") : "No MX records observed"),
      "",
      "FINDINGS",
      ...audit.findings.map((finding, index) => (index + 1) + ". [" + finding.severity + "] " + finding.title + "\n   " + finding.description + "\n   Context: " + finding.impact),
      "",
      "RECOMMENDED REVIEW CHECKLIST",
      audit.remediationSnippet,
      "",
      "LIMITATIONS",
      "This report reflects public DNS responses at the time of review. It does not prove inbox placement, inspect every DKIM selector, confirm all authorized senders, establish compromise, prove financial loss, or establish regulatory compliance. No DNS or production changes were made.",
      "",
      "HUMAN REVIEW BEFORE DELIVERY",
      "- Confirm the domain and customer authorization.",
      "- Verify the query time and evidence are current.",
      "- Review each finding and remove anything not supported by the observed evidence.",
      "- Confirm the agreed scope and delivery terms.",
      "- Send only after human approval.",
    ].join("\n");

    return NextResponse.json({
      success: true,
      draft: {
        leadId: lead.id,
        customerName: lead.name,
        customerEmail: lead.email,
        domain: audit.domain,
        preparedAt: new Date().toISOString(),
        findings: audit.findings,
        reportText,
        status: "draft_for_human_review",
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Paid domain report preparation failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ success: false, error: "Report draft could not be prepared. Verify DNS availability and retry." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
