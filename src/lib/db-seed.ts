import { db } from "@/db";
import { opportunities, scanTargets, schedulerSettings } from "@/db/schema";
import { DATABASE_SETUP_SQL } from "@/db/setup";
import { INITIAL_OPPORTUNITIES, SEED_PLAYBOOKS } from "./seed-data";
import { defaultCycleConfig, isVercel } from "./automation-config";
import { sql } from "drizzle-orm";

const globalForInit = globalThis as typeof globalThis & {
  __zeroGravityDbInitialization?: Promise<{ success: true }>;
};

// Initialization must not start jobs or send email. Cache it per instance to avoid
// rerunning DDL/seeding on every dashboard poll. Failed initialization is retryable.
export function ensureDbInitialized(): Promise<{ success: true }> {
  if (!process.env.DATABASE_URL) return Promise.reject(new Error("DATABASE_URL is required."));
  if (!globalForInit.__zeroGravityDbInitialization) {
    globalForInit.__zeroGravityDbInitialization = initialize().catch((error) => {
      delete globalForInit.__zeroGravityDbInitialization;
      throw error;
    });
  }
  return globalForInit.__zeroGravityDbInitialization;
}

async function initialize(): Promise<{ success: true }> {
  await db.transaction(async (tx) => {
    // Serialize cold-start schema/seed initialization across function instances.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(74320941)`);
    for (const statement of DATABASE_SETUP_SQL.split(";").filter((s) => s.trim())) {
      await tx.execute(sql.raw(statement));
    }

    await tx.insert(schedulerSettings).values({
      id: 1,
      enabled: process.env.AUTONOMOUS_ENABLED === "true",
      intervalMinutes: isVercel() ? 1440 : 15,
      ...defaultCycleConfig(),
    }).onConflictDoNothing();

    // Playbooks are reference material; sample businesses are opt-in only.
    // Never turn fictional/sample data into real outreach on a fresh deployment.
    for (const pb of SEED_PLAYBOOKS) {
      await tx.execute(sql`
        INSERT INTO playbooks (slug, title, vector, tagline, capital_required,
          avg_time_to_first_dollar, avg_deal_size, scalability_rating, barrier_to_entry,
          core_mechanism, step_by_step_execution, free_tools_used, scripts_and_templates, risk_mitigation)
        SELECT ${pb.slug}, ${pb.title}, ${pb.vector}, ${pb.tagline}, ${pb.capitalRequired},
          ${pb.avgTimeToFirstDollar}, ${pb.avgDealSize}, ${pb.scalabilityRating}, ${pb.barrierToEntry},
          ${pb.coreMechanism}, ${JSON.stringify(pb.stepByStepExecution)}, ${pb.freeToolsUsed},
          ${JSON.stringify(pb.scriptsAndTemplates)}, ${pb.riskMitigation}
        WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE slug = ${pb.slug})
      `);
    }

    if (process.env.SEED_DEMO_DATA === "true" && !isVercel()) {
      await tx.insert(scanTargets).values({
        domain: "example.com", niche: "Demo only", source: "demo", priority: 3,
      }).onConflictDoNothing();
      const existing = await tx.select({ id: opportunities.id }).from(opportunities).limit(1);
      if (existing.length === 0) {
        await tx.insert(opportunities).values(INITIAL_OPPORTUNITIES as typeof opportunities.$inferInsert[]);
      }
    }

    // Retire only known legacy simulated receipts; never reset paid opportunity revenue.
    await tx.execute(sql`
      UPDATE financial_transactions SET verified = false
      WHERE description IN (
        'Apex Roofing LLC - 25% Contingency fee on 3 closed roof replacements ($28,400 gross volume).',
        'Vanguard Wealth Partners - DMARC & SPF DNS remediation fix bounty.',
        'Rust Dev Digest - 30% Broker commission on Q2 sponsor placement ($3,600 deal).'
      ) OR description LIKE 'Direct Cash Receipt:%'
    `);
  });
  return { success: true };
}
