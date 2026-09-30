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
  auditData: text("audit_data"), // JSON formatted string
  contractTerms: text("contract_terms"),
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
