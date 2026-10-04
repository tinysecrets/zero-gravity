import type Stripe from "stripe";
import { db } from "@/db";
import { financialTransactions, opportunities, paymentRequests, revenueEvents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { amountToCents } from "./payment-checkout";

export class PaymentEventError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

export type StripePaymentSettlementResult =
  | {
      received: true;
      status: "awaiting_payment";
      paymentRecorded: false;
      livemode: boolean;
    }
  | {
      received: true;
      idempotent: true;
      paymentRecorded: false;
      livemode: boolean;
    }
  | {
      received: true;
      paymentRecorded: true;
      livemode: boolean;
      opportunityId: number | null;
      amount: string;
      currency: string;
      referenceCode?: string;
      clientName?: string;
      serviceDescription?: string;
    };

function transactionTypeForVector(vector?: string) {
  if (vector === "technical_leak_audit") return "fix_bounty";
  if (vector === "micro_sponsorship") return "sponsorship_brokerage";
  if (vector === "public_micro_purchase") return "finder_fee";
  return "rev_share_commission";
}

// A confirmed card payment is not a bank payout. Record receipt atomically and
// exactly once, including when Stripe concurrently retries different paid events.
export async function recordStripePayment(session: Stripe.Checkout.Session): Promise<StripePaymentSettlementResult> {
  if (session.payment_status !== "paid") return { received: true, status: "awaiting_payment", paymentRecorded: false, livemode: session.livemode };
  const rawId = session.metadata?.paymentRequestId || "";
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id <= 0) throw new PaymentEventError("Payment request metadata is missing or invalid.");
  return db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(paymentRequests).where(eq(paymentRequests.id, id)).limit(1).for("update");
    if (!invoice) throw new PaymentEventError("Matching payment request not found.", 404);
    if (invoice.providerSessionId !== session.id || invoice.referenceCode !== session.client_reference_id ||
      amountToCents(invoice.amount) !== session.amount_total || invoice.currency !== session.currency ||
      invoice.livemode !== session.livemode) {
      throw new PaymentEventError("Stripe session, invoice reference, amount, currency, or payment mode does not match the saved invoice.");
    }
    if (invoice.status === "paid" || invoice.transactionId) return { received: true, idempotent: true, paymentRecorded: false, livemode: session.livemode };

    if (!session.livemode) {
      // Test card events confirm the test invoice only; never contaminate cash metrics.
      await tx.update(paymentRequests).set({ status: "paid", paidAt: new Date(), updatedAt: new Date() }).where(eq(paymentRequests.id, id));
      return { received: true, paymentRecorded: true, livemode: false, opportunityId: invoice.opportunityId, amount: invoice.amount, currency: invoice.currency, referenceCode: invoice.referenceCode, clientName: invoice.clientName, serviceDescription: invoice.serviceDescription };
    }

    const [deal] = invoice.opportunityId ? await tx.select().from(opportunities).where(eq(opportunities.id, invoice.opportunityId)) : [];
    const [receipt] = await tx.insert(financialTransactions).values({
      opportunityId: invoice.opportunityId,
      transactionType: transactionTypeForVector(deal?.vector), amount: invoice.amount,
      paymentMethod: "Stripe Checkout",
      description: `Stripe payment ${session.id} · ${invoice.clientName} · ${invoice.serviceDescription} · ${invoice.referenceCode}. Bank payout is managed in Stripe.`,
      verified: true,
    }).returning();
    await tx.update(paymentRequests).set({
      status: "paid", transactionId: receipt.id, paidAt: new Date(), updatedAt: new Date(),
    }).where(eq(paymentRequests.id, id));
    if (deal) {
      // Database arithmetic also protects against different invoices paid concurrently.
      await tx.update(opportunities).set({
        status: "revenue_collected", realizedRevenue: sql`${opportunities.realizedRevenue} + ${invoice.amount}::numeric`, updatedAt: new Date(),
      }).where(eq(opportunities.id, deal.id));
      await tx.insert(revenueEvents).values({
        opportunityId: deal.id, transactionId: receipt.id, industry: deal.targetNiche,
        offerTier: deal.offerTier, acquisitionSource: deal.acquisitionSource, amount: invoice.amount,
        eventType: "payment_verified",
      });
    }
    return { received: true, paymentRecorded: true, livemode: true, opportunityId: invoice.opportunityId, amount: invoice.amount, currency: invoice.currency, referenceCode: invoice.referenceCode, clientName: invoice.clientName, serviceDescription: invoice.serviceDescription };
  });
}
