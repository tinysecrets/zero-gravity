import { promises as dns } from "node:dns";

export interface ContactInfo {
  email: string | null;
  contactName: string | null;
  contactRole: string | null;
  source: "website" | "none";
  confidence: "high" | "medium" | "low";
}

/**
 * Discover a recipient only when the business website publicly discloses the
 * address and the address domain publishes MX records. Never guess mailboxes.
 */
export async function findContact(domain: string): Promise<ContactInfo> {
  const result: ContactInfo = {
    email: null, contactName: null, contactRole: null, source: "none", confidence: "low",
  };

  const normalized = domain.toLowerCase().replace(/^www\./, "");
  const pages = [
    `https://${normalized}`,
    `https://${normalized}/contact`,
    `https://${normalized}/contact-us`,
    `https://${normalized}/about`,
    `https://${normalized}/about-us`,
    `https://www.${normalized}`,
    `https://www.${normalized}/contact`,
  ];

  for (const url of pages) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ZeroGravityAudit/1.0)", Accept: "text/html" },
        redirect: "follow",
      });
      if (!res.ok) continue;

      const html = await res.text();
      const visibleHtml = html
        .replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi, " ")
        .replace(/<style\\b[^>]*>[\\s\\S]*?<\\/style>/gi, " ");

      const emails = extractEmails(visibleHtml, normalized);
      const person = extractDecisionMaker(visibleHtml);

      for (const email of prioritizeEmails(emails)) {
        if (await hasMailExchange(email)) {
          return {
            email,
            contactName: person?.name ?? null,
            contactRole: person?.role ?? null,
            source: "website",
            confidence: "high",
          };
        }
      }
    } catch {
      // Try the next public contact page.
    }
  }

  return result;
}

async function hasMailExchange(email: string): Promise<boolean> {
  const mailDomain = email.split("@").pop()?.toLowerCase();
  if (!mailDomain) return false;
  try {
    const mx = await dns.resolveMx(mailDomain);
    return mx.some((record) => Boolean(record.exchange));
  } catch {
    return false;
  }
}

function extractEmails(html: string, domain: string): string[] {
  const regex = /(?:mailto:)?([a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,})/gi;
  const matches = html.match(regex) || [];
  return [...new Set(matches.map((e) => e.replace(/^mailto:/i, "").toLowerCase().trim()).filter((e) => {
    const mailDomain = e.split("@").pop() || "";
    if (mailDomain !== domain && !mailDomain.endsWith(`.${domain}`)) return false;
    if (/example\\.com|test\\.com|sentry\\.io|wixpress/i.test(e)) return false;
    if (/@\\d+x\\./i.test(e) || e.length > 60) return false;
    return true;
  }))];
}

function prioritizeEmails(emails: string[]): string[] {
  const patterns = [
    /^(owner|founder|ceo|president)@/i,
    /^[a-z]+\\.[a-z]+@/i,
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
    /(?:founded?\\s+by|founder[:\\s]+|ceo[:\\s]+|owner[:\\s]+|president[:\\s]+)\\s*([A-Z][a-z]+\\s+[A-Z][a-z]+)/i,
    /([A-Z][a-z]+\\s+[A-Z][a-z]+)[\\s,—–]+(?:founder|ceo|owner|president|principal)/i,
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
  const match = context.match(/(founder|ceo|owner|president|principal|managing\\s+partner|chief\\s+executive|head\\s+of\\s+growth|marketing\\s+director)/i);
  return match?.[1] || null;
}
