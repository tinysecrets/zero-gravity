import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { vi } from "vitest";
import { DATABASE_SETUP_SQL } from "@/db/setup";

export const client = new PGlite();
export const db = drizzle(client);

export async function setupDatabase() { await client.exec(DATABASE_SETUP_SQL); }

export async function resetDatabase(overrides: Record<string, string> = {}) {
  vi.unstubAllEnvs();
  const env = {
    DATABASE_URL: "postgresql://test:fixture@invalid.local/test",
    VERCEL: "1", VERCEL_ENV: "production",
    CRON_SECRET: "local-cron-fixture", DASHBOARD_PASSWORD: "local-dashboard-fixture",
    DASHBOARD_USERNAME: "admin", APP_URL: "https://zero-gravity.test", NEXT_PUBLIC_APP_URL: "",
    VERCEL_PROJECT_PRODUCTION_URL: "", VERCEL_URL: "",
    AUTONOMOUS_ENABLED: "true", AUTONOMOUS_CREATE_CHECKOUT: "true", AUTONOMOUS_SEND_OUTREACH: "false",
    STRIPE_SECRET_KEY: "sk_test_local_fixture", STRIPE_WEBHOOK_SECRET: "whsec_local_fixture",
    RESEND_API_KEY: "", FROM_EMAIL: "", OUTREACH_REPLY_TO: "", OUTREACH_POSTAL_ADDRESS: "", OUTREACH_TEST_RECIPIENT: "",
    SEED_DEMO_DATA: "false", ...overrides,
  };
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  delete (globalThis as typeof globalThis & { __zeroGravityDbInitialization?: unknown }).__zeroGravityDbInitialization;
  await client.exec(`TRUNCATE scheduler_settings, autonomous_runs, scan_targets, payment_requests,
    financial_transactions, revenue_events, monitoring_subscriptions, opportunities, audits, playbooks RESTART IDENTITY CASCADE;`);
}
