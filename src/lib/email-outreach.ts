import { db } from "@/db";
import { opportunities, revenueEvents, paymentRequests } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Email Outreach — actually delivers the pitch to the prospect
//
// Uses Resend (free: 3,000 emails/month, instant API key).
// Set RESEND_API_KEY and FROM_EMAIL in your environment.
//
// If Resend is not configured, sends nothing but logs the attempt
// so the feedback loop still records it.
// ---------------------------------------------------------------------------

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "outreach@resend.dev";

export interface OutreachResult {
  sent: boolean;
  method: "resend" | "skipped";
  recipientEmail: string;
  subject: string;
  dealId: number;
  error?: string;
}

/**
 * Send outreach email for a deal.
 *
 * Called by the autonomous engine after creating a deal and generating
 * outreach copy. If a Stripe checkout URL exists, it's included in the email.
 */
export async function sendOutreach(dealId: number): Promise<OutreachResult> {
  const [deal] = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, dealId));

  if (!deal) {
    return {
      sent: false,
      method: "skipped",
      recipientEmail: "",
      subject: "",
      dealId,
      error: "Deal not found.",
    };
  }

  if (!deal.targetEmail) {
    return {
      sent: false,
      method: "skipped",
      recipientEmail: "",
      subject: deal.title,
      dealId,
      error: "No email address on deal.",
    };
  }

  const subject = extractSubject(deal.outreachMessage || "");
  const checkoutUrl = await getCheckoutUrl(dealId);
  const body = buildEmailBody(deal, checkoutUrl);

  // Log the outreach attempt in the feedback loop regardless of send success
  await db.insert(revenueEvents).values({
    opportunityId: deal.id,
    industry: deal.targetNiche || null,
    offerTier: (deal as Record<string, unknown>).offerTier as string || "remediation",
    acquisitionSource: (deal as Record<string, unknown>).acquisitionSource as string || "manual",
    amount: deal.potentialValue || "0",
    eventType: "outreach_sent",
    channel: "email",
  }).catch(() => { /* non-critical */ });

  if (!RESEND_API_KEY) {
    return {
      sent: false,
      method: "skipped",
      recipientEmail: deal.targetEmail,
      subject,
      dealId,
      error: "RESEND_API_KEY not configured.",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [deal.targetEmail],
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return {
        sent: false,
        method: "resend",
        recipientEmail: deal.targetEmail,
        subject,
        dealId,
        error: `Resend ${res.status}: ${errBody}`,
      };
    }

    // Update deal status to outreach_sent
    await db
      .update(opportunities)
      .set({ status: "outreach_sent", updatedAt: new Date() })
      .where(eq(opportunities.id, dealId));

    return {
      sent: true,
      method: "resend",
      recipientEmail: deal.targetEmail,
      subject,
      dealId,
    };
  } catch (err) {
    return {
      sent: false,
      method: "resend",
      recipientEmail: deal.targetEmail,
      subject,
      dealId,
      error: err instanceof Error ? err.message : "Send failed.",
    };
  }
}

/**
 * Send outreach for all deals in "audited" status that have an email.
 * Called by the autonomous engine after creating deals.
 */
export async function sendPendingOutreach(): Promise<OutreachResult[]> {
  const pendingDeals = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.status, "audited"));

  const results: OutreachResult[] = [];

  for (const deal of pendingDeals) {
    if (deal.targetEmail) {
      const result = await sendOutreach(deal.id);
      results.push(result);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Email body construction
// ---------------------------------------------------------------------------

function extractSubject(outreachMessage: string): string {
  // Try to extract "Subject: ..." from the outreach copy
  const subjectMatch = outreachMessage.match(/^Subject:\s*(.+)$/im);
  if (subjectMatch) return subjectMatch[1].trim();

  // Fallback
  return "Quick question regarding your domain deliverability";
}

function buildEmailBody(deal: {
  outreachMessage: string | null;
  title: string;
  potentialValue: string;
  contractTerms: string | null;
  targetCompany: string;
}, checkoutUrl?: string): string {
  const parts: string[] = [];

  // The outreach script is the main body
  if (deal.outreachMessage) {
    // Strip the "Subject: ..." line if present
    const body = deal.outreachMessage.replace(/^Subject:.*$/m, "").trim();
    parts.push(body);
  }

  // Attach the Stripe checkout link if available
  if (checkoutUrl) {
    parts.push("");
    parts.push("— Pay securely by card:");
    parts.push(checkoutUrl);
  }

  // Signature
  parts.push("");
  parts.push("---");
  parts.push("Sent by Zero Gravity Autonomous Revenue Engine");

  return parts.join("\n");
}

async function getCheckoutUrl(dealId: number): Promise<string | undefined> {
  try {
    const [pr] = await db
      .select({ url: paymentRequests.checkoutUrl })
      .from(paymentRequests)
      .where(eq(paymentRequests.opportunityId, dealId));
    return pr?.url || undefined;
  } catch {
    return undefined;
  }
}