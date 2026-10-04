export interface CycleConfig {
  scoreThreshold: number;
  autoCreateDeals: boolean;
  autoGenerateOutreach: boolean;
  autoSendOutreach: boolean;
  autoCreateCheckout: boolean;
  maxDomainsPerCycle: number;
}

// Keep this in sync with vercel.json. Vercel Hobby supports daily cron jobs.
export const VERCEL_CRON_SCHEDULE = "0 13 * * *";
export const CYCLE_BUDGET_MS = 240_000;
export const RUN_LEASE_MS = 330_000;

export function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

export function defaultCycleConfig(): CycleConfig {
  return {
    scoreThreshold: 65,
    autoCreateDeals: true,
    autoGenerateOutreach: true,
    // Credentials alone must never opt an operator into sending email or creating checkout.
    autoSendOutreach: process.env.AUTONOMOUS_SEND_OUTREACH === "true",
    autoCreateCheckout: process.env.AUTONOMOUS_CREATE_CHECKOUT === "true",
    maxDomainsPerCycle: 5,
  };
}

export function parseCycleConfig(body: unknown): Partial<CycleConfig> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Configuration must be a JSON object.");
  }
  const input = body as Record<string, unknown>;
  const config: Partial<CycleConfig> = {};
  for (const key of ["autoCreateDeals", "autoGenerateOutreach", "autoSendOutreach", "autoCreateCheckout"] as const) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== "boolean") throw new Error(`${key} must be a boolean.`);
      config[key] = input[key];
    }
  }
  for (const [key, min, max] of [["scoreThreshold", 1, 100], ["maxDomainsPerCycle", 1, 10]] as const) {
    if (input[key] !== undefined) {
      const value = input[key];
      if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
        throw new Error(`${key} must be an integer between ${min} and ${max}.`);
      }
      config[key] = value;
    }
  }
  return config;
}

export function parseIntervalMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 1440) {
    throw new Error("intervalMinutes must be an integer between 1 and 1440.");
  }
  return value;
}

export function nextVercelRun(now = new Date()): Date {
  const next = new Date(now);
  next.setUTCHours(13, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export function stripeLivemode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (/^(sk|rk)_live_/.test(key)) return true;
  if (/^(sk|rk)_test_/.test(key)) return false;
  throw new Error("STRIPE_SECRET_KEY must be a Stripe test or live secret key.");
}

export function appOrigin(requestUrl?: string): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const value = configured || (isVercel() && vercelHost ? `https://${vercelHost}` : requestUrl);
  if (!value) throw new Error("Set APP_URL to the public application URL.");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("APP_URL must be an HTTP(S) URL without credentials.");
  }
  if (isVercel() && (url.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) {
    throw new Error("APP_URL must be a public HTTPS URL on Vercel.");
  }
  return url.origin;
}

export interface AutomationReadiness {
  ready: boolean;
  blockers: string[];
  paymentMode: "live" | "test" | "not_configured";
}

export function automationReadiness(config: CycleConfig): AutomationReadiness {
  const blockers: string[] = [];
  let paymentMode: AutomationReadiness["paymentMode"] = "not_configured";
  if (!process.env.DATABASE_URL) blockers.push("DATABASE_URL is not configured.");
  if (isVercel()) {
    if (!process.env.CRON_SECRET) blockers.push("CRON_SECRET is not configured.");
  }
  if (process.env.STRIPE_SECRET_KEY) {
    try { paymentMode = stripeLivemode() ? "live" : "test"; }
    catch { blockers.push("STRIPE_SECRET_KEY is not a valid test/live key."); }
  }
  if (config.autoCreateCheckout) {
    if (!process.env.STRIPE_SECRET_KEY) blockers.push("STRIPE_SECRET_KEY is not configured.");
    if (!process.env.STRIPE_WEBHOOK_SECRET) blockers.push("STRIPE_WEBHOOK_SECRET is not configured.");
    try { appOrigin(); } catch { blockers.push("APP_URL must be a valid public application URL."); }
  }
  if (config.autoSendOutreach) {
    if (!config.autoGenerateOutreach || !config.autoCreateCheckout) {
      blockers.push("Sending outreach requires both outreach generation and checkout creation.");
    }
    if (paymentMode === "test" && !/^\S+@\S+\.\S+$/.test(process.env.OUTREACH_TEST_RECIPIENT || "")) {
      blockers.push("OUTREACH_TEST_RECIPIENT is required for test-mode email; real prospects are never contacted with test invoices.");
    }
    if (!process.env.RESEND_API_KEY) blockers.push("RESEND_API_KEY is not configured.");
    if (!/^\S+@\S+\.\S+$/.test(process.env.FROM_EMAIL || "")) blockers.push("FROM_EMAIL must be your verified sender address.");
    if (!/^\S+@\S+\.\S+$/.test(process.env.OUTREACH_REPLY_TO || "")) blockers.push("OUTREACH_REPLY_TO must be a monitored opt-out mailbox.");
    if (!process.env.OUTREACH_POSTAL_ADDRESS?.trim()) blockers.push("OUTREACH_POSTAL_ADDRESS is required for outreach.");
    if (process.env.OUTREACH_COMPLIANCE_CONFIRMED !== "true") {
      blockers.push("OUTREACH_COMPLIANCE_CONFIRMED=true requires operator confirmation that the reply/opt-out mailbox is monitored and the postal address is a real business address.");
    }
  }
  return { ready: blockers.length === 0, blockers, paymentMode };
}
