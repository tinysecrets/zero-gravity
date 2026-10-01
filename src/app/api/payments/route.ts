import { NextResponse } from "next/server";
import { db } from "@/db";
import { opportunities, paymentRequests } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { amountToCents, createPaymentCheckout } from "@/lib/payment-checkout";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const referenceCode = searchParams.get("reference");
  if (!sessionId && !referenceCode) {
    return NextResponse.json({ success: false, error: "A Stripe session ID or invoice reference is required." }, { status: 400 });
  }
  try {
    await ensureDbInitialized();
    // A public session lookup must never fall back to a guessable invoice reference.
    const [payment] = await db.select().from(paymentRequests).where(sessionId
      ? eq(paymentRequests.providerSessionId, sessionId)
      : eq(paymentRequests.referenceCode, referenceCode!)).limit(1);
    if (!payment) return NextResponse.json({ success: false, error: "Payment request not found." }, { status: 404 });
    return NextResponse.json({
      success: true,
      payment: {
        referenceCode: payment.referenceCode, status: payment.status, amount: payment.amount,
        currency: payment.currency, serviceDescription: payment.serviceDescription,
        paidAt: payment.paidAt, livemode: payment.livemode,
      },
    });
  } catch (error) {
    console.error("Payment status lookup failed:", error);
    return NextResponse.json({ success: false, error: "Unable to retrieve payment status." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let amount: number;
  let opportunityId: number | null;
  let clientName: string;
  let serviceDescription: string;
  try {
    const body = await request.json();
    amount = Number(body.amount);
    amountToCents(amount);
    opportunityId = body.dealId == null || body.dealId === "" ? null : Number(body.dealId);
    if (opportunityId !== null && (!Number.isSafeInteger(opportunityId) || opportunityId <= 0)) throw new Error("The selected opportunity is invalid.");
    clientName = String(body.clientName || "Direct client").trim().slice(0, 180);
    serviceDescription = String(body.serviceType || "Professional services").trim().slice(0, 500);
    if (!clientName || !serviceDescription) throw new Error("Client name and service description are required.");
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Invalid payment request." }, { status: 400 });
  }
  try {
    await ensureDbInitialized();
    if (opportunityId) {
      const [deal] = await db.select({ id: opportunities.id }).from(opportunities).where(eq(opportunities.id, opportunityId));
      if (!deal) return NextResponse.json({ success: false, error: "Opportunity not found." }, { status: 404 });
    }
    const result = await createPaymentCheckout({ opportunityId, amount, clientName, serviceDescription, requestUrl: request.url });
    return NextResponse.json({
      success: true, ...result,
      message: result.providerConfigured
        ? "Secure Stripe Checkout generated. No charge occurs until the customer chooses to pay; only signed live payment events count as revenue."
        : "Invoice draft saved. Configure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable verified customer payments.",
    });
  } catch (error) {
    console.error("Checkout creation failed:", error);
    return NextResponse.json({ success: false, error: "Unable to create checkout. Check database, Stripe, webhook, and public APP_URL settings." }, { status: 503 });
  }
}
