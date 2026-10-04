import Stripe from "stripe";
import { db } from "@/db";
import { opportunities, revenueEvents, paymentRequests } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { stripeLivemode } from "./automation-config";
import { amountToCents } from "./payment-checkout";
import { isVerifiedBusinessContact } from "./contact-finder";
import { publicBusinessDomain } from "./public-domain";
import { followupMessage, markOutreachSent, readSalesState } from "./sales-state";

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
export async function sendOutreach(dealId: number, options: {
  authorized: boolean;
  shouldStop?: () => Promise<boolean>;
  mode?: "initial" | "followup";
} = { authorized: false }): Promise<OutreachResult> {
  const [deal] = await db.select().from(opportunities).where(eq(opportunities.id, dealId));
  const subject = deal?.outreachMessage?.match(/^Subject:\s*(.+)$/im)?.[1]?.trim() || "Email-authentication review";
  const skipped = (error: string): OutreachResult => ({ sent: false, method: "skipped", recipientEmail: deal?.targetEmail || "", subject, dealId, error });
  if (!options.authorized) return skipped("Explicit autonomous outreach authorization is required.");
  if (!deal?.targetEmail || !deal.outreachMessage) return skipped("A verified contact and outreach draft are required.");
  const mode = options.mode || "initial";
  if (mode === "initial" && deal.outreachDeliveryStatus !== "draft") return skipped(`Outreach is ${deal.outreachDeliveryStatus}; automatic resend withheld. Review delivery before retrying.`);
  if (mode === "followup" && deal.outreachDeliveryStatus !== "followup_sending") return skipped(`Follow-up claim is not active (${deal.outreachDeliveryStatus}).`);
  const sales = readSalesState(deal.auditData);
  if (sales.optedOut || sales.replyDisposition || sales.followupCount >= 3) return skipped("Sales follow-up is stopped.");
  const key = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  const replyTo = process.env.OUTREACH_REPLY_TO;
  const postalAddress = process.env.OUTREACH_POSTAL_ADDRESS;
  if (!key || !from || !replyTo || !/^\S+@\S+\.\S+$/.test(from || "") || !/^\S+@\S+\.\S+$/.test(replyTo || "") || !postalAddress?.trim() ||
    process.env.OUTREACH_COMPLIANCE_CONFIRMED !== "true") {
    return skipped("Configure the verified sender and confirm the monitored reply/opt-out mailbox and real business postal address.");
  }
  const domain = deal.autonomousDomain || publicBusinessDomain(deal.targetCompany);
  let contact: unknown;
  try { contact = JSON.parse(deal.auditData || "{}").contactEvidence; } catch { /* Unverified legacy metadata. */ }
  if (!domain || !isVerifiedBusinessContact(contact, domain) || contact.email !== deal.targetEmail) {
    return skipped("The recipient needs public business website and MX evidence; guessed addresses are never sent offers.");
  }
  const [invoice] = await db.select().from(paymentRequests).where(and(
    eq(paymentRequests.opportunityId, dealId), eq(paymentRequests.status, "checkout_created"),
  )).orderBy(desc(paymentRequests.createdAt), desc(paymentRequests.id)).limit(1);
  if (!invoice?.checkoutUrl || !invoice.providerSessionId) return skipped("A verified-mode checkout link is required before outreach.");
  try {
    if (!process.env.STRIPE_SECRET_KEY || invoice.livemode !== stripeLivemode()) return skipped("Checkout mode does not match the configured Stripe mode.");
    const checkout = new URL(invoice.checkoutUrl);
    if (checkout.protocol !== "https:" || checkout.username || checkout.password) {
      return skipped("A valid HTTPS Stripe checkout URL is required.");
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 10_000, maxNetworkRetries: 0 });
    const session = await stripe.checkout.sessions.retrieve(invoice.providerSessionId);
    if (session.status !== "open" || session.mode !== "payment" || session.id !== invoice.providerSessionId ||
      session.livemode !== invoice.livemode || session.url !== invoice.checkoutUrl ||
      session.client_reference_id !== invoice.referenceCode || session.amount_total !== amountToCents(invoice.amount) ||
      session.currency !== invoice.currency || session.metadata?.paymentRequestId !== String(invoice.id)) {
      return skipped("Checkout is not open or does not match the saved invoice; outreach withheld.");
    }
  } catch { return skipped("Checkout could not be verified with Stripe; no email was attempted."); }
  const recipient = invoice.livemode ? deal.targetEmail : process.env.OUTREACH_TEST_RECIPIENT;
  if (!recipient || !/^\S+@\S+\.\S+$/.test(recipient)) return skipped("Set OUTREACH_TEST_RECIPIENT for test-mode outreach; real prospects are never sent test invoices.");
  if (!invoice.livemode && (recipient.toLowerCase() === deal.targetEmail.toLowerCase() ||
    publicBusinessDomain(recipient.split("@")[1]) === domain)) {
    return skipped("The test recipient must be an operator-owned inbox, not a prospect address or domain.");
  }
  if (!await verifiedSender(key, from)) return skipped("Resend credentials and the sender's verified sending domain could not be confirmed; no email was attempted.");
  if (await options.shouldStop?.()) return skipped("Stop requested before sending outreach.");

  const [claimed] = await db.update(opportunities).set({
    outreachDeliveryStatus: "sending", outreachAttemptedAt: new Date(), updatedAt: new Date(),
  }).where(and(eq(opportunities.id, dealId), eq(opportunities.outreachDeliveryStatus, mode === "followup" ? "followup_sending" : "draft"))).returning({ id: opportunities.id });
  if (!claimed) return skipped("Another worker already claimed this email.");
  const message = mode === "followup" ? followupMessage(deal.outreachMessage, sales.followupCount + 1) : deal.outreachMessage;
  const body = [
    message.replace(/^Subject:.*$/m, "").trim(),
    "", "Customer-authorized card checkout:", invoice.checkoutUrl,
    "", "---", `From: ${from}`, postalAddress,
    `To opt out of further offers, reply \"unsubscribe\" to ${replyTo}.`,
  ].join("\n");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `outreach-${dealId}-${mode}-${sales.followupCount}` },
      body: JSON.stringify({ from, reply_to: replyTo, to: [recipient], subject: mode === "followup" ? `Re: ${subject}` : (invoice.livemode ? subject : `[TEST] ${subject}`), text: body }),
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
    await markOutreachSent(dealId, deal.auditData);
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

// Read-only provider verification. API-key presence or a syntactically valid
// FROM_EMAIL alone is never proof of a verified business sender.
async function verifiedSender(key: string, from: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return false;
    const result = await response.json() as { data?: Array<{ name?: string; status?: string; capabilities?: { sending?: string } }> };
    const senderDomain = from.split("@")[1].toLowerCase();
    return Array.isArray(result.data) && result.data.some((domain) =>
      domain.name?.toLowerCase() === senderDomain && domain.status === "verified" && domain.capabilities?.sending === "enabled");
  } catch { return false; }
}
