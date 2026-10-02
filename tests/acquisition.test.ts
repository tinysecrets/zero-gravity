import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", async () => { const fixture = await import("./database"); return { db: fixture.db }; });

import { client, db, resetDatabase, setupDatabase } from "./database";
import { scanTargets } from "@/db/schema";
import { ensureDbInitialized } from "@/lib/db-seed";
import { acquireFromCTLogs, discoverPortfolio, importDomains } from "@/lib/prospect-acquisition";
import { publicBusinessDomain } from "@/lib/public-domain";

beforeAll(setupDatabase);
beforeEach(async () => {
  await resetDatabase();
  await ensureDbInitialized();
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json([])));
});
afterEach(async () => {
  await client.exec("ALTER TABLE scan_targets DROP CONSTRAINT IF EXISTS simulated_bad_domain;");
  vi.unstubAllGlobals(); vi.unstubAllEnvs();
});
afterAll(() => client.close());

describe("existing Certificate Transparency acquisition", () => {
  it("discovers only observed public domains, deduplicates names, and retains certificate evidence", async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json([
      { id: 12345, name_value: "*.sub.north-roofing.com\nWWW.NORTH-ROOFING.COM" },
      { id: 12346, common_name: "south-roofing.co.nz" },
      { id: 12347, name_value: "public-business.github.io" },
      { name_value: "127.0.0.1\nlocalhost\ninternal.local\n-invalid.com\na..com\nexample.com\nco.uk\nhttps://fabricated-roofing.com/path" },
      null, { name_value: 123 },
    ]));
    expect(await acquireFromCTLogs("roofing", "roofing")).toMatchObject({ domainsFound: 3, newInserted: 3, duplicatesSkipped: 0, errors: [] });
    const rows = await db.select().from(scanTargets);
    expect(rows.map((row) => row.domain).sort()).toEqual(["north-roofing.com", "public-business.github.io", "south-roofing.co.nz"]);
    expect(rows[0].source).toBe("ct_log");
    expect(JSON.parse(rows[0].sourceEvidence!)).toMatchObject({ certificateName: "*.sub.north-roofing.com", certificateId: "12345", certificateUrl: "https://crt.sh/?id=12345", sourceUrl: "https://crt.sh/?q=%25roofing%25&output=json" });
    expect(await acquireFromCTLogs("roofing")).toMatchObject({ newInserted: 0, duplicatesSkipped: 3 });
    expect(await db.select().from(scanTargets)).toHaveLength(3);
  });

  it("does not count candidates held back by the batch limit as duplicates and discovers new ones next time", async () => {
    await db.insert(scanTargets).values({ domain: "existing-roofing.com" });
    vi.mocked(fetch).mockImplementation(async () => Response.json([
      { name_value: "existing-roofing.com\nnew-roofing.com\nnext-roofing.com" },
    ]));
    expect(await acquireFromCTLogs("roofing", "roofing", 1)).toMatchObject({ domainsFound: 3, newInserted: 1, duplicatesSkipped: 1 });
    expect(await acquireFromCTLogs("roofing", "roofing", 1)).toMatchObject({ newInserted: 1, duplicatesSkipped: 2 });
  });

  it("counts concurrent unique-index conflicts accurately without duplicate targets", async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json([{ name_value: "one-roofing.com" }]));
    const results = await Promise.all([acquireFromCTLogs("roofing"), acquireFromCTLogs("roofing")]);
    expect(results.reduce((sum, result) => sum + result.newInserted, 0)).toBe(1);
    expect(results.reduce((sum, result) => sum + result.duplicatesSkipped, 0)).toBe(1);
    expect(await db.select().from(scanTargets)).toHaveLength(1);
  });

  it("keeps inserting good domains after one target fails", async () => {
    await client.exec("ALTER TABLE scan_targets ADD CONSTRAINT simulated_bad_domain CHECK (domain <> 'bad-roofing.com');");
    vi.mocked(fetch).mockImplementation(async () => Response.json([{ name_value: "bad-roofing.com\ngood-roofing.com" }]));
    const result = await acquireFromCTLogs("roofing");
    expect(result.newInserted).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect((await db.select().from(scanTargets))[0].domain).toBe("good-roofing.com");
  });

  it.each([503, 429])("returns an acquisition failure, not a thrown cycle-killing error, for HTTP %s", async (status) => {
    vi.mocked(fetch).mockImplementation(async () => new Response("Unavailable", { status }));
    expect(await acquireFromCTLogs("roofing")).toMatchObject({ newInserted: 0, errors: [`crt.sh returned ${status}`] });
  });

  it("tolerates a malformed response and network failure without inventing candidates", async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => Response.json({ error: "unavailable" }))
      .mockRejectedValueOnce(new Error("Network unavailable"));
    expect((await acquireFromCTLogs("roofing")).errors).toHaveLength(1);
    expect((await acquireFromCTLogs("roofing")).errors).toHaveLength(1);
    expect(await db.select().from(scanTargets)).toHaveLength(0);
  });

  it.each([-1, 0, 101, Infinity, 1.5])("rejects invalid acquisition limit %s before fetching", async (maxResults) => {
    expect((await acquireFromCTLogs("roofing", "roofing", maxResults)).errors).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves optional imports, validates domains, and reports actual insert counts", async () => {
    const text = "https://WWW.ONE-ROOFING.COM/contact\none-roofing.com\n127.0.0.1\ninternal.local\n-invalid.com";
    expect(await importDomains(text)).toMatchObject({ domainsFound: 1, newInserted: 1, duplicatesSkipped: 0 });
    expect(await importDomains(text)).toMatchObject({ newInserted: 0, duplicatesSkipped: 1 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("normalizes portfolio scope and does not accept a merely matching suffix", async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json([{ id: 12345, name_value: "sub.one-roofing.com\nnotone-roofing.com" }]));
    expect(await discoverPortfolio("https://WWW.ONE-ROOFING.COM")).toMatchObject({ domainsFound: 1, newInserted: 1 });
    expect((await db.select().from(scanTargets))[0]).toMatchObject({ domain: "one-roofing.com", source: "portfolio" });
    vi.mocked(fetch).mockClear();
    expect((await discoverPortfolio("127.0.0.1")).errors).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses public suffix boundaries instead of guessing business roots", () => {
    expect(publicBusinessDomain("sub.business.co.za")).toBe("business.co.za");
    expect(publicBusinessDomain("business.github.io")).toBe("business.github.io");
    expect(publicBusinessDomain("github.io")).toBeNull();
    expect(publicBusinessDomain("co.uk")).toBeNull();
  });
  it("backfills unknown legacy acquisition evidence only when the certificate is actually observed again", async () => {
    await db.insert(scanTargets).values([
      { domain: "observed-roofing.com", source: "ct_log" },
      { domain: "unobserved-roofing.com", source: "ct_log" },
    ]);
    vi.mocked(fetch).mockImplementation(async () => Response.json([{ id: 12345, name_value: "observed-roofing.com" }]));
    expect(await acquireFromCTLogs("roofing")).toMatchObject({ newInserted: 0, duplicatesSkipped: 1 });
    const rows = await db.select().from(scanTargets);
    expect(JSON.parse(rows.find((row) => row.domain === "observed-roofing.com")!.sourceEvidence!)).toMatchObject({ certificateId: "12345" });
    expect(rows.find((row) => row.domain === "unobserved-roofing.com")!.sourceEvidence).toBeNull();
  });

});
