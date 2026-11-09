import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The former public $149 checkout was retired. Public visitors now start with
// the free diagnostic and request a written, customer-approved scope before
// any implementation or recurring monitoring is invoiced.
export async function POST() {
  return NextResponse.json({
    success: false,
    error: "The former one-time review offer is no longer available. Start with the free diagnostic and request a scoped proposal instead.",
  }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
