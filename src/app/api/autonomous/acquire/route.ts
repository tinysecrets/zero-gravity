import { NextResponse } from "next/server";
import { ensureDbInitialized } from "@/lib/db-seed";
import {
  acquireFromCTLogs,
  importDomains,
  discoverPortfolio,
} from "@/lib/prospect-acquisition";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST — Prospect acquisition.
 *
 * Body:
 *   mode: "ct_log" | "import" | "portfolio"
 *   query: string          — niche keyword (ct_log), domain list (import), or root domain (portfolio)
 *   industry?: string      — industry tag for feedback loop
 *   maxResults?: number    — cap on new domains (default 50)
 */
export async function POST(request: Request) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const mode = String(body.mode || "ct_log");
    const query = String(body.query || "").trim();

    if (!query) {
      return NextResponse.json({ success: false, error: "Query is required." }, { status: 400 });
    }

    let result;

    switch (mode) {
      case "ct_log":
        result = await acquireFromCTLogs(
          query,
          body.industry || "general",
          Number(body.maxResults) || 50
        );
        break;

      case "import":
        result = await importDomains(
          query,
          body.niche || "Imported",
          body.industry || "general"
        );
        break;

      case "portfolio":
        result = await discoverPortfolio(
          query,
          body.industry || "agency_portfolio"
        );
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown mode: ${mode}. Use ct_log, import, or portfolio.` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
      message: `Found ${result.domainsFound} domains. ${result.newInserted} new targets added. ${result.duplicatesSkipped} duplicates skipped.`,
    });
  } catch (error) {
    console.error("Prospect acquisition failed:", error);
    return NextResponse.json(
      { success: false, error: "Prospect acquisition failed." },
      { status: 500 }
    );
  }
}