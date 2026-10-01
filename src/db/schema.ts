import { pgTable, serial, text, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  vector: text("vector").notNull(), // lead_reactivation | technical_leak_audit | micro_sponsorship | public_micro_purchase
  targetCompany: text("target_company").notNull(),
  targetContact: text("target_contact").notNull(),
  targetEmail: text("target_email"),
  targetPhone: text("target_phone"),
  targetNiche: text("target_niche").notNull(),
  status: text("status").notNull().default("discovered"), // discovered | audited | outreach_sent | contract_signed | in_execution | completed_invoiced | revenue_collected
  potentialValue: numeric("potential_value", { precision: 10, scale: 2 }).notNull().default("0"),
  operatorFeePercent: numeric("operator_fee_percent", { precision: 5, scale: 2 }).notNull().default("25.0"),
  grossTransactionValue: numeric("gross_transaction_value", { precision: 10, scale: 2 }).notNull().default("0"),
  realizedRevenue: numeric("realized_revenue", { precision: 10, scale: 2 }).notNull().default("0"),
  capitalSpent: numeric("capital_spent", { precision: 10, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  outreachMessage: text("outreach_message"),
  outreachDeliveryStatus: text("outreach_delivery_status").notNull().default("draft"),
  outreachProviderId: text("outreach_provider_id"),
  outreachAttemptedAt: timestamp("outreach_attempted_at"),
  auditData: text("audit_data"), // JSON formatted string
  contractTerms: text("contract_terms"),
  offerTier: text("offer_tier").default("remediation"), // remediation ($350) | implementation ($1.5K-$3K) | monitoring ($199-$299/mo)
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }),
  acquisitionSource: text("acquisition_source").default("manual"), // manual | ct_log | portfolio | advisor
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const audits = pgTable("audits", {
  id: serial("id").primaryKey(),
  domainOrTarget: text("domain_or_target").notNull(),
  auditType: text("audit_type").notNull(), // deliverability_leak | dead_lead_potential | sponsorship_rate | micro_procurement
  overallScore: integer("overall_score").notNull().default(70),
  findings: text("findings").notNull(), // JSON
  estimatedMonthlyLeakage: numeric("estimated_monthly_leakage", { precision: 10, scale: 2 }).notNull().default("0"),
  recommendedFixBounty: numeric("recommended_fix_bounty", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financialTransactions = pgTable("financial_transactions", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id"),
  transactionType: text("transaction_type").notNull(), // rev_share_commission | fix_bounty | sponsorship_brokerage | finder_fee
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("Stripe Direct"),
  description: text("description").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentRequests = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id"),
  referenceCode: text("reference_code").notNull().unique(),
  provider: text("provider").notNull().default("stripe"),
  livemode: boolean("livemode").notNull().default(false),
  providerSessionId: text("provider_session_id").unique(),
  checkoutUrl: text("checkout_url"),
  status: text("status").notNull().default("draft"), // draft | checkout_created | paid | expired | cancelled | provider_not_configured
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("usd"),
  clientName: text("client_name").notNull(),
  serviceDescription: text("service_description").notNull(),
  paymentMethod: text("payment_method").notNull().default("card"),
  transactionId: integer("transaction_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const playbooks = pgTable("playbooks", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  vector: text("vector").notNull(),
  tagline: text("tagline").notNull(),
  capitalRequired: text("capital_required").notNull().default("$0.00"),
  avgTimeToFirstDollar: text("avg_time_to_first_dollar").notNull(),
  avgDealSize: text("avg_deal_size").notNull(),
  scalabilityRating: text("scalability_rating").notNull(),
  barrierToEntry: text("barrier_to_entry").notNull(),
  coreMechanism: text("core_mechanism").notNull(),
  stepByStepExecution: text("step_by_step_execution").notNull(), // JSON
  freeToolsUsed: text("free_tools_used").notNull(),
  scriptsAndTemplates: text("scripts_and_templates").notNull(), // JSON
  riskMitigation: text("risk_mitigation").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Autonomous engine: persistent scan targets ──────────────────────────

export const scanTargets = pgTable("scan_targets", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  niche: text("niche").notNull().default("B2B Services"),
  industry: text("industry"),               // feedback-loop dimension
  source: text("source").notNull().default("manual"), // manual | ct_log | portfolio | csv_import
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(1),
  lastAuditedAt: timestamp("last_audited_at"),
  lastScore: integer("last_score"),
  lastDealId: integer("last_deal_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Autonomous engine: run history ──────────────────────────────────────

export const autonomousRuns = pgTable("autonomous_runs", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("running"),
  scoreThreshold: integer("score_threshold").notNull().default(65),
  autoCreateDeals: boolean("auto_create_deals").notNull().default(true),
  autoGenerateOutreach: boolean("auto_generate_outreach").notNull().default(true),
  autoSendOutreach: boolean("auto_send_outreach").notNull().default(false),
  maxDomainsPerCycle: integer("max_domains_per_cycle").notNull().default(5),
  autoCreateCheckout: boolean("auto_create_checkout").notNull().default(false),
  domainsScanned: integer("domains_scanned").notNull().default(0),
  opportunitiesFound: integer("opportunities_found").notNull().default(0),
  dealsCreated: integer("deals_created").notNull().default(0),
  outreachGenerated: integer("outreach_generated").notNull().default(0),
  checkoutsCreated: integer("checkouts_created").notNull().default(0),
  totalEstimatedValue: numeric("total_estimated_value", { precision: 12, scale: 2 }).notNull().default("0"),
  details: text("details"),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// ── Productized offers: recurring monitoring subscriptions ───────────────

export const monitoringSubscriptions = pgTable("monitoring_subscriptions", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id"),
  domain: text("domain").notNull(),
  clientName: text("client_name").notNull(),
  tier: text("tier").notNull().default("standard"), // standard ($199/mo) | premium ($299/mo)
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }).notNull().default("199.00"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  status: text("status").notNull().default("active"), // active | paused | cancelled | past_due
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Revenue feedback loop: event-level attribution ──────────────────────

export const revenueEvents = pgTable("revenue_events", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id"),
  transactionId: integer("transaction_id"),
  industry: text("industry"),
  offerTier: text("offer_tier"), // remediation | implementation | monitoring
  acquisitionSource: text("acquisition_source"), // ct_log | manual | portfolio | advisor
  contactType: text("contact_type"), // owner | cto | marketing_vp | procurement
  channel: text("channel"), // email | sms | linkedin | form
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  eventType: text("event_type").notNull(), // checkout_created | payment_verified | subscription_started | subscription_renewed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One persisted scheduler configuration and execution lease across Vercel instances.
export const schedulerSettings = pgTable("scheduler_settings", {
  id: integer("id").primaryKey().default(1),
  enabled: boolean("enabled").notNull().default(false),
  intervalMinutes: integer("interval_minutes").notNull().default(15),
  scoreThreshold: integer("score_threshold").notNull().default(65),
  autoCreateDeals: boolean("auto_create_deals").notNull().default(true),
  autoGenerateOutreach: boolean("auto_generate_outreach").notNull().default(true),
  autoSendOutreach: boolean("auto_send_outreach").notNull().default(false),
  autoCreateCheckout: boolean("auto_create_checkout").notNull().default(false),
  maxDomainsPerCycle: integer("max_domains_per_cycle").notNull().default(5),
  stopRequested: boolean("stop_requested").notNull().default(false),
  leaseOwner: text("lease_owner"),
  leaseExpiresAt: timestamp("lease_expires_at"),
  nextRunAt: timestamp("next_run_at"),
  lastRunAt: timestamp("last_run_at"),
  lastRunStatus: text("last_run_status"),
  totalRuns: integer("total_runs").notNull().default(0),
  consecutiveErrors: integer("consecutive_errors").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
