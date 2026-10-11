import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Read-only provider health check. Never returns credentials or sends email.
export async function GET() {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || "";
  if (!key) return NextResponse.json({ ok: false, resend: "missing_api_key" }, { status: 503 });
  if (!/^\S+@\S+\.\S+$/.test(from)) return NextResponse.json({ ok: false, resend: "invalid_from_email" }, { status: 503 });
  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return NextResponse.json({ ok: false, resend: "api_rejected_key", providerStatus: response.status }, { status: 502 });
    const result = await response.json() as { data?: Array<{ name?: string; status?: string; capabilities?: { sending?: string } }> };
    const senderDomain = from.split("@")[1].toLowerCase();
    const domain = result.data?.find((item) => item.name?.toLowerCase() === senderDomain);
    const verified = domain?.status === "verified" && domain.capabilities?.sending === "enabled";
    return NextResponse.json({
      ok: Boolean(verified),
      resend: verified ? "verified_and_sending_enabled" : domain ? "domain_not_ready" : "sender_domain_not_found",
      domainStatus: domain?.status || "not_found",
      sendingCapability: domain?.capabilities?.sending || "unknown",
    }, { status: verified ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false, resend: "provider_check_failed" }, { status: 502 });
  }
}
