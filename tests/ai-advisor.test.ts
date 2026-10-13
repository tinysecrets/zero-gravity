import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ai-advisor/route";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function request(body: unknown) {
  return new Request("https://zero-gravity.example/api/ai-advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

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
});
