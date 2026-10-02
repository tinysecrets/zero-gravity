import { promises as dns } from "node:dns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findContact, isVerifiedBusinessContact } from "@/lib/contact-finder";

const domain = "business-roofing.com";
const email = `hello@${domain}`;
const site = `https://${domain}`;

beforeEach(() => {
  vi.spyOn(dns, "lookup").mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);
  vi.spyOn(dns, "resolveMx").mockResolvedValue([{ priority: 10, exchange: `mail.${domain}` }]);
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("Not found", { status: 404 })));
});
afterEach(() => vi.unstubAllGlobals());

function html(body: string, url?: string) {
  const response = new Response(body, { headers: { "Content-Type": "text/html" } });
  if (url) Object.defineProperty(response, "url", { value: url });
  return response;
}

describe("public business contact enrichment", () => {
  it("extracts a published mailto address and retains official URL, confidence, and MX evidence", async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => html(`<a href="mailto:${email.toUpperCase()}">Contact our business</a>`));
    const contact = await findContact(domain);
    expect(contact).toMatchObject({ email, source: "website", confidence: "high", sourceUrl: site, mxRecords: [`10 mail.${domain}`] });
    expect(contact.verifiedAt).toBeTruthy();
    expect(isVerifiedBusinessContact(contact, domain)).toBe(true);
    expect(dns.resolveMx).toHaveBeenCalledWith(domain);
  });

  it("accepts publicly displayed info@ only when it was actually published, never by guessing", async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => html(`<p>Business inquiries: info@${domain}</p>`));
    expect((await findContact(domain)).email).toBe(`info@${domain}`);
    vi.mocked(fetch).mockImplementation(async () => html("Business website, no published email."));
    expect((await findContact(domain)).email).toBeNull();
  });

  it("follows a nonstandard official contact link without leaving the business website", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url === site) return html('<a href="/get-in-touch-with-us">Contact</a>');
      if (url === `${site}/get-in-touch-with-us`) return html(`<p>${email}</p>`);
      return new Response("Not found", { status: 404 });
    });
    expect(await findContact(domain)).toMatchObject({ email, sourceUrl: `${site}/get-in-touch-with-us` });
  });

  it("retains the final official URL after a redirect", async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => new Response(null, { status: 301, headers: { location: `https://www.${domain}/contact` } }))
      .mockImplementationOnce(async () => html(`<p>${email}</p>`, `https://www.${domain}/contact`));
    expect((await findContact(domain)).sourceUrl).toBe(`https://www.${domain}/contact`);
  });

  it("does not follow third-party or private redirects or harvest their contacts", async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } }));
    expect((await findContact(domain)).email).toBeNull();
    expect(vi.mocked(fetch).mock.calls.every(([url]) => String(url).startsWith(site) || String(url).startsWith(`https://www.${domain}`))).toBe(true);
  });

  it.each(["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fc00::1", "::ffff:127.0.0.1"])("never fetches a website resolving to nonpublic address %s", async (address) => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address, family: address.includes(":") ? 6 : 4 }] as never);
    expect((await findContact(domain)).email).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not harvest script/comment/attribute-only data, unrelated private mailboxes, or opt-out addresses", async () => {
    vi.mocked(fetch).mockImplementation(async () => html(`
      <script>"${email}"</script><!-- owner@${domain} -->
      <meta content="person@${domain}"><p>Personal: person@gmail.com</p>
      <a href="mailto:privacy@${domain}">Privacy requests</a>`));
    expect((await findContact(domain)).email).toBeNull();
    expect(dns.resolveMx).not.toHaveBeenCalled();
  });

  it.each([{ records: [] }, { records: [{ priority: 0, exchange: "." }] }])("rejects absent/null MX records and deduplicates lookups", async ({ records }) => {
    vi.mocked(dns.resolveMx).mockResolvedValue(records);
    vi.mocked(fetch).mockImplementation(async () => html(`<p>${email} ${email} owner@${domain}</p>`));
    expect((await findContact(domain)).email).toBeNull();
    expect(dns.resolveMx).toHaveBeenCalledTimes(1);
  });

  it("fails forward to another official page when a website fetch fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Source unavailable"))
      .mockImplementationOnce(async () => html(`<p>${email}</p>`));
    expect(await findContact(domain)).toMatchObject({ email, sourceUrl: `${site}/contact` });
  });

  it("skips a contact when MX lookup fails", async () => {
    vi.mocked(dns.resolveMx).mockRejectedValue(new Error("DNS unavailable"));
    vi.mocked(fetch).mockImplementation(async () => html(`<p>${email}</p>`));
    expect((await findContact(domain)).email).toBeNull();
  });

  it.each(["localhost", "127.0.0.1", "internal.local", "co.uk", "-invalid.com", "example.com"])("skips invalid/nonbusiness domain %s", async (value) => {
    expect((await findContact(value)).email).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires evidence rather than trusting legacy website/high labels alone", async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => html(`<p>${email}</p>`));
    const contact = await findContact(domain);
    expect(isVerifiedBusinessContact({ ...contact, sourceUrl: null }, domain)).toBe(false);
    expect(isVerifiedBusinessContact({ ...contact, sourceUrl: "https://unrelated.com/contact" }, domain)).toBe(false);
    expect(isVerifiedBusinessContact({ ...contact, email: "person@gmail.com" }, domain)).toBe(false);
    expect(isVerifiedBusinessContact({ ...contact, mxRecords: ["0 ."] }, domain)).toBe(false);
  });
});
