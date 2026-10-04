import { NextRequest, NextResponse } from "next/server";
import { operatorAuthState, sameOriginRequest, validOperatorAuthorization } from "@/lib/request-auth";

// These endpoints are authenticated at their provider boundary instead of by
// operator HTTP Basic Auth: Vercel cron's Bearer token, Stripe's webhook
// signature, or an unguessable Checkout Session ID.
function isProviderRoute(request: NextRequest): boolean {
  const path = request.nextUrl.pathname;
  return path === "/api/health" ||
    path === "/api/autonomous/cron" ||
    path === "/api/payments/webhook" ||
    path === "/api/webhook/stripe" ||
    path === "/payment/success" ||
    (path === "/api/payments" &&
      request.method === "GET" &&
      request.nextUrl.searchParams.has("session_id"));
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

  if (isProviderRoute(request)) return NextResponse.next();

  const auth = operatorAuthState();
  if (auth.misconfigured) return operatorConfigUnavailable();
  if (auth.required && !validOperatorAuthorization(request)) {
    return operatorAuthenticationRequired();
  }

  // Browser mutations also require a same-origin request to prevent CSRF.
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
