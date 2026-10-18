import { NextRequest, NextResponse } from "next/server";
import { operatorAuthState, sameOriginRequest, validOperatorAuthorization } from "@/lib/request-auth";

// These endpoints are authenticated at their provider boundary instead of by
// operator HTTP Basic Auth: Vercel cron's Bearer token, Stripe's webhook
// signature, or an unguessable Checkout Session ID.
function isProviderRoute(request: NextRequest): boolean {
  const path = request.nextUrl.pathname;
  return path === "/api/public/contact" || path === "/api/public/checkout" ||
    path === "/api/health" || path === "/api/health/email" ||
    path === "/api/autonomous/cron" ||
    path === "/api/payments/webhook" ||
    path === "/api/webhook/stripe" ||
    path === "/payment/success" ||
    (path === "/api/payments" &&
      request.method === "GET" &&
      request.nextUrl.searchParams.has("session_id"));
}

// Only allow runner-authenticated mutations to bypass operator Basic Auth.
// The route handlers repeat this token check before doing any work. Read-only
// GET status routes remain behind operator auth, and Preview's safety gate
// above still runs first.
function isRunnerAuthenticatedMutation(request: NextRequest): boolean {
  const path = request.nextUrl.pathname;
  const method = request.method;
  const runnerRoute =
    (path === "/api/autonomous/cycle" || path === "/api/autonomous/schedule") &&
    (method === "POST" || method === "DELETE");
  if (!runnerRoute) return false;

  const token = process.env.ZERO_GRAVITY_RUNNER_TOKEN;
  return Boolean(token && request.headers.get("x-zero-gravity-runner") === token);
}

function previewOperationsDisabled() {
  return NextResponse.json(
    { success: false, error: "Preview operations are disabled. Set ALLOW_PREVIEW_OPERATIONS=true only after configuring an isolated Preview database." },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

function previewRouteIsReadOnly(request: NextRequest): boolean {
  const path = request.nextUrl.pathname;
  return path === "/api/health" || path === "/payment/success" ||
    (path === "/api/payments" && request.method === "GET" && request.nextUrl.searchParams.has("session_id"));
}

function operatorConfigUnavailable() {
  return NextResponse.json(
    { success: false, error: "Operator access is not configured. Set OPERATOR_USERNAME and OPERATOR_PASSWORD before using management routes." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

function operatorAuthenticationRequired() {
  return NextResponse.json(
    { success: false, error: "Operator authentication required." },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Zero Gravity Operator", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    },
  );
}

export function proxy(request: NextRequest) {
  if (
    process.env.VERCEL_ENV === "preview" &&
    process.env.ALLOW_PREVIEW_OPERATIONS !== "true" &&
    !previewRouteIsReadOnly(request)
  ) return previewOperationsDisabled();

  // Public service page is separate from the authenticated operator workspace.
  if (request.nextUrl.pathname === "/") return NextResponse.next();

  if (isProviderRoute(request) || isRunnerAuthenticatedMutation(request)) {
    return NextResponse.next();
  }

  // Production management routes fail closed unless valid operator credentials
  // are configured. Local development remains open only when neither credential
  // is set; provider-bound routes above retain their own authentication.
  const auth = operatorAuthState();
  if (auth.misconfigured) return operatorConfigUnavailable();
  if (auth.required && !validOperatorAuthorization(request)) {
    return operatorAuthenticationRequired();
  }

  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    !sameOriginRequest(request)
  ) {
    return NextResponse.json(
      { success: false, error: "Cross-origin request rejected." },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
