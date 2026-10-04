import { db } from "@/db";
import { opportunities } from "@/db/schema";
import { and, eq, lt, or, sql } from "drizzle-orm";

export type SalesStage = "contacted" | "followup_1" | "followup_2" | "followup_3" | "replied" | "opted_out" | "paid" | "closed";
export type ReplyDisposition = "positive" | "question" | "negative" | "unsubscribe" | "unknown";

export interface SalesState {
  stage?: SalesStage;
  followupCount: number;
  nextFollowupAt?: string | null;
  lastContactedAt?: string | null;
  lastInboundAt?: string | null;
  replyDisposition?: ReplyDisposition | null;
  optedOut?: boolean;
  stoppedReason?: string | null;
  lastInboundMessageId?: string | null;
}

const MAX_FOLLOWUPS = 3;
const FOLLOWUP_DELAYS_MS = [2, 4, 7].map((days) => days * 24 * 60 * 60 * 1000);

export function readSalesState(auditData: string | null | undefined): SalesState {
  try {
    const parsed = JSON.parse(auditData || "{}") as { sales?: Partial<SalesState> };
    return {
      followupCount: Math.max(0, Number(parsed.sales?.followupCount || 0)),
      stage: parsed.sales?.stage,
      nextFollowupAt: parsed.sales?.nextFollowupAt ?? null,
      lastContactedAt: parsed.sales?.lastContactedAt ?? null,
      lastInboundAt: parsed.sales?.lastInboundAt ?? null,
      replyDisposition: parsed.sales?.replyDisposition ?? null,
      optedOut: Boolean(parsed.sales?.optedOut),
      stoppedReason: parsed.sales?.stoppedReason ?? null,
      lastInboundMessageId: parsed.sales?.lastInboundMessageId ?? null,
    };
  } catch {
    return { followupCount: 0 };
  }
}

function withSalesState(auditData: string | null | undefined, sales: SalesState): string {
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(auditData || "{}") as Record<string, unknown>; } catch { /* replace malformed legacy metadata */ }
  return JSON.stringify({ ...parsed, sales });
}

export async function markOutreachSent(dealId: number, auditData: string | null | undefined, now = new Date()) {
  const current = readSalesState(auditData);
  const next = new Date(now.getTime() + FOLLOWUP_DELAYS_MS[current.followupCount] || now.getTime());
  const followupCount = current.followupCount;
  const sales: SalesState = {
    ...current,
    stage: followupCount === 0 ? "contacted" : (`followup_${followupCount}` as SalesStage),
    followupCount,
    lastContactedAt: now.toISOString(),
    nextFollowupAt: followupCount < MAX_FOLLOWUPS ? next.toISOString() : null,
    stoppedReason: null,
  };
  await db.update(opportunities).set({
    auditData: withSalesState(auditData, sales),
    updatedAt: now,
  }).where(eq(opportunities.id, dealId));
  return sales;
}

export async function claimDueFollowup(dealId: number, auditData: string | null | undefined, now = new Date()): Promise<SalesState | null> {
  const current = readSalesState(auditData);
  if (current.optedOut || current.replyDisposition || current.followupCount >= MAX_FOLLOWUPS || !current.nextFollowupAt) return null;
  const due = Date.parse(current.nextFollowupAt);
  if (!Number.isFinite(due) || due > now.getTime()) return null;
  const nextCount = current.followupCount + 1;
  const claimed: SalesState = { ...current, stage: `followup_${nextCount}` as SalesStage, followupCount: nextCount, nextFollowupAt: null };
  const result = await db.update(opportunities).set({
    auditData: withSalesState(auditData, claimed),
    outreachDeliveryStatus: "followup_sending",
    updatedAt: now,
  }).where(and(
    eq(opportunities.id, dealId),
    eq(opportunities.outreachDeliveryStatus, "sent"),
    sql`(${opportunities.auditData}::jsonb->'sales'->>'nextFollowupAt') = ${current.nextFollowupAt}`,
  )).returning({ id: opportunities.id });
  return result.length ? claimed : null;
}

export async function stopSalesForReply(dealId: number, disposition: ReplyDisposition, messageId?: string | null, now = new Date()) {
  const [deal] = await db.select({ auditData: opportunities.auditData }).from(opportunities).where(eq(opportunities.id, dealId));
  if (!deal) return false;
  const current = readSalesState(deal.auditData);
  const optedOut = disposition === "unsubscribe";
  const sales: SalesState = {
    ...current,
    stage: optedOut ? "opted_out" : "replied",
    replyDisposition: disposition,
    optedOut,
    nextFollowupAt: null,
    lastInboundAt: now.toISOString(),
    lastInboundMessageId: messageId || null,
    stoppedReason: optedOut ? "recipient_opted_out" : "recipient_replied",
  };
  await db.update(opportunities).set({
    status: optedOut ? "closed" : "outreach_sent",
    outreachDeliveryStatus: optedOut ? "suppressed" : "reply_received",
    auditData: withSalesState(deal.auditData, sales),
    updatedAt: now,
  }).where(eq(opportunities.id, dealId));
  return true;
}

export function classifyReply(text: string): ReplyDisposition {
  const value = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (/\b(unsubscribe|remove me|stop emailing|do not contact|don't contact|no more emails|opt out)\b/.test(value)) return "unsubscribe";
  if (/\b(yes|interested|sounds good|let's talk|lets talk|book|schedule|call me|how much|send details|tell me more|interested)\b/.test(value)) return "positive";
  if (/\b(what do you mean|how does|can you|why|when|where|question|details|clarify)\b/.test(value)) return "question";
  if (/\b(no thanks|not interested|pass|remove|already have|not a fit|no thank you)\b/.test(value)) return "negative";
  return "unknown";
}

export function followupMessage(original: string, count: number): string {
  const subject = original.match(/^Subject:\s*(.+)$/im)?.[1]?.trim() || "Follow-up";
  const body = [
    count === 1 ? "Following up on the public DNS observations I sent over." :
    count === 2 ? "One last follow-up on the DNS review below." :
    "Final follow-up on this review; I will close the loop after this message.",
    "",
    "If this is not relevant, reply “unsubscribe” and I will stop further offers.",
  ].join("\n");
  return `Subject: Re: ${subject}\n\n${body}`;
}

export const MAX_SALES_FOLLOWUPS = MAX_FOLLOWUPS;


export async function markSalesPaid(dealId: number, now = new Date()) {
  const [deal] = await db.select({ auditData: opportunities.auditData }).from(opportunities).where(eq(opportunities.id, dealId));
  if (!deal) return false;
  const current = readSalesState(deal.auditData);
  const sales: SalesState = {
    ...current,
    stage: "paid",
    nextFollowupAt: null,
    stoppedReason: "payment_verified",
  };
  await db.update(opportunities).set({
    auditData: withSalesState(deal.auditData, sales),
    updatedAt: now,
  }).where(eq(opportunities.id, dealId));
  return true;
}
