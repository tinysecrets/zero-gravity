import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { appOrigin, automationReadiness, defaultCycleConfig, nextVercelRun, parseCycleConfig, parseIntervalMinutes } from "@/lib/automation-config";
import { validCronAuthorization } from "@/lib/request-auth";

const relevantEnv = ["VERCEL", "VERCEL_ENV", "DATABASE_URL", "CRON_SECRET", "DASHBOARD_PASSWORD", "DASHBOARD_USERNAME", "OPERATOR_USERNAME", "OPERATOR_PASSWORD", "CTLOGS_API_KEY", "APP_URL", "NEXT_PUBLIC_APP_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "FROM_EMAIL", "OUTREACH_REPLY_TO", "OUTREACH_POSTAL_ADDRESS", "OUTREACH_TEST_RECIPIENT", "OUTREACH_COMPLIANCE_CONFIRMED", "AUTONOMOUS_SEND_OUTREACH", "AUTONOMOUS_CREATE_CHECKOUT", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"];
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
  it("does not require operator credentials during local test/development", () => {
    clearEnv();
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("DATABASE_URL", "postgresql://fixture"); vi.stubEnv("CRON_SECRET", "fixture");
    expect(automationReadiness(defaultCycleConfig())).toMatchObject({ ready: true });
  });
  it("blocks production automation until operator access is configured", () => {
    clearEnv();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("DATABASE_URL", "postgresql://fixture"); vi.stubEnv("CRON_SECRET", "fixture");
    expect(automationReadiness(defaultCycleConfig())).toMatchObject({
      ready: false,
      blockers: expect.arrayContaining([expect.stringContaining("OPERATOR_USERNAME and OPERATOR_PASSWORD")]),
    });
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
  it("protects the dashboard and management APIs with production Basic Auth", () => {
    clearEnv();
    vi.stubEnv("NODE_ENV", "production");
    for (const path of ["/", "/api/autonomous/schedule", "/api/payments?reference=INV-123"]) {
      const response = proxy(new NextRequest(`https://example.test${path}`));
      expect(response?.status).toBe(503);
      expect(response?.headers.get("cache-control")).toBe("no-store");
    }

    vi.stubEnv("OPERATOR_USERNAME", "operator");
    vi.stubEnv("OPERATOR_PASSWORD", "a-long-random-password-fixture-with-at-least-32-chars");
    const authorization = `Basic ${Buffer.from("operator:a-long-random-password-fixture-with-at-least-32-chars").toString("base64")}`;
    for (const path of ["/", "/api/autonomous/schedule", "/api/payments?reference=INV-123"]) {
      expect(proxy(new NextRequest(`https://example.test${path}`, { headers: { authorization } }))?.status).toBe(200);
    }
    const rejected = proxy(new NextRequest("https://example.test/api/autonomous/schedule", {
      headers: { authorization: "Basic d3Jvbmc6Y3JlZGVudGlhbHM=" },
    }));
    expect(rejected?.status).toBe(401);
    expect(rejected?.headers.get("www-authenticate")).toContain("Zero Gravity Operator");
  });
  it("keeps an unconfigured local dashboard convenient but fails closed on partial credentials", () => {
    clearEnv();
    expect(proxy(new NextRequest("https://example.test/"))?.status).toBe(200);
    vi.stubEnv("OPERATOR_USERNAME", "operator");
    expect(proxy(new NextRequest("https://example.test/"))?.status).toBe(503);
    vi.stubEnv("OPERATOR_PASSWORD", "too-short");
    expect(proxy(new NextRequest("https://example.test/"))?.status).toBe(503);
    vi.stubEnv("OPERATOR_USERNAME", "invalid:name");
    vi.stubEnv("OPERATOR_PASSWORD", "a-long-random-password-fixture-with-at-least-32-chars");
    expect(proxy(new NextRequest("https://example.test/"))?.status).toBe(503);
  });
  it("keeps signed-provider routes directly reachable without operator credentials", () => {
    clearEnv();
    vi.stubEnv("NODE_ENV", "production");
    for (const path of ["/api/health", "/api/payments/webhook", "/api/autonomous/cron", "/payment/success", "/api/payments?session_id=cs_test_random"]) {
      expect(proxy(new NextRequest(`https://example.test${path}`))?.status).toBe(200);
    }
  });
  it("allows same-origin management requests and rejects cross-origin mutations", () => {
    clearEnv();
    expect(proxy(new NextRequest("https://example.test/api/payments", { method: "POST", headers: { origin: "https://example.test" } }))?.status).toBe(200);
    expect(proxy(new NextRequest("https://example.test/api/payments", { method: "POST", headers: { origin: "https://attacker.test" } }))?.status).toBe(403);
  });
});
