import { runDomainAudit, type AuditResult } from "./audit-engine";
import { sendOutreach } from "./email-outreach";
import { findContact, isVerifiedBusinessContact } from "./contact-finder";
import { acquireFromCTLogs, type AcquisitionResult } from "./prospect-acquisition";
import { publicBusinessDomain } from "./public-domain";
import { createPaymentCheckout } from "./payment-checkout";
import { CYCLE_BUDGET_MS, defaultCycleConfig, parseCycleConfig, type CycleConfig } from "./automation-config";
import { db } from "@/db";
import { opportunities, scanTargets, autonomousRuns, revenueEvents } from "@/db/schema";
import { and, eq, ne, or, sql } from "drizzle-orm";

export type { CycleConfig } from "./automation-config";
export type StepType = "acquisition" | "scan" | "audit" | "decide" | "deal_created" | "outreach_generated" | "checkout_created" | "skipped";

export interface CycleStep {
  type: StepType;
  domain: string;
  niche?: string;
  industry?: string;
  score?: number;
  grade?: string;
  dealId?: number;
  offerTier?: string;
  referenceCode?: string;
  checkoutUrl?: string;
  potentialValue?: number;
  message: string;
  timestamp: string;
}

export interface CycleSummary {
  domainsScanned: number;
  opportunitiesFound: number;
  dealsCreated: number;
  outreachGenerated: number;
  checkoutsCreated: number;
  totalEstimatedValue: number;
}

export interface CycleState {
  id: string;
  status: "running" | "completed" | "failed" | "stopped";
  startedAt: string;
  completedAt?: string;
  config: CycleConfig;
  steps: CycleStep[];
  summary: CycleSummary;
  acquisition?: AcquisitionResult;
  error?: string;
}

let activeCycle: CycleState | null = null;
export function getActiveCycle(): CycleState | null { return activeCycle; }

type Deal = typeof opportunities.$inferSelect;
type Target = typeof scanTargets.$inferSelect;

function pickOfferTier(audit: AuditResult): "remediation" | "implementation" {
  return audit.score < 50 && audit.findings.filter((f) => f.severity === "Critical").length >= 2
    ? "implementation" : "remediation";
}

function priceForTier(tier: string, audit: AuditResult): number {
  return tier === "implementation" ? 1500 : audit.score < 50 ? 450 : audit.score < 70 ? 350 : 250;
}

// Called only through the scheduler's database-backed execution lease.
export async function executeCycle(config: Partial<CycleConfig> = {}, options: {
  shouldStop?: () => Promise<boolean>;
  acquisition?: { query: string; industry: string; maxResults: number };
} = {}): Promise<CycleState> {
  const fullConfig = { ...defaultCycleConfig(), ...parseCycleConfig(config) };
  const deadline = Date.now() + CYCLE_BUDGET_MS;
  const state: CycleState = {
    id: crypto.randomUUID(), status: "running", startedAt: new Date().toISOString(),
    config: fullConfig, steps: [],
    summary: { domainsScanned: 0, opportunitiesFound: 0, dealsCreated: 0, outreachGenerated: 0, checkoutsCreated: 0, totalEstimatedValue: 0 },
  };
  activeCycle = state;
  const shouldStop = async () => Date.now() >= deadline || Boolean(await options.shouldStop?.());
  try {
    await db.insert(autonomousRuns).values({
      id: state.id, status: "running", ...fullConfig,
      details: JSON.stringify({ steps: [], config: fullConfig }),
    });
    // The run exists before discovery starts, so source failures and terminated
    // invocations are visible in the same durable history as the business cycle.
    if (options.acquisition && !await shouldStop()) {
      const { query, industry, maxResults } = options.acquisition;
      try {
        state.acquisition = await acquireFromCTLogs(query, industry, maxResults);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Discovery source unavailable.";
        state.acquisition = {
          source: "ct_log", query, sourceUrl: `https://crt.sh/?q=%25${encodeURIComponent(query)}%25&output=json`,
          domainsFound: 0, newInserted: 0, duplicatesSkipped: 0,
          errors: [reason], sources: [{ name: "discovery", status: "failed", domainsFound: 0, reason }],
        };
      }
      const sourceSummary = state.acquisition.sources?.map((source) =>
        `${source.name}: ${source.status}${source.domainsFound ? ` (${source.domainsFound} domains)` : ""}${source.reason ? ` — ${source.reason}` : ""}`,
      ).join("; ");
      addStep(state, { type: "acquisition", domain: "(discovery)",
        message: `CT discovery (${query}): ${state.acquisition.newInserted} new candidates, ${state.acquisition.duplicatesSkipped} duplicates.${sourceSummary ? ` Sources: ${sourceSummary}.` : ""}${state.acquisition.errors.length ? ` Errors: ${state.acquisition.errors.join(" ")}` : ""}` });
      await persistRun(state);
    }
    const targets = await db.select().from(scanTargets)
      .where(and(eq(scanTargets.isActive, true), ne(scanTargets.source, "demo")))
      // Rotate bounded batches so the same high-priority domains cannot starve others.
      .orderBy(sql`${scanTargets.lastAuditedAt} ASC NULLS FIRST`, scanTargets.priority, scanTargets.id)
      .limit(fullConfig.maxDomainsPerCycle);
    if (!targets.length) addStep(state, { type: "skipped", domain: "(none)", message: "No active candidates available this cycle. Public discovery will run again on the next scheduled cycle; no contact list is required." });

    for (const target of targets) {
      if (await shouldStop()) {
        state.status = "stopped";
        addStep(state, { type: "skipped", domain: target.domain, message: "Stop requested or execution budget reached." });
        break;
      }
      // Leave enough headroom for bounded DNS, contact, Stripe, and mail calls,
      // plus final persistence, before the 300-second Vercel function deadline.
      if (deadline - Date.now() < 120_000) {
        addStep(state, { type: "skipped", domain: target.domain, message: "Batch budget reached. Remaining targets will be picked up next run." });
        break;
      }
      try {
        await processDomain(state, { ...target, domain: publicBusinessDomain(target.domain) || target.domain }, shouldStop);
      } catch (error) {
        addStep(state, { type: "skipped", domain: target.domain,
          message: `Prospect processing failed; continuing the batch: ${error instanceof Error ? error.message : "unknown error"}` });
        await db.update(scanTargets).set({ lastAuditedAt: new Date() }).where(eq(scanTargets.id, target.id));
      }
      await persistRun(state);
    }
    if (state.status === "running") state.status = await shouldStop() ? "stopped" : "completed";
  } catch (error) {
    state.status = "failed";
    state.error = error instanceof Error ? error.message : "Unknown execution error";
  } finally {
    state.completedAt = new Date().toISOString();
    try { await persistRun(state); }
    finally { activeCycle = null; }
  }
  return state;
}

async function processDomain(state: CycleState, target: Target, shouldStop: () => Promise<boolean>): Promise<void> {
  const config = state.config;
  const { domain, niche } = target;
  addStep(state, { type: "scan", domain, niche, message: `Inspecting public DNS records for ${domain}.` });
  let audit: AuditResult;
  try { audit = await runDomainAudit(domain, niche); }
  catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    const confirmedNxdomain = reason === "Domain does not resolve.";
    // Only a definitive root-domain NXDOMAIN retires a target. Timeouts,
    // SERVFAIL, and provider errors rotate normally and never deactivate it.
    await db.update(scanTargets).set({
      lastAuditedAt: new Date(),
      ...(confirmedNxdomain ? { isActive: false } : {}),
    }).where(eq(scanTargets.id, target.id));
    addStep(state, { type: "skipped", domain,
      message: confirmedNxdomain
        ? "Target retired after definitive NXDOMAIN responses for the root-domain DNS audit. It remains in history and can be reactivated by the operator."
        : `DNS audit unavailable; no offer created: ${reason}` });
    return;
  }
  state.summary.domainsScanned++;
  addStep(state, { type: "audit", domain, niche, score: audit.score, grade: audit.grade,
    message: `DNS score ${audit.score}/100 (${audit.grade}). DMARC: ${audit.dmarcPresent ? audit.dmarcPolicy : "not found"}. SPF: ${audit.spfPresent ? "present" : "not found"}. DNS alone does not establish lost revenue.` });
  await db.update(scanTargets).set({ lastAuditedAt: new Date(), lastScore: audit.score }).where(eq(scanTargets.id, target.id));
  if (await shouldStop()) return;

  const [existing] = await db.select().from(opportunities).where(or(
    eq(opportunities.autonomousDomain, domain), sql`LOWER(BTRIM(${opportunities.targetCompany})) IN (${domain.toLowerCase()}, ${`www.${domain.toLowerCase()}`})`,
  )).limit(1);
  const actionable = audit.score < config.scoreThreshold;
  if (existing) {
    const metadata = existing.auditData ? JSON.parse(existing.auditData) : {};
    if (actionable && existing.status === "audited" && metadata.automatedCycleId) {
      addStep(state, { type: "decide", domain, dealId: existing.id, message: "Resuming the existing autonomous deal; no duplicate created." });
      await fulfillDeal(state, existing, audit, target, shouldStop);
    } else {
      addStep(state, { type: "skipped", domain, dealId: existing.id, message: "Existing deal or non-actionable audit; duplicate suppressed." });
    }
    return;
  }
  addStep(state, { type: "decide", domain, score: audit.score,
    message: actionable ? `ACTIONABLE — DNS score below ${config.scoreThreshold}.` : "No action; DNS score meets the threshold." });
  if (!actionable) return;
  state.summary.opportunitiesFound++;
  if (!config.autoCreateDeals) return;
  const contact = await findContact(domain);
  // A guessed info@ address is not a verified contact and must not receive automation.
  if (!isVerifiedBusinessContact(contact, domain)) {
    addStep(state, { type: "skipped", domain, message: "No verified public contact found. Guessed email addresses are not used for automated offers." });
    return;
  }
  if (await shouldStop()) return;
  const tier = pickOfferTier(audit);
  const price = priceForTier(tier, audit);
  const service = tier === "implementation" ? "Deliverability implementation" : "Deliverability remediation";
  const [deal] = await db.insert(opportunities).values({
    title: `${domain} — ${service}`, vector: "technical_leak_audit", targetCompany: domain,
    targetContact: contact.contactName || "Public business contact", targetEmail: contact.email,
    targetNiche: niche, status: "audited", potentialValue: price.toFixed(2), operatorFeePercent: "100.00",
    grossTransactionValue: price.toFixed(2), realizedRevenue: "0.00", capitalSpent: "0.00",
    contractTerms: `Proposed ${service} fee: $${price}. Scope, authorization, and delivery must be agreed with the customer.`,
    notes: `Autonomous cycle ${state.id}. Public DNS observations only; no revenue or inbox-placement guarantee.`,
    auditData: JSON.stringify({
      score: audit.score, grade: audit.grade, findings: audit.findings,
      contactEmail: contact.email, contactName: contact.contactName,
      contactSource: contact.source, contactConfidence: contact.confidence, contactEvidence: contact,
      acquisitionEvidence: target.sourceEvidence ? JSON.parse(target.sourceEvidence) : null,
      auditObservedAt: new Date().toISOString(), auditSourceUrl: "https://cloudflare-dns.com/dns-query",
      dmarcPresent: audit.dmarcPresent, dmarcPolicy: audit.dmarcPolicy, spfRecord: audit.spfRecord, mxRecords: audit.mxRecords,
      automatedCycleId: state.id,
    }),
    offerTier: tier, acquisitionSource: target.source, autonomousDomain: domain,
  }).onConflictDoNothing({ target: opportunities.autonomousDomain }).returning();
  if (!deal) {
    addStep(state, { type: "skipped", domain, message: "An autonomous opportunity already exists; duplicate suppressed by the database." });
    return;
  }
  state.summary.dealsCreated++;
  state.summary.totalEstimatedValue += price;
  await db.update(scanTargets).set({ lastDealId: deal.id }).where(eq(scanTargets.id, target.id));
  addStep(state, { type: "deal_created", domain, dealId: deal.id, offerTier: tier, potentialValue: price,
    message: `Deal #${deal.id} created for $${price}. This is a proposed invoice, not received funds.` });
  await fulfillDeal(state, deal, audit, target, shouldStop);
}

async function fulfillDeal(state: CycleState, deal: Deal, audit: AuditResult, target: Target, shouldStop: () => Promise<boolean>): Promise<void> {
  const { domain } = target;
  const config = state.config;
  let metadata = deal.auditData ? JSON.parse(deal.auditData) : {};
  // Reverify recipients when resuming a prior run, including legacy drafts without evidence.
  if (!isVerifiedBusinessContact(metadata.contactEvidence, domain) || metadata.contactEvidence.email !== deal.targetEmail ||
    Date.parse(metadata.contactEvidence.verifiedAt!) < Date.parse(state.startedAt)) {
    const contact = await findContact(domain);
    if (!isVerifiedBusinessContact(contact, domain) || contact.email !== deal.targetEmail) {
      addStep(state, { type: "skipped", domain, dealId: deal.id, message: "Saved recipient could not be reverified on the business website; checkout and outreach withheld." });
      return;
    }
    metadata = { ...metadata, contactEvidence: contact, contactSource: contact.source, contactConfidence: contact.confidence,
      acquisitionEvidence: metadata.acquisitionEvidence || (target.sourceEvidence ? JSON.parse(target.sourceEvidence) : null) };
    deal.auditData = JSON.stringify(metadata);
    await db.update(opportunities).set({ auditData: deal.auditData, updatedAt: new Date() }).where(eq(opportunities.id, deal.id));
  }
  if (await shouldStop()) return;
  if (config.autoGenerateOutreach && deal.outreachDeliveryStatus === "draft" &&
    (!deal.outreachMessage || metadata.outreachCopyVersion !== "dns-v1")) {
    const outreachMessage = buildOfferOutreach(domain, audit, deal, metadata.contactName);
    await db.update(opportunities).set({
      outreachMessage, auditData: JSON.stringify({ ...metadata, outreachCopyVersion: "dns-v1" }), updatedAt: new Date(),
    }).where(eq(opportunities.id, deal.id));
    deal.outreachMessage = outreachMessage;
    state.summary.outreachGenerated++;
    addStep(state, { type: "outreach_generated", domain, dealId: deal.id, message: "Outreach draft generated from observed DNS findings. No email sent yet." });
  }
  if (await shouldStop()) return;
  let checkoutUrl: string | null = null;
  if (config.autoCreateCheckout) {
    try {
      const result = await createPaymentCheckout({
        opportunityId: deal.id, amount: deal.potentialValue, clientName: domain,
        serviceDescription: deal.title, reusePending: true,
      });
      checkoutUrl = result.paymentRequest.checkoutUrl;
      if (result.created) {
        state.summary.checkoutsCreated++;
        await db.insert(revenueEvents).values({
          opportunityId: deal.id, industry: target.industry, offerTier: deal.offerTier,
          acquisitionSource: target.source, amount: deal.potentialValue, eventType: "checkout_created",
        });
      }
      addStep(state, { type: "checkout_created", domain, dealId: deal.id,
        referenceCode: result.paymentRequest.referenceCode, checkoutUrl: checkoutUrl || undefined,
        message: checkoutUrl ? `${result.paymentRequest.livemode ? "Live" : "Test"} checkout ready. Customer payment is required before revenue is recorded.` : "Checkout is blocked by provider configuration." });
    } catch (error) {
      addStep(state, { type: "skipped", domain, dealId: deal.id, message: `Checkout unavailable; saved draft can be retried: ${error instanceof Error ? error.message : "unknown error"}` });
    }
  }
  if (await shouldStop()) return;
  if (config.autoSendOutreach && deal.outreachMessage && checkoutUrl) {
    if (!isVerifiedBusinessContact(metadata.contactEvidence, domain) || metadata.contactEvidence.email !== deal.targetEmail) {
      addStep(state, { type: "skipped", domain, dealId: deal.id, message: "Outreach withheld: the saved contact needs verification." });
      return;
    }
    const result = await sendOutreach(deal.id, { authorized: config.autoSendOutreach, shouldStop });
    addStep(state, { type: "outreach_generated", domain, dealId: deal.id,
      message: result.sent ? `Email delivered to provider for ${result.recipientEmail}.` : result.error || "Email withheld." });
  }
}

function buildOfferOutreach(domain: string, audit: AuditResult, deal: Deal, name?: string | null): string {
  const findings = audit.findings.filter((f) => f.severity !== "Passed").map((f) => `- ${f.title}: ${f.description}`).join("\n");
  return `Subject: Public email-authentication observations for ${domain}\n\n${name ? `Hi ${name.split(" ")[0]},` : "Hi,"}\n\nI reviewed the public DNS records for ${domain} and observed:\n\n${findings}\n\nThese observations do not measure inbox placement or establish any lost revenue. A DNS review also cannot verify your internal lead-capture systems.\n\nI offer ${deal.offerTier === "implementation" ? "an email-authentication implementation review" : "email-authentication remediation"} for $${Number(deal.potentialValue).toLocaleString()}. Scope and access requirements will need your approval; no configuration changes have been made.\n\nWould you like to discuss the findings and proposed scope? If we agree to proceed, the checkout below accepts a customer-authorized card payment.\n\nThis is a commercial service offer.`;
}

function addStep(state: CycleState, step: Omit<CycleStep, "timestamp">): void {
  state.steps.push({ ...step, timestamp: new Date().toISOString() });
}

async function persistRun(state: CycleState): Promise<void> {
  await db.update(autonomousRuns).set({
    status: state.status, ...state.summary, totalEstimatedValue: state.summary.totalEstimatedValue.toFixed(2),
    details: JSON.stringify({ steps: state.steps, config: state.config, acquisition: state.acquisition }), error: state.error || null,
    completedAt: state.completedAt ? new Date(state.completedAt) : null,
  }).where(eq(autonomousRuns.id, state.id));
}
