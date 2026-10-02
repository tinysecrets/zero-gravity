import { db } from "@/db";
import { autonomousRuns, financialTransactions, opportunities, paymentRequests, revenueEvents, scanTargets, schedulerSettings } from "@/db/schema";
import { getTableColumns, getTableName, sql } from "drizzle-orm";
import { automationReadiness, defaultCycleConfig } from "@/lib/automation-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requiredTables = [schedulerSettings, autonomousRuns, scanTargets, opportunities, paymentRequests, revenueEvents, financialTransactions];

export async function GET() {
  const readiness = automationReadiness(defaultCycleConfig());
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: false, database: "not_configured", automation: readiness }, { status: 503 });
  }
  try {
    // Read-only schema verification, not seeding or an implicit scheduler start.
    const columns = await db.execute(sql`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name IN (${sql.join(requiredTables.map((table) => sql`${getTableName(table)}`), sql`, `)})
    `);
    const present = new Set(columns.rows.map((row) => {
      const value = row as { table_name: string; column_name: string };
      return `${value.table_name}.${value.column_name}`;
    }));
    const missing = requiredTables.flatMap((table) => Object.values(getTableColumns(table))
      .map((column) => `${getTableName(table)}.${column.name}`).filter((column) => !present.has(column)));
    return Response.json({ ok: missing.length === 0, database: "connected", schema: { ready: missing.length === 0, missing }, automation: readiness },
      { status: missing.length ? 503 : 200 });
  } catch {
    return Response.json({ ok: false, database: "unavailable", automation: readiness }, { status: 503 });
  }
}
