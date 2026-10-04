import { timingSafeEqual } from "node:crypto";

export interface OperatorAuthState {
  required: boolean;
  configured: boolean;
  misconfigured: boolean;
}

export function secretsEqual(actual: string | null, expected: string): boolean {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Production management routes fail closed unless both operator credentials
 * are present. Local development remains convenient when neither is set.
 */
export function operatorAuthState(): OperatorAuthState {
  const username = process.env.OPERATOR_USERNAME;
  const password = process.env.OPERATOR_PASSWORD;
  const hasUsername = Boolean(username);
  const hasPassword = Boolean(password);
  const credentialsPresent = hasUsername && hasPassword;
  const credentialsValid = Boolean(
    username && username.trim() && password && Buffer.byteLength(password, "utf8") >= 32 &&
    !username.includes(":") && !/[\r\n]/.test(username) && !/[\r\n]/.test(password),
  );
  const configured = credentialsPresent && credentialsValid;
  const required = process.env.NODE_ENV === "production" || hasUsername || hasPassword;
  return {
    required,
    configured,
    misconfigured: required && !configured,
  };
}

export function validOperatorAuthorization(request: Request): boolean {
  const state = operatorAuthState();
  if (!state.configured) return false;
  const username = process.env.OPERATOR_USERNAME!;
  const password = process.env.OPERATOR_PASSWORD!;
  const authorization = request.headers.get("authorization") || "";
  const match = /^Basic\s+([A-Za-z0-9+/]+={0,2})$/i.exec(authorization);
  if (!match) return false;

  let decoded: string;
  try {
    decoded = Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  const suppliedUsername = decoded.slice(0, separator);
  const suppliedPassword = decoded.slice(separator + 1);
  const usernameMatches = secretsEqual(suppliedUsername, username);
  const passwordMatches = secretsEqual(suppliedPassword, password);
  return usernameMatches && passwordMatches;
}

// Next may construct request.url from its internal listener address. Use the
// proxy-forwarded public host/protocol for browser CSRF checks on Vercel/previews.
export function sameOriginRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true; // Operator authentication is enforced by the proxy.
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
