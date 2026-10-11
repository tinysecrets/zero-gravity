import { sameOriginRequest } from "@/lib/request-auth";

type RequestBucket = { timestamps: number[] };
const state = globalThis as typeof globalThis & { __zgPublicBuckets?: Map<string, RequestBucket> };
const buckets = state.__zgPublicBuckets ?? (state.__zgPublicBuckets = new Map<string, RequestBucket>());

export function allowPublicSubmission(request: Request, channel: string, now = Date.now()): boolean {
  if (request.method !== "POST" || !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return false;
  if (Number(request.headers.get("content-length") || "0") > 12_000) return false;
  if (!request.headers.get("origin") || !sameOriginRequest(request)) return false;
  // On Vercel, x-real-ip is set by the edge. Do not let a caller-controlled
  // leading x-forwarded-for entry override that trusted address.
  const ip = request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
  const key = channel + ":" + ip;
  const recent = (buckets.get(key)?.timestamps || []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 8) return false;
  recent.push(now);
  buckets.set(key, { timestamps: recent });
  if (buckets.size > 2_000) for (const [k, v] of buckets) { v.timestamps = v.timestamps.filter((stamp) => now - stamp < 60_000); if (!v.timestamps.length) buckets.delete(k); }
  return true;
}
export function validEmail(value: string): boolean { return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
export function validRequestedDomain(input: string): string {
  const v = input.trim().toLowerCase().replace(/\.$/, "");
  if (v.length > 253 || v.length < 4 || !v.includes(".") || /[^a-z0-9.-]/.test(v) || v.startsWith(".") || v.endsWith(".") || v.includes("..")) return "";
  const labels = v.split(".");
  if (labels.some((s) => !s || s.length > 63 || s.startsWith("-") || s.endsWith("-"))) return "";
  if (v === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return "";
  return v;
}
