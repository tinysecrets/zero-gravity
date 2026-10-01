import { NextRequest, NextResponse } from "next/server";
import { sameOriginRequest, secretsEqual } from "@/lib/request-auth";

// Protect the operator dashboard/APIs, but leave hosted checkout callbacks public.
// Cron and Stripe authenticate themselves in their route handlers.
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = path === "/api/health" || path === "/api/autonomous/cron" ||
    path === "/api/payments/webhook" || path === "/payment/success" ||
    (path === "/api/payments" && request.method === "GET" && request.nextUrl.searchParams.has("session_id"));
  if (isPublic) return NextResponse.next();

  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) return NextResponse.next();
    return NextResponse.json({ success: false, error: "Set DASHBOARD_PASSWORD before exposing the dashboard." }, { status: 503 });
  }
  const username = process.env.DASHBOARD_USERNAME || "admin";
  const expected = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  if (!secretsEqual(request.headers.get("authorization"), expected)) {
    return new NextResponse("Operator authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Zero Gravity", charset="UTF-8"', "Cache-Control": "no-store" },
    });
  }

  // Browser Basic Auth is ambient: reject cross-origin mutation requests (CSRF).
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !sameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: "Cross-origin request rejected." }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
