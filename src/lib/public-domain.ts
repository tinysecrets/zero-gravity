import { parse } from "tldts";

const DOMAIN_NAME = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/;

/** Normalize an observed hostname, using the public suffix list rather than guessing a business root. */
export function publicBusinessDomain(input: string): string | null {
  let host = input.trim().toLowerCase().replace(/^\*\./, "");
  try {
    if (/^https?:\/\//i.test(host)) {
      const url = new URL(host);
      if (url.username || url.password) return null;
      host = url.hostname;
    } else {
      // Imports may contain a website path, but never credentials or other schemes.
      if (host.includes("@") || host.includes("://")) return null;
      host = host.split(/[/?#]/)[0].replace(/:\d+$/, "");
    }
  } catch { return null; }
  host = host.replace(/\.$/, "");
  if (host.length > 253 || !DOMAIN_NAME.test(host)) return null;
  const parsed = parse(host, { allowPrivateDomains: true });
  if ((!parsed.isIcann && !parsed.isPrivate) || !parsed.domain || parsed.isIp) return null;
  if (["example.com", "example.net", "example.org"].includes(parsed.domain)) return null;
  return parsed.domain;
}

/** Reject certificate-search artifacts that look machine-generated rather than like a normal business domain. */
export function isPlausibleBusinessDomain(domain: string): boolean {
  const root = publicBusinessDomain(domain);
  if (!root) return false;
  const labels = root.split(".");
  const name = labels[0] || "";
  return !name.includes("--") && !/^(?:[a-z0-9]{1,4}-){2,}/i.test(name);
}

export function isBusinessWebsiteUrl(value: string, domain: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch { return false; }
}

export function isBusinessEmail(email: string, domain: string): boolean {
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) || email.length > 254) return false;
  const mailDomain = email.split("@")[1].toLowerCase();
  return DOMAIN_NAME.test(mailDomain) &&
    (mailDomain === domain || mailDomain.endsWith(`.${domain}`)) &&
    !/^(?:no-?reply|donotreply|unsubscribe|abuse|privacy|dmarc|hostmaster|postmaster)@/i.test(email);
}
