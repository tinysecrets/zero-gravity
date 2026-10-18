import { describe, expect, it } from "vitest";
import { isPublicIpAddress, normalizeWebsiteUrl } from "@/lib/website-audit";

describe("website reliability audit target validation", () => {
  it("normalizes public hostnames to safe URLs and removes query parameters", () => {
    const url = normalizeWebsiteUrl("zero-gravity-smoky.vercel.app/customer?token=do-not-replay#section");
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("zero-gravity-smoky.vercel.app");
    expect(url.pathname).toBe("/customer");
    expect(url.search).toBe("");
    expect(url.hash).toBe("");
  });

  it.each([
    "http://127.0.0.1",
    "http://10.0.0.4",
    "http://localhost",
    "http://metadata.google.internal",
    "http://example.test",
    "https://user:password@example.com",
    "https://example.com:8443",
    "file:///etc/passwd",
    "https://[::1]/",
  ])("rejects unsafe or unsupported target %s", (value) => {
    expect(() => normalizeWebsiteUrl(value)).toThrow();
  });

  it("allows representative global unicast addresses only", () => {
    expect(isPublicIpAddress("1.1.1.1")).toBe(true);
    expect(isPublicIpAddress("8.8.8.8")).toBe(true);
    expect(isPublicIpAddress("2606:4700:4700::1111")).toBe(true);
  });

  it.each([
    "0.0.0.0", "10.1.2.3", "100.64.1.2", "127.0.0.1", "169.254.169.254",
    "172.16.0.1", "192.168.1.1", "192.0.2.1", "198.18.0.1", "203.0.113.1",
    "224.0.0.1", "255.255.255.255", "::", "::1", "fc00::1", "fe80::1",
    "ff02::1", "::ffff:192.168.1.1", "2001:db8::1", "2002:7f00:1::",
  ])("blocks special-use address %s", (value) => {
    expect(isPublicIpAddress(value)).toBe(false);
  });
});
