import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { appOrigin, automationReadiness, defaultCycleConfig, nextVercelRun, parseCycleConfig, parseIntervalMinutes } from "@/lib/automation-config";
import { validCronAuthorization } from "@/lib/request-auth";

const relevantEnv = ["VERCEL", "VERCEL_ENV", "DATABASE_URL", "CRON_SECRET", "DASHBOARD_PASSWORD", "DASHBOARD_USERNAME", "APP_URL", "NEXT_PUBLIC_APP_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "FROM_EMAIL", "OUTREACH_REPLY_TO", "OUTREACH_POSTAL_ADDRESS", "OUTREACH_TEST_RECIPIENT", "OUTREACH_COMPLIANCE_CONFIRMED", "AUTONOMOUS_SEND_OUTREACH", "AUTONOMOUS_CREATE_CHECKOUT", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"];
function clearEnv() { for (const key of relevantEnv) vi.stubEnv(key, ""); }
afterEach(() => vi.unstubAllEnvs());

describe("configuration boundaries", () => {
  it("does not turn credentials alone into payment/email automation", () => {
    clearEnv();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fixture");
    vi.stubEnv("RESEND_API_KEY", "email_fixture");
    expect(defaultCycleConfig()).toMatchObject({ autoCreateCheckout: false, autoSendOutreach: false });
  });
  it.each([NaN, Infinity, -1, 0, 101, "65", 1.5])("rejects invalid score %s", (value) => {
    expect(() => parseCycleConfig({ scoreThreshold: value })).toThrow();
  });
  it.each(["true", 1, null])("rejects nonboolean automation flags %s", (value) => {
    expect(() => parseCycleConfig({ autoSendOutreach: value })).toThrow();
  });
  it("accepts false, partial configuration, and bounded batch sizes", () => {
    expect(parseCycleConfig({ autoCreateDeals: false, scoreThreshold: 1, maxDomainsPerCycle: 10 })).toEqual({ autoCreateDeals: false, scoreThreshold: 1, maxDomainsPerCycle: 10 });
    expect(() => parseCycleConfig({ maxDomainsPerCycle: 11 })).toThrow();
    expect(() => parseCycleConfig(null)).toThrow();
    expect(() => parseIntervalMinutes(NaN)).toThrow();
    expect(() => parseIntervalMinutes("15")).toThrow();
  });
  it("computes the next daily 13:00 UTC window across dates", () => {
    expect(nextVercelRun(new Date("2026-10-01T12:59:00Z")).toISOString()).toBe("2026-10-01T13:00:00.000Z");
    expect(nextVercelRun(new Date("2026-10-01T13:00:00Z")).toISOString()).toBe("2026-10-02T13:00:00.000Z");
    expect(nextVercelRun(new Date("2026-12-31T23:00:00Z")).toISOString()).toBe("2027-01-01T13:00:00.000Z");
  });
  it("never generates autonomous Vercel callbacks to localhost", () => {
    clearEnv(); vi.stubEnv("VERCEL", "1"); vi.stubEnv("APP_URL", "http://localhost:3000");
    expect(() => appOrigin()).toThrow();
    vi.stubEnv("APP_URL", ""); vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "production.example.test");
    expect(appOrigin()).toBe("https://production.example.test");
  });
  it("prioritizes the server public URL and rejects credential-bearing URLs", () => {
    clearEnv(); vi.stubEnv("APP_URL", "https://production.example.test/path"); vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(appOrigin()).toBe("https://production.example.test");
    vi.stubEnv("APP_URL", "https://user:password@example.test");
    expect(() => appOrigin()).toThrow();
  });
  it("does not require a dashboard password for a passwordless dashboard", () => {
    clearEnv();
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("DATABASE_URL", "postgresql://fixture"); vi.stubEnv("CRON_SECRET", "fixture");
    expect(automationReadiness(defaultCycleConfig())).toMatchObject({ ready: true });
  });
  it("lists missing infrastructure and test email safeguards without secret values", () => {
    clearEnv(); vi.stubEnv("VERCEL", "1"); vi.stubEnv("DATABASE_URL", "fixture-secret"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture-secret");
    const result = automationReadiness({ ...defaultCycleConfig(), autoCreateCheckout: true, autoSendOutreach: true });
    expect(result.ready).toBe(false);
    expect(result.paymentMode).toBe("test");
    expect(result.blockers.join(" ")).toContain("OUTREACH_TEST_RECIPIENT");
    expect(JSON.stringify(result)).not.toContain("fixture-secret");
  });
});

describe("request authentication", () => {
  it("requires a configured cron secret and an exact Bearer token", () => {
    clearEnv();
    expect(validCronAuthorization(new Request("https://example.test"))).toBe(false);
    vi.stubEnv("CRON_SECRET", "fixture");
    expect(validCronAuthorization(new Request("https://example.test", { headers: { Authorization: "Bearer wrong" } }))).toBe(false);
    expect(validCronAuthorization(new Request("https://example.test", { headers: { Authorization: "Bearer fixture" } }))).toBe(true);
  });
  it("does not challenge the operator dashboard with Basic Auth", () => {
    clearEnv();
    expect(proxy(new NextRequest("https://example.test/"))?.status).toBe(200);
    expect(proxy(new NextRequest("https://example.test/api/autonomous/schedule"))?.status).toBe(200);
    expect(proxy(new NextRequest("https://example.test/api/payments?reference=INV-123"))?.status).toBe(200);
  });
  it("keeps signed-provider routes directly reachable", () => {
    clearEnv();
    for (const path of ["/api/payments/webhook", "/api/autonomous/cron", "/payment/success", "/api/payments?session_id=cs_test_random"]) {
      expect(proxy(new NextRequest(`https://example.test${path}`))?.status).toBe(200);
    }
  });
  it("allows same-origin management requests and rejects cross-origin mutations", () => {
    clearEnv();
    expect(proxy(new NextRequest("https://example.test/api/payments", { method: "POST", headers: { origin: "https://example.test" } }))?.status).toBe(200);
    expect(proxy(new NextRequest("https://example.test/api/payments", { method: "POST", headers: { origin: "https://attacker.test" } }))?.status).toBe(403);
  });
});
