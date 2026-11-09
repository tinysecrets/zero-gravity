import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/public/dns-preview/route";

afterEach(() => vi.unstubAllGlobals());

function request(body: unknown, ip = "198.51.100.41") {
  return new Request("https://zero-gravity.test/api/public/dns-preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://zero-gravity.test",
      "x-real-ip": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("public DNS preview", () => {
  it("returns a limited, evidence-based preview without financial claims", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (input) => {
      const url = new URL(String(input));
      const name = url.searchParams.get("name");
      const type = url.searchParams.get("type");
      const answer = name?.startsWith("_dmarc")
        ? { type: 16, data: '"v=DMARC1; p=none;"' }
        : type === "MX" ? { type: 15, data: "10 mail.example.com" }
        : { type: 16, data: '"v=spf1 include:mail.example.com ~all"' };
      return Response.json({ Status: 0, Answer: [answer] });
    }));
    const response = await POST(request({ domain: "Example.com" }));
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      success: true,
      preview: {
        domain: "example.com",
        dmarcPresent: true,
        dmarcPolicy: "none",
        spfPresent: true,
        mxPresent: true,
      },
    });
    expect(result.preview).not.toHaveProperty("estimatedMonthlyLeakage");
    expect(result.preview.limitation).toContain("does not test inbox placement");
  });

  it("rejects invalid domains before performing DNS requests", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request({ domain: "127.0.0.1" }, "198.51.100.42"));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects requests without same-origin protection", async () => {
    const response = await POST(new Request("https://zero-gravity.test/api/public/dns-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "198.51.100.43" },
      body: JSON.stringify({ domain: "example.com" }),
    }));
    expect(response.status).toBe(429);
  });
});
