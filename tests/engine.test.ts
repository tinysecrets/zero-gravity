import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditResult } from "@/lib/audit-engine";

const checkoutMock = vi.hoisted(() => vi.fn());
vi.mock("@/db", async () => { const fixture = await import("./database"); return { db: fixture.db }; });
vi.mock("@/lib/audit-engine", () => ({ runDomainAudit: vi.fn() }));
vi.mock("@/lib/contact-finder", () => ({ findContact: vi.fn() }));
vi.mock("stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("stripe")>();
  return { ...actual, default: class extends actual.default {
    constructor(...args: ConstructorParameters<typeof actual.default>) { super(...args); this.checkout.sessions.create = checkoutMock; }
  } };
});

import { client, db, resetDatabase, setupDatabase } from "./database";
import { opportunities, paymentRequests, financialTransactions, scanTargets } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { runDomainAudit } from "@/lib/audit-engine";
import { findContact } from "@/lib/contact-finder";
import { getStatus, runOnce, startScheduler, stopScheduler } from "@/lib/scheduler";

function audit(domain = "business.test"): AuditResult {
  return {
    domain, score: 35, grade: "F", dmarcPresent: false, dmarcPolicy: "none", spfPresent: false, spfRecord: "", mxPresent: true, mxRecords: ["10 mail.business.test"],
    findings: [
      { category: "Deliverability", severity: "Critical", title: "DMARC record not found", description: "No public DMARC record returned.", impact: "Authentication needs review." },
      { category: "Deliverability", severity: "Critical", title: "SPF record not found", description: "No public SPF record returned.", impact: "Authentication needs review." },
    ], estimatedMonthlyLeakage: 0, recommendedFixBounty: 350, remediationSnippet: "Review owner authorization.", readyOutreachCopy: "Observed DNS records only.",
  };
}

beforeAll(setupDatabase);
beforeEach(async () => {
  await resetDatabase();
  vi.mocked(runDomainAudit).mockReset().mockImplementation(async (domain) => audit(domain));
  vi.mocked(findContact).mockReset().mockImplementation(async (domain) => ({ email: `owner@${domain}`, contactName: "Test Owner", contactRole: "Owner", source: "website", confidence: "high" }));
  checkoutMock.mockReset().mockImplementation(async (params) => ({ id: `cs_test_${params.metadata.paymentRequestId}`, url: `https://checkout.stripe.test/${params.metadata.paymentRequestId}` }));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ id: "mail_fixture" })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
afterAll(() => client.close());

async function targets(...domains: string[]) {
  await ensureDbInitialized();
  await db.insert(scanTargets).values(domains.map((domain) => ({ domain, niche: "Reviewed business", industry: "services", source: "manual" })));
}

async function enableEmail() {
  for (const [key, value] of Object.entries({
    RESEND_API_KEY: "re_local_fixture", FROM_EMAIL: "offers@operator.test", OUTREACH_REPLY_TO: "optout@operator.test",
    OUTREACH_POSTAL_ADDRESS: "123 Test Street, Montgomery, AL 00000", OUTREACH_TEST_RECIPIENT: "operator@operator.test",
  })) vi.stubEnv(key, value);
  const config = (await getStatus()).cycleConfig;
  await startScheduler({ cycleConfig: { ...config, autoSendOutreach: true } });
}

describe("autonomous customer-payment workflow", () => {
  it("starts from reviewed targets, creates draft offers and checkout, but does not fabricate revenue or send email without opt-in", async () => {
    await targets("one-business.test", "two-business.test");
    const result = await runOnce();
    expect(result).toMatchObject({ status: "completed", cycle: { summary: { domainsScanned: 2, dealsCreated: 2, outreachGenerated: 2, checkoutsCreated: 2 } } });
    expect(await db.select().from(opportunities)).toHaveLength(2);
    expect(await db.select().from(paymentRequests)).toHaveLength(2);
    expect(await db.select().from(financialTransactions)).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
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
    await targets("one-business.test");
    await runOnce({ force: true, cycleConfig: { autoCreateCheckout: false } });
    expect(await db.select().from(opportunities)).toHaveLength(1);
    expect(await db.select().from(paymentRequests)).toHaveLength(0);
    await runOnce({ force: true });
    expect(await db.select().from(opportunities)).toHaveLength(1);
    expect(await db.select().from(paymentRequests)).toHaveLength(1);
  });
  it("routes all test-mode emails to the operator inbox, includes opt-out identity, and avoids re-sending", async () => {
    await targets("one-business.test"); await enableEmail();
    await runOnce({ force: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    const args = vi.mocked(fetch).mock.calls[0];
    const mail = JSON.parse(String(args[1]?.body));
    expect(mail.to).toEqual(["operator@operator.test"]);
    expect(mail.subject).toMatch(/^\[TEST\]/);
    expect(mail.text).toContain("123 Test Street");
    expect(mail.text).toContain('reply "unsubscribe"');
    expect((await db.select().from(opportunities))[0]).toMatchObject({ status: "outreach_sent", outreachDeliveryStatus: "sent", outreachProviderId: "mail_fixture" });
    await runOnce({ force: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await db.select().from(financialTransactions)).toHaveLength(0);
  });
  it("does not automatically resend an indeterminate provider attempt", async () => {
    await targets("one-business.test"); await enableEmail();
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network interrupted"));
    await runOnce({ force: true });
    expect((await db.select().from(opportunities))[0].outreachDeliveryStatus).toBe("needs_review");
    await runOnce({ force: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not offer checkout or send mail to guessed contacts", async () => {
    await targets("one-business.test");
    vi.mocked(findContact).mockResolvedValueOnce({ email: "info@one-business.test", contactName: null, contactRole: null, source: "pattern", confidence: "low" });
    await runOnce({ force: true });
    expect(await db.select().from(opportunities)).toHaveLength(0);
    expect(checkoutMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("skips inconclusive DNS failures instead of generating fabricated offers", async () => {
    await targets("one-business.test");
    vi.mocked(runDomainAudit).mockRejectedValueOnce(new Error("DNS unavailable"));
    const result = await runOnce({ force: true });
    expect(result.cycle?.summary).toMatchObject({ domainsScanned: 0, dealsCreated: 0 });
    expect((await db.select().from(scanTargets))[0].lastAuditedAt).toBeTruthy();
    expect(checkoutMock).not.toHaveBeenCalled();
  });
  it("rotates bounded batches across all active targets", async () => {
    await targets("one-business.test", "two-business.test");
    await runOnce({ force: true, cycleConfig: { maxDomainsPerCycle: 1 } });
    await runOnce({ force: true, cycleConfig: { maxDomainsPerCycle: 1 } });
    expect(vi.mocked(runDomainAudit).mock.calls.map((args) => args[0])).toEqual(["one-business.test", "two-business.test"]);
  });
  it("honors a remote Pause before checkout/email side effects", async () => {
    await targets("one-business.test");
    let started!: () => void; let finish!: (value: AuditResult) => void;
    const running = new Promise<void>((resolve) => { started = resolve; });
    const pendingAudit = new Promise<AuditResult>((resolve) => { finish = resolve; });
    vi.mocked(runDomainAudit).mockImplementationOnce(async () => { started(); return pendingAudit; });
    const pending = runOnce({ force: true }); await running;
    await stopScheduler(); finish(audit("one-business.test"));
    expect((await pending).status).toBe("stopped");
    expect(checkoutMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect((await getStatus()).enabled).toBe(false);
  });
});
