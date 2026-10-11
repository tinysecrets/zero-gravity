import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/db", async () => { const fixture = await import("./database"); return { db: fixture.db }; });
import { client, db, resetDatabase, setupDatabase } from "./database";
import { contactLeads } from "@/db/schema";
import { POST as submitContact } from "@/app/api/public/contact/route";
import { allowPublicSubmission } from "@/lib/public-request-guard";

beforeAll(setupDatabase);
beforeEach(async () => {
  await resetDatabase();
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("FROM_EMAIL", "");
  vi.stubEnv("SALES_INBOX_EMAIL", "");
  vi.stubEnv("OUTREACH_REPLY_TO", "");
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => client.close());

function req(body: Record<string, unknown>, ip: string) {
  return new Request("https://zero-gravity.test/api/public/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://zero-gravity.test",
      "x-real-ip": ip,
      "x-forwarded-for": "198.51.100.111",
    },
    body: JSON.stringify(body),
  });
}

describe("public sales inquiry capture", () => {
  it("validates and persists inquiries without operator credentials", async () => {
    const r = await submitContact(req({
      name: "Taylor Customer", email: "taylor@example.com", domain: "Example.com",
      message: "Please review our domain configuration.", website: "",
    }, "203.0.113.45"));
    expect(r.status).toBe(201);
    expect(await r.json()).toMatchObject({ success: true });
    expect(await db.select().from(contactLeads)).toMatchObject([{
      kind: "contact", status: "new", name: "Taylor Customer", email: "taylor@example.com",
      domain: "example.com", message: "Please review our domain configuration.",
    }]);
  });

  it("rejects cross-origin and malformed requests", async () => {
    const cross = new Request("https://zero-gravity.test/api/public/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://attacker.invalid", "x-real-ip": "203.0.113.46" },
      body: JSON.stringify({ name: "Taylor", email: "taylor@example.com", domain: "example.com", message: "Hello" }),
    });
    expect((await submitContact(cross)).status).toBe(403);
    const bad = await submitContact(req({ name: "T", email: "bad", domain: "not a domain", message: "Hi" }, "203.0.113.47"));
    expect(bad.status).toBe(400);
    expect(await db.select().from(contactLeads)).toHaveLength(0);
  });

  it("rate-limits by trusted edge IP rather than a spoofed forwarded-for value", () => {
    const now = Date.now() + 120_000;
    for (let i = 0; i < 8; i += 1) {
      const request = new Request("https://zero-gravity.test/api/public/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", Origin: "https://zero-gravity.test",
          "x-real-ip": "192.0.2.222", "x-forwarded-for": "198.51.100." + (10 + i),
        },
        body: "{}",
      });
      expect(allowPublicSubmission(request, "spoof-audit", now)).toBe(true);
    }
    const ninth = new Request("https://zero-gravity.test/api/public/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", Origin: "https://zero-gravity.test",
        "x-real-ip": "192.0.2.222", "x-forwarded-for": "203.0.113.90",
      },
      body: "{}",
    });
    expect(allowPublicSubmission(ninth, "spoof-audit", now)).toBe(false);
  });

  it("drops honeypot submissions without storing them", async () => {
    const r = await submitContact(req({
      name: "Spam Bot", email: "bot@example.com", domain: "example.com", message: "Buy now", website: "spam",
    }, "203.0.113.48"));
    expect(r.status).toBe(200);
    expect(await db.select().from(contactLeads)).toHaveLength(0);
  });
});
