import { afterEach, describe, expect, it, vi } from "vitest";
import { runDomainAudit } from "@/lib/audit-engine";

afterEach(() => vi.unstubAllGlobals());

describe("observed DNS audits", () => {
  it("does not convert a network failure into an actionable fabricated audit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("DNS unavailable")));
    await expect(runDomainAudit("business.test")).rejects.toThrow("DNS unavailable");
  });
  it("reports missing observed records, not invented lead-capture faults or revenue losses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ Status: 0, Answer: [] })));
    const audit = await runDomainAudit("business.test");
    expect(audit.estimatedMonthlyLeakage).toBe(0);
    expect(audit.recommendedFixBounty).toBe(0);
    expect(audit.readyOutreachCopy).not.toMatch(/\$\s?[\d,]+/);
    expect(audit.findings.some((f) => f.category === "Lead Capture")).toBe(false);
    expect(audit.readyOutreachCopy).not.toContain("30%");
    expect(audit.readyOutreachCopy).toContain("do not establish lost revenue");
  });
  it("parses observed SPF/DMARC/MX records and acknowledges monitoring can be intentional", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (input) => {
      const url = new URL(String(input));
      const name = url.searchParams.get("name");
      const type = url.searchParams.get("type");
      const answer = name?.startsWith("_dmarc") ? { type: 16, data: '"v=DMARC1; p=none;"' }
        : type === "MX" ? { type: 15, data: "10 mail.business.test" }
        : { type: 16, data: '"v=spf1 include:mail.business.test ~all"' };
      return Response.json({ Status: 0, Answer: [answer] });
    }));
    const result = await runDomainAudit("https://business.test/contact");
    expect(result).toMatchObject({ domain: "business.test", dmarcPresent: true, dmarcPolicy: "none", spfPresent: true, mxPresent: true, score: 80 });
    expect(result.findings[0].description).toContain("intentional");
  });
  it("does not create offers for non-existent/private/invalid domains", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ Status: 3 })));
    await expect(runDomainAudit("does-not-exist.test")).rejects.toThrow("does not resolve");
    await expect(runDomainAudit("127.0.0.1")).rejects.toThrow("public domain");
    await expect(runDomainAudit("localhost")).rejects.toThrow("public domain");
  });
});
