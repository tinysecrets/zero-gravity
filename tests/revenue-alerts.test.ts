import { afterEach, describe, expect, it, vi } from "vitest";
import { sendRevenueAlert } from "@/lib/revenue-alerts";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("verified-payment email alert", () => {
  it("uses the configured sales inbox when a dedicated revenue inbox is absent", async () => {
    vi.stubEnv("RESEND_API_KEY", "resend_fixture");
    vi.stubEnv("FROM_EMAIL", "admin@wah-lah.com");
    vi.stubEnv("REVENUE_ALERT_EMAIL", "");
    vi.stubEnv("SALES_INBOX_EMAIL", "support@wah-lah.com");
    vi.stubEnv("OUTREACH_REPLY_TO", "");
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await sendRevenueAlert({
      amount: "149.00", currency: "usd", opportunityId: null,
      referenceCode: "INV-FIXTURE", clientName: "Buyer",
      serviceDescription: "Domain Signals Review",
    })).toMatchObject({ sent: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = fetch.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      from: "admin@wah-lah.com", to: ["support@wah-lah.com"],
      subject: "Payment verified: $149.00 USD",
    });
  });
});
