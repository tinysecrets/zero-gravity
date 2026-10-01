import { timingSafeEqual } from "node:crypto";

export function secretsEqual(actual: string | null, expected: string): boolean {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Next may construct request.url from its internal listener address. Use the
// proxy-forwarded public host/protocol for browser CSRF checks on Vercel/previews.
export function sameOriginRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser API clients still require authentication.
  try {
    const internal = new URL(request.url);
    const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || internal.host;
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || internal.protocol.replace(":", "");
    if (!["http", "https"].includes(protocol)) return false;
    return new URL(origin).origin === new URL(`${protocol}://${host}`).origin;
  } catch { return false; }
}

export function validCronAuthorization(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && secretsEqual(request.headers.get("authorization"), `Bearer ${secret}`));
}
