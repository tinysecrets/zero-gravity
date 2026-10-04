import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/db";
import { opportunities, revenueEvents } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { and, eq, inArray } from "drizzle-orm";
import { classifyReply, stopSalesForReply } from "@/lib/sales-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ResendEvent = {
  type?: string;
  data?: { email_id?: string; from?: string; to?: string[]; subject?: string; message_id?: string };
};

function senderEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim().toLowerCase();
}

async function verifyInbound(raw: string, request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) throw new Error("RESEND_WEBHOOK_SECRET is not configured.");
  const resend = new Resend(process.env.RESEND_API_KEY || "");
  return resend.webhooks.verify({
    payload: raw,
    headers: {
      id: request.headers.get("svix-id") || "",
      timestamp: request.headers.get("svix-timestamp") || "",
      signature: request.headers.get("svix-signature") || "",
    },
    webhookSecret: secret,
  }) as ResendEvent;
}

async function receivedContent(emailId: string): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "";
  const response = await fetch(`https://api.resend.com/emails/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return "";
  const data = await response.json() as { text?: string | null; html?: string | null };
  return String(data.text || data.html || "").replace(/<[^>]+>/g, " ").slice(0, 20_000);
}

export async function POST(request: Request) {
  const raw = await request.text();
  let event: ResendEvent;
  try {
    event = await verifyInbound(raw, request);
  } catch {
    return NextResponse.json({ error: "Invalid Resend webhook signature." }, { status: 400 });
  }
  if (event.type !== "email.received" || !event.data?.from) return NextResponse.json({ received: true });

  try {
    await ensureDbInitialized();
    const from = senderEmail(event.data.from);
    const content = event.data.email_id ? await receivedContent(event.data.email_id) : "";
    const disposition = classifyReply([event.data.subject || "", content].join(" "));
    const [deal] = await db.select().from(opportunities).where(and(
      eq(opportunities.targetEmail, from),
      inArray(opportunities.outreachDeliveryStatus, ["sent", "sending", "followup_sending"]),
    )).limit(1);
    if (!deal) return NextResponse.json({ received: true, matched: false });

    await stopSalesForReply(deal.id, disposition, event.data.message_id || event.data.email_id);
    await db.insert(revenueEvents).values({
      opportunityId: deal.id, industry: deal.targetNiche, offerTier: deal.offerTier,
      acquisitionSource: deal.acquisitionSource, amount: deal.potentialValue,
      eventType: disposition === "unsubscribe" ? "outreach_opt_out" : "outreach_reply", channel: "email",
    });
    return NextResponse.json({ received: true, matched: true, disposition });
  } catch (error) {
    console.error("Inbound reply processing failed:", error);
    return NextResponse.json({ error: "Reply processing failed; Resend can retry the webhook." }, { status: 500 });
  }
}
