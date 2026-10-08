import { db } from "@/db";
import { scanTargets } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { isPlausibleBusinessDomain, publicBusinessDomain } from "./public-domain";

// ---------------------------------------------------------------------------
// Prospect Acquisition Engine
//
// crt.sh is the free primary CT index. When it fails or cannot fill the next
// batch, a licensed ctlogs.dev organization search can supply independent CT
// evidence. The latter is opt-in: its commercial API key/plan is operator-
// supplied, and all candidates still pass the normal DNS/contact qualification.
// ---------------------------------------------------------------------------

const CTLOGS_ORG_API = "https://api.ctlogs.dev/v1/org";
const SOURCE_TIMEOUT_MS = 10_000;
const MAX_SOURCE_ATTEMPTS = 2;
const MAX_RETRY_AFTER_MS = 2_000;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

type SourceState = "ok" | "failed" | "skipped";

export interface AcquisitionSourceStatus {
  name: string;
  status: SourceState;
  domainsFound: number;
  reason?: string;
}

export interface AcquisitionResult {
  source: string;
  query: string;
  sourceUrl: string | null;
  domainsFound: number;
  newInserted: number;
  duplicatesSkipped: number;
  errors: string[];
  sources?: AcquisitionSourceStatus[];
}

type ExistingTarget = {
  id: number;
  domain: string;
  source: string;
  sourceEvidence: string | null;
};

/**
 * Discover niche-related certificate names, using a second independent CT
 * index when crt.sh is unhealthy or does not supply enough new candidates.
 *
 * CT results are only observed certificate hostnames—not proof of a business,
 * security issue, or paid need. DNS scoring and published-contact verification
 * remain mandatory before any offer or customer outreach.
 */
export async function acquireFromCTLogs(
  nicheQuery: string,
  industry: string = "general",
  maxResults: number = 50,
): Promise<AcquisitionResult> {
  const primaryUrl = `https://crt.sh/?q=%25${encodeURIComponent(nicheQuery)}%25&output=json`;
  const result: AcquisitionResult = {
    source: "ct_log",
    query: nicheQuery,
    sourceUrl: primaryUrl,
    domainsFound: 0,
    newInserted: 0,
    duplicatesSkipped: 0,
    errors: [],
    sources: [],
  };

  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 100) {
    result.errors.push("maxResults must be an integer between 1 and 100.");
    return result;
  }

  const observed = new Map<string, string>();
  const primaryResponse = await fetchJsonWithRetry("crt.sh", primaryUrl);
  if (primaryResponse.error) {
    result.errors.push(primaryResponse.error);
    result.sources!.push({ name: "crt.sh", status: "failed", domainsFound: 0, reason: primaryResponse.error });
  } else {
    try {
      const domains = certificateDomains(primaryResponse.data, primaryUrl, nicheQuery, "crt.sh");
      for (const [domain, evidence] of domains) observed.set(domain, evidence);
      result.sources!.push({ name: "crt.sh", status: "ok", domainsFound: domains.size });
    } catch {
      const reason = "crt.sh returned an invalid certificate list.";
      result.errors.push(reason);
      result.sources!.push({ name: "crt.sh", status: "failed", domainsFound: 0, reason });
    }
  }

  let existingRows: ExistingTarget[];
  try {
    existingRows = await loadExistingTargets();
  } catch (error) {
    result.domainsFound = observed.size;
    result.errors.push(`Could not read existing prospects: ${error instanceof Error ? error.message : "database unavailable"}`);
    return result;
  }

  const apiKey = process.env.CTLOGS_API_KEY?.trim();
  const knownDomains = existingDomainSet(existingRows);
  const primaryNewCount = [...observed.keys()].filter((domain) => !knownDomains.has(domain)).length;
  if (!apiKey) {
    result.sources!.push({
      name: "ctlogs.dev",
      status: "skipped",
      domainsFound: 0,
      reason: "CTLOGS_API_KEY is not configured; only crt.sh was queried.",
    });
  } else if (primaryNewCount >= maxResults) {
    result.sources!.push({
      name: "ctlogs.dev",
      status: "skipped",
      domainsFound: 0,
      reason: "crt.sh already supplied enough new candidates for this batch.",
    });
  } else {
    const fallbackUrl = `${CTLOGS_ORG_API}?q=${encodeURIComponent(nicheQuery)}`;
    const fallbackResponse = await fetchJsonWithRetry("ctlogs.dev", fallbackUrl, {
      Authorization: `Bearer ${apiKey}`,
    });
    if (fallbackResponse.error) {
      result.errors.push(fallbackResponse.error);
      result.sources!.push({ name: "ctlogs.dev", status: "failed", domainsFound: 0, reason: fallbackResponse.error });
    } else {
      try {
        const domains = organizationDomains(fallbackResponse.data, fallbackUrl, nicheQuery);
        for (const [domain, evidence] of domains) {
          // Prefer primary evidence when the same business is in both indexes.
          if (!observed.has(domain)) observed.set(domain, evidence);
        }
        result.sources!.push({ name: "ctlogs.dev", status: "ok", domainsFound: domains.size });
      } catch {
        const reason = "ctlogs.dev returned an invalid organization-search response.";
        result.errors.push(reason);
        result.sources!.push({ name: "ctlogs.dev", status: "failed", domainsFound: 0, reason });
      }
    }
  }

  result.domainsFound = observed.size;
  await persistObservedDomains(result, observed, existingRows, {
    niche: nicheQuery,
    industry,
    targetSource: "ct_log",
    priority: 2,
    maxNew: maxResults,
  });
  return result;
}

/**
 * Bulk import domains from a newline-separated list.
 */
export async function importDomains(
  rawText: string,
  niche: string = "Imported",
  industry: string = "general",
  source: string = "csv_import",
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
    .map((line) => extractRootDomain(line.trim()))
    .filter((domain): domain is string => domain !== null && isValidDomain(domain));

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
    } catch (error) {
      result.errors.push(`Failed to insert ${domain}: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  return result;
}

/**
 * Run a portfolio scan: discover subdomains for a given root domain.
 */
export async function discoverPortfolio(
  rootDomain: string,
  industry: string = "agency_portfolio",
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
    sources: [],
  };

  if (!url || !normalizedRoot) {
    result.errors.push("A valid public portfolio domain is required.");
    return result;
  }

  const response = await fetchJsonWithRetry("crt.sh", url);
  if (response.error) {
    result.errors.push(response.error);
    result.sources!.push({ name: "crt.sh", status: "failed", domainsFound: 0, reason: response.error });
    return result;
  }

  let observed: Map<string, string>;
  try {
    observed = certificateDomains(response.data, url, normalizedRoot, "crt.sh");
    for (const domain of observed.keys()) {
      if (domain !== normalizedRoot && !domain.endsWith(`.${normalizedRoot}`)) observed.delete(domain);
    }
  } catch {
    const reason = "crt.sh returned an invalid certificate list.";
    result.errors.push(reason);
    result.sources!.push({ name: "crt.sh", status: "failed", domainsFound: 0, reason });
    return result;
  }
  result.sources!.push({ name: "crt.sh", status: "ok", domainsFound: observed.size });
  result.domainsFound = observed.size;

  try {
    const existingRows = await loadExistingTargets();
    await persistObservedDomains(result, observed, existingRows, {
      niche: `Portfolio: ${normalizedRoot}`,
      industry,
      targetSource: "portfolio",
      priority: 1,
    });
  } catch (error) {
    result.errors.push(`Could not save portfolio discoveries: ${error instanceof Error ? error.message : "database unavailable"}`);
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

async function fetchJsonWithRetry(
  source: string,
  url: string,
  headers: Record<string, string> = {},
): Promise<{ data: unknown; error?: never } | { data?: never; error: string }> {
  let lastError = `${source} request failed.`;
  for (let attempt = 0; attempt < MAX_SOURCE_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", ...headers },
        signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
      });
      if (!response.ok) {
        lastError = `${source} returned ${response.status}`;
        if (!RETRYABLE_STATUSES.has(response.status) || attempt + 1 >= MAX_SOURCE_ATTEMPTS) {
          return { error: lastError };
        }
        const delay = retryDelay(response, attempt);
        if (delay === null) return { error: lastError };
        await wait(delay);
        continue;
      }
      try {
        return { data: await response.json() };
      } catch {
        lastError = `${source} returned invalid JSON.`;
        if (attempt + 1 >= MAX_SOURCE_ATTEMPTS) return { error: lastError };
        await wait(250 * (attempt + 1));
      }
    } catch (error) {
      lastError = `${source} request failed: ${error instanceof Error ? error.message : "network unavailable"}`;
      if (attempt + 1 >= MAX_SOURCE_ATTEMPTS) return { error: lastError };
      await wait(250 * (attempt + 1));
    }
  }
  return { error: lastError };
}

function retryDelay(response: Response, attempt: number): number | null {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const requested = Number.isFinite(seconds)
      ? seconds * 1_000
      : Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(requested)) {
      if (requested < 0) return 0;
      return requested <= MAX_RETRY_AFTER_MS ? requested : null;
    }
  }
  if (response.status === 429) return null;
  return 250 * (attempt + 1);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function loadExistingTargets(): Promise<ExistingTarget[]> {
  return db
    .select({ id: scanTargets.id, domain: scanTargets.domain, source: scanTargets.source, sourceEvidence: scanTargets.sourceEvidence })
    .from(scanTargets);
}

function existingDomainSet(rows: ExistingTarget[]): Set<string> {
  return new Set(rows.map((row) => extractRootDomain(row.domain) || row.domain.toLowerCase()));
}

function certificateDomains(
  entries: unknown,
  sourceUrl: string,
  query: string,
  provider: string,
): Map<string, string> {
  if (!Array.isArray(entries)) throw new Error("Invalid certificate list.");
  const domains = new Map<string, string>();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const names = typeof record.name_value === "string" && record.name_value
      ? record.name_value
      : typeof record.common_name === "string" ? record.common_name : "";
    for (const name of names.split("\n")) {
      if (/[/?#@:]/.test(name)) continue;
      const domain = extractRootDomain(name);
      if (!domain || !isPlausibleBusinessDomain(domain) || domains.has(domain)) continue;
      const rawId = String(record.id ?? "");
      const certificateId = /^\d+$/.test(rawId) ? rawId : null;
      domains.set(domain, JSON.stringify({
        provider,
        sourceUrl,
        query,
        certificateName: name.trim(),
        certificateId,
        certificateUrl: certificateId ? `https://crt.sh/?id=${certificateId}` : null,
        observedAt: new Date().toISOString(),
      }));
    }
  }
  return domains;
}

function organizationDomains(payload: unknown, sourceUrl: string, query: string): Map<string, string> {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as Record<string, unknown>).rows)) {
    throw new Error("Invalid organization response.");
  }
  const rows = (payload as { rows: unknown[] }).rows;
  const domains = new Map<string, string>();
  for (const value of rows) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    const names: string[] = [];
    if (typeof row.domains === "string") names.push(...row.domains.split(/[\s,]+/));
    if (Array.isArray(row.domains)) names.push(...row.domains.filter((name): name is string => typeof name === "string"));
    if (typeof row.subject_cn === "string") names.push(row.subject_cn);
    for (const name of names) {
      const trimmedName = name.trim();
      if (!trimmedName || /[/?#@:]/.test(trimmedName)) continue;
      const domain = extractRootDomain(trimmedName);
      if (!domain || !isPlausibleBusinessDomain(domain) || domains.has(domain)) continue;
      const rawId = typeof row.id === "string" || typeof row.id === "number" ? String(row.id) : "";
      const certificateId = /^[a-z\d_-]{1,128}$/i.test(rawId) ? rawId : null;
      domains.set(domain, JSON.stringify({
        provider: "ctlogs.dev",
        sourceUrl,
        query,
        organizationMatch: typeof row.match === "string" ? row.match : null,
        certificateName: trimmedName,
        certificateId,
        certificateUrl: certificateId ? `https://ctlogs.dev/cert/${encodeURIComponent(certificateId)}` : null,
        observedAt: new Date().toISOString(),
      }));
    }
  }
  return domains;
}

async function persistObservedDomains(
  result: AcquisitionResult,
  observed: Map<string, string>,
  existingRows: ExistingTarget[],
  options: {
    niche: string;
    industry: string;
    targetSource: string;
    priority: number;
    maxNew?: number;
  },
): Promise<void> {
  const knownDomains = existingDomainSet(existingRows);
  await retainObservedEvidence(existingRows, observed, result);
  const freshDomains = [...observed.keys()].filter((domain) => !knownDomains.has(domain));
  const newDomains = options.maxNew === undefined ? freshDomains : freshDomains.slice(0, options.maxNew);
  result.duplicatesSkipped = [...observed.keys()].filter((domain) => knownDomains.has(domain)).length;

  for (const domain of newDomains) {
    try {
      const inserted = await db
        .insert(scanTargets)
        .values({
          domain,
          niche: options.niche,
          industry: options.industry,
          source: options.targetSource,
          sourceEvidence: observed.get(domain) || null,
          priority: options.priority,
          isActive: true,
        })
        .onConflictDoNothing()
        .returning({ id: scanTargets.id });
      if (inserted.length) result.newInserted++;
      else result.duplicatesSkipped++;
    } catch (error) {
      result.errors.push(`Failed to insert ${domain}: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }
}

async function retainObservedEvidence(
  rows: ExistingTarget[],
  observed: Map<string, string>,
  result: AcquisitionResult,
): Promise<void> {
  for (const row of rows) {
    const evidence = observed.get(extractRootDomain(row.domain) || row.domain);
    if (!evidence || row.sourceEvidence || !["ct_log", "portfolio"].includes(row.source)) continue;
    try {
      // Backfill only evidence genuinely observed now; never invent legacy provenance.
      await db.update(scanTargets).set({ sourceEvidence: evidence })
        .where(and(eq(scanTargets.id, row.id), isNull(scanTargets.sourceEvidence)));
    } catch {
      result.errors.push(`Could not retain observed acquisition evidence for ${row.domain}.`);
    }
  }
}
