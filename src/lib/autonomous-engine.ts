import { runDomainAudit, type AuditResult } from "./audit-engine";
import { sendOutreach } from "./email-outreach";
import { findContact } from "./contact-finder";
import { db } from "@/db";
import { opportunities, scanTargets, autonomousRuns, paymentRequests, revenueEvents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepType =
  | "scan"
  | "audit"
  | "decide"
  | "deal_created"
  | "outreach_generated"
  | "checkout_created"
  | "skipped";

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
  error?: string;
}

export interface CycleConfig {
  scoreThreshold: number;
  autoCreateDeals: boolean;
  autoGenerateOutreach: boolean;
  autoCreateCheckout: boolean;
}

// ---------------------------------------------------------------------------
// Module-level state — one active cycle at a time
// ---------------------------------------------------------------------------

let activeCycle: CycleState | null = null;
let stopRequested = false;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: CycleConfig = {
  scoreThreshold: 65,
  autoCreateDeals: true,
  autoGenerateOutreach: true,
  autoCreateCheckout: false,
};

/**
 * Offer tier pricing.
 * - remediation:  quick DNS patch, $350 flat
 * - implementation: full deliverability overhaul, $1,500–$3,000
 * - monitoring:   ongoing $199/mo or $299/mo (subscription)
 *
 * The engine picks the tier based on audit severity.
 */
const TIER_PRICING = {
  remediation: { min: 250, max: 450 },
  implementation: { min: 1500, max: 3000 },
} as const;

function pickOfferTier(audit: AuditResult): "remediation" | "implementation" {
  // Critical score + multiple findings → implementation bundle
  if (audit.score < 50 && audit.findings.filter((f) => f.severity === "Critical").length >= 2) {
    return "implementation";
  }
  return "remediation";
}

function priceForTier(tier: "remediation" | "implementation", audit: AuditResult): number {
  if (tier === "implementation") {
    // Scale by leakage
    if (audit.estimatedMonthlyLeakage > 3000) return 3000;
    if (audit.estimatedMonthlyLeakage > 1500) return 2250;
    return 1500;
  }
  // remediation
  return audit.score < 50 ? 450 : audit.score < 70 ? 350 : 250;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getActiveCycle(): CycleState | null {
  return activeCycle;
}

export function requestStop(): boolean {
  if (activeCycle?.status === "running") {
    stopRequested = true;
    return true;
  }
  return false;
}

export async function executeCycle(
  config: Partial<CycleConfig> = {}
): Promise<CycleState> {
  if (activeCycle?.status === "running") {
    throw new Error("A cycle is already running. Stop it first.");
  }

  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const cycleId = crypto.randomUUID();

  const state: CycleState = {
    id: cycleId,
    status: "running",
    startedAt: new Date().toISOString(),
    config: fullConfig,
    steps: [],
    summary: {
      domainsScanned: 0,
      opportunitiesFound: 0,
      dealsCreated: 0,
      outreachGenerated: 0,
      checkoutsCreated: 0,
      totalEstimatedValue: 0,
    },
  };

  activeCycle = state;
  stopRequested = false;

  // Persist the run record
  await db.insert(autonomousRuns).values({
    id: cycleId,
    status: "running",
    scoreThreshold: fullConfig.scoreThreshold,
    autoCreateDeals: fullConfig.autoCreateDeals,
    autoGenerateOutreach: fullConfig.autoGenerateOutreach,
    autoCreateCheckout: fullConfig.autoCreateCheckout,
  });

  try {
    const targets = await db
      .select()
      .from(scanTargets)
      .where(eq(scanTargets.isActive, true))
      .orderBy(scanTargets.priority);

    if (targets.length === 0) {
      addStep(state, {
        type: "skipped",
        domain: "(none)",
        message: "No active scan targets. Add targets or run prospect acquisition to begin.",
      });
    }

    for (const target of targets) {
      if (stopRequested) {
        addStep(state, {
          type: "skipped",
          domain: target.domain,
          message: "Cycle stopped by user.",
        });
        break;
      }

      await processDomain(state, fullConfig, target.domain, target.niche, target.industry || undefined, target.source, target.id);
    }

    state.status = stopRequested ? "stopped" : "completed";
    state.completedAt = new Date().toISOString();
  } catch (err) {
    state.status = "failed";
    state.error = err instanceof Error ? err.message : "Unknown error";
    state.completedAt = new Date().toISOString();
  }

  // Persist final state
  await persistRun(state);
  activeCycle = null;
  return state;
}

// ---------------------------------------------------------------------------
// Per-domain processing pipeline
// ---------------------------------------------------------------------------

async function processDomain(
  state: CycleState,
  config: CycleConfig,
  domain: string,
  niche: string,
  industry: string | undefined,
  source: string,
  targetId: number
): Promise<void> {
  // ── Step 1: Scan / Audit ──────────────────────────────────────────────────
  addStep(state, {
    type: "scan",
    domain,
    niche,
    industry,
    message: `Scanning DNS records for ${domain}…`,
  });

  let audit: AuditResult;
  try {
    audit = await runDomainAudit(domain, niche);
  } catch (err) {
    addStep(state, {
      type: "audit",
      domain,
      message: `Audit failed for ${domain}: ${err instanceof Error ? err.message : "unknown error"}`,
    });
    return;
  }

  state.summary.domainsScanned++;

  addStep(state, {
    type: "audit",
    domain,
    niche,
    industry,
    score: audit.score,
    grade: audit.grade,
    message: `Score ${audit.score}/100 (${audit.grade}). DMARC: ${audit.dmarcPresent ? audit.dmarcPolicy : "missing"}. SPF: ${audit.spfPresent ? "present" : "missing"}. Est. leakage: $${audit.estimatedMonthlyLeakage.toLocaleString()}/mo.`,
  });

  // Update scan target with latest audit results
  await db
    .update(scanTargets)
    .set({ lastAuditedAt: new Date(), lastScore: audit.score })
    .where(eq(scanTargets.id, targetId));

  // ── Step 2: Decide ────────────────────────────────────────────────────────
  const isActionable = audit.score < config.scoreThreshold;
  state.summary.opportunitiesFound += isActionable ? 1 : 0;

  addStep(state, {
    type: "decide",
    domain,
    score: audit.score,
    message: isActionable
      ? `ACTIONABLE — score ${audit.score} < threshold ${config.scoreThreshold}. Executing.`
      : `NO ACTION — score ${audit.score} ≥ threshold ${config.scoreThreshold}. Passing.`,
  });

  if (!isActionable) return;

  // ── Step 3: Determine offer tier and price ────────────────────────────────
  const tier = pickOfferTier(audit);
  const bounty = priceForTier(tier, audit);

  // ── Step 4: Create deal ───────────────────────────────────────────────────
  if (!config.autoCreateDeals) return;

  const offerLabel = tier === "implementation"
    ? `Revenue & Deliverability Recovery Implementation — $${bounty.toLocaleString()}`
    : `Deliverability Remediation — $${bounty}`;

  // ── Find the real decision-maker ─────────────────────────────────────────
  const contact = await findContact(domain);

  addStep(state, {
    type: "decide",
    domain,
    score: audit.score,
    message: contact.email
      ? `Contact found: ${contact.email} (${contact.contactName || "unknown"}, ${contact.contactRole || "unknown"}, ${contact.confidence} confidence, source: ${contact.source})`
      : `No verifiable email found for ${domain}. Skipping outreach.`,
  });

  // Don't create a deal if we can't reach anyone
  if (!contact.email) return;

  const [newDeal] = await db
    .insert(opportunities)
    .values({
      title: `${domain} — ${offerLabel}`,
      vector: "technical_leak_audit",
      targetCompany: domain,
      targetContact: contact.contactName && contact.contactRole
        ? `${contact.contactName} (${contact.contactRole})`
        : contact.contactName || contact.contactRole || "Decision Maker",
      targetEmail: contact.email,
      targetNiche: niche,
      status: "audited",
      potentialValue: String(bounty),
      operatorFeePercent: "100.00",
      grossTransactionValue: String(bounty),
      realizedRevenue: "0.00",
      capitalSpent: "0.00",
      outreachMessage: tier === "implementation"
        ? buildImplementationOutreach(domain, audit, bounty, contact.contactName)
        : personalizeOutreach(audit.readyOutreachCopy, contact.contactName, domain),
      contractTerms: tier === "implementation"
        ? `Revenue & Deliverability Recovery Package: $${bounty}. Includes full DMARC/SPF/DKIM configuration, deliverability monitoring setup, and 30-day verification.`
        : `Fixed one-time remediation fee: $${bounty}. 100% satisfaction guarantee.`,
      notes: `Autonomous cycle ${state.id.slice(0, 8)}. Score: ${audit.score}/100. Grade: ${audit.grade}. Tier: ${tier}. Monthly leakage: $${audit.estimatedMonthlyLeakage}. Contact: ${contact.email} (${contact.source}, ${contact.confidence}). Source: ${source}.`,
      auditData: JSON.stringify({
        score: audit.score,
        grade: audit.grade,
        dmarcPresent: audit.dmarcPresent,
        dmarcPolicy: audit.dmarcPolicy,
        spfPresent: audit.spfPresent,
        estimatedMonthlyLeakage: audit.estimatedMonthlyLeakage,
        findings: audit.findings.map((f) => ({ title: f.title, severity: f.severity })),
        offerTier: tier,
        contactEmail: contact.email,
        contactName: contact.contactName,
        contactSource: contact.source,
        contactConfidence: contact.confidence,
        automatedCycleId: state.id,
      }),
      offerTier: tier,
      acquisitionSource: source,
    })
    .returning();

  state.summary.dealsCreated++;
  state.summary.totalEstimatedValue += bounty;

  // Update scan target with deal reference
  await db
    .update(scanTargets)
    .set({ lastDealId: newDeal.id })
    .where(eq(scanTargets.id, targetId));

  // Log revenue event
  await db.insert(revenueEvents).values({
    opportunityId: newDeal.id,
    industry: industry || null,
    offerTier: tier,
    acquisitionSource: source,
    amount: String(bounty),
    eventType: "checkout_created",
  });

  addStep(state, {
    type: "deal_created",
    domain,
    dealId: newDeal.id,
    offerTier: tier,
    potentialValue: bounty,
    message: `Deal #${newDeal.id} created. Tier: ${tier}. Price: $${bounty.toLocaleString()}. Status: audited.`,
  });

  // ── Step 5: Create Stripe checkout first (URL goes in the email) ────────
  let checkoutUrl: string | undefined;
  if (config.autoCreateCheckout) {
    checkoutUrl = await createCheckout(state, domain, newDeal.id, tier, bounty);
  }

  // ── Step 6: Generate and SEND outreach ──────────────────────────────────
  if (config.autoGenerateOutreach) {
    state.summary.outreachGenerated++;

    const outreachResult = await sendOutreach(newDeal.id);

    addStep(state, {
      type: "outreach_generated",
      domain,
      dealId: newDeal.id,
      offerTier: tier,
      message: outreachResult.sent
        ? `Email sent to ${outreachResult.recipientEmail}: "${outreachResult.subject}"`
        : outreachResult.error || "Outreach generated but not sent.",
    });
  }
}

// ---------------------------------------------------------------------------
// Stripe checkout creation (extracted for clarity)
// ---------------------------------------------------------------------------

async function createCheckout(
  state: CycleState,
  domain: string,
  dealId: number,
  tier: string,
  bounty: number
): Promise<string | undefined> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    addStep(state, {
      type: "checkout_created",
      domain,
      dealId,
      offerTier: tier,
      message: "Skipped — STRIPE_SECRET_KEY not configured.",
    });
    return undefined;
  }

  try {
    const { Stripe } = await import("stripe");
    const stripe = new Stripe(secretKey);
    const referenceCode = `INV-${crypto.randomUUID().split("-")[0].toUpperCase()}`;

    const serviceName = tier === "implementation"
      ? `Revenue & Deliverability Recovery — ${domain}`
      : `Deliverability Remediation — ${domain}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(bounty * 100),
            product_data: {
              name: serviceName,
              description: `Invoice ${referenceCode} · ${tier} package`,
            },
          },
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"}/?payment=cancelled&reference=${referenceCode}`,
      client_reference_id: referenceCode,
      metadata: {
        paymentRequestId: "",
        referenceCode,
        opportunityId: String(dealId),
      },
    });

    const [paymentRequest] = await db
      .insert(paymentRequests)
      .values({
        opportunityId: dealId,
        referenceCode,
        provider: "stripe",
        status: "checkout_created",
        amount: bounty.toFixed(2),
        currency: "usd",
        clientName: domain,
        serviceDescription: serviceName,
        paymentMethod: "card",
        providerSessionId: session.id,
        checkoutUrl: session.url || "",
      })
      .returning();

    state.summary.checkoutsCreated++;

    addStep(state, {
      type: "checkout_created",
      domain,
      dealId,
      offerTier: tier,
      referenceCode,
      checkoutUrl: session.url || undefined,
      message: `Stripe Checkout ${referenceCode} · $${bounty.toLocaleString()} · ${session.url || "(no url)"}`,
    });

    return session.url || undefined;
  } catch (err) {
    addStep(state, {
      type: "checkout_created",
      domain,
      dealId,
      offerTier: tier,
      message: `Checkout failed: ${err instanceof Error ? err.message : "unknown"}`,
    });
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Implementation-tier outreach copy
// ---------------------------------------------------------------------------

function buildImplementationOutreach(
  domain: string,
  audit: AuditResult,
  price: number,
  contactName?: string | null
): string {
  const greeting = contactName ? `Hi ${contactName.split(" ")[0]},` : "Hi,";
  const criticalFindings = audit.findings
    .filter((f) => f.severity === "Critical")
    .map((f) => `- ${f.title}: ${f.description}`)
    .join("\n");

  return `Subject: Revenue leakage report for ${domain} — $${audit.estimatedMonthlyLeakage.toLocaleString()}/mo at risk

${greeting}

I ran a comprehensive deliverability and revenue-leakage diagnostic on ${domain} and found multiple critical issues that are actively costing your business revenue each month:

${criticalFindings}

The estimated monthly revenue leakage is $${audit.estimatedMonthlyLeakage.toLocaleString()} — that's roughly $${(audit.estimatedMonthlyLeakage * 12).toLocaleString()} per year silently lost to spam filters, authentication failures, and broken lead capture flows.

I'm offering a full Revenue & Deliverability Recovery implementation:

• Complete DMARC/SPF/DKIM configuration and enforcement
• Email authentication verification across all sending services
• Lead capture webhook audit and repair
• 30-day monitoring and verification period
• Detailed before/after deliverability report

Total investment: $${price.toLocaleString()} (one-time).

If the issues I've documented aren't fully resolved, you pay nothing.

Would you like me to send over the full diagnostic report and implementation scope?`;
}

// ---------------------------------------------------------------------------
// Outreach personalization
// ---------------------------------------------------------------------------

function personalizeOutreach(
  rawCopy: string,
  contactName: string | null,
  domain: string
): string {
  if (!rawCopy) return rawCopy;

  let personalized = rawCopy;

  // Replace common placeholder patterns with the real name
  if (contactName) {
    const firstName = contactName.split(" ")[0];
    personalized = personalized
      .replace(/\{\{OwnerName\}\}/gi, firstName)
      .replace(/\{\{Name\}\}/gi, firstName)
      .replace(/\{\{FounderName\}\}/gi, firstName)
      .replace(/\{\{FirstName\}\}/gi, firstName)
      .replace(/\[Founder\s*\/\s*VP Operations\]/gi, firstName)
      .replace(/\[Name\]/gi, firstName)
      .replace(/Hi \[Founder/gi, `Hi ${firstName}`)
      .replace(/Hi \[Name\]/gi, `Hi ${firstName}`);
  }

  // Replace domain placeholders
  personalized = personalized
    .replace(/\{\{domain\}\}/gi, domain)
    .replace(/\{\{Domain\}\}/gi, domain);

  return personalized;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addStep(state: CycleState, step: Omit<CycleStep, "timestamp">): void {
  state.steps.push({ ...step, timestamp: new Date().toISOString() });
}

async function persistRun(state: CycleState): Promise<void> {
  await db
    .update(autonomousRuns)
    .set({
      status: state.status,
      domainsScanned: state.summary.domainsScanned,
      opportunitiesFound: state.summary.opportunitiesFound,
      dealsCreated: state.summary.dealsCreated,
      outreachGenerated: state.summary.outreachGenerated,
      checkoutsCreated: state.summary.checkoutsCreated,
      totalEstimatedValue: state.summary.totalEstimatedValue.toFixed(2),
      details: JSON.stringify({
        steps: state.steps,
        config: state.config,
      }),
      error: state.error || null,
      completedAt: state.completedAt ? new Date(state.completedAt) : null,
    })
    .where(eq(autonomousRuns.id, state.id));
}