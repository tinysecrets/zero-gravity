import { lookup as dnsLookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { isIP } from "node:net";
import http from "node:http";
import https from "node:https";
import tls from "node:tls";

export type WebsiteFindingSeverity = "critical" | "warning" | "info" | "pass";
export interface WebsiteFinding {
  severity: WebsiteFindingSeverity;
  title: string;
  evidence: string;
  recommendedFix: string;
  businessImpact: string;
}
export interface WebsiteTlsEvidence {
  status: "valid" | "failed" | "not-applicable" | "unknown";
  protocol?: string;
  subject?: string;
  issuer?: string;
  validTo?: string;
  daysUntilExpiry?: number;
  error?: string;
}
export interface WebsiteDnsLookup {
  hostname: string;
  addresses: string[];
  elapsedMs: number;
}
export interface WebsiteRedirect {
  from: string;
  statusCode: number;
  to: string;
}
export interface WebsiteReliabilityAudit {
  requestedUrl: string;
  finalUrl: string;
  hostname: string;
  checkedAt: string;
  executionRegion: string;
  result: "complete" | "inconclusive";
  dnsLookups: WebsiteDnsLookup[];
  redirects: WebsiteRedirect[];
  httpStatus: number | null;
  contentType: string | null;
  contentLength: string | null;
  server: string | null;
  cacheStatus: string | null;
  pageTitle: string | null;
  dnsLookupMs: number | null;
  timeToFirstByteMs: number | null;
  totalElapsedMs: number;
  responseBytesRead: number;
  responseBodyTruncated: boolean;
  tls: WebsiteTlsEvidence;
  requestError: string | null;
  findings: WebsiteFinding[];
  revenueImpact: { estimated: false; reason: string };
}
const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 128 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;
const AUDIT_TIMEOUT_MS = 12_000;
const MAX_AUDIT_ELAPSED_MS = 40_000;
const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
];
function ipv4Number(value: string): number | null {
  if (isIP(value) !== 4) return null;
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return ((((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!) >>> 0);
}
function inV4Subnet(ip: number, cidr: string, bits: number): boolean {
  const network = ipv4Number(cidr);
  if (network === null) return true;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ip & mask) === (network & mask);
}
function ipv6FirstTwoWords(value: string): [number, number] | null {
  const clean = value.toLowerCase().split("%")[0] ?? "";
  if (isIP(clean) !== 6 || clean.includes(".")) return null;
  const halves = clean.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const words = [...left, ...Array(Math.max(0, missing)).fill("0"), ...right].map(part => Number.parseInt(part || "0", 16));
  if (words.length !== 8 || words.some(word => !Number.isInteger(word) || word < 0 || word > 0xffff)) return null;
  return [words[0]!, words[1]!];
}
/** Public-IP check used before any outbound request. Non-global and special-use ranges fail closed. */
export function isPublicIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const ip = ipv4Number(address);
    return ip !== null && !BLOCKED_V4.some(([subnet, bits]) => inV4Subnet(ip, subnet, bits));
  }
  if (family !== 6) return false;
  const words = ipv6FirstTwoWords(address);
  if (!words) return false;
  const [first, second] = words;
  if (first < 0x2000 || first > 0x3fff) return false; // only global unicast 2000::/3
  if (first === 0x2002 || first === 0x3fff || (first === 0x2001 && (second <= 0x01ff || second === 0x0db8))) return false;
  return true;
}
export function normalizeWebsiteUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2048) throw new Error("Enter a public website URL (maximum 2,048 characters).");
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
  let url: URL;
  try { url = new URL(candidate); } catch { throw new Error("Enter a valid public website URL, such as https://example.com."); }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only HTTP and HTTPS website URLs are supported.");
  if (url.username || url.password) throw new Error("URLs containing usernames or passwords are not allowed.");
  if (url.port) throw new Error("Custom ports are not allowed; use the standard HTTP or HTTPS port.");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") || hostname.endsWith(".internal") ||
      hostname.endsWith(".test") || hostname.endsWith(".invalid") ||
      hostname.endsWith(".example") || isIP(hostname) !== 0 || !hostname.includes(".")) {
    throw new Error("A public DNS hostname is required; local, reserved, and direct-IP targets are blocked.");
  }
  url.hostname = hostname;
  // Do not replay possibly sensitive query parameters from pasted URLs.
  url.search = "";
  url.hash = "";
  if (!url.pathname) url.pathname = "/";
  return url;
}
async function resolvePublicAddresses(hostname: string): Promise<{ addresses: LookupAddress[]; elapsedMs: number }> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const records = await Promise.race([
      dnsLookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("DNS lookup timed out after 3.5 seconds.")), 3500);
        timer.unref?.();
      }),
    ]);
    if (!records.length) throw new Error("DNS returned no A or AAAA addresses.");
    const blocked = records.find(record => !isPublicIpAddress(record.address));
    if (blocked) throw new Error("The hostname resolves to a non-public IP address; the request was blocked.");
    const ordered = [...records].sort((a, b) => a.family === b.family ? 0 : a.family === 4 ? -1 : 1);
    return { addresses: ordered, elapsedMs: Date.now() - started };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function cleanError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/[\r\n\t]+/g, " ").slice(0, 240);
}
function parseTitle(body: string): string | null {
  const match = body.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  if (!match) return null;
  const title = match[1]!.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return title ? title.slice(0, 180) : null;
}
function certField(value: unknown): string | undefined {
  if (typeof value === "string" && value.length <= 180) return value;
  return undefined;
}
function pinnedLookup(addresses: LookupAddress[]): NonNullable<http.RequestOptions["lookup"]> {
  return ((
    _hostname: string,
    options: unknown,
    callback: (...args: unknown[]) => void,
  ) => {
    const opts = typeof options === "number" ? { family: options } : (options as { family?: number; all?: boolean } | null) || {};
    const candidates = opts.family ? addresses.filter(address => address.family === opts.family) : addresses;
    if (!candidates.length) {
      const error = Object.assign(new Error("No validated address matches the requested IP family."), { code: "ENOTFOUND" });
      callback(error);
      return;
    }
    if (opts.all) {
      callback(null, candidates.map(address => ({ address: address.address, family: address.family })));
      return;
    }
    callback(null, candidates[0]!.address, candidates[0]!.family);
  }) as unknown as NonNullable<http.RequestOptions["lookup"]>;
}
interface RequestObservation {
  statusCode: number | null;
  contentType: string | null;
  contentLength: string | null;
  server: string | null;
  cacheStatus: string | null;
  pageTitle: string | null;
  timeToFirstByteMs: number | null;
  elapsedMs: number;
  responseBytesRead: number;
  responseBodyTruncated: boolean;
  location: string | null;
  tls: WebsiteTlsEvidence;
  error: string | null;
}
function requestOnce(url: URL, addresses: LookupAddress[]): Promise<RequestObservation> {
  return new Promise(resolve => {
    const started = Date.now();
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tlsEvidence: WebsiteTlsEvidence = { status: url.protocol === "https:" ? "unknown" : "not-applicable" };
    let response: http.IncomingMessage | undefined;
    let body = "";
    let bytes = 0;
    let truncated = false;
    const finish = (result: Partial<RequestObservation> & Pick<RequestObservation, "statusCode" | "contentType" | "contentLength" | "server" | "cacheStatus" | "timeToFirstByteMs" | "location">) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      const complete: RequestObservation = {
        statusCode: result.statusCode,
        contentType: result.contentType,
        contentLength: result.contentLength,
        server: result.server,
        cacheStatus: result.cacheStatus,
        pageTitle: result.pageTitle ?? parseTitle(body),
        timeToFirstByteMs: result.timeToFirstByteMs,
        elapsedMs: result.elapsedMs ?? Date.now() - started,
        responseBytesRead: result.responseBytesRead ?? bytes,
        responseBodyTruncated: result.responseBodyTruncated ?? truncated,
        location: result.location,
        tls: result.tls ?? tlsEvidence,
        error: result.error ?? null,
      };
      resolve(complete);
      if (truncated) response?.destroy();
    };
    const options = {
      method: "GET",
      agent: false as const,
      headers: {
        "User-Agent": "ZeroGravityReadOnlyReliabilityAudit/1.0",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.2",
        "Accept-Encoding": "identity",
        "Cache-Control": "no-cache",
      },
      lookup: pinnedLookup(addresses),
    };
    const client = url.protocol === "https:" ? https : http;
    const request = client.request(url, options, (res: http.IncomingMessage) => {
      response = res;
      const responseHeaders = {
        statusCode: res.statusCode ?? null,
        contentType: certField(res.headers["content-type"]) ?? null,
        contentLength: certField(res.headers["content-length"]) ?? null,
        server: certField(res.headers.server) ?? null,
        cacheStatus: certField(res.headers["x-vercel-cache"] ?? res.headers["cf-cache-status"]) ?? null,
        timeToFirstByteMs: Date.now() - started,
        location: certField(res.headers.location) ?? null,
      };
      res.on("data", (chunk: Buffer | string) => {
        const piece = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        const remaining = MAX_BODY_BYTES - bytes;
        if (remaining > 0) {
          const clipped = piece.subarray(0, remaining);
          bytes += clipped.length;
          body += clipped.toString("utf8");
        }
        if (piece.length > remaining || bytes >= MAX_BODY_BYTES) {
          truncated = true;
          finish({ ...responseHeaders, pageTitle: parseTitle(body), responseBodyTruncated: true });
          res.destroy();
        }
      });
      res.on("end", () => finish({ ...responseHeaders, pageTitle: parseTitle(body) }));
      res.on("error", error => finish({ ...responseHeaders, pageTitle: parseTitle(body), error: cleanError(error) }));
    });
    request.on("socket", socket => {
      if (url.protocol !== "https:" || !(socket instanceof tls.TLSSocket)) return;
      socket.once("secureConnect", () => {
        const cert = socket.getPeerCertificate();
        const expiry = cert.valid_to ? Date.parse(cert.valid_to) : NaN;
        const days = Number.isFinite(expiry) ? Math.floor((expiry - Date.now()) / 86_400_000) : undefined;
        tlsEvidence = {
          status: socket.authorized ? "valid" : "failed",
          protocol: certField(socket.getProtocol()) ?? undefined,
          subject: certField(cert.subject?.CN) ?? undefined,
          issuer: certField(cert.issuer?.O ?? cert.issuer?.CN) ?? undefined,
          validTo: certField(cert.valid_to) ?? undefined,
          ...(days !== undefined ? { daysUntilExpiry: days } : {}),
          ...(!socket.authorized ? { error: cleanError(socket.authorizationError ?? "TLS certificate validation failed") } : {}),
        };
      });
    });
    request.on("error", error => finish({
      statusCode: null, contentType: null, contentLength: null, server: null, cacheStatus: null,
      pageTitle: parseTitle(body), timeToFirstByteMs: null, location: null, error: cleanError(error), tls: tlsEvidence,
    }));
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new Error("HTTP request timed out after 8 seconds.")));
    timer = setTimeout(() => request.destroy(new Error("HTTP request exceeded the 12-second safety timeout.")), AUDIT_TIMEOUT_MS);
    timer.unref?.();
    request.end();
  });
}
export async function runWebsiteReliabilityAudit(input: string): Promise<WebsiteReliabilityAudit> {
  const checkedAt = new Date().toISOString();
  const started = Date.now();
  const requested = normalizeWebsiteUrl(input);
  const requestedUrl = requested.toString();
  const dnsLookups: WebsiteDnsLookup[] = [];
  const redirects: WebsiteRedirect[] = [];
  const visited = new Set<string>();
  let current = requested;
  let observation: RequestObservation | null = null;
  let requestError: string | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (Date.now() - started >= MAX_AUDIT_ELAPSED_MS) {
      requestError = "The audit reached its 40-second total safety budget; results are inconclusive.";
      break;
    }
    const currentUrl = current.toString();
    if (visited.has(currentUrl)) { requestError = "Redirect loop detected."; break; }
    visited.add(currentUrl);
    let resolved: { addresses: LookupAddress[]; elapsedMs: number };
    try {
      resolved = await resolvePublicAddresses(current.hostname);
      dnsLookups.push({ hostname: current.hostname, addresses: resolved.addresses.map(x => x.address), elapsedMs: resolved.elapsedMs });
    } catch (error) {
      requestError = cleanError(error);
      break;
    }
    observation = await requestOnce(current, resolved.addresses);
    if (observation.error) requestError = observation.error;
    const code = observation.statusCode;
    const location = observation.location;
    if (code !== 301 && code !== 302 && code !== 303 && code !== 307 && code !== 308) break;
    if (!location) break;
    if (hop === MAX_REDIRECTS) { requestError = "The site exceeded the maximum of five redirects; stopped safely."; break; }
    let destination: URL;
    try { destination = normalizeWebsiteUrl(new URL(location, current).toString()); }
    catch (error) { requestError = "Redirect target was blocked: " + cleanError(error); break; }
    redirects.push({ from: current.toString(), statusCode: code, to: destination.toString() });
    current = destination;
  }
  const tlsEvidence = observation?.tls ?? { status: current.protocol === "https:" ? "unknown" as const : "not-applicable" as const };
  const findings: WebsiteFinding[] = [];
  const firstDns = dnsLookups[0];
  if (!firstDns) {
    findings.push({
      severity: "critical", title: "DNS resolution did not complete",
      evidence: requestError || "The audit could not resolve the hostname through the configured server-side DNS resolver.",
      recommendedFix: "Confirm the domain's A/AAAA records, registrar delegation, and DNS provider status from a second independent resolver before changing records.",
      businessImpact: "Visitors may be unable to reach the site if the failure is reproducible for their resolvers. This single probe does not establish global downtime or lost revenue.",
    });
  } else {
    findings.push({
      severity: "pass", title: "Public DNS resolution succeeded",
      evidence: firstDns.hostname + " resolved to " + firstDns.addresses.join(", ") + " in " + firstDns.elapsedMs + " ms.",
      recommendedFix: "No DNS change is indicated by this successful lookup alone. Compare multiple regions/resolvers for propagation or intermittent issues.",
      businessImpact: "The hostname was resolvable from this audit environment at the recorded time.",
    });
  }
  if (tlsEvidence.status === "failed" || (observation?.error && current.protocol === "https:" && observation.statusCode === null)) {
    findings.push({
      severity: "critical", title: "HTTPS/TLS could not be validated",
      evidence: tlsEvidence.error || requestError || observation?.error || "TLS validation did not complete.",
      recommendedFix: "Inspect certificate validity, hostname coverage, certificate chain, and edge TLS configuration. Re-test from a second network before making changes.",
      businessImpact: "A reproducible certificate or handshake failure can prevent visitors and integrations from connecting securely; this probe alone does not quantify conversions or revenue.",
    });
  } else if (current.protocol === "https:" && tlsEvidence.status === "valid") {
    if (typeof tlsEvidence.daysUntilExpiry === "number" && tlsEvidence.daysUntilExpiry < 0) {
      findings.push({ severity: "critical", title: "TLS certificate is expired", evidence: "Certificate validity ended at " + tlsEvidence.validTo + ".", recommendedFix: "Renew or reissue the certificate and verify that the edge serves the full certificate chain.", businessImpact: "Expired TLS certificates normally trigger browser and client security failures when the result is reproducible." });
    } else if (typeof tlsEvidence.daysUntilExpiry === "number" && tlsEvidence.daysUntilExpiry <= 14) {
      findings.push({ severity: "warning", title: "TLS certificate is near expiry", evidence: "Certificate expires at " + tlsEvidence.validTo + " (" + tlsEvidence.daysUntilExpiry + " days remaining).", recommendedFix: "Check automatic renewal and alerting now; verify the renewed certificate before expiry.", businessImpact: "A failed renewal could interrupt secure access. A currently valid certificate is not a current outage." });
    } else {
      findings.push({ severity: "pass", title: "HTTPS/TLS handshake succeeded", evidence: "Certificate validation passed; protocol " + (tlsEvidence.protocol || "not reported") + "; subject " + (tlsEvidence.subject || "not reported") + "; expiry " + (tlsEvidence.validTo || "not reported") + ".", recommendedFix: "Keep renewal monitoring enabled and repeat from more than one region for customer-facing assurance.", businessImpact: "The tested endpoint accepted a validated TLS connection at the recorded time." });
    }
  } else if (current.protocol === "http:") {
    findings.push({ severity: "warning", title: "Final page uses unencrypted HTTP", evidence: "The final URL is " + current.origin + ".", recommendedFix: "Enable valid HTTPS and redirect HTTP to HTTPS, then confirm every redirect target and canonical URL.", businessImpact: "Unencrypted pages can expose traffic and show browser warnings. Checkout or sensitive forms should never depend on plain HTTP." });
  }
  if (redirects.length > 0) {
    const downgrade = redirects.some(hop => hop.from.startsWith("https:") && hop.to.startsWith("http:"));
    findings.push({
      severity: downgrade ? "critical" : redirects.length > 3 ? "warning" : "info",
      title: downgrade ? "Redirect chain downgrades HTTPS" : "Redirect chain observed",
      evidence: redirects.map(hop => hop.statusCode + " " + hop.from + " → " + hop.to).join(" | "),
      recommendedFix: downgrade ? "Remove HTTPS-to-HTTP redirects and ensure the canonical destination remains HTTPS." : "Verify each redirect is intentional. Where practical, link directly to the canonical HTTPS URL and avoid unnecessary hops.",
      businessImpact: downgrade ? "A downgrade can remove transport protection from the final page." : "Extra redirects can add latency and create opportunities for configuration errors; their business impact is not inferred from this sample.",
    });
  }
  if (observation?.statusCode === null || !observation) {
    findings.push({
      severity: "critical", title: "No HTTP response was obtained",
      evidence: requestError || "The audit did not receive an HTTP status code.",
      recommendedFix: "Check edge/origin logs, DNS from another resolver, firewall/WAF rules, and deployment health; repeat from a second region before concluding there is an outage.",
      businessImpact: "The audit client could not obtain a response. This may reflect a temporary, regional, filtering, or origin problem; no downtime duration or revenue loss has been measured.",
    });
  } else if (observation.statusCode >= 500) {
    findings.push({
      severity: "critical", title: "Server returned an HTTP 5xx error",
      evidence: "The final page returned HTTP " + observation.statusCode + "; response time to headers " + (observation.timeToFirstByteMs ?? "unknown") + " ms.",
      recommendedFix: "Check the deployment and serverless/runtime logs for this request; verify upstream services and roll back only if logs confirm a regression.",
      businessImpact: "Requests receiving this response fail. The number of affected visitors, duration, and revenue impact require traffic and transaction data.",
    });
  } else if (observation.statusCode >= 300) {
    findings.push({
      severity: "warning",
      title: "Redirect response did not reach a final page (HTTP " + observation.statusCode + ")",
      evidence: "The response ended at " + current.toString() + " with HTTP " + observation.statusCode + ".",
      recommendedFix: "Inspect the Location header and redirect rules. Verify the destination is public, valid HTTPS, and not caught in a loop.",
      businessImpact: "The check did not reach a final page. This does not prove that all visitors are affected or establish a financial loss.",
    });
  } else if (observation.statusCode >= 400) {
    findings.push({
      severity: "warning", title: "Homepage returned HTTP " + observation.statusCode,
      evidence: "The final page returned HTTP " + observation.statusCode + "; server " + (observation.server || "not reported") + ".",
      recommendedFix: "Confirm whether the response is expected (for example, access control, bot protection, or a missing path). Inspect public routing before changing access controls.",
      businessImpact: "This probe's request was not served as a successful page. It does not prove all users are blocked.",
    });
  } else {
    findings.push({
      severity: "pass", title: "HTTP " + observation.statusCode + " response received",
      evidence: "Content type " + (observation.contentType || "not reported") + "; title " + (observation.pageTitle || "not found") + "; " + observation.responseBytesRead + " bytes inspected" + (observation.responseBodyTruncated ? " (body inspection capped)" : "") + ".",
      recommendedFix: "No availability fix is indicated by this one successful request. Repeat periodically and monitor representative customer journeys.",
      businessImpact: "The final page responded to this check at the recorded time. It does not prove application correctness or successful checkout.",
    });
  }
  if (observation?.timeToFirstByteMs !== null && observation?.timeToFirstByteMs !== undefined) {
    if (observation.timeToFirstByteMs > 3000) {
      findings.push({ severity: "warning", title: "Slow time to first byte", evidence: observation.timeToFirstByteMs + " ms elapsed until HTTP response headers.", recommendedFix: "Compare warm and cold requests; inspect platform/server timing, caching, and server-side work. Use real-user percentiles before prioritizing a broad performance project.", businessImpact: "Slow initial responses can increase abandonment risk, but this single request does not quantify conversion or revenue impact." });
    } else {
      findings.push({ severity: "info", title: "Response timing captured", evidence: "Time to first byte: " + observation.timeToFirstByteMs + " ms; complete probe including reads and DNS: " + (Date.now() - started) + " ms.", recommendedFix: "Collect repeated p50/p95 measurements from relevant user regions before drawing conclusions about performance.", businessImpact: "This is one synthetic sample and is not a Core Web Vitals or user-experience percentile." });
    }
  }
  if (requestError && observation?.statusCode !== null) {
    findings.push({
      severity: "warning", title: "Audit stopped with a diagnostic note", evidence: requestError,
      recommendedFix: "Review the note and repeat the check. A safety limit, a DNS refresh issue, or a redirect rule can stop a scan without establishing an outage.",
      businessImpact: "The audit was limited by this condition; no financial loss is estimated.",
    });
  }
  return {
    requestedUrl, finalUrl: current.toString(), hostname: requested.hostname, checkedAt,
    executionRegion: process.env.VERCEL_REGION || "region not exposed by runtime",
    result: observation?.statusCode !== null && observation !== null && !requestError ? "complete" : "inconclusive",
    dnsLookups, redirects, httpStatus: observation?.statusCode ?? null,
    contentType: observation?.contentType ?? null, contentLength: observation?.contentLength ?? null,
    server: observation?.server ?? null, cacheStatus: observation?.cacheStatus ?? null,
    pageTitle: observation?.pageTitle ?? null, dnsLookupMs: firstDns?.elapsedMs ?? null,
    timeToFirstByteMs: observation?.timeToFirstByteMs ?? null, totalElapsedMs: Date.now() - started,
    responseBytesRead: observation?.responseBytesRead ?? 0,
    responseBodyTruncated: observation?.responseBodyTruncated ?? false,
    tls: tlsEvidence, requestError: requestError || observation?.error || null, findings,
    revenueImpact: { estimated: false, reason: "No visitor, conversion, order-value, checkout-failure, or outage-duration data was supplied. This audit reports technical observations only and does not claim a dollar loss." },
  };
}
