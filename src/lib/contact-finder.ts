import { promises as dns } from "node:dns";
import { BlockList, isIP } from "node:net";
import { isBusinessEmail, isBusinessWebsiteUrl, publicBusinessDomain } from "./public-domain";

export interface ContactInfo {
  email: string | null;
  contactName: string | null;
  contactRole: string | null;
  source: "website" | "none";
  confidence: "high" | "medium" | "low";
  sourceUrl: string | null;
  mxRecords: string[];
  verifiedAt: string | null;
}

/**
 * Discover a recipient only when the business website publicly discloses the
 * address and the address domain publishes MX records. Never guess mailboxes.
 */
export async function findContact(domain: string): Promise<ContactInfo> {
  const result: ContactInfo = {
    email: null, contactName: null, contactRole: null, source: "none", confidence: "low",
    sourceUrl: null, mxRecords: [], verifiedAt: null,
  };

  const normalized = publicBusinessDomain(domain);
  if (!normalized) return result;
  const deadline = Date.now() + 15_000;
  const seenEmails = new Set<string>();
  const mxByDomain = new Map<string, string[]>();
  const publicHosts = new Map<string, boolean>();
  const pages = [
    `https://${normalized}`,
    `https://${normalized}/contact`,
    `https://${normalized}/contact-us`,
    `https://${normalized}/about`,

  ];

  for (const url of pages) {
    try {
      if (Date.now() >= deadline) break;
      const res = await fetchBusinessPage(url, normalized, deadline, publicHosts);
      if (!res?.ok) continue;
      const sourceUrl = res.url || url;
      if (!isBusinessWebsiteUrl(sourceUrl, normalized)) continue;

      const html = await res.text();
      const visibleHtml = html
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");

      // Follow only a few publicly linked contact/about pages on the business site.
      for (const match of visibleHtml.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
        try {
          const linked = new URL(match[1], sourceUrl);
          linked.hash = "";
          if (/contact|about|get-in-touch/i.test(linked.pathname) &&
            isBusinessWebsiteUrl(linked.href, normalized) && !pages.includes(linked.href) && pages.length < 6) {
            pages.push(linked.href);
          }
        } catch { /* Invalid public link. */ }
      }
      const emails = extractEmails(visibleHtml, normalized);
      const person = extractDecisionMaker(visibleHtml);

      for (const email of prioritizeEmails(emails)) {
        if (seenEmails.has(email) || Date.now() >= deadline) continue;
        seenEmails.add(email);
        const mailDomain = email.split("@")[1];
        if (!mxByDomain.has(mailDomain)) mxByDomain.set(mailDomain, await mailExchanges(mailDomain));
        const mxRecords = mxByDomain.get(mailDomain)!;
        if (mxRecords.length) {
          return {
            email,
            contactName: person?.name ?? null,
            contactRole: person?.role ?? null,
            source: "website",
            confidence: "high",
            sourceUrl, mxRecords, verifiedAt: new Date().toISOString(),
          };
        }
      }
    } catch {
      // Try the next public contact page.
    }
  }

  return result;
}

/** Fail closed when saved contacts lack their public URL or non-null MX evidence. */
export function isVerifiedBusinessContact(contact: unknown, domain: string): contact is ContactInfo & { email: string; sourceUrl: string } {
  if (!contact || typeof contact !== "object") return false;
  const value = contact as Partial<ContactInfo>;
  return typeof value.email === "string" && isBusinessEmail(value.email, domain) &&
    value.source === "website" && value.confidence === "high" &&
    typeof value.sourceUrl === "string" && isBusinessWebsiteUrl(value.sourceUrl, domain) &&
    typeof value.verifiedAt === "string" && Number.isFinite(Date.parse(value.verifiedAt)) &&
    Array.isArray(value.mxRecords) && value.mxRecords.some((record) => {
      if (typeof record !== "string") return false;
      const match = record.match(/^(\d+)\s+(\S+)$/);
      return Boolean(match && Number(match[1]) <= 65535 && publicBusinessDomain(match[2]));
    });
}

async function mailExchanges(mailDomain: string): Promise<string[]> {
  try {
    const mx = await boundedDns(dns.resolveMx(mailDomain));
    return mx.filter((record) => record.exchange && publicBusinessDomain(record.exchange))
      .map((record) => `${record.priority} ${record.exchange}`);
  } catch { return []; }
}

function extractEmails(html: string, domain: string): string[] {
  // Visible text and explicitly published mailto links, not script/comment data.
  const mailto = [...html.matchAll(/href\s*=\s*["']mailto:([^"'?]+)(?:\?[^"']*)?["']/gi)]
    .map((match) => { try { return decodeURIComponent(match[1]); } catch { return ""; } });
  const published = [html.replace(/<[^>]*>/g, " "), ...mailto].join(" ")
    .replace(/&#(?:64|x40);|&commat;/gi, "@").replace(/&#(?:46|x2e);/gi, ".");
  const regex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
  return [...new Set((published.match(regex) || []).map((email) => email.toLowerCase()))]
    .filter((email) => isBusinessEmail(email, domain)).slice(0, 20);
}

async function fetchBusinessPage(url: string, domain: string, deadline: number, publicHosts: Map<string, boolean>): Promise<Response | null> {
  let current = url;
  for (let redirects = 0; redirects < 3 && Date.now() < deadline; redirects++) {
    if (!isBusinessWebsiteUrl(current, domain)) return null;
    const host = new URL(current).hostname;
    if (!publicHosts.has(host)) {
      const addresses = await boundedDns(dns.lookup(host, { all: true }));
      publicHosts.set(host, addresses.length > 0 && addresses.every(({ address }) => publicAddress(address)));
    }
    if (!publicHosts.get(host)) return null;
    const response = await fetch(current, {
      signal: AbortSignal.timeout(Math.max(1, Math.min(3_000, deadline - Date.now()))),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ZeroGravityAudit/1.0)", Accept: "text/html" },
      redirect: "manual",
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) return null;
    current = new URL(location, current).href;
  }
  return null;
}

const nonPublicV4 = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const) nonPublicV4.addSubnet(address, prefix);
const publicV6 = new BlockList();
publicV6.addSubnet("2000::", 3, "ipv6");
const nonPublicV6 = new BlockList();
nonPublicV6.addSubnet("2001:db8::", 32, "ipv6");
nonPublicV6.addSubnet("2002::", 16, "ipv6");
function publicAddress(address: string): boolean {
  return isIP(address) === 4 ? !nonPublicV4.check(address) :
    isIP(address) === 6 && publicV6.check(address, "ipv6") && !nonPublicV6.check(address, "ipv6");
}

async function boundedDns<T>(lookup: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([lookup, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("DNS lookup timed out.")), 1_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

function prioritizeEmails(emails: string[]): string[] {
  const patterns = [
    /^(owner|founder|ceo|president)@/i,
    /^[a-z]+\.[a-z]+@/i,
    /^[a-z]+@/i,
    /^(hello|hi|hey)@/i,
    /^(info|inquiries|inquiry)@/i,
    /^(contact|sales|team)@/i,
  ];
  const ordered: string[] = [];
  for (const pattern of patterns) {
    ordered.push(...emails.filter((email) => pattern.test(email) && !ordered.includes(email)));
  }
  ordered.push(...emails.filter((email) => !ordered.includes(email)));
  return ordered;
}

function extractDecisionMaker(html: string): { name: string; role: string } | null {
  const patterns = [
    /(?:founded?\s+by|founder[:\s]+|ceo[:\s]+|owner[:\s]+|president[:\s]+)\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)[\s,—–]+(?:founder|ceo|owner|president|principal)/
  ];
  for (const regex of patterns) {
    const match = html.match(regex);
    if (match?.[1] && match[1].length > 3 && match[1].length < 50) {
      return { name: match[1].trim(), role: extractRole(html, match[1]) || "Owner" };
    }
  }
  return null;
}

function extractRole(html: string, name: string): string | null {
  const idx = html.indexOf(name);
  if (idx < 0) return null;
  const context = html.substring(Math.max(0, idx - 100), idx + 200);
  const match = context.match(/(founder|ceo|owner|president|principal|managing\s+partner|chief\s+executive|head\s+of\s+growth|marketing\s+director)/i);
  return match?.[1] || null;
}
