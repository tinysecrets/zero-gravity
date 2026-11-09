import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/db", async () => { const fixture = await import("./database"); return { db: fixture.db }; });
vi.mock("@/lib/audit-engine", () => ({
  runDomainAudit: vi.fn(async (domain: string) => ({
    domain, score: 80, grade: "B", dmarcPresent: true, dmarcPolicy: "quarantine",
    spfPresent: true, spfRecord: "v=spf1 -all", mxPresent: true, mxRecords: ["10 mail.example.com"],
    findings: [{ category: "Security", severity: "Warning", title: "DMARC policy", description: "Policy observed.", impact: "Review reports before changing policy." }],
    estimatedMonthlyLeakage: 0, recommendedFixBounty: 0,
    remediationSnippet: "Review authorized senders before making changes.",
    readyOutreachCopy: "",
  })),
}));
import { db, client, resetDatabase, setupDatabase } from "./database";
import { contactLeads } from "@/db/schema";
import { runDomainAudit } from "@/lib/audit-engine";
import { POST as preparePaidReport } from "@/app/api/private/leads/[id]/report/route";

beforeAll(setupDatabase);
beforeEach(async () => { await resetDatabase(); vi.clearAllMocks(); });
afterAll(() => client.close());

describe("paid customer report preparation", () => {
  it("prepares a draft only for a provider-confirmed paid checkout and does not send it", async () => {
    const [lead] = await db.insert(contactLeads).values({
      kind: "checkout", status: "paid", name: "Taylor Customer",
      email: "taylor@example.com", domain: "Example.com",
      message: "Requested Domain Signals Review at $149 USD.",
      paymentReference: "ZG-PAID-1",
    }).returning();
    const response = await preparePaidReport(
      new Request("https://zero-gravity.test/api/private/leads/" + lead.id + "/report", { method: "POST" }),
      { params: Promise.resolve({ id: String(lead.id) }) },
    );
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      success: true,
      draft: {
        leadId: lead.id, customerName: "Taylor Customer",
        customerEmail: "taylor@example.com", domain: "example.com",
        status: "draft_for_human_review",
      },
    });
    expect(result.draft.reportText).toContain("DRAFT FOR HUMAN REVIEW — NOT YET SENT TO CUSTOMER");
    expect(result.draft.reportText).toContain("HUMAN REVIEW BEFORE DELIVERY");
    expect(runDomainAudit).toHaveBeenCalledWith("example.com");
    const [unchanged] = await db.select().from(contactLeads);
    expect(unchanged.status).toBe("paid");
  });

  it("refuses unpaid and test-paid orders", async () => {
    for (const status of ["checkout_created", "test_paid"]) {
      const [lead] = await db.insert(contactLeads).values({
        kind: "checkout", status, name: "Taylor Customer",
        email: "taylor@example.com", domain: "example.com",
      }).returning();
      const response = await preparePaidReport(
        new Request("https://zero-gravity.test/api/private/leads/" + lead.id + "/report", { method: "POST" }),
        { params: Promise.resolve({ id: String(lead.id) }) },
      );
      expect(response.status).toBe(409);
    }
    expect(runDomainAudit).not.toHaveBeenCalled();
  });

  it("rejects malformed order identifiers", async () => {
    const response = await preparePaidReport(
      new Request("https://zero-gravity.test/api/private/leads/not-an-id/report", { method: "POST" }),
      { params: Promise.resolve({ id: "not-an-id" }) },
    );
    expect(response.status).toBe(400);
    expect(runDomainAudit).not.toHaveBeenCalled();
  });
});
