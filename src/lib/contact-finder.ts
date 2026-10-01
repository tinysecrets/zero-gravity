// ---------------------------------------------------------------------------
// Contact Finder — discovers the real decision-maker email for a domain
//
// Strategy (in priority order):
// 1. Scrape the domain's website for email addresses on /contact, /about, /
// 2. Try common role-based patterns (hello@, info@, owner@, etc.)
// 3. Check the website for the founder/owner name to personalize outreach
//
// All free. No API keys needed for the scraping layer.
// ---------------------------------------------------------------------------

export interface ContactInfo {
  email: string | null;
  contactName: string | null;
  contactRole: string | null;
  source: string; // "website" | "pattern" | "whois"
  confidence: "high" | "medium" | "low";
}

/**
 * Find the best contact email and name for a domain.
 */
export async function findContact(domain: string): Promise<ContactInfo> {
  const result: ContactInfo = {
    email: null,
    contactName: null,
    contactRole: null,
    source: "none",
    confidence: "low",
  };

  // Step 1: Scrape the website for emails and names
  const scraped = await scrapeWebsiteForContact(domain);
  if (scraped.email) {
    return scraped;
  }

  // Step 2: Try common patterns (we'll verify later)
  const pattern = guessEmailFromDomain(domain);
  if (pattern) {
    result.email = pattern.email;
    result.contactName = pattern.name;
    result.contactRole = pattern.role;
    result.source = "pattern";
    result.confidence = "low";
    return result;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Website scraper — extracts emails and decision-maker names from HTML
// ---------------------------------------------------------------------------

async function scrapeWebsiteForContact(domain: string): Promise<ContactInfo> {
  const result: ContactInfo = {
    email: null,
    contactName: null,
    contactRole: null,
    source: "website",
    confidence: "low",
  };

  const pages = [
    `https://${domain}`,
    `https://${domain}/contact`,
    `https://${domain}/contact-us`,
    `https://${domain}/about`,
    `https://${domain}/about-us`,
    `https://www.${domain}`,
    `https://www.${domain}/contact`,
  ];

  for (const url of pages) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ZeroGravityAudit/1.0)",
          Accept: "text/html",
        },
        redirect: "follow",
      });

      if (!res.ok) continue;

      const html = await res.text();

      // Extract emails from HTML
      const emails = extractEmails(html, domain);
      if (emails.length > 0) {
        // Prefer personal emails over generic ones
        const bestEmail = prioritizeEmails(emails);
        result.email = bestEmail;
        result.confidence = "high";
      }

      // Extract decision-maker names
      const person = extractDecisionMaker(html);
      if (person) {
        result.contactName = person.name;
        result.contactRole = person.role;
        if (result.email) result.confidence = "high";
      }

      if (result.email) break;
    } catch {
      // Page not reachable, try next
    }
  }

  return result;
}

function extractEmails(html: string, domain: string): string[] {
  // Match email addresses in HTML (including mailto: links)
  const emailRegex = /(?:mailto:)?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
  const matches = html.match(emailRegex) || [];

  const cleanEmails = matches
    .map((e) => e.replace(/^mailto:/i, "").toLowerCase().trim())
    .filter((e) => {
      // Only use contact addresses belonging to the audited business, not
      // third-party emails embedded in scripts, examples, or partner content.
      const mailDomain = e.split("@").pop() || "";
      if (mailDomain !== domain && !mailDomain.endsWith(`.${domain}`)) return false;
      // Filter out obvious junk
      if (e.includes("example.com") || e.includes("test.com")) return false;
      if (e.includes("sentry.io") || e.includes("wixpress")) return false;
      if (e.includes("@2x") || e.includes("@3x")) return false; // image refs
      if (e.length > 60) return false;
      return true;
    });

  // Deduplicate
  return [...new Set(cleanEmails)];
}

function prioritizeEmails(emails: string[]): string {
  // Priority: personal name emails > owner/founder > info/hello > anything else
  const priority = [
    /^(owner|founder|ceo|president)@/i,
    /^[a-z]+\.[a-z]+@/i, // firstname.lastname@
    /^[a-z]+@[a-z]+\.(com|net|org|io)$/i, // single name @ domain
    /^(hello|hi|hey)@/i,
    /^(info|inquiries|inquiry)@/i,
    /^(contact|sales|team)@/i,
  ];

  for (const pattern of priority) {
    const match = emails.find((e) => pattern.test(e));
    if (match) return match;
  }

  return emails[0];
}

// ---------------------------------------------------------------------------
// Decision-maker name extraction
// ---------------------------------------------------------------------------

function extractDecisionMaker(html: string): { name: string; role: string } | null {
  // Look for common patterns in HTML that indicate the founder/owner
  const patterns = [
    // "Founded by John Smith" or "Founder: John Smith"
    /(?:founded?\s+by|founder[:\s]+|ceo[:\s]+|owner[:\s]+|president[:\s]+)\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    // "John Smith, Founder" or "John Smith — CEO"
    /([A-Z][a-z]+\s+[A-Z][a-z]+)[\s,—–]+(?:founder|ceo|owner|president|principal)/i,
    // Meta tags
    /<meta[^>]*author[^>]*content="([^"]+)"/i,
  ];

  for (const regex of patterns) {
    const match = html.match(regex);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name.length > 3 && name.length < 50 && name.includes(" ")) {
        const role = extractRole(html, name) || "Owner";
        return { name, role };
      }
    }
  }

  return null;
}

function extractRole(html: string, name: string): string | null {
  const nameIdx = html.indexOf(name);
  if (nameIdx === -1) return null;

  // Look for a role near the name
  const context = html.substring(Math.max(0, nameIdx - 100), nameIdx + 200);
  const roleMatch = context.match(
    /(founder|ceo|owner|president|principal|managing\s+partner|chief\s+executive|head\s+of\s+growth|marketing\s+director)/i
  );
  return roleMatch ? roleMatch[1] : null;
}

// ---------------------------------------------------------------------------
// Email pattern guessing (fallback)
// ---------------------------------------------------------------------------

function guessEmailFromDomain(
  domain: string
): { email: string; name: string | null; role: string | null } | null {
  // Common patterns for small businesses
  const patterns = [
    { prefix: "info", name: null, role: null },
    { prefix: "hello", name: null, role: null },
    { prefix: "contact", name: null, role: null },
    { prefix: "owner", name: null, role: "Owner" },
  ];

  // Use the first pattern as a fallback
  return {
    email: `${patterns[0].prefix}@${domain}`,
    name: null,
    role: null,
  };
}