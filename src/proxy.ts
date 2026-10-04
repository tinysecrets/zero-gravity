import { NextRequest, NextResponse } from "next/server";
import { sameOriginRequest } from "@/lib/request-auth";

// Zero Gravity is intentionally operator-accessible without a browser login.
// Provider callbacks remain public because Stripe/Vercel invoke them directly.
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isProviderRoute =
    path === "/api/health" ||
    path === "/api/autonomous/cron" ||
    path === "/api/payments/webhook" ||
    path === "/payment/success" ||
    (path === "/api/payments" &&
      request.method === "GET" &&
      request.nextUrl.searchParams.has("session_id"));

  if (isProviderRoute) return NextResponse.next();

  // No username/password challenge. Keep browser mutations same-origin so the
  // public dashboard cannot be driven cross-origin by a malicious web page.
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
