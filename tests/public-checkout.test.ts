import { describe, expect, it } from "vitest";
import { POST as startPublicCheckout } from "@/app/api/public/checkout/route";

describe("retired public fixed-price checkout", () => {
  it("returns Gone and directs visitors to the free-first proposal flow", async () => {
    const response = await startPublicCheckout();

    expect(response.status).toBe(410);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      success: false,
      error: expect.stringContaining("free diagnostic"),
    });
  });
});
