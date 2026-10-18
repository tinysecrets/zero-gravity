import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ai-advisor/route";
import { runWebsiteReliabilityAudit, type WebsiteReliabilityAudit } from "@/lib/website-audit";

vi.mock("@/lib/website-audit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/website-audit")>();
  return { ...actual, runWebsiteReliabilityAudit: vi.fn() };
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

let testIpCounter = 10;
function request(body: unknown) {
  testIpCounter += 1;
  return new Request("https://zero-gravity.example/api/ai-advisor", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://zero-gravity.example",
      "x-real-ip": `198.51.100.${testIpCounter}`,
    },
    body: JSON.stringify(body),
  });
}

const auditFixture: WebsiteReliabilityAudit = {
  requestedUrl: "https://shop.example.com/",
  finalUrl: "https://shop.example.com/",
  hostname: "shop.example.com",
  checkedAt: "2026-10-18T12:00:00.000Z",
  executionRegion: "test-region",
  result: "complete",
  dnsLookups: [{ hostname: "shop.example.com", addresses: ["203.0.113.10"], elapsedMs: 12 }],
  redirects: [],
  httpStatus: 503,
  contentType: "text/html",
  contentLength: "128",
  server: "test",
  cacheStatus: null,
  pageTitle: "Test shop",
  dnsLookupMs: 12,
  timeToFirstByteMs: 240,
  totalElapsedMs: 252,
  responseBytesRead: 128,
  responseBodyTruncated: false,
  tls: { status: "valid", protocol: "TLSv1.3", subject: "shop.example.com", validTo: "Dec 01 00:00:00 2026 GMT", daysUntilExpiry: 44 },
  requestError: null,
  findings: [{
    severity: "critical",
    title: "Server returned an HTTP 5xx error",
    evidence: "The final page returned HTTP 503.",
    recommendedFix: "Check deployment and origin logs.",
    businessImpact: "Requests receiving this response fail; revenue impact is unknown.",
  }],
  revenueImpact: {
    estimated: false,
    reason: "No visitor, conversion, order-value, checkout-failure, or outage-duration data was supplied.",
  },
};

describe("AI advisor model integration", () => {
  it("keeps the template fallback working without a provider key", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const response = await POST(request({ niche: "auto repair", location: "Montgomery" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.generation.mode).toBe("template");
    expect(body.strategy.title).toContain("auto repair");
    expect(body.strategy.targetProfile).toContain("No business or prospect has been searched for or verified");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("uses the configured free model server-side and preserves the advisor response shape", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "provider-test-key");
    vi.stubEnv("AI_ADVISOR_MODEL", "nvidia/nemotron-3.5-lightning:free");
    const generated = {
      title: "Audit-focused prospect research",
      targetProfile: "Identify local service businesses with measurable public web reliability signals.",
      researchQuestion: "Which public signals can be independently verified?",
      offerBoundary: "Do not claim revenue impact without evidence.",
      actionSteps: ["Check authoritative DNS responses", "Capture HTTP/TLS status and timing"],
      customOutreachScript: "Draft only; {{Business}} {{verified_topic}}",
      scopeChecklist: "Evidence, scope, fee, approval and outcome metrics.",
    };
    const mockFetch = vi.fn().mockResolvedValue(Response.json({
      choices: [{ message: { content: JSON.stringify(generated) } }],
    }));
    vi.stubGlobal("fetch", mockFetch);

    const response = await POST(request({ niche: "home services", location: "Montgomery" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.generation).toEqual({ mode: "ai", model: "nvidia/nemotron-3.5-lightning:free" });
    expect(body.strategy).toMatchObject(generated);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer provider-test-key");
    expect(String(options.body)).toContain("Montgomery");
    expect(JSON.parse(String(options.body)).model).toBe("nvidia/nemotron-3.5-lightning:free");
  });

  it("attaches actual read-only audit evidence to the plan without an AI provider key", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.mocked(runWebsiteReliabilityAudit).mockResolvedValue(auditFixture);
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const response = await POST(request({
      niche: "online retail",
      location: "United States",
      websiteUrl: "https://shop.example.com",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.generation.mode).toBe("template");
    expect(body.audit.httpStatus).toBe(503);
    expect(body.strategy.targetProfile).toContain("HTTP status: 503");
    expect(body.strategy.actionSteps.some((step: string) => step.includes("HTTP 5xx"))).toBe(true);
    expect(body.strategy.offerBoundary).toContain("does not establish lost revenue");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(runWebsiteReliabilityAudit).toHaveBeenCalledWith("https://shop.example.com");
  });

  it("rejects invalid website URLs before making any outbound audit request", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const response = await POST(request({
      niche: "retail",
      location: "United States",
      websiteUrl: "http://127.0.0.1",
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(runWebsiteReliabilityAudit).not.toHaveBeenCalled();
  });

  it("falls back to the template for provider errors without leaking provider keys", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "provider-test-key");
    const mockFetch = vi.fn().mockResolvedValue(new Response("temporary provider failure", { status: 429 }));
    vi.stubGlobal("fetch", mockFetch);

    const response = await POST(request({ niche: "dentists", location: "Montgomery" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.generation.mode).toBe("template");
    expect(body.strategy.title).toContain("dentists");
    expect(JSON.stringify(body)).not.toContain("provider-test-key");
  });

  it("falls back to the template for provider network failures without leaking provider keys", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "provider-test-key");
    const mockFetch = vi.fn().mockRejectedValue(new TypeError("simulated network failure"));
    vi.stubGlobal("fetch", mockFetch);

    const response = await POST(request({ niche: "plumbers", location: "Montgomery" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.generation.mode).toBe("template");
    expect(body.strategy.title).toContain("plumbers");
    expect(JSON.stringify(body)).not.toContain("provider-test-key");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
