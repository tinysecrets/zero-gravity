import { describe, expect, it } from "vitest";
import { POST as createStrategyDraft } from "@/app/api/ai-advisor/route";
import { INITIAL_OPPORTUNITIES, SEED_PLAYBOOKS } from "@/lib/seed-data";

describe("public planning content", () => {
  it("does not publish invented customer names or financial ranges in reference templates", () => {
    const templates = JSON.stringify(SEED_PLAYBOOKS);
    expect(templates).not.toMatch(/Apex Roofing|Vanguard Wealth|Rust Dev Digest|State Poly/i);
    expect(templates).not.toMatch(/\$\s?[\d,]+/);
    expect(SEED_PLAYBOOKS.every((playbook) => playbook.avgDealSize === "Not estimated")).toBe(true);
    expect(SEED_PLAYBOOKS.every((playbook) => playbook.avgTimeToFirstDollar === "Not estimated")).toBe(true);
  });

  it("uses only an explicitly fictional, zero-value local demo opportunity", () => {
    expect(INITIAL_OPPORTUNITIES).toHaveLength(1);
    expect(INITIAL_OPPORTUNITIES[0]).toMatchObject({
      title: expect.stringContaining("DEMO ONLY"),
      targetCompany: "Example Business (Demo)",
      targetEmail: "demo@example.invalid",
      status: "discovered",
      potentialValue: "0.00",
      grossTransactionValue: "0.00",
      realizedRevenue: "0.00",
    });
    expect(INITIAL_OPPORTUNITIES[0].notes).toContain("Fictional local-development fixture only");
  });

  it("generates a research worksheet without fabricated market or revenue projections", async () => {
    const response = await createStrategyDraft(new Request("https://example.test/api/ai-advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ niche: "Roofing", location: "Montgomery, Alabama" }),
    }));
    const result = await response.json();
    const content = JSON.stringify(result);

    expect(response.status).toBe(200);
    expect(content).not.toMatch(/\$\s?[\d,]+/);
    expect(content).not.toMatch(/expected reply rate|average deal|operator net commission|gross revenue generated/i);
    expect(result.strategy.targetProfile).toContain("No business or prospect has been searched for or verified");
  });
});
