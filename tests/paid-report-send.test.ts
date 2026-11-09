import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/db", async () => { const fixture = await import("./database"); return { db: fixture.db }; });
import { db, client, resetDatabase, setupDatabase } from "./database";
import { contactLeads } from "@/db/schema";
import { POST as sendPaidReport } from "@/app/api/private/leads/[id]/report/send/route";

beforeAll(setupDatabase);
beforeEach(async () => {
  await resetDatabase();
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("FROM_EMAIL", "reports@wah-lah.com");
  vi.stubEnv("OUTREACH_REPLY_TO", "support@wah-lah.com");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
afterAll(() => client.close());

const reportText = [
  "ZERO GRAVITY — DOMAIN SIGNALS REVIEW",
  "DRAFT FOR HUMAN REVIEW — NOT YET SENT TO CUSTOMER",
  "Customer: Taylor Customer",
  "Domain: example.com",
  "PUBLIC DNS OBSERVATIONS",
  "SPF record observed: Yes",
  "DMARC record observed: Yes",
  "FINDINGS",
  "A carefully reviewed finding with supporting evidence and context for the customer.",
  "RECOMMENDED REVIEW CHECKLIST",
  "Confirm authorized senders before changing production policy.",
  "LIMITATIONS",
  "This report reflects public DNS observations and does not prove inbox placement, loss, compromise or compliance.",
  "HUMAN REVIEW BEFORE DELIVERY",
  "- Confirm authorization and verify all findings before sending.",
].join("\n");

async function paidLead() {
  const [lead] = await db.insert(contactLeads).values({
    kind: "checkout", status: "paid", name: "Taylor Customer",
    email: "taylor@example.com", domain: "example.com",
    paymentReference: "ZG-PAID-EMAIL-1",
  }).returning();
  return lead;
}

function request(id: number, body: Record<string, unknown>) {
  return new Request("https://zero-gravity.test/api/private/leads/" + id + "/report/send", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://zero-gravity.test" },
    body: JSON.stringify(body),
  });
}

describe("operator-approved paid report email delivery", () => {
  it("sends only to the paid customer's saved email and marks the order delivered", async () => {
    const lead = await paidLead();
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ id: "email_report_123" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await sendPaidReport(request(lead.id, { approved: true, reportText }), {
      params: Promise.resolve({ id: String(lead.id) }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true, accepted: true, emailId: "email_report_123",
      customerEmail: "taylor@example.com", status: "sent",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.resend.com/emails");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer re_test_key",
      "Idempotency-Key": "zg-paid-report-" + lead.id,
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      from: "reports@wah-lah.com",
      to: ["taylor@example.com"],
      reply_to: "support@wah-lah.com",
      subject: "Your Zero Gravity Domain Signals Review — example.com",
      text: expect.any(String),
    });
    const sentText = JSON.parse(String(init?.body)).text as string;
    expect(sentText).toContain("CUSTOMER COPY");
    expect(sentText).not.toContain("DRAFT FOR HUMAN REVIEW");
    expect(sentText).not.toContain("HUMAN REVIEW BEFORE DELIVERY");
    expect(sentText).toContain("LIMITATIONS");
    const [saved] = await db.select().from(contactLeads);
    expect(saved.status).toBe("sent");
    expect(saved.notificationStatus).toBe("report_sent:email_report_123");
  });

  it("requires explicit human approval before sending", async () => {
    const lead = await paidLead();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await sendPaidReport(request(lead.id, { approved: false, reportText }), {
      params: Promise.resolve({ id: String(lead.id) }),
    });
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unpaid, test-paid and already-sent orders", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const status of ["checkout_created", "test_paid", "sent"]) {
      const [lead] = await db.insert(contactLeads).values({
        kind: "checkout", status, name: "Taylor Customer",
        email: "taylor@example.com", domain: "example.com",
      }).returning();
      const response = await sendPaidReport(request(lead.id, { approved: true, reportText }), {
        params: Promise.resolve({ id: String(lead.id) }),
      });
      expect(response.status).toBe(409);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires the report to match the paid domain and retain limitations", async () => {
    const lead = await paidLead();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await sendPaidReport(request(lead.id, {
      approved: true, reportText: reportText.replace("Domain: example.com", "Domain: example.com.attacker.test"),
    }), { params: Promise.resolve({ id: String(lead.id) }) });
    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("restores the paid status when the email provider rejects delivery", async () => {
    const lead = await paidLead();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: "provider error" }, { status: 500 })));
    const response = await sendPaidReport(request(lead.id, { approved: true, reportText }), {
      params: Promise.resolve({ id: String(lead.id) }),
    });
    expect(response.status).toBe(502);
    const [saved] = await db.select().from(contactLeads);
    expect(saved.status).toBe("paid");
    expect(saved.notificationStatus).toBe("report_send_failed");
  });
});
