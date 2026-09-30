import { db } from "@/db";
import { opportunities, audits, playbooks } from "@/db/schema";
import { INITIAL_OPPORTUNITIES, SEED_PLAYBOOKS } from "./seed-data";
import { sql } from "drizzle-orm";

export async function ensureDbInitialized() {
  try {
    // Ensure table structure exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS opportunities (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        vector TEXT NOT NULL,
        target_company TEXT NOT NULL,
        target_contact TEXT NOT NULL,
        target_email TEXT,
        target_phone TEXT,
        target_niche TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'discovered',
        potential_value NUMERIC(10,2) NOT NULL DEFAULT 0,
        operator_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 25.00,
        gross_transaction_value NUMERIC(10,2) NOT NULL DEFAULT 0,
        realized_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
        capital_spent NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        notes TEXT,
        outreach_message TEXT,
        audit_data TEXT,
        contract_terms TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audits (
        id SERIAL PRIMARY KEY,
        domain_or_target TEXT NOT NULL,
        audit_type TEXT NOT NULL,
        overall_score INTEGER NOT NULL DEFAULT 70,
        findings TEXT NOT NULL,
        estimated_monthly_leakage NUMERIC(10,2) NOT NULL DEFAULT 0,
        recommended_fix_bounty NUMERIC(10,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'completed',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS financial_transactions (
        id SERIAL PRIMARY KEY,
        opportunity_id INTEGER,
        transaction_type TEXT NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'Stripe Direct',
        description TEXT NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payment_requests (
        id SERIAL PRIMARY KEY,
        opportunity_id INTEGER,
        reference_code TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL DEFAULT 'stripe',
        provider_session_id TEXT UNIQUE,
        checkout_url TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        amount NUMERIC(10,2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'usd',
        client_name TEXT NOT NULL,
        service_description TEXT NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'card',
        transaction_id INTEGER,
        paid_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS playbooks (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        vector TEXT NOT NULL,
        tagline TEXT NOT NULL,
        capital_required TEXT NOT NULL DEFAULT '$0.00',
        avg_time_to_first_dollar TEXT NOT NULL,
        avg_deal_size TEXT NOT NULL,
        scalability_rating TEXT NOT NULL,
        barrier_to_entry TEXT NOT NULL,
        core_mechanism TEXT NOT NULL,
        step_by_step_execution TEXT NOT NULL,
        free_tools_used TEXT NOT NULL,
        scripts_and_templates TEXT NOT NULL,
        risk_mitigation TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Check if playbooks need seeding
    const playbooksCount = await db.execute(sql`SELECT count(*)::int as cnt FROM playbooks`);
    const pCount = (playbooksCount.rows[0] as { cnt: number })?.cnt || 0;

    if (pCount === 0) {
      for (const pb of SEED_PLAYBOOKS) {
        await db.insert(playbooks).values({
          slug: pb.slug,
          title: pb.title,
          vector: pb.vector,
          tagline: pb.tagline,
          capitalRequired: pb.capitalRequired,
          avgTimeToFirstDollar: pb.avgTimeToFirstDollar,
          avgDealSize: pb.avgDealSize,
          scalabilityRating: pb.scalabilityRating,
          barrierToEntry: pb.barrierToEntry,
          coreMechanism: pb.coreMechanism,
          stepByStepExecution: JSON.stringify(pb.stepByStepExecution),
          freeToolsUsed: pb.freeToolsUsed,
          scriptsAndTemplates: JSON.stringify(pb.scriptsAndTemplates),
          riskMitigation: pb.riskMitigation,
        });
      }
    }

    // Check if opportunities need seeding
    const oppCountRes = await db.execute(sql`SELECT count(*)::int as cnt FROM opportunities`);
    const oppCount = (oppCountRes.rows[0] as { cnt: number })?.cnt || 0;

    if (oppCount === 0) {
      for (const opp of INITIAL_OPPORTUNITIES) {
        await db.insert(opportunities).values(opp as typeof opportunities.$inferInsert);
      }
    }

    // Retire legacy scenario entries that were created before provider-confirmed settlement existed.
    // They remain visible only as unverified history and no longer contribute to cash metrics.
    await db.execute(sql`
      UPDATE financial_transactions
      SET verified = false
      WHERE description IN (
        'Apex Roofing LLC - 25% Contingency fee on 3 closed roof replacements ($28,400 gross volume).',
        'Vanguard Wealth Partners - DMARC & SPF DNS remediation fix bounty.',
        'Rust Dev Digest - 30% Broker commission on Q2 sponsor placement ($3,600 deal).'
      )
      OR description LIKE 'Direct Cash Receipt:%';

      UPDATE opportunities
      SET
        realized_revenue = 0,
        status = CASE WHEN status = 'revenue_collected' THEN 'completed_invoiced' ELSE status END,
        updated_at = NOW()
      WHERE title LIKE 'Apex Roofing & Solar - Austin, TX%'
         OR title LIKE 'Vanguard Wealth Management%'
         OR title LIKE 'Rust Developers Digest%'
         OR title LIKE 'State University Library%';
    `);

    return { success: true };
  } catch (error) {
    console.error("Database initialization error:", error);
    return { success: false, error };
  }
}
