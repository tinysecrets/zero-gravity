import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { financialTransactions, opportunities, paymentRequests } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function transactionTypeForVector(vector: string) {
  if (vector === "technical_leak_audit") return "fix_bounty";
  if (vector === "micro_sponsorship") return "sponsorship_brokerage";
  if (vector === "public_micro_purchase") return "finder_fee";
  return "rev_share_commission";
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  try {
    await ensureDbInitialized();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
    }

    const stripe = new Stripe(secretKey);
    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (
      event.type !== "checkout.session.completed" &&
      event.type !== "checkout.session.async_payment_succeeded"
    ) {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true, status: "awaiting_payment" });
    }

    const paymentRequestId = Number.parseInt(session.metadata?.paymentRequestId || "", 10);
    if (!paymentRequestId || Number.isNaN(paymentRequestId)) {
      console.error("Missing paymentRequestId in Stripe Checkout metadata", session.id);
      return NextResponse.json({ error: "Payment request metadata is missing." }, { status: 400 });
    }

    const [paymentRequest] = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, paymentRequestId));

    if (!paymentRequest) {
      return NextResponse.json({ error: "Matching payment request not found." }, { status: 404 });
    }

    // Stripe retries webhooks. A completed request is safe to acknowledge without duplicating revenue.
    if (paymentRequest.status === "paid" || paymentRequest.transactionId) {
      return NextResponse.json({ received: true, idempotent: true });
    }

    let transactionType = "rev_share_commission";
    if (paymentRequest.opportunityId) {
      const [opportunity] = await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.id, paymentRequest.opportunityId));
      if (opportunity) {
        transactionType = transactionTypeForVector(opportunity.vector);
      }
    }

    const [transaction] = await db
      .insert(financialTransactions)
      .values({
        opportunityId: paymentRequest.opportunityId,
        transactionType,
        amount: paymentRequest.amount,
        paymentMethod: "Stripe Checkout",
        description: `Stripe settlement ${session.id} · ${paymentRequest.clientName} · ${paymentRequest.serviceDescription} · ${paymentRequest.referenceCode}`,
        verified: true,
      })
      .returning();

    await db
      .update(paymentRequests)
      .set({
        status: "paid",
        transactionId: transaction.id,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentRequests.id, paymentRequest.id));

    if (paymentRequest.opportunityId) {
      const [opportunity] = await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.id, paymentRequest.opportunityId));

      if (opportunity) {
        const updatedRevenue = (
          Number.parseFloat(opportunity.realizedRevenue || "0") +
          Number.parseFloat(paymentRequest.amount)
        ).toFixed(2);

        await db
          .update(opportunities)
          .set({
            status: "revenue_collected",
            realizedRevenue: updatedRevenue,
            updatedAt: new Date(),
          })
          .where(eq(opportunities.id, paymentRequest.opportunityId));
      }
    }

    return NextResponse.json({ received: true, settled: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return NextResponse.json({ error: "Webhook verification failed." }, { status: 400 });
  }
}
