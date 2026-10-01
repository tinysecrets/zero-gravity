import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type StripeType from "stripe";

const checkoutMock = vi.hoisted(() => vi.fn());
vi.mock("@/db", async () => { const fixture = await import("./database"); return { db: fixture.db }; });
vi.mock("stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("stripe")>();
  return { ...actual, default: class extends actual.default {
    constructor(...args: ConstructorParameters<typeof actual.default>) {
      super(...args);
      this.checkout.sessions.create = checkoutMock;
    }
  } };
});

import Stripe from "stripe";
import { client, db, resetDatabase, setupDatabase } from "./database";
import { financialTransactions, opportunities, paymentRequests, revenueEvents } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { amountToCents, createPaymentCheckout } from "@/lib/payment-checkout";
import { recordStripePayment } from "@/lib/payment-settlement";
import { POST as webhook } from "@/app/api/payments/webhook/route";
import { GET as getPayment } from "@/app/api/payments/route";

beforeAll(setupDatabase);
beforeEach(async () => {
  await resetDatabase();
  checkoutMock.mockReset().mockImplementation(async (params) => ({ id: `cs_test_${params.metadata.paymentRequestId}`, url: `https://checkout.stripe.test/${params.metadata.paymentRequestId}` }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(async () => { await client.exec("ALTER TABLE revenue_events DROP CONSTRAINT IF EXISTS simulated_failure;"); vi.unstubAllEnvs(); });
afterAll(() => client.close());

async function fixtureInvoice(options: { amount?: string; livemode?: boolean; dealId?: number } = {}) {
  await ensureDbInitialized();
  const [deal] = options.dealId ? [{ id: options.dealId }] : await db.insert(opportunities).values({
    title: "Approved service", vector: "technical_leak_audit", targetCompany: "business.test",
    targetContact: "Public contact", targetNiche: "Business", potentialValue: options.amount || "350.00", status: "audited",
  }).returning();
  const livemode = options.livemode ?? true;
  const id = crypto.randomUUID();
  const [invoice] = await db.insert(paymentRequests).values({
    opportunityId: deal.id, referenceCode: `INV-${id}`, providerSessionId: `cs_${livemode ? "live" : "test"}_${id}`,
    amount: options.amount || "350.00", clientName: "Business", serviceDescription: "Approved service",
    status: "checkout_created", livemode,
  }).returning();
  return invoice;
}

function sessionFor(invoice: typeof paymentRequests.$inferSelect, overrides: Partial<StripeType.Checkout.Session> = {}): StripeType.Checkout.Session {
  return {
    id: invoice.providerSessionId!, object: "checkout.session", mode: "payment", payment_status: "paid",
    client_reference_id: invoice.referenceCode, amount_total: amountToCents(invoice.amount),
    currency: invoice.currency, livemode: invoice.livemode,
    metadata: { paymentRequestId: String(invoice.id), referenceCode: invoice.referenceCode }, ...overrides,
  } as StripeType.Checkout.Session;
}

function signedRequest(session: StripeType.Checkout.Session, type = "checkout.session.completed") {
  const payload = JSON.stringify({ id: `evt_${crypto.randomUUID()}`, object: "event", type, livemode: session.livemode, data: { object: session } });
  const stripe = new Stripe("sk_test_local_fixture");
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_local_fixture" });
  return new Request("https://zero-gravity.test/api/payments/webhook", { method: "POST", headers: { "stripe-signature": signature }, body: payload });
}

describe("hosted checkout creation", () => {
  it.each([0, -1, NaN, Infinity, 0.009, 1.001, 1_000_000])("rejects invalid USD amount %s", (amount) => {
    expect(() => amountToCents(amount)).toThrow();
  });
  it("saves the invoice before calling Stripe and uses a public URL and idempotency key", async () => {
    await ensureDbInitialized();
    checkoutMock.mockImplementationOnce(async (params, options) => {
      const rows = await db.select().from(paymentRequests);
      expect(rows).toHaveLength(1);
      expect(params.success_url).toBe("https://zero-gravity.test/payment/success?session_id={CHECKOUT_SESSION_ID}");
      expect(params.line_items[0].price_data.unit_amount).toBe(35000);
      expect(options.idempotencyKey).toBe(`checkout-${rows[0].referenceCode}`);
      return { id: "cs_test_fixture", url: "https://checkout.stripe.test/fixture" };
    });
    const result = await createPaymentCheckout({ amount: "350.00", clientName: "Business", serviceDescription: "Agreed service" });
    expect(result).toMatchObject({ providerConfigured: true, created: true, paymentRequest: { status: "checkout_created", livemode: false } });
    expect(await db.select().from(financialTransactions)).toHaveLength(0);
  });
  it("reuses the same draft/provider idempotency key after a transient checkout failure", async () => {
    const invoice = await fixtureInvoice({ livemode: false });
    await db.delete(paymentRequests);
    checkoutMock.mockRejectedValueOnce(new Error("Provider temporarily unavailable"));
    const input = { opportunityId: invoice.opportunityId, amount: "350.00", clientName: "Business", serviceDescription: "Agreed service", reusePending: true };
    await expect(createPaymentCheckout(input)).rejects.toThrow();
    const saved = (await db.select().from(paymentRequests))[0];
    const result = await createPaymentCheckout(input);
    expect(result.paymentRequest.id).toBe(saved.id);
    expect(await db.select().from(paymentRequests)).toHaveLength(1);
    expect(checkoutMock.mock.calls[0][1].idempotencyKey).toBe(checkoutMock.mock.calls[1][1].idempotencyKey);
    await createPaymentCheckout(input);
    expect(checkoutMock).toHaveBeenCalledTimes(2);
  });
  it("does not create checkout when webhook verification is not configured", async () => {
    await ensureDbInitialized(); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect(await createPaymentCheckout({ amount: 350, clientName: "Business", serviceDescription: "Service" })).toMatchObject({ providerConfigured: false, created: false });
    expect(checkoutMock).not.toHaveBeenCalled();
    expect(await db.select().from(financialTransactions)).toHaveLength(0);
  });
  it("does not permit a public session lookup to fall back to an invoice reference", async () => {
    const invoice = await fixtureInvoice();
    const response = await getPayment(new Request(`https://zero-gravity.test/api/payments?session_id=cs_test_wrong&reference=${invoice.referenceCode}`));
    expect(response.status).toBe(404);
  });
});

describe("atomic payment recording", () => {
  it("records concurrent paid-event retries exactly once", async () => {
    const invoice = await fixtureInvoice();
    const session = sessionFor(invoice);
    const results = await Promise.all([recordStripePayment(session), recordStripePayment(session), recordStripePayment(session)]);
    expect(results.filter((r) => "idempotent" in r && r.idempotent)).toHaveLength(2);
    expect(await db.select().from(financialTransactions)).toHaveLength(1);
    expect(await db.select().from(revenueEvents)).toHaveLength(1);
    expect((await db.select().from(opportunities))[0]).toMatchObject({ status: "revenue_collected", realizedRevenue: "350.00" });
    expect((await db.select().from(paymentRequests))[0].transactionId).toBeTruthy();
  });
  it("adds different concurrent invoices without losing opportunity revenue", async () => {
    const first = await fixtureInvoice();
    const second = await fixtureInvoice({ amount: "250.00", dealId: first.opportunityId! });
    await Promise.all([recordStripePayment(sessionFor(first)), recordStripePayment(sessionFor(second))]);
    expect((await db.select().from(opportunities))[0].realizedRevenue).toBe("600.00");
    expect(await db.select().from(financialTransactions)).toHaveLength(2);
  });
  it("confirms test payments without recording real cash or marking a deal won", async () => {
    const invoice = await fixtureInvoice({ livemode: false });
    expect(await recordStripePayment(sessionFor(invoice))).toMatchObject({ paymentRecorded: true, livemode: false });
    expect(await db.select().from(financialTransactions)).toHaveLength(0);
    expect(await db.select().from(revenueEvents)).toHaveLength(0);
    expect((await db.select().from(opportunities))[0]).toMatchObject({ status: "audited", realizedRevenue: "0.00" });
    expect((await db.select().from(paymentRequests))[0].status).toBe("paid");
  });
  it.each([
    { id: "cs_live_wrong" }, { amount_total: 1 }, { currency: "eur" }, { client_reference_id: "INV-wrong" }, { livemode: false },
  ])("rejects invoice/session mismatches: %s", async (overrides) => {
    const invoice = await fixtureInvoice();
    await expect(recordStripePayment(sessionFor(invoice, overrides))).rejects.toThrow(/does not match/);
    expect(await db.select().from(financialTransactions)).toHaveLength(0);
    expect((await db.select().from(paymentRequests))[0].status).toBe("checkout_created");
  });
  it("awaits unpaid sessions rather than creating ledger entries", async () => {
    const invoice = await fixtureInvoice();
    expect(await recordStripePayment(sessionFor(invoice, { payment_status: "unpaid" }))).toMatchObject({ status: "awaiting_payment" });
    expect(await db.select().from(financialTransactions)).toHaveLength(0);
  });
  it("rolls back all writes if attribution fails, then safely records a retry", async () => {
    const invoice = await fixtureInvoice();
    await client.exec("ALTER TABLE revenue_events ADD CONSTRAINT simulated_failure CHECK (event_type <> 'payment_verified');");
    await expect(recordStripePayment(sessionFor(invoice))).rejects.toThrow();
    expect(await db.select().from(financialTransactions)).toHaveLength(0);
    expect((await db.select().from(paymentRequests))[0].status).toBe("checkout_created");
    expect((await db.select().from(opportunities))[0].realizedRevenue).toBe("0.00");
    await client.exec("ALTER TABLE revenue_events DROP CONSTRAINT simulated_failure;");
    await recordStripePayment(sessionFor(invoice));
    expect(await db.select().from(financialTransactions)).toHaveLength(1);
  });
});

describe("signed webhook handling", () => {
  it("rejects missing/bad signatures before initializing the database", async () => {
    expect((await webhook(new Request("https://zero-gravity.test/api/payments/webhook", { method: "POST", body: "{}" }))).status).toBe(400);
    expect((await webhook(new Request("https://zero-gravity.test/api/payments/webhook", { method: "POST", headers: { "stripe-signature": "invalid" }, body: "{}" }))).status).toBe(400);
    expect((globalThis as typeof globalThis & { __zeroGravityDbInitialization?: unknown }).__zeroGravityDbInitialization).toBeUndefined();
  });
  it("accepts signed live paid events and acknowledges their retries", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_local_fixture");
    const invoice = await fixtureInvoice();
    const response = await webhook(signedRequest(sessionFor(invoice)));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ paymentRecorded: true, livemode: true });
    expect(await (await webhook(signedRequest(sessionFor(invoice), "checkout.session.async_payment_succeeded"))).json()).toMatchObject({ idempotent: true });
    expect(await db.select().from(financialTransactions)).toHaveLength(1);
  });
  it("rejects a signed event from the wrong configured Stripe mode", async () => {
    const invoice = await fixtureInvoice({ livemode: true });
    expect((await webhook(signedRequest(sessionFor(invoice)))).status).toBe(400);
    expect(await db.select().from(financialTransactions)).toHaveLength(0);
  });
  it("returns retriable 5xx for database failures, not signature failures", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_local_fixture");
    const invoice = await fixtureInvoice();
    await client.exec("ALTER TABLE revenue_events ADD CONSTRAINT simulated_failure CHECK (event_type <> 'payment_verified');");
    expect((await webhook(signedRequest(sessionFor(invoice)))).status).toBe(500);
    await client.exec("ALTER TABLE revenue_events DROP CONSTRAINT simulated_failure;");
    expect((await webhook(signedRequest(sessionFor(invoice)))).status).toBe(200);
  });
  it("marks expired unpaid invoices but does not overwrite paid invoices", async () => {
    const invoice = await fixtureInvoice({ livemode: false });
    await recordStripePayment(sessionFor(invoice));
    expect((await webhook(signedRequest(sessionFor(invoice), "checkout.session.expired"))).status).toBe(200);
    expect((await db.select().from(paymentRequests))[0].status).toBe("paid");
  });
});
