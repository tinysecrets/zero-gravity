import { NextResponse } from "next/server";
import { allowPublicSubmission } from "@/lib/public-request-guard";
import { normalizeWebsiteUrl, runWebsiteReliabilityAudit } from "@/lib/website-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!allowPublicSubmission(request, "website_reliability")) {
    return NextResponse.json(
      { success: false, error: "Request rejected or audit rate limit reached. Retry in about a minute." },
      { status: 429 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A JSON body containing a public website URL is required." }, { status: 400 });
  }
  const url = body && typeof body === "object" && "url" in body ? (body as { url?: unknown }).url : undefined;
  if (typeof url !== "string" || !url.trim() || url.length > 2048) {
    return NextResponse.json({ success: false, error: "Enter a public website URL (maximum 2,048 characters)." }, { status: 400 });
  }
  try {
    normalizeWebsiteUrl(url);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "The website URL was rejected." },
      { status: 400 },
    );
  }
  try {
    const audit = await runWebsiteReliabilityAudit(url);
    return NextResponse.json({ success: true, audit });
  } catch (error) {
    console.error("Website reliability audit failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { success: false, error: "The audit could not complete. Check the URL and retry; no website changes or transactions were performed." },
      { status: 502 },
    );
  }
}
