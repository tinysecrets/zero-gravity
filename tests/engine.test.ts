import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { AuditResult } from "@/lib/audit-engine";

const { checkoutMock, retrieveCheckoutMock } = vi.hoisted(() => ({ checkoutMock: vi.fn(), retrieveCheckoutMock: vi.fn() }));
vi.mock("@/db", async () => { const fixture = await import("./database"); return { db: fixture.db }; });
vi.mock("@/lib/audit-engine", () => ({ runDomainAudit: vi.fn() }));
vi.mock("@/lib/contact-finder", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/contact-finder")>(), findContact: vi.fn() }));
vi.mock("stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("stripe")>();
  return { ...actual, default: class extends actual.default {
    constructor(...args: ConstructorParameters<typeof actual.default>) { super(...args); this.checkout.sessions.create = checkoutMock; this.checkout.sessions.retrieve = retrieveCheckoutMock; }
  } };
});

import { client, db, resetDatabase, setupDatabase } from "./database";
import { opportunities, paymentRequests, financialTransactions, scanTargets, autonomousRuns, schedulerSettings } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { runDomainAudit } from "@/lib/audit-engine";
import { findContact } from "@/lib/contact-finder";
import { getStatus, runOnce, startScheduler, stopScheduler } from "@/lib/scheduler";
import { sendOutreach } from "@/lib/email-outreach";
import { GET as cron } from "@/app/api/autonomous/cron/route";

const sourceMock = vi.fn();
const senderMock = vi.fn();
const emailSendMock = vi.fn();

function audit(domain = "business.com"): AuditResult {
  return {
    domain, score: 35, grade: "F", dmarcPresent: false, dmarcPolicy: "none", spfPresent: false, spfRecord: "", mxPresent: true, mxRecords: ["10 mail.business.com"],
    findings: [
      { category: "Deliverability", severity: "Critical", title: "DMARC record not found", description: "No public DMARC record returned.", impact: "Authentication needs review." },
      { category: "Deliverability", severity: "Critical", title: "SPF record not found", description: "No public SPF record returned.", impact: "Authentication needs review." },
    ], estimatedMonthlyLeakage: 0, recommendedFixBounty: 350, remediationSnippet: "Review owner authorization.", readyOutreachCopy: "Observed DNS records only.",
  };
}

beforeAll(setupDatabase);
beforeEach(async () => {
  await resetDatabase();
  vi.stubEnv("CTLOGS_API_KEY", "");
  vi.mocked(runDomainAudit).mockReset().mockImplementation(async (domain) => audit(domain));
  vi.mocked(findContact).mockReset().mockImplementation(async (domain) => ({ email: `owner@${domain}`, contactName: "Test Owner", contactRole: "Owner", source: "website", confidence: "high", sourceUrl: `https://${domain}/contact`, mxRecords: [`10 mail.${domain}`], verifiedAt: new Date().toISOString() }));
  checkoutMock.mockReset().mockImplementation(async (params) => ({
    id: `cs_${process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test"}_${params.metadata.paymentRequestId}`,
    url: `https://checkout.stripe.com/c/pay/${params.metadata.paymentRequestId}`,
  }));
  retrieveCheckoutMock.mockReset().mockImplementation(async (id) => {
    const [invoice] = await db.select().from(paymentRequests).where(eq(paymentRequests.providerSessionId, id));
    return { id, status: "open", mode: "payment", livemode: invoice.livemode, url: invoice.checkoutUrl,
      client_reference_id: invoice.referenceCode, amount_total: Math.round(Number(invoice.amount) * 100),
      currency: invoice.currency, metadata: { paymentRequestId: String(invoice.id) } };
  });
  sourceMock.mockReset().mockImplementation(async () => Response.json([]));
  senderMock.mockReset().mockImplementation(async () => Response.json({ data: [
    { name: "operator.test", status: "verified", capabilities: { sending: "enabled" } },
  ] }));
  emailSendMock.mockReset().mockImplementation(async () => Response.json({ id: "mail_fixture" }));
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async (input, options) => {
    const url = String(input);
    if (url.startsWith("https://crt.sh/")) return sourceMock();
    if (url === "https://api.resend.com/domains") return senderMock();
    if (url === "https://api.resend.com/emails" && options?.method === "POST") return emailSendMock(input, options);
    throw new Error(`Unexpected external request: ${url}`);
  }));
});
afterEach(async () => { await client.exec("ALTER TABLE scan_targets ADD COLUMN IF NOT EXISTS industry TEXT;"); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
afterAll(() => client.close());

async function targets(...domains: string[]) {
  await ensureDbInitialized();
  await db.insert(scanTargets).values(domains.map((domain) => ({ domain, niche: "Reviewed business", industry: "services", source: "manual" })));
}

async function enableEmail() {
  for (const [key, value] of Object.entries({
    RESEND_API_KEY: "re_local_fixture", FROM_EMAIL: "offers@operator.test", OUTREACH_REPLY_TO: "optout@operator.test",
    OUTREACH_POSTAL_ADDRESS: "123 Test Street, Montgomery, AL 00000", OUTREACH_TEST_RECIPIENT: "operator@operator.test", OUTREACH_COMPLIANCE_CONFIRMED: "true",
  })) vi.stubEnv(key, value);
  const config = (await getStatus()).cycleConfig;
  await startScheduler({ cycleConfig: { ...config, autoSendOutreach: true } });
}

describe("autonomous customer-payment workflow", () => {
  it("starts from reviewed targets, creates draft offers and checkout, but does not fabricate revenue or send email without opt-in", async () => {
    await targets("one-business.com", "two-business.com");
    const result = await runOnce();
    expect(result).toMatchObject({ status: "completed", cycle: { summary: { domainsScanned: 2, dealsCreated: 2, outreachGenerated: 2, checkoutsCreated: 2 } } });
    expect(await db.select().from(opportunities)).toHaveLength(2);
    expect(await db.select().from(paymentRequests)).toHaveLength(2);
    expect(await db.select().from(financialTransactions)).toHaveLength(0);
    expect(emailSendMock).not.toHaveBeenCalled();
    const second = await runOnce({ force: true });
    expect(second.cycle?.summary).toMatchObject({ dealsCreated: 0, checkoutsCreated: 0, outreachGenerated: 0 });
    expect(checkoutMock).toHaveBeenCalledTimes(2);
  });
  it("never seeds or automatically scans fictional production prospects", async () => {
    await ensureDbInitialized();
    expect(await db.select().from(scanTargets)).toHaveLength(0);
    expect(await db.select().from(opportunities)).toHaveLength(0);
    expect((await runOnce()).cycle?.summary.domainsScanned).toBe(0);
    expect(runDomainAudit).not.toHaveBeenCalled();
  });
  it("resumes pending deals after configuration is enabled without duplicate invoices/deals", async () => {
    await targets("one-business.com");
    await runOnce({ force: true, cycleConfig: { autoCreateCheckout: false } });
    expect(await db.select().from(opportunities)).toHaveLength(1);
    expect(await db.select().from(paymentRequests)).toHaveLength(0);
    await runOnce({ force: true });
    expect(await db.select().from(opportunities)).toHaveLength(1);
    expect(await db.select().from(paymentRequests)).toHaveLength(1);
  });
  it("routes all test-mode emails to the operator inbox, includes opt-out identity, and avoids re-sending", async () => {
    await targets("one-business.com"); await enableEmail();
    await runOnce({ force: true });
    expect(emailSendMock).toHaveBeenCalledTimes(1);
    const args = emailSendMock.mock.calls[0];
    const mail = JSON.parse(String(args[1]?.body));
    expect(mail.to).toEqual(["operator@operator.test"]);
    expect(mail.subject).toMatch(/^\[TEST\]/);
    expect(mail.text).toContain("123 Test Street");
    expect(mail.text).toContain('reply "unsubscribe"');
    expect((await db.select().from(opportunities))[0]).toMatchObject({ status: "outreach_sent", outreachDeliveryStatus: "sent", outreachProviderId: "mail_fixture" });
    await runOnce({ force: true });
    expect(emailSendMock).toHaveBeenCalledTimes(1);
    expect(await db.select().from(financialTransactions)).toHaveLength(0);
  });
  it("does not automatically resend an indeterminate provider attempt", async () => {
    await targets("one-business.com"); await enableEmail();
    emailSendMock.mockRejectedValueOnce(new Error("Network interrupted"));
    await runOnce({ force: true });
    expect((await db.select().from(opportunities))[0].outreachDeliveryStatus).toBe("needs_review");
    await runOnce({ force: true });
    expect(emailSendMock).toHaveBeenCalledTimes(1);
  });
  it("does not offer checkout or send mail to guessed contacts", async () => {
    await targets("one-business.com");
    vi.mocked(findContact).mockResolvedValueOnce({ email: "info@one-business.com", contactName: null, contactRole: null, source: "none", confidence: "low", sourceUrl: null, mxRecords: [], verifiedAt: null });
    await runOnce({ force: true });
    expect(await db.select().from(opportunities)).toHaveLength(0);
    expect(checkoutMock).not.toHaveBeenCalled();
    expect(emailSendMock).not.toHaveBeenCalled();
  });
  it("skips inconclusive DNS failures instead of generating fabricated offers", async () => {
    await targets("one-business.com");
    vi.mocked(runDomainAudit).mockRejectedValueOnce(new Error("DNS unavailable"));
    const result = await runOnce({ force: true });
    expect(result.cycle?.summary).toMatchObject({ domainsScanned: 0, dealsCreated: 0 });
    expect((await db.select().from(scanTargets))[0]).toMatchObject({ isActive: true });
    expect((await db.select().from(scanTargets))[0].lastAuditedAt).toBeTruthy();
    expect(checkoutMock).not.toHaveBeenCalled();
  });
  it("retires only confirmed NXDOMAIN targets and preserves them for operator review", async () => {
    await targets("dead-business.com");
    vi.mocked(runDomainAudit).mockRejectedValueOnce(new Error("Domain does not resolve."));
    const result = await runOnce();
    expect((await db.select().from(scanTargets))[0]).toMatchObject({ isActive: false });
    expect(result.cycle?.steps.some((step) => step.message.includes("Target retired after definitive NXDOMAIN"))).toBe(true);
    await runOnce();
    expect(vi.mocked(runDomainAudit).mock.calls.map((args) => args[0])).toEqual(["dead-business.com"]);
  });
  it("rotates bounded batches across all active targets", async () => {
    await targets("one-business.com", "two-business.com");
    await runOnce({ force: true, cycleConfig: { maxDomainsPerCycle: 1 } });
    await runOnce({ force: true, cycleConfig: { maxDomainsPerCycle: 1 } });
    expect(vi.mocked(runDomainAudit).mock.calls.map((args) => args[0])).toEqual(["one-business.com", "two-business.com"]);
  });
  it("honors a remote Pause before checkout/email side effects", async () => {
    await targets("one-business.com");
    let started!: () => void; let finish!: (value: AuditResult) => void;
    const running = new Promise<void>((resolve) => { started = resolve; });
    const pendingAudit = new Promise<AuditResult>((resolve) => { finish = resolve; });
    vi.mocked(runDomainAudit).mockImplementationOnce(async () => { started(); return pendingAudit; });
    const pending = runOnce({ force: true }); await running;
    await stopScheduler(); finish(audit("one-business.com"));
    expect((await pending).status).toBe("stopped");
    expect(checkoutMock).not.toHaveBeenCalled();
    expect(emailSendMock).not.toHaveBeenCalled();
    expect((await getStatus()).enabled).toBe(false);
  });
  it("discovers a new observed candidate from an empty database, without an owner-supplied list, and persists both acquisition and cycle results", async () => {
    sourceMock.mockImplementation(async () => {
      const runs = await db.select().from(autonomousRuns);
      expect(runs.some((run) => run.status === "running")).toBe(true);
      return Response.json([{ id: 12345, name_value: "*.fresh-roofing.com" }]);
    });
    const response = await cron(new Request("https://zero-gravity.test/api/autonomous/cron", { headers: { authorization: "Bearer local-cron-fixture" } }));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({ status: "completed", cycle: { acquisition: { newInserted: 1 }, summary: { domainsScanned: 1, dealsCreated: 1, checkoutsCreated: 1 } } });
    const [target] = await db.select().from(scanTargets);
    const [deal] = await db.select().from(opportunities);
    const [run] = await db.select().from(autonomousRuns);
    expect(target).toMatchObject({ domain: "fresh-roofing.com", source: "ct_log", lastDealId: deal.id });
    expect(deal).toMatchObject({ autonomousDomain: target.domain, acquisitionSource: "ct_log", realizedRevenue: "0.00" });
    expect(JSON.parse(deal.auditData!)).toMatchObject({ acquisitionEvidence: { certificateId: "12345" }, contactEvidence: { sourceUrl: "https://fresh-roofing.com/contact", confidence: "high", mxRecords: ["10 mail.fresh-roofing.com"] } });
    expect(run).toMatchObject({ status: "completed", domainsScanned: 1, dealsCreated: 1, checkoutsCreated: 1 });
    expect(run.completedAt).toBeTruthy();
    expect(JSON.parse(run.details!).acquisition).toMatchObject({ newInserted: 1, errors: [] });
    expect(await getStatus()).toMatchObject({ cycleActive: false, totalRuns: 1, lastRunStatus: "completed" });
    expect(await db.select().from(financialTransactions)).toHaveLength(0);
    expect(emailSendMock).not.toHaveBeenCalled();
    expect((await runOnce({ force: true })).cycle?.acquisition).toMatchObject({ newInserted: 0, duplicatesSkipped: 1 });
    expect(await db.select().from(opportunities)).toHaveLength(1);
  });

  it("persists a failed discovery source and still processes existing real candidates", async () => {
    await targets("one-business.com");
    sourceMock.mockImplementation(async () => new Response("Unavailable", { status: 503 }));
    expect(await runOnce()).toMatchObject({ status: "completed", cycle: { acquisition: { errors: ["crt.sh returned 503"] }, summary: { dealsCreated: 1 } } });
    expect(JSON.parse((await db.select().from(autonomousRuns))[0].details!).acquisition.errors).toEqual(["crt.sh returned 503"]);
    expect((await getStatus()).lastRunReason).toContain("Discovery warning: crt.sh returned 503");
  });

  it.each(["audit", "contact", "checkout"])("one failed %s does not abort processing the next domain", async (stage) => {
    await targets("one-business.com", "two-business.com");
    if (stage === "audit") vi.mocked(runDomainAudit).mockRejectedValueOnce(new Error("Invalid or unavailable domain"));
    if (stage === "contact") vi.mocked(findContact).mockRejectedValueOnce(new Error("Contact provider unavailable"));
    if (stage === "checkout") checkoutMock.mockRejectedValueOnce(new Error("Checkout unavailable"));
    const result = await runOnce();
    expect(result.status).toBe("completed");
    expect((await db.select().from(opportunities)).some((deal) => deal.targetCompany === "two-business.com")).toBe(true);
    expect((await db.select().from(paymentRequests)).some((invoice) => invoice.clientName === "two-business.com" && invoice.status === "checkout_created")).toBe(true);
  });

  it("does not duplicate an already processed legacy domain with different casing", async () => {
    await targets("one-business.com");
    await db.insert(opportunities).values({ title: "Legacy", vector: "technical_leak_audit", targetCompany: " ONE-BUSINESS.COM ", targetContact: "Public contact", targetNiche: "Business" });
    expect((await runOnce()).cycle?.summary.dealsCreated).toBe(0);
    expect(await db.select().from(opportunities)).toHaveLength(1);
  });

  it("one corrupt legacy audit record cannot kill the batch", async () => {
    await targets("one-business.com", "two-business.com");
    await db.insert(opportunities).values({ title: "Legacy", vector: "technical_leak_audit", targetCompany: "one-business.com", targetContact: "Public contact", targetNiche: "Business", auditData: "not-json" });
    const result = await runOnce();
    expect(result.status).toBe("completed");
    expect(result.cycle?.steps.some((step) => step.domain === "one-business.com" && step.type === "skipped")).toBe(true);
    expect((await db.select().from(opportunities)).some((deal) => deal.targetCompany === "two-business.com")).toBe(true);
  });

  it("converts an interrupted sending claim to needs_review without automatically retrying", async () => {
    await targets("one-business.com"); await enableEmail();
    await runOnce({ cycleConfig: { autoSendOutreach: false } });
    await db.update(opportunities).set({ outreachDeliveryStatus: "sending", outreachAttemptedAt: new Date(Date.now() - 600_000) });
    await db.update(schedulerSettings).set({ leaseOwner: "terminated-worker", leaseExpiresAt: new Date(Date.now() - 1_000) });
    await runOnce({ force: true });
    expect((await db.select().from(opportunities))[0].outreachDeliveryStatus).toBe("needs_review");
    expect(emailSendMock).not.toHaveBeenCalled();
  });

  it("requires explicit authorization at the send boundary, not just credentials", async () => {
    await targets("one-business.com"); await enableEmail();
    await runOnce({ cycleConfig: { autoSendOutreach: false } });
    const [deal] = await db.select().from(opportunities);
    expect(await sendOutreach(deal.id)).toMatchObject({ sent: false, method: "skipped" });
    expect(emailSendMock).not.toHaveBeenCalled();
  });

  it.each(["unverified_sender", "sender_api_failure", "unconfirmed_compliance", "expired_checkout", "checkout_api_failure"])("withholds live commercial outreach for %s", async (failure) => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_local_fixture");
    await targets("one-business.com"); await enableEmail();
    if (failure === "unverified_sender") senderMock.mockImplementation(async () => Response.json({ data: [{ name: "operator.test", status: "pending", capabilities: { sending: "enabled" } }] }));
    if (failure === "sender_api_failure") senderMock.mockRejectedValue(new Error("Verification unavailable"));
    if (failure === "unconfirmed_compliance") vi.stubEnv("OUTREACH_COMPLIANCE_CONFIRMED", "false");
    if (failure === "expired_checkout") retrieveCheckoutMock.mockResolvedValue({ status: "expired" });
    if (failure === "checkout_api_failure") retrieveCheckoutMock.mockRejectedValue(new Error("Stripe unavailable"));
    await runOnce();
    expect(emailSendMock).not.toHaveBeenCalled();
    expect(await db.select().from(financialTransactions)).toHaveLength(0);
  });

  it("does not trust old contactSource/confidence labels without public evidence", async () => {
    await targets("one-business.com"); await enableEmail();
    await runOnce({ cycleConfig: { autoSendOutreach: false } });
    const [deal] = await db.select().from(opportunities);
    await db.update(opportunities).set({ auditData: JSON.stringify({ contactSource: "website", contactConfidence: "high" }) });
    expect(await sendOutreach(deal.id, { authorized: true })).toMatchObject({ sent: false, method: "skipped" });
    expect(emailSendMock).not.toHaveBeenCalled();
  });

  it("persists a failed cycle with completion time and releases its lease", async () => {
    await targets("one-business.com");
    await client.exec("ALTER TABLE scan_targets DROP COLUMN industry;");
    const result = await runOnce();
    expect(result.status).toBe("failed");
    const [run] = await db.select().from(autonomousRuns);
    expect(run.status).toBe("failed");
    expect(run.error).toBeTruthy();
    expect(run.completedAt).toBeTruthy();
    expect(JSON.parse(run.details!).acquisition).toMatchObject({ newInserted: 0 });
    expect(await getStatus()).toMatchObject({ cycleActive: false, consecutiveErrors: 1, lastRunStatus: "failed" });
  });

  it("canonicalizes legacy www targets without duplicating an already processed business", async () => {
    await targets("www.one-business.com");
    await db.insert(opportunities).values({ title: "Legacy", vector: "technical_leak_audit", targetCompany: "www.one-business.com", targetContact: "Public contact", targetNiche: "Business" });
    expect((await runOnce()).cycle?.summary.dealsCreated).toBe(0);
    expect(await db.select().from(opportunities)).toHaveLength(1);
  });

  it("never sends a test invoice when the configured test inbox is actually on the prospect domain", async () => {
    await targets("one-business.com"); await enableEmail();
    vi.stubEnv("OUTREACH_TEST_RECIPIENT", "owner@one-business.com");
    await runOnce();
    expect(emailSendMock).not.toHaveBeenCalled();
  });

  it("reverifies a resumed contact and skips an address that is no longer publicly verified", async () => {
    await targets("one-business.com");
    await runOnce({ cycleConfig: { autoCreateCheckout: false } });
    const [deal] = await db.select().from(opportunities);
    const metadata = JSON.parse(deal.auditData!);
    metadata.contactEvidence.verifiedAt = new Date(Date.now() - 86_400_000).toISOString();
    await db.update(opportunities).set({ auditData: JSON.stringify(metadata) });
    vi.mocked(findContact).mockResolvedValue({ email: null, contactName: null, contactRole: null, source: "none", confidence: "low", sourceUrl: null, mxRecords: [], verifiedAt: null });
    await runOnce({ force: true });
    expect(await db.select().from(opportunities)).toHaveLength(1);
    expect(checkoutMock).not.toHaveBeenCalled();
    expect(emailSendMock).not.toHaveBeenCalled();
  });

  it("preserves Stripe-verified custom checkout domains rather than assuming the default host", async () => {
    await targets("one-business.com"); await enableEmail();
    checkoutMock.mockImplementation(async (params) => ({ id: `cs_test_${params.metadata.paymentRequestId}`, url: `https://pay.operator.test/${params.metadata.paymentRequestId}` }));
    await runOnce();
    expect(emailSendMock).toHaveBeenCalledTimes(1);
    expect(retrieveCheckoutMock).toHaveBeenCalledTimes(1);
  });

});
