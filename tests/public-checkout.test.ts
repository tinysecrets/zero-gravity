import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const checkoutMock = vi.hoisted(() => vi.fn());
vi.mock("@/db", async () => { const fixture = await import("./database"); return { db: fixture.db }; });
vi.mock("@/lib/payment-checkout", () => ({ createPaymentCheckout: checkoutMock }));
import { client, db, resetDatabase, setupDatabase } from "./database";
import { contactLeads } from "@/db/schema";
import { POST as startPublicCheckout } from "@/app/api/public/checkout/route";

beforeAll(setupDatabase);
beforeEach(async () => {
  await resetDatabase({ STRIPE_SECRET_KEY: "sk_live_local_fixture", STRIPE_WEBHOOK_SECRET: "whsec_local_fixture" });
  checkoutMock.mockReset();
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => client.close());

function request(body: Record<string, unknown>, ip = "203.0.113.74") {
  return new Request("https://zero-gravity.test/api/public/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://zero-gravity.test", "x-real-ip": ip },
    body: JSON.stringify(body),
  });
}

describe("public fixed-price Checkout route", () => {
  it("rejects malformed order details before writing a lead or calling Stripe", async () => {
    const response = await startPublicCheckout(request({
      name: "T", email: "not-an-email", domain: "not a domain", website: "",
    }));
    expect(response.status).toBe(400);
    expect(await db.select().from(contactLeads)).toHaveLength(0);
    expect(checkoutMock).not.toHaveBeenCalled();
  });

  it("creates a $149 live-mode checkout and links the private lead to the invoice reference", async () => {
    checkoutMock.mockResolvedValue({
      providerConfigured: true, created: true,
      paymentRequest: {
        id: 246, referenceCode: "INV-AUDIT246",
        checkoutUrl: "https://checkout.stripe.com/c/pay/cs_live_audit",
      },
    });
    const response = await startPublicCheckout(request({
      name: "Audit Customer", email: "buyer@example.com", domain: "Example.com", website: "",
    }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      success: true, amount: 149, currency: "usd",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_live_audit",
      referenceCode: "INV-AUDIT246",
    });
    expect(checkoutMock).toHaveBeenCalledWith(expect.objectContaining({
      amount: 149, clientName: "Audit Customer", customerEmail: "buyer@example.com",
      serviceDescription: "Domain Signals Review — one authorized domain (example.com)",
    }));
    expect(await db.select().from(contactLeads)).toMatchObject([{
      kind: "checkout", status: "checkout_created", name: "Audit Customer",
      email: "buyer@example.com", domain: "example.com", paymentReference: "INV-AUDIT246",
    }]);
  });

  it("fails closed on a test-mode key in production", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_local_fixture");
    const response = await startPublicCheckout(request({
      name: "Audit Customer", email: "buyer@example.com", domain: "example.com", website: "",
    }, "203.0.113.75"));
    expect(response.status).toBe(503);
    expect(await db.select().from(contactLeads)).toHaveLength(0);
    expect(checkoutMock).not.toHaveBeenCalled();
  });
});
