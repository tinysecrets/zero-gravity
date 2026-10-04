import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { paymentRequests } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { ensureDbInitialized } from "@/lib/db-seed";
import { stripeLivemode } from "@/lib/automation-config";
import { PaymentEventError, recordStripePayment } from "@/lib/payment-settlement";
import { markSalesPaid } from "@/lib/sales-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !webhookSecret) return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  let event: Stripe.Event;
  try {
    const stripe = new Stripe(key);
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
    if (event.livemode !== stripeLivemode()) throw new PaymentEventError("Stripe event mode does not match the configured account mode.");
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature or payment mode." }, { status: 400 });
  }
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.expired"].includes(event.type)) {
    return NextResponse.json({ received: true });
  }
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.livemode !== event.livemode || session.mode !== "payment") {
    return NextResponse.json({ error: "Stripe session mode does not match the verified payment event." }, { status: 400 });
  }
  try {
    // Only authenticated provider events may touch the database. Initialization
    // never starts the engine or sends email as a webhook side effect.
    await ensureDbInitialized();
    if (event.type === "checkout.session.expired") {
      await db.update(paymentRequests).set({ status: "expired", updatedAt: new Date() }).where(and(
        eq(paymentRequests.providerSessionId, session.id), ne(paymentRequests.status, "paid"),
      ));
      return NextResponse.json({ received: true });
    }
    const result = await recordStripePayment(session);\n    if (result.paymentRecorded && result.livemode && result.opportunityId) await markSalesPaid(result.opportunityId);\n    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentEventError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Stripe payment recording failed:", error);
    // Database failures must be retriable (5xx), not misreported as bad signatures.
    return NextResponse.json({ error: "Payment recording failed. Stripe can safely retry this event." }, { status: 500 });
  }
}
