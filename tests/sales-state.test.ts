import { describe, expect, it } from "vitest";
import { classifyReply, readSalesState } from "@/lib/sales-state";

describe("sales state machine", () => {
  it("suppresses explicit opt-outs", () => {
    expect(classifyReply("Please unsubscribe me from future offers.")).toBe("unsubscribe");
  });

  it("recognizes positive buying intent", () => {
    expect(classifyReply("Yes, send the details and let's schedule a call.")).toBe("positive");
  });

  it("fails closed on malformed legacy metadata", () => {
    expect(readSalesState("{not-json").followupCount).toBe(0);
  });

  it("never restores a scheduled follow-up after an opt-out state", () => {
    expect(readSalesState(JSON.stringify({ sales: {
      followupCount: 1, optedOut: true, nextFollowupAt: new Date(0).toISOString()
    }})).toMatchObject({ followupCount: 1, optedOut: true });
  });
});
