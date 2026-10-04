import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { client, db, resetDatabase, setupDatabase } from "./database";
import {
  opportunities,
  paymentRequests,
  financialTransactions,
  scanTargets,
  autonomousRuns,
  schedulerSettings,
  revenueEvents,
} from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { runDomainAudit } from "@/lib/audit-engine";
import { findContact } from "@/lib/contact-finder";
import { getStatus, runOnce, startScheduler } from "@/lib/scheduler";
import { POST as webhook } from "@/app/api/payments/webhook/route";
import { GET as getFeedback } from "@/app/api/autonomous/feedback/route";
import { GET as getHistory } from "@/app/api/autonomous/history/route";
import { GET as getTargets, POST as createTarget, PATCH as updateTarget, DELETE as deleteTarget } from "@/app/api/autonomous/targets/route";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getTransactions } from "@/app/api/transactions/route";
import { POST as createStrategy } from "@/app/api/ai-advisor/route";
import { POST as createManualOpportunity, GET as getOpportunities } from "@/app/api/opportunities/route";
import { amountToCents } from "@/lib/payment-checkout";

const { checkoutMock, retrieveCheckoutMock } = vi.hoisted(() => ({
  checkoutMock: vi.fn(),
  retrieveCheckoutMock: vi.fn(),
}));

vi.mock("@/db", async () => {
  const fixture = await import("./database");
  return { db: fixture.db };
});

vi.mock("@/lib/audit-engine", () => ({ runDomainAudit: vi.fn() }));
vi.mock("@/lib/contact-finder", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/contact-finder")>(),
  findContact: vi.fn(),
}));

vi.mock("stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("stripe")>();
  return {
    ...actual,
    default: class extends actual.default {
      constructor(...args: ConstructorParameters<typeof actual.default>) {
        super(...args);
        this.checkout.sessions.create = checkoutMock;
        this.checkout.sessions.retrieve = retrieveCheckoutMock;
      }
    },
  };
});

const fetchMock = vi.fn();

beforeAll(setupDatabase);
beforeEach(async () => {
  await resetDatabase();
  vi.spyOn(console, "error").mockImplementation(() => {});

  // Configure live-mode environment
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("DATABASE_URL", "postgresql://neon-production-fixture/db?sslmode=require");
  vi.stubEnv("APP_URL", "https://zero-gravity-wah-lah.vercel.app");
  vi.stubEnv("OPERATOR_USERNAME", "wah_lah_operator");
  vi.stubEnv("OPERATOR_PASSWORD", "super-secret-operator-password-with-at-least-32-chars-long");
  vi.stubEnv("CRON_SECRET", "super-secret-cron-token-production-12345");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_production_key_fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_production_signing_secret");
  vi.stubEnv("RESEND_API_KEY", "re_live_production_key_fixture");
  vi.stubEnv("FROM_EMAIL", "audits@zero-gravity.com");
  vi.stubEnv("OUTREACH_REPLY_TO", "optout@zero-gravity.com");
  vi.stubEnv("REVENUE_ALERT_EMAIL", "finance@zero-gravity.com");
  vi.stubEnv("OUTREACH_POSTAL_ADDRESS", "789 Enterprise Blvd, Suite 400, Austin, TX 78701");
  vi.stubEnv("OUTREACH_COMPLIANCE_CONFIRMED", "true");

  // Mock domain audit
  vi.mocked(runDomainAudit).mockReset().mockImplementation(async (domain) => ({
    domain,
    niche: "commercial_roofing",
    score: 40,
    grade: "F",
    dmarcPresent: false,
    dmarcPolicy: "none",
    spfPresent: false,
    spfRecord: "",
    mxPresent: true,
    mxRecords: [`10 mail.${domain}`],
    findings: [
      { category: "Deliverability", severity: "Critical", title: "DMARC record not found", description: "No DMARC policy published.", impact: "High" },
      { category: "Deliverability", severity: "Critical", title: "SPF record not found", description: "No SPF record published.", impact: "High" },
    ],
    estimatedMonthlyLeakage: 0,
    recommendedFixBounty: 450,
    remediationSnippet: `REMEDIATION PLAN FOR ${domain}`,
    readyOutreachCopy: `Observed DNS findings for ${domain}`,
  }));

  // Mock contact finder
  vi.mocked(findContact).mockReset().mockImplementation(async (domain) => ({
    email: `ceo@${domain}`,
    contactName: "Alex Mercer",
    contactRole: "Chief Executive Officer",
    source: "website",
    confidence: "high",
    sourceUrl: `https://${domain}/contact`,
    mxRecords: [`10 mail.${domain}`],
    verifiedAt: new Date().toISOString(),
  }));

  // Mock Stripe create & retrieve
  checkoutMock.mockReset().mockImplementation(async (params) => {
    const paymentRequestId = params.metadata.paymentRequestId;
    return {
      id: `cs_live_${paymentRequestId}`,
      url: `https://checkout.stripe.com/c/pay/cs_live_${paymentRequestId}`,
      client_reference_id: params.client_reference_id,
      amount_total: params.line_items[0].price_data.unit_amount,
      currency: "usd",
      livemode: true,
      status: "open",
    };
  });

  retrieveCheckoutMock.mockReset().mockImplementation(async (sessionId) => {
    const [invoice] = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.providerSessionId, sessionId));
    return {
      id: sessionId,
      status: "open",
      mode: "payment",
      livemode: true,
      url: invoice?.checkoutUrl,
      client_reference_id: invoice?.referenceCode,
      amount_total: invoice ? amountToCents(invoice.amount) : 45000,
      currency: invoice?.currency || "usd",
      metadata: { paymentRequestId: invoice ? String(invoice.id) : "1" },
    };
  });

  // Mock outbound fetch (crt.sh, Resend domains, Resend emails)
  fetchMock.mockReset().mockImplementation(async (input, options) => {
    const url = String(input);
    if (url.startsWith("https://crt.sh/")) {
      return Response.json([
        { id: 98765, name_value: "apex-roofing-pro.com\nwww.apex-roofing-pro.com" },
        { id: 98766, name_value: "summit-commercial-roofs.com" },
      ]);
    }
    if (url === "https://api.resend.com/domains") {
      return Response.json({
        data: [{ name: "zero-gravity.com", status: "verified", capabilities: { sending: "enabled" } }],
      });
    }
    if (url === "https://api.resend.com/emails" && options?.method === "POST") {
      return Response.json({ id: `msg_${crypto.randomUUID()}` });
    }
    return Response.json({ success: true });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

afterAll(() => client.close());

describe("🔴 P0 Production Stack — Full Smoke Test & Verification", () => {
  it("Phase 1: Production health check reports connected DB and ready schema", async () => {
    const response = await getHealth();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.database).toBe("connected");
    expect(data.schema.ready).toBe(true);
    expect(data.schema.missing).toEqual([]);
    expect(data.automation.ready).toBe(true);
    expect(data.automation.paymentMode).toBe("live");
  });

  it("Phase 2: Target API CRUD operations operate with proper validation and persistence", async () => {
    // 1. Create target
    const createReq = new Request("https://zero-gravity-wah-lah.vercel.app/api/autonomous/targets", {
      method: "POST",
      body: JSON.stringify({ domain: "vanguard-hvac-services.com", niche: "HVAC", industry: "commercial_services", priority: 1 }),
    });
    const createRes = await createTarget(createReq);
    expect(createRes.status).toBe(200);
    const createdTarget = (await createRes.json()).data;
    expect(createdTarget.domain).toBe("vanguard-hvac-services.com");
    expect(createdTarget.niche).toBe("HVAC");

    // 2. Fetch targets
    const getRes = await getTargets();
    const targetsList = (await getRes.json()).data;
    expect(targetsList.some((t: typeof scanTargets.$inferSelect) => t.domain === "vanguard-hvac-services.com")).toBe(true);

    // 3. Update target
    const patchReq = new Request("https://zero-gravity-wah-lah.vercel.app/api/autonomous/targets", {
      method: "PATCH",
      body: JSON.stringify({ id: createdTarget.id, priority: 2, niche: "Commercial HVAC" }),
    });
    const patchRes = await updateTarget(patchReq);
    expect(patchRes.status).toBe(200);
    const updatedTarget = (await patchRes.json()).data;
    expect(updatedTarget.priority).toBe(2);
    expect(updatedTarget.niche).toBe("Commercial HVAC");

    // 4. Delete target
    const delReq = new Request(`https://zero-gravity-wah-lah.vercel.app/api/autonomous/targets?id=${createdTarget.id}`, { method: "DELETE" });
    const delRes = await deleteTarget(delReq);
    expect(delRes.status).toBe(200);
  });

  it("Phase 3: AI strategy advisor generates compliant research worksheet", async () => {
    const req = new Request("https://zero-gravity-wah-lah.vercel.app/api/ai-advisor", {
      method: "POST",
      body: JSON.stringify({ niche: "Commercial Roofing", location: "Austin, TX" }),
    });
    const res = await createStrategy(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.strategy.title).toContain("Commercial Roofing");
    expect(data.strategy.actionSteps.length).toBeGreaterThan(0);
    expect(data.strategy.scopeChecklist).toContain("DISCUSSION CHECKLIST");
  });

  it("Phase 4 & 5: Complete end-to-end Autonomous Cycle from CT discovery through Live Stripe Checkout, Outreach delivery, Live webhook payment, Ledger recording & Revenue Alert", async () => {
    // 1. Enable full autonomous pipeline
    await startScheduler({
      cycleConfig: {
        scoreThreshold: 65,
        autoCreateDeals: true,
        autoGenerateOutreach: true,
        autoCreateCheckout: true,
        autoSendOutreach: true,
        maxDomainsPerCycle: 5,
      },
    });

    // 2. Run cycle
    const result = await runOnce({ force: true });
    expect(result.status).toBe("completed");
    expect(result.cycle).toBeDefined();

    const cycle = result.cycle!;
    expect(cycle.summary.domainsScanned).toBeGreaterThanOrEqual(2);
    expect(cycle.summary.dealsCreated).toBeGreaterThanOrEqual(2);
    expect(cycle.summary.checkoutsCreated).toBeGreaterThanOrEqual(2);
    expect(cycle.summary.outreachGenerated).toBeGreaterThanOrEqual(2);

    // 3. Verify deals in database
    const deals = await db.select().from(opportunities);
    expect(deals.length).toBeGreaterThanOrEqual(2);
    for (const deal of deals) {
      expect(deal.status).toBe("outreach_sent");
      expect(deal.outreachDeliveryStatus).toBe("sent");
      expect(deal.outreachProviderId).toMatch(/^msg_/);
      expect(deal.realizedRevenue).toBe("0.00"); // Unpaid invoices are not revenue
    }

    // 4. Verify Stripe checkout requests in database
    const invoices = await db.select().from(paymentRequests);
    expect(invoices.length).toBeGreaterThanOrEqual(2);
    for (const inv of invoices) {
      expect(inv.livemode).toBe(true);
      expect(inv.status).toBe("checkout_created");
      expect(inv.checkoutUrl).toContain("checkout.stripe.com");
      expect(inv.providerSessionId).toMatch(/^cs_live_/);
    }

    // 5. Verify outreach emails were sent via Resend API
    const emailCalls = fetchMock.mock.calls.filter(([url]) => url === "https://api.resend.com/emails");
    expect(emailCalls.length).toBeGreaterThanOrEqual(2);
    for (const [, opts] of emailCalls) {
      const payload = JSON.parse(String(opts?.body));
      expect(payload.from).toBe("audits@zero-gravity.com");
      expect(payload.to[0]).toMatch(/^ceo@/);
      expect(payload.text).toContain("Customer-authorized card checkout:");
      expect(payload.text).toContain("https://checkout.stripe.com");
      expect(payload.text).toContain('reply "unsubscribe" to optout@zero-gravity.com');
      expect(payload.text).toContain("789 Enterprise Blvd");
    }

    // 6. Verify run history entry
    const historyRes = await getHistory();
    const historyData = await historyRes.json();
    expect(historyData.success).toBe(true);
    expect(historyData.data.length).toBeGreaterThanOrEqual(1);
    expect(historyData.data[0].status).toBe("completed");
    expect(historyData.data[0].dealsCreated).toBeGreaterThanOrEqual(2);

    // 7. Process customer payment for one deal
    const [dealToPay] = deals;
    const [invoiceToPay] = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.opportunityId, dealToPay.id));

    expect(invoiceToPay).toBeDefined();
    expect(invoiceToPay.livemode).toBe(true);

    const sessionObj = {
      id: invoiceToPay.providerSessionId!,
      object: "checkout.session",
      mode: "payment",
      payment_status: "paid",
      client_reference_id: invoiceToPay.referenceCode,
      amount_total: amountToCents(invoiceToPay.amount),
      currency: "usd",
      livemode: true,
      metadata: {
        paymentRequestId: String(invoiceToPay.id),
        referenceCode: invoiceToPay.referenceCode,
        opportunityId: String(dealToPay.id),
      },
    } as unknown as Stripe.Checkout.Session;

    const eventPayload = JSON.stringify({
      id: `evt_live_${crypto.randomUUID()}`,
      object: "event",
      type: "checkout.session.completed",
      livemode: true,
      data: { object: sessionObj },
    });

    const stripe = new Stripe("sk_live_production_key_fixture");
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: eventPayload,
      secret: "whsec_production_signing_secret",
    });

    const webhookReq = new Request("https://zero-gravity-wah-lah.vercel.app/api/payments/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: eventPayload,
    });

    // 8. Process webhook
    const webhookRes = await webhook(webhookReq);
    expect(webhookRes.status).toBe(200);
    const webhookData = await webhookRes.json();
    expect(webhookData.paymentRecorded).toBe(true);
    expect(webhookData.livemode).toBe(true);
    expect(webhookData.amount).toBe(invoiceToPay.amount);

    // 9. Verify financial transaction ledger
    const [tx] = await db.select().from(financialTransactions).where(eq(financialTransactions.opportunityId, dealToPay.id));
    expect(tx).toBeDefined();
    expect(tx.verified).toBe(true);
    expect(tx.amount).toBe(invoiceToPay.amount);
    expect(tx.paymentMethod).toBe("Stripe Checkout");

    // 10. Verify opportunity state updated to revenue_collected
    const [updatedDeal] = await db.select().from(opportunities).where(eq(opportunities.id, dealToPay.id));
    expect(updatedDeal.status).toBe("revenue_collected");
    expect(Number(updatedDeal.realizedRevenue)).toBe(Number(invoiceToPay.amount));

    // 11. Verify revenue attribution event
    const events = await db.select().from(revenueEvents).where(eq(revenueEvents.opportunityId, dealToPay.id));
    expect(events.some((e) => e.eventType === "payment_verified")).toBe(true);

    // 12. Verify revenue alert was dispatched to finance
    const alertCalls = fetchMock.mock.calls.filter(([url, opts]) => {
      if (url !== "https://api.resend.com/emails" || opts?.method !== "POST") return false;
      const body = JSON.parse(String(opts?.body));
      return body.to?.includes("finance@zero-gravity.com");
    });
    expect(alertCalls.length).toBe(1);
    const alertBody = JSON.parse(String(alertCalls[0][1]?.body));
    expect(alertBody.subject).toContain(`Payment verified: $${invoiceToPay.amount} USD`);

    // 13. Verify ledger & transaction metrics API reflects verified revenue
    const txRes = await getTransactions();
    expect(txRes.status).toBe(200);
    const txData = await txRes.json();
    expect(txData.data.metrics.totalRealizedRevenue).toBe(Number(invoiceToPay.amount));
    expect(txData.data.metrics.wonDealsCount).toBe(1);

    // 14. Verify feedback loop KPI
    const feedbackRes = await getFeedback();
    expect(feedbackRes.status).toBe(200);
    const feedbackData = await feedbackRes.json();
    expect(feedbackData.success).toBe(true);
    expect(feedbackData.kpi.verifiedRevenue).toBe(Number(invoiceToPay.amount));

    // 15. Test idempotency: Resend identical webhook event
    const retryRes = await webhook(new Request("https://zero-gravity-wah-lah.vercel.app/api/payments/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: eventPayload,
    }));
    expect(retryRes.status).toBe(200);
    const retryData = await retryRes.json();
    expect(retryData.idempotent).toBe(true);
    expect(retryData.paymentRecorded).toBe(false);

    // Total transactions should still be 1 (no double counting)
    const allTxs = await db.select().from(financialTransactions).where(eq(financialTransactions.opportunityId, dealToPay.id));
    expect(allTxs.length).toBe(1);
  });
});
