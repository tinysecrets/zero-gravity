import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { paymentRequests } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function moneyToCents(amount: number) {
  return Math.round(amount * 100);
}

function getOrigin(request: Request) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }
  return new URL(request.url).origin;
}

function buildReferenceCode() {
  return `INV-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
}

export async function GET(request: Request) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");
    const referenceCode = searchParams.get("reference");

    if (!sessionId && !referenceCode) {
      return NextResponse.json(
        { success: false, error: "A Stripe session ID or invoice reference is required." },
        { status: 400 }
      );
    }

    const records = await db
      .select()
      .from(paymentRequests)
      .where(
        sessionId && referenceCode
          ? or(
              eq(paymentRequests.providerSessionId, sessionId),
              eq(paymentRequests.referenceCode, referenceCode)
            )
          : sessionId
          ? eq(paymentRequests.providerSessionId, sessionId)
          : eq(paymentRequests.referenceCode, referenceCode!)
      )
      .limit(1);

    if (!records[0]) {
      return NextResponse.json({ success: false, error: "Payment request not found." }, { status: 404 });
    }

    const payment = records[0];
    return NextResponse.json({
      success: true,
      payment: {
        referenceCode: payment.referenceCode,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        serviceDescription: payment.serviceDescription,
        paidAt: payment.paidAt,
      },
    });
  } catch (error) {
    console.error("Payment status lookup failed:", error);
    return NextResponse.json({ success: false, error: "Unable to retrieve payment status." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const parsedAmount = Number(body.amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 999999.99) {
      return NextResponse.json(
        { success: false, error: "Enter a valid USD amount between $0.01 and $999,999.99." },
        { status: 400 }
      );
    }

    const opportunityId = body.dealId ? Number.parseInt(String(body.dealId), 10) : null;
    if (body.dealId && (!opportunityId || Number.isNaN(opportunityId))) {
      return NextResponse.json({ success: false, error: "The selected opportunity is invalid." }, { status: 400 });
    }

    const clientName = String(body.clientName || "Direct client").trim().slice(0, 180);
    const serviceDescription = String(body.serviceType || "Professional services").trim().slice(0, 500);
    const referenceCode = buildReferenceCode();
    const secretKey = process.env.STRIPE_SECRET_KEY;

    // Persist the request before contacting a provider. This is not a payment and never enters the cash ledger.
    const [paymentRequest] = await db
      .insert(paymentRequests)
      .values({
        opportunityId,
        referenceCode,
        provider: "stripe",
        status: secretKey ? "draft" : "provider_not_configured",
        amount: parsedAmount.toFixed(2),
        currency: "usd",
        clientName,
        serviceDescription,
        paymentMethod: "card",
      })
      .returning();

    if (!secretKey) {
      return NextResponse.json({
        success: true,
        providerConfigured: false,
        paymentRequest: {
          id: paymentRequest.id,
          referenceCode,
          status: "provider_not_configured",
          amount: parsedAmount.toFixed(2),
        },
        message:
          "Payment request saved, but Stripe is not connected. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable hosted checkout and verified settlement.",
      });
    }

    const stripe = new Stripe(secretKey);
    const origin = getOrigin(request);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: moneyToCents(parsedAmount),
            product_data: {
              name: serviceDescription,
              description: `Invoice ${referenceCode} · ${clientName}`,
            },
          },
        },
      ],
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=cancelled&reference=${referenceCode}`,
      client_reference_id: referenceCode,
      metadata: {
        paymentRequestId: String(paymentRequest.id),
        referenceCode,
        ...(opportunityId ? { opportunityId: String(opportunityId) } : {}),
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }

    await db
      .update(paymentRequests)
      .set({
        status: "checkout_created",
        providerSessionId: session.id,
        checkoutUrl: session.url,
        updatedAt: new Date(),
      })
      .where(eq(paymentRequests.id, paymentRequest.id));

    return NextResponse.json({
      success: true,
      providerConfigured: true,
      paymentRequest: {
        id: paymentRequest.id,
        referenceCode,
        status: "checkout_created",
        amount: parsedAmount.toFixed(2),
        checkoutUrl: session.url,
        provider: "stripe",
      },
      message: "Secure Stripe Checkout generated. Revenue will appear only after Stripe sends a verified payment event.",
    });
  } catch (error) {
    console.error("Checkout creation failed:", error);
    return NextResponse.json(
      { success: false, error: "Unable to create the secure checkout session." },
      { status: 500 }
    );
  }
}
