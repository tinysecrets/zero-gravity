import Stripe from "stripe";
import { db } from "@/db";
import { paymentRequests } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { appOrigin, stripeLivemode } from "./automation-config";

export function amountToCents(amount: number | string): number {
  const value = Number(amount);
  const cents = Math.round(value * 100);
  if (!Number.isFinite(value) || cents < 1 || cents > 99_999_999 || Math.abs(value * 100 - cents) > 0.000001) {
    throw new Error("Enter a USD amount between $0.01 and $999,999.99 with at most two decimal places.");
  }
  return cents;
}

export async function createPaymentCheckout(input: {
  opportunityId?: number | null;
  amount: number | string;
  clientName: string;
  serviceDescription: string;
  requestUrl?: string;
  reusePending?: boolean;
}) {
  const cents = amountToCents(input.amount);
  const key = process.env.STRIPE_SECRET_KEY;
  const providerConfigured = Boolean(key && process.env.STRIPE_WEBHOOK_SECRET);
  const livemode = key ? stripeLivemode() : false;
  // Validate the URL before saving an enabled invoice. Autonomous calls have no
  // request origin and must use a public configured/Vercel URL, never localhost.
  const origin = providerConfigured ? appOrigin(input.requestUrl) : null;
  let paymentRequest: typeof paymentRequests.$inferSelect | undefined;
  if (input.reusePending && input.opportunityId) {
    [paymentRequest] = await db.select().from(paymentRequests).where(and(
      eq(paymentRequests.opportunityId, input.opportunityId),
      inArray(paymentRequests.status, ["draft", "provider_not_configured", "checkout_created"]),
    )).orderBy(desc(paymentRequests.createdAt), desc(paymentRequests.id)).limit(1);
    if (paymentRequest) {
      if (amountToCents(paymentRequest.amount) !== cents) throw new Error("The existing invoice has a different amount. Review it manually.");
      if (paymentRequest.providerSessionId && paymentRequest.livemode !== livemode) {
        throw new Error("The existing invoice is in a different Stripe mode. Review it manually.");
      }
      if (paymentRequest.checkoutUrl && paymentRequest.status === "checkout_created") {
        return { providerConfigured: true, paymentRequest, created: false };
      }
    }
  }
  if (!paymentRequest) {
    [paymentRequest] = await db.insert(paymentRequests).values({
      opportunityId: input.opportunityId || null,
      referenceCode: `INV-${crypto.randomUUID().split("-")[0].toUpperCase()}`,
      provider: "stripe",
      livemode,
      status: providerConfigured ? "draft" : "provider_not_configured",
      amount: (cents / 100).toFixed(2),
      currency: "usd",
      clientName: input.clientName.trim().slice(0, 180),
      serviceDescription: input.serviceDescription.trim().slice(0, 500),
      paymentMethod: "card",
    }).returning();
  }
  if (!providerConfigured || !key || !origin) {
    return { providerConfigured: false, paymentRequest, created: false };
  }

  await db.update(paymentRequests).set({ livemode, status: "draft", updatedAt: new Date() })
    .where(eq(paymentRequests.id, paymentRequest.id));
  const stripe = new Stripe(key, { timeout: 15_000, maxNetworkRetries: 1 });
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: cents,
        product_data: {
          name: paymentRequest.serviceDescription,
          description: `Invoice ${paymentRequest.referenceCode} · ${paymentRequest.clientName}`,
        },
      },
    }],
    success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?payment=cancelled&reference=${paymentRequest.referenceCode}`,
    client_reference_id: paymentRequest.referenceCode,
    metadata: {
      paymentRequestId: String(paymentRequest.id),
      referenceCode: paymentRequest.referenceCode,
      ...(paymentRequest.opportunityId ? { opportunityId: String(paymentRequest.opportunityId) } : {}),
    },
  }, {
    // A retry reuses the saved invoice and cannot create a second provider session.
    idempotencyKey: `checkout-${paymentRequest.referenceCode}`,
  });
  if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
  [paymentRequest] = await db.update(paymentRequests).set({
    livemode,
    status: "checkout_created",
    providerSessionId: session.id,
    checkoutUrl: session.url,
    updatedAt: new Date(),
  }).where(eq(paymentRequests.id, paymentRequest.id)).returning();
  return { providerConfigured: true, paymentRequest, created: true };
}
