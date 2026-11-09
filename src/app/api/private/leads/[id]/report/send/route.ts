import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contactLeads } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { validRequestedDomain } from "@/lib/public-request-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

// Operator-only delivery. Requires an explicit human approval flag, a verified
// paid order, and a report matching that order's domain. Resend idempotency
// prevents accidental duplicate sends when an operator retries a timed-out call.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ success: false, error: "Invalid order ID." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "A reviewed report is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (body.approved !== true) {
    return NextResponse.json({ success: false, error: "Confirm that you reviewed and approve this report before sending." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const reportText = typeof body.reportText === "string" ? body.reportText.trim() : "";
  if (reportText.length < 250 || reportText.length > 40000) {
    return NextResponse.json({ success: false, error: "The report must contain between 250 and 40,000 characters." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  if (!apiKey || !from) {
    return NextResponse.json({ success: false, error: "Report email delivery is not configured. Set RESEND_API_KEY and FROM_EMAIL." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    await ensureDbInitialized();
    const [lead] = await db.select().from(contactLeads).where(eq(contactLeads.id, Number(id))).limit(1);
    if (!lead) return NextResponse.json({ success: false, error: "Order not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    if (lead.kind !== "checkout" || lead.status !== "paid") {
      return NextResponse.json({ success: false, error: lead.status === "sent" ? "The report email has already been accepted by the provider." : "A verified live paid order is required." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    const domain = validRequestedDomain(lead.domain || "");
    if (!domain || !reportText.startsWith("ZERO GRAVITY — DOMAIN SIGNALS REVIEW") ||
        !reportText.includes("Domain: " + domain) || !reportText.includes("LIMITATIONS")) {
      return NextResponse.json({ success: false, error: "The report must match this paid order's domain and retain its limitations section." }, { status: 422, headers: { "Cache-Control": "no-store" } });
    }

    const customerReportText = reportText
      .replace(/^DRAFT FOR HUMAN REVIEW — NOT YET SENT TO CUSTOMER\s*$/m, "CUSTOMER COPY")
      .replace(/\nHUMAN REVIEW BEFORE DELIVERY[\s\S]*$/m, "")
      .trim();

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
          "Idempotency-Key": "zg-paid-report-" + lead.id,
        },
        body: JSON.stringify({
          from,
          to: [lead.email],
          reply_to: process.env.OUTREACH_REPLY_TO || process.env.SALES_INBOX_EMAIL || undefined,
          subject: "Your Zero Gravity Domain Signals Review — " + domain,
          text: customerReportText,
        }),
      });
      const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
      if (!response.ok) {
        await db.update(contactLeads).set({
          notificationStatus: "report_send_failed", updatedAt: new Date(),
        }).where(eq(contactLeads.id, lead.id));
        return NextResponse.json({ success: false, error: "The email provider did not accept the report. The order remains paid and can be retried." }, { status: 502, headers: { "Cache-Control": "no-store" } });
      }

      const emailId = result.id || "accepted";
      await db.update(contactLeads).set({
        status: "sent", notificationStatus: "report_sent:" + emailId, updatedAt: new Date(),
      }).where(eq(contactLeads.id, lead.id));

      return NextResponse.json({
        success: true,
        accepted: true,
        emailId,
        customerEmail: lead.email,
        status: "sent",
      }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      await db.update(contactLeads).set({
        notificationStatus: "report_send_failed", updatedAt: new Date(),
      }).where(eq(contactLeads.id, lead.id));
      console.error("Paid report email failed:", error instanceof Error ? error.message : "unknown error");
      return NextResponse.json({ success: false, error: "Report delivery could not be confirmed. The order remains paid; check the email provider before retrying." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
  } catch (error) {
    console.error("Paid report delivery preparation failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ success: false, error: "The paid order could not be verified for delivery." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
