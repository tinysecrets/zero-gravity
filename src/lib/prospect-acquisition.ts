import { db } from "@/db";
import { scanTargets } from "@/db/schema";
import { publicBusinessDomain } from "./public-domain";
import { and, eq, isNull } from "drizzle-orm";

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
  sourceUrl: string | null;
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
 * observed hostnames, not proof of a business or a need. Website/contact
 * verification and DNS qualification still happen before any offer.
 */
export async function acquireFromCTLogs(
  nicheQuery: string,
  industry: string = "general",
  maxResults: number = 50
): Promise<AcquisitionResult> {
  const url = `https://crt.sh/?q=%25${encodeURIComponent(nicheQuery)}%25&output=json`;
  const result: AcquisitionResult = {
    source: "ct_log",
    query: nicheQuery,
    sourceUrl: url,
    domainsFound: 0,
    newInserted: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 100) {
    result.errors.push("maxResults must be an integer between 1 and 100.");
    return result;
  }

  try {
    // crt.sh supports LIKE queries on certificate common names

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      result.errors.push(`crt.sh returned ${res.status}`);
      return result;
    }

    const rawDomains = certificateDomains(await res.json(), url, nicheQuery);

    result.domainsFound = rawDomains.size;

    // Deduplicate against existing scan_targets
    const existingRows = await db
      .select({ id: scanTargets.id, domain: scanTargets.domain, source: scanTargets.source, sourceEvidence: scanTargets.sourceEvidence })
      .from(scanTargets);

    const existingDomains = new Set(existingRows.map((r) => extractRootDomain(r.domain) || r.domain.toLowerCase()));
    await retainObservedEvidence(existingRows, rawDomains, result);
    const newDomains = [...rawDomains.keys()]
      .filter((d) => !existingDomains.has(d))
      .slice(0, maxResults);

    result.duplicatesSkipped = [...rawDomains.keys()].filter((domain) => existingDomains.has(domain)).length;

    // Insert new prospects
    for (const domain of newDomains) {
      try {
        const inserted = await db
          .insert(scanTargets)
          .values({
            domain,
            niche: nicheQuery,
            industry,
            source: "ct_log",
            sourceEvidence: rawDomains.get(domain),
            priority: 2, // medium priority for auto-discovered
            isActive: true,
          })
          .onConflictDoNothing()
          .returning({ id: scanTargets.id });

        if (inserted.length) result.newInserted++;
        else result.duplicatesSkipped++;
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
    sourceUrl: null,
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
      const inserted = await db
        .insert(scanTargets)
        .values({
          domain,
          niche,
          industry,
          source,
          sourceEvidence: JSON.stringify({ source, domain, observedAt: new Date().toISOString() }),
          priority: 1,
          isActive: true,
        })
        .onConflictDoNothing()
        .returning({ id: scanTargets.id });

      if (inserted.length) result.newInserted++;
      else result.duplicatesSkipped++;
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
  const normalizedRoot = extractRootDomain(rootDomain);
  const url = normalizedRoot ? `https://crt.sh/?q=%25.${encodeURIComponent(normalizedRoot)}&output=json` : null;
  const result: AcquisitionResult = {
    source: "portfolio",
    query: rootDomain,
    sourceUrl: url,
    domainsFound: 0,
    newInserted: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  if (!url || !normalizedRoot) {
    result.errors.push("A valid public portfolio domain is required.");
    return result;
  }

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      result.errors.push(`crt.sh returned ${res.status}`);
      return result;
    }

    const rawDomains = certificateDomains(await res.json(), url, normalizedRoot);
    for (const domain of rawDomains.keys()) {
      if (domain !== normalizedRoot && !domain.endsWith(`.${normalizedRoot}`)) rawDomains.delete(domain);
    }

    result.domainsFound = rawDomains.size;

    const existingRows = await db
      .select({ id: scanTargets.id, domain: scanTargets.domain, source: scanTargets.source, sourceEvidence: scanTargets.sourceEvidence })
      .from(scanTargets);

    const existingDomains = new Set(existingRows.map((r) => extractRootDomain(r.domain) || r.domain.toLowerCase()));
    await retainObservedEvidence(existingRows, rawDomains, result);
    const newDomains = [...rawDomains.keys()].filter((d) => !existingDomains.has(d));
    result.duplicatesSkipped = [...rawDomains.keys()].filter((domain) => existingDomains.has(domain)).length;

    for (const domain of newDomains) {
      try {
        const inserted = await db
          .insert(scanTargets)
          .values({
            domain,
            niche: `Portfolio: ${normalizedRoot}`,
            industry,
            source: "portfolio",
            sourceEvidence: rawDomains.get(domain),
            priority: 1,
            isActive: true,
          })
          .onConflictDoNothing()
          .returning({ id: scanTargets.id });
        if (inserted.length) result.newInserted++;
        else result.duplicatesSkipped++;
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
  return publicBusinessDomain(input);
}

function isValidDomain(domain: string): boolean {
  return publicBusinessDomain(domain) === domain;
}

function certificateDomains(entries: unknown, sourceUrl: string, query: string): Map<string, string> {
  if (!Array.isArray(entries)) throw new Error("crt.sh did not return a certificate list.");
  const domains = new Map<string, string>();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const names = typeof entry.name_value === "string" && entry.name_value ? entry.name_value
      : typeof entry.common_name === "string" ? entry.common_name : "";
    for (const name of names.split("\n")) {
      if (/[/?:@#]/.test(name)) continue; // Certificate SANs must be hostnames, not URLs.
      const domain = extractRootDomain(name);
      if (!domain || domains.has(domain)) continue;
      const certificateId = /^\d+$/.test(String(entry.id ?? "")) ? String(entry.id) : null;
      domains.set(domain, JSON.stringify({
        sourceUrl, query, certificateName: name.trim(), certificateId,
        certificateUrl: certificateId ? `https://crt.sh/?id=${certificateId}` : null,
        observedAt: new Date().toISOString(),
      }));
    }
  }
  return domains;
}

async function retainObservedEvidence(
  rows: Array<{ id: number; domain: string; source: string; sourceEvidence: string | null }>,
  observed: Map<string, string>, result: AcquisitionResult,
): Promise<void> {
  for (const row of rows) {
    const evidence = observed.get(extractRootDomain(row.domain) || row.domain);
    if (!evidence || row.sourceEvidence || !["ct_log", "portfolio"].includes(row.source)) continue;
    try {
      // Backfill only evidence genuinely observed now; never invent legacy provenance.
      await db.update(scanTargets).set({ sourceEvidence: evidence })
        .where(and(eq(scanTargets.id, row.id), isNull(scanTargets.sourceEvidence)));
    } catch { result.errors.push(`Could not retain observed acquisition evidence for ${row.domain}.`); }
  }
}
