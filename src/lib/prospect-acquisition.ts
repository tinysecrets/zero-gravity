import { db } from "@/db";
import { scanTargets } from "@/db/schema";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Prospect Acquisition Engine
//
// Pulls domains from public Certificate Transparency logs via crt.sh,
// deduplicates against the existing scan_targets table, and inserts
// new prospects as scan targets. Zero API keys required.
// ---------------------------------------------------------------------------

export interface AcquisitionResult {
  source: string;
  query: string;
  domainsFound: number;
  newInserted: number;
  duplicatesSkipped: number;
  errors: string[];
}

/**
 * Discover domains from Certificate Transparency logs.
 *
 * crt.sh indexes every SSL/TLS certificate issued by public CAs.
 * Searching for a niche keyword (e.g., "roofing", "dental") returns
 * domains that recently obtained certificates — a strong signal of
 * active businesses with email-sending infrastructure.
 */
export async function acquireFromCTLogs(
  nicheQuery: string,
  industry: string = "general",
  maxResults: number = 50
): Promise<AcquisitionResult> {
  const result: AcquisitionResult = {
    source: "ct_log",
    query: nicheQuery,
    domainsFound: 0,
    newInserted: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  try {
    // crt.sh supports LIKE queries on certificate common names
    const url = `https://crt.sh/?q=%25${encodeURIComponent(nicheQuery)}%25&output=json`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      result.errors.push(`crt.sh returned ${res.status}`);
      return result;
    }

    const entries: Array<{ name_value: string; common_name: string }> = await res.json();

    // Extract unique root domains from certificate names
    const rawDomains = new Set<string>();
    for (const entry of entries) {
      const names = (entry.name_value || entry.common_name || "").split("\n");
      for (const name of names) {
        const domain = extractRootDomain(name.trim());
        if (domain && isValidDomain(domain)) {
          rawDomains.add(domain);
        }
      }
    }

    result.domainsFound = rawDomains.size;

    // Deduplicate against existing scan_targets
    const existingRows = await db
      .select({ domain: scanTargets.domain })
      .from(scanTargets);

    const existingDomains = new Set(existingRows.map((r) => r.domain));
    const newDomains = [...rawDomains]
      .filter((d) => !existingDomains.has(d))
      .slice(0, maxResults);

    result.duplicatesSkipped = rawDomains.size - newDomains.length;

    // Insert new prospects
    for (const domain of newDomains) {
      try {
        await db
          .insert(scanTargets)
          .values({
            domain,
            niche: nicheQuery,
            industry,
            source: "ct_log",
            priority: 2, // medium priority for auto-discovered
            isActive: true,
          })
          .onConflictDoNothing();

        result.newInserted++;
      } catch (err) {
        result.errors.push(`Failed to insert ${domain}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }
  } catch (err) {
    result.errors.push(`CT log fetch failed: ${err instanceof Error ? err.message : "unknown"}`);
  }

  return result;
}

/**
 * Bulk import domains from a newline-separated list.
 */
export async function importDomains(
  rawText: string,
  niche: string = "Imported",
  industry: string = "general",
  source: string = "csv_import"
): Promise<AcquisitionResult> {
  const result: AcquisitionResult = {
    source,
    query: niche,
    domainsFound: 0,
    newInserted: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  const lines = rawText
    .split(/[\n,;]+/)
    .map((l) => extractRootDomain(l.trim()))
    .filter((d): d is string => d !== null && isValidDomain(d));

  const uniqueDomains = [...new Set(lines)];
  result.domainsFound = uniqueDomains.length;

  for (const domain of uniqueDomains) {
    try {
      await db
        .insert(scanTargets)
        .values({
          domain,
          niche,
          industry,
          source,
          priority: 1,
          isActive: true,
        })
        .onConflictDoNothing();

      result.newInserted++;
    } catch (err) {
      result.errors.push(`Failed to insert ${domain}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  return result;
}

/**
 * Run a portfolio scan: discover subdomains and related domains for
 * a given root domain. Used by the agency/portfolio mode.
 */
export async function discoverPortfolio(
  rootDomain: string,
  industry: string = "agency_portfolio"
): Promise<AcquisitionResult> {
  const result: AcquisitionResult = {
    source: "portfolio",
    query: rootDomain,
    domainsFound: 0,
    newInserted: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  try {
    const url = `https://crt.sh/?q=%25.${encodeURIComponent(rootDomain)}&output=json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      result.errors.push(`crt.sh returned ${res.status}`);
      return result;
    }

    const entries: Array<{ name_value: string; common_name: string }> = await res.json();

    const rawDomains = new Set<string>();
    for (const entry of entries) {
      const names = (entry.name_value || entry.common_name || "").split("\n");
      for (const name of names) {
        const domain = extractRootDomain(name.trim());
        if (domain && isValidDomain(domain) && domain.endsWith(rootDomain)) {
          rawDomains.add(domain);
        }
      }
    }

    result.domainsFound = rawDomains.size;

    const existingRows = await db
      .select({ domain: scanTargets.domain })
      .from(scanTargets);

    const existingDomains = new Set(existingRows.map((r) => r.domain));
    const newDomains = [...rawDomains].filter((d) => !existingDomains.has(d));
    result.duplicatesSkipped = rawDomains.size - newDomains.length;

    for (const domain of newDomains) {
      try {
        await db
          .insert(scanTargets)
          .values({
            domain,
            niche: `Portfolio: ${rootDomain}`,
            industry,
            source: "portfolio",
            priority: 1,
            isActive: true,
          })
          .onConflictDoNothing();
        result.newInserted++;
      } catch (err) {
        result.errors.push(`Failed to insert ${domain}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }
  } catch (err) {
    result.errors.push(`Portfolio discovery failed: ${err instanceof Error ? err.message : "unknown"}`);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractRootDomain(input: string): string | null {
  if (!input) return null;
  // Remove wildcards, protocols, paths, ports
  let d = input
    .replace(/^\*\./, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:.*$/, "")
    .trim()
    .toLowerCase();

  // Skip obviously invalid entries
  if (!d || d.includes("%") || d.includes(" ") || d.length < 4) return null;

  // If it has a subdomain with many parts, try to get the root
  // But keep two-part TLDs intact (co.uk, com.au, etc.)
  const parts = d.split(".");
  if (parts.length > 2) {
    // Heuristic: if the second-to-last part is a known TLD prefix, keep 3 parts
    const knownMultiPart = ["co", "com", "org", "net", "gov", "edu", "ac"];
    if (parts.length >= 3 && knownMultiPart.includes(parts[parts.length - 2])) {
      return parts.slice(-3).join(".");
    }
    return parts.slice(-2).join(".");
  }

  return d;
}

function isValidDomain(domain: string): boolean {
  return (
    domain.length >= 4 &&
    domain.includes(".") &&
    !domain.startsWith(".") &&
    !domain.endsWith(".") &&
    !domain.includes("..") &&
    /^[a-z0-9.-]+$/.test(domain)
  );
}