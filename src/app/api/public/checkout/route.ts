import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contactLeads } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { createPaymentCheckout } from "@/lib/payment-checkout";
import { stripeLivemode } from "@/lib/automation-config";
import { allowPublicSubmission, validEmail, validRequestedDomain } from "@/lib/public-request-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const PRICE_USD = 149;
const SERVICE_NAME = "Domain Signals Review — one authorized domain";

export async function POST(request: Request) {
  if (!allowPublicSubmission(request, "checkout")) return NextResponse.json({ success: false, error: "Request rejected. Refresh the page and try again." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  let name = "", email = "", domain = "";
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ success: false, error: "Unable to start checkout." }, { status: 400 });
    name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    domain = typeof body.domain === "string" ? validRequestedDomain(body.domain) : "";
    if (name.length < 2 || !validEmail(email) || !domain) throw new Error("Enter your name, a valid email and an authorized domain.");
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Invalid order details." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ success: false, error: "Secure checkout is temporarily unavailable. Please use the inquiry form." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  try {
    const live = stripeLivemode();
    if (process.env.VERCEL_ENV === "production" && !live) return NextResponse.json({ success: false, error: "Live checkout is not enabled. Please use the inquiry form." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    await ensureDbInitialized();
    const [lead] = await db.insert(contactLeads).values({ kind: "checkout", status: "checkout_pending", name, email, domain, message: "Requested " + SERVICE_NAME + " at $" + PRICE_USD + " USD.", notificationStatus: "not_requested" }).returning({ id: contactLeads.id });
    try {
      const result = await createPaymentCheckout({ amount: PRICE_USD, clientName: name, customerEmail: email, serviceDescription: SERVICE_NAME + " (" + domain + ")", requestUrl: request.url });
      if (!result.providerConfigured || !result.paymentRequest.checkoutUrl) {
        await db.update(contactLeads).set({ status: "checkout_unavailable", updatedAt: new Date() }).where(eq(contactLeads.id, lead.id));
        return NextResponse.json({ success: false, error: "Checkout could not be created. Your inquiry was saved; use the inquiry form to arrange the review." }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
      await db.update(contactLeads).set({ status: "checkout_created", paymentReference: result.paymentRequest.referenceCode, updatedAt: new Date() }).where(eq(contactLeads.id, lead.id));
      return NextResponse.json({ success: true, checkoutUrl: result.paymentRequest.checkoutUrl, referenceCode: result.paymentRequest.referenceCode, amount: PRICE_USD, currency: "usd" }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      await db.update(contactLeads).set({ status: "checkout_error", updatedAt: new Date() }).where(eq(contactLeads.id, lead.id));
      console.error("Public checkout creation failed:", error instanceof Error ? error.message : "unknown error");
      return NextResponse.json({ success: false, error: "Checkout could not be created. Your inquiry was saved; use the inquiry form to arrange the review." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  } catch (error) {
    console.error("Public checkout initialization failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ success: false, error: "Secure checkout is temporarily unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
