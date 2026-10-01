import { db } from "@/db";
import { sql } from "drizzle-orm";
import { automationReadiness, defaultCycleConfig } from "@/lib/automation-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const readiness = automationReadiness(defaultCycleConfig());
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: false, database: "not_configured", automation: readiness }, { status: 503 });
  }
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: "connected", automation: readiness });
  } catch {
    return Response.json({ ok: false, database: "unavailable", automation: readiness }, { status: 503 });
  }
}
