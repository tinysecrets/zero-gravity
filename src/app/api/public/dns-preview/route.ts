import { NextResponse } from "next/server";
import { runDomainAudit } from "@/lib/audit-engine";
import { allowPublicSubmission, validRequestedDomain } from "@/lib/public-request-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

// Free, read-only preview. It reports public DNS observations only and never
// creates a lead, sends outreach, changes DNS, or estimates financial loss.
export async function POST(request: Request) {
  if (!allowPublicSubmission(request, "dns_preview")) {
    return NextResponse.json(
      { success: false, error: "Please refresh and try again in about a minute." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  let domain = "";
  try {
    const body = await request.json() as Record<string, unknown>;
    domain = typeof body.domain === "string" ? validRequestedDomain(body.domain) : "";
    if (!domain) throw new Error("Enter a valid public domain, such as example.com.");
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "A valid public domain is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const audit = await runDomainAudit(domain);
    return NextResponse.json({
      success: true,
      preview: {
        domain: audit.domain,
        score: audit.score,
        dmarcPresent: audit.dmarcPresent,
        dmarcPolicy: audit.dmarcPolicy,
        spfPresent: audit.spfPresent,
        mxPresent: audit.mxPresent,
        findings: audit.findings.map(({ category, severity, title, description }) => ({
          category, severity, title, description,
        })),
        limitation: "This is a limited public DNS snapshot. It does not test inbox placement, inspect every DKIM selector, prove lost revenue, or make configuration changes.",
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "The DNS preview could not complete. Please retry." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
