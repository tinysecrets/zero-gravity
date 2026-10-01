import { db } from "@/db";
import { opportunities, revenueEvents, paymentRequests } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export interface OutreachResult {
  sent: boolean;
  method: "resend" | "skipped";
  recipientEmail: string;
  subject: string;
  dealId: number;
  error?: string;
}

// Invoked only after explicit autoSendOutreach opt-in. A durable claim prevents
// parallel sends. Indeterminate sends require review rather than blind retries.
export async function sendOutreach(dealId: number): Promise<OutreachResult> {
  const [deal] = await db.select().from(opportunities).where(eq(opportunities.id, dealId));
  const subject = deal?.outreachMessage?.match(/^Subject:\s*(.+)$/im)?.[1]?.trim() || "Email-authentication review";
  const skipped = (error: string): OutreachResult => ({ sent: false, method: "skipped", recipientEmail: deal?.targetEmail || "", subject, dealId, error });
  if (!deal?.targetEmail || !deal.outreachMessage) return skipped("A verified contact and outreach draft are required.");
  if (deal.outreachDeliveryStatus !== "draft") return skipped(`Outreach is ${deal.outreachDeliveryStatus}; automatic resend withheld. Review delivery before retrying.`);
  const key = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  const replyTo = process.env.OUTREACH_REPLY_TO;
  const postalAddress = process.env.OUTREACH_POSTAL_ADDRESS;
  if (!key || !from || !replyTo || !postalAddress) return skipped("Configure the verified sender, Resend key, reply/opt-out mailbox, and postal address.");
  const [invoice] = await db.select().from(paymentRequests).where(and(
    eq(paymentRequests.opportunityId, dealId), eq(paymentRequests.status, "checkout_created"),
  )).orderBy(desc(paymentRequests.createdAt), desc(paymentRequests.id)).limit(1);
  if (!invoice?.checkoutUrl) return skipped("A verified-mode checkout link is required before outreach.");
  const recipient = invoice.livemode ? deal.targetEmail : process.env.OUTREACH_TEST_RECIPIENT;
  if (!recipient) return skipped("Set OUTREACH_TEST_RECIPIENT for test-mode outreach; real prospects are never sent test invoices.");

  const [claimed] = await db.update(opportunities).set({
    outreachDeliveryStatus: "sending", outreachAttemptedAt: new Date(), updatedAt: new Date(),
  }).where(and(eq(opportunities.id, dealId), eq(opportunities.outreachDeliveryStatus, "draft"))).returning({ id: opportunities.id });
  if (!claimed) return skipped("Another worker already claimed this email.");
  const body = [
    deal.outreachMessage.replace(/^Subject:.*$/m, "").trim(),
    "", "Customer-authorized card checkout:", invoice.checkoutUrl,
    "", "---", `From: ${from}`, postalAddress,
    `To opt out of further offers, reply \"unsubscribe\" to ${replyTo}.`,
  ].join("\n");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `outreach-${dealId}` },
      body: JSON.stringify({ from, reply_to: replyTo, to: [recipient], subject: invoice.livemode ? subject : `[TEST] ${subject}`, text: body }),
    });
    if (!response.ok) {
      // Even a provider error might follow a partial/indeterminate send. Require
      // review, never claim this as sent revenue or silently contact them again.
      await db.update(opportunities).set({ outreachDeliveryStatus: "needs_review", updatedAt: new Date() }).where(eq(opportunities.id, dealId));
      return { sent: false, method: "resend", recipientEmail: recipient, subject, dealId, error: `Email provider returned ${response.status}. Delivery needs review.` };
    }
    const data = await response.json() as { id?: string };
    if (!data.id) throw new Error("Email provider did not return a receipt ID.");
    await db.update(opportunities).set({
      status: "outreach_sent", outreachDeliveryStatus: "sent", outreachProviderId: data.id, updatedAt: new Date(),
    }).where(eq(opportunities.id, dealId));
    await db.insert(revenueEvents).values({
      opportunityId: deal.id, industry: deal.targetNiche, offerTier: deal.offerTier,
      acquisitionSource: deal.acquisitionSource, amount: deal.potentialValue,
      eventType: invoice.livemode ? "outreach_sent" : "test_outreach_sent", channel: "email",
    });
    return { sent: true, method: "resend", recipientEmail: recipient, subject, dealId };
  } catch {
    await db.update(opportunities).set({ outreachDeliveryStatus: "needs_review", updatedAt: new Date() }).where(eq(opportunities.id, dealId));
    return { sent: false, method: "resend", recipientEmail: recipient, subject, dealId, error: "Delivery is indeterminate. Review provider logs before manually retrying." };
  }
}
