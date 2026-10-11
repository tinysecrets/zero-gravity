import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contactLeads } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { allowPublicSubmission, validEmail, validRequestedDomain } from "@/lib/public-request-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!allowPublicSubmission(request, "contact")) return NextResponse.json({ success: false, error: "Request rejected. Refresh the page and try again." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  let name = "", email = "", domain = "", message = "";
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    domain = typeof body.domain === "string" ? validRequestedDomain(body.domain) : "";
    message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
    if (name.length < 2 || !validEmail(email) || !domain || message.length < 3) throw new Error("Please enter a name, valid email, domain and short message.");
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Invalid inquiry." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    await ensureDbInitialized();
    const [lead] = await db.insert(contactLeads).values({ kind: "contact", status: "new", name, email, domain, message, notificationStatus: "pending" }).returning({ id: contactLeads.id });
    let notificationStatus = "not_configured";
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.FROM_EMAIL;
    const to = process.env.SALES_INBOX_EMAIL || process.env.OUTREACH_REPLY_TO;
    if (apiKey && from && to) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json", "Idempotency-Key": "zg-contact-" + lead.id },
          body: JSON.stringify({ from, to: [to], subject: "New Zero Gravity service inquiry", text: "A new inquiry was saved in the private lead inbox.\n\nName: " + name + "\nEmail: " + email + "\nDomain: " + domain + "\nMessage:\n" + message + "\n\nLead ID: " + lead.id }),
        });
        notificationStatus = response.ok ? "sent" : "failed";
      } catch { notificationStatus = "failed"; }
    }
    await db.update(contactLeads).set({ notificationStatus, updatedAt: new Date() }).where(eq(contactLeads.id, lead.id));
    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Public inquiry save failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ success: false, error: "Inquiry storage is temporarily unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
