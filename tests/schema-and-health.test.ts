import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", async () => { const fixture = await import("./database"); return { db: fixture.db }; });

import { client, db, resetDatabase, setupDatabase } from "./database";
import { autonomousRuns, financialTransactions, opportunities, paymentRequests, revenueEvents, scanTargets, schedulerSettings } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { GET as health } from "@/app/api/health/route";

beforeAll(setupDatabase);
beforeEach(() => resetDatabase());
afterEach(async () => {
  await client.exec("ALTER TABLE scan_targets ADD COLUMN IF NOT EXISTS source_evidence TEXT;");
  vi.unstubAllEnvs();
});
afterAll(() => client.close());

describe("production schema and read-only health", () => {
  it("verifies every engine/ledger table without initialization, fake prospects, or job side effects", async () => {
    const response = await health();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, database: "connected", schema: { ready: true, missing: [] } });
    expect((globalThis as typeof globalThis & { __zeroGravityDbInitialization?: unknown }).__zeroGravityDbInitialization).toBeUndefined();
    expect(await db.select().from(schedulerSettings)).toHaveLength(0);
    expect(await db.select().from(scanTargets)).toHaveLength(0);
    expect(await db.select().from(autonomousRuns)).toHaveLength(0);
  });

  it("does not mistake database connectivity for a complete production schema", async () => {
    await client.exec("ALTER TABLE scan_targets DROP COLUMN source_evidence;");
    const response = await health();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ database: "connected", schema: { ready: false, missing: ["scan_targets.source_evidence"] } });
  });

  it("fails closed without database configuration and never exposes its credentials", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const response = await health();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ database: "not_configured" });
  });

  it("upgrades legacy tables idempotently without destroying existing prospects, payments, revenue, or saved Pause", async () => {
    const [deal] = await db.insert(opportunities).values([
      { title: "Legacy fixture", vector: "technical_leak_audit", targetCompany: "legacy-business.com", targetContact: "Public contact", targetNiche: "Business", realizedRevenue: "25.00" },
      { title: "Legacy duplicate retained", vector: "technical_leak_audit", targetCompany: "legacy-business.com", targetContact: "Public contact", targetNiche: "Business" },
    ]).returning();
    await db.insert(scanTargets).values({ domain: "legacy-business.com", source: "manual" });
    const [receipt] = await db.insert(financialTransactions).values({ opportunityId: deal.id, amount: "25.00", transactionType: "fix_bounty", description: "Isolated authenticated receipt fixture", verified: true }).returning();
    await db.insert(paymentRequests).values({ opportunityId: deal.id, referenceCode: "INV-legacy-fixture", providerSessionId: "cs_live_legacy_fixture", amount: "25.00", clientName: "Legacy fixture", serviceDescription: "Approved fixture service", status: "paid", livemode: true, transactionId: receipt.id });
    await db.insert(revenueEvents).values({ opportunityId: deal.id, transactionId: receipt.id, amount: "25.00", eventType: "payment_verified" });
    await db.insert(autonomousRuns).values({ id: "legacy-run", status: "completed" });
    await db.insert(schedulerSettings).values({ id: 1, enabled: false, autoCreateCheckout: false, autoSendOutreach: false });
    await client.exec("ALTER TABLE scan_targets DROP COLUMN source_evidence; ALTER TABLE opportunities DROP COLUMN autonomous_domain;");
    await ensureDbInitialized();
    delete (globalThis as typeof globalThis & { __zeroGravityDbInitialization?: unknown }).__zeroGravityDbInitialization;
    await ensureDbInitialized();
    expect(await db.select().from(opportunities)).toHaveLength(2);
    expect((await db.select().from(opportunities))[0].realizedRevenue).toBe("25.00");
    expect((await db.select().from(financialTransactions))[0].verified).toBe(true);
    expect((await db.select().from(paymentRequests))[0]).toMatchObject({ status: "paid", transactionId: receipt.id });
    expect(await db.select().from(revenueEvents)).toHaveLength(1);
    expect(await db.select().from(autonomousRuns)).toHaveLength(1);
    expect((await db.select().from(schedulerSettings))[0]).toMatchObject({ enabled: false, autoCreateCheckout: false, autoSendOutreach: false });
    expect((await db.select().from(scanTargets))[0].sourceEvidence).toBeNull();
    expect((await health()).status).toBe(200);
  });

  it("enforces one new autonomous opportunity per domain at the database boundary", async () => {
    const values = { title: "Fixture offer", vector: "technical_leak_audit", targetCompany: "business-roofing.com", targetContact: "Public contact", targetNiche: "Business", autonomousDomain: "business-roofing.com" };
    await db.insert(opportunities).values(values);
    expect(await db.insert(opportunities).values(values).onConflictDoNothing({ target: opportunities.autonomousDomain }).returning()).toHaveLength(0);
    expect(await db.select().from(opportunities)).toHaveLength(1);
  });
});
