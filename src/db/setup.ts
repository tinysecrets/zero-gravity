// Idempotent schema setup, shared by the application and database integration tests.
export const DATABASE_SETUP_SQL = `
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

      CREATE TABLE IF NOT EXISTS scan_targets (
        id SERIAL PRIMARY KEY,
        domain TEXT NOT NULL UNIQUE,
        niche TEXT NOT NULL DEFAULT 'B2B Services',
        industry TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        is_active BOOLEAN NOT NULL DEFAULT true,
        priority INTEGER NOT NULL DEFAULT 1,
        last_audited_at TIMESTAMP,
        last_score INTEGER,
        last_deal_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS autonomous_runs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'running',
        score_threshold INTEGER NOT NULL DEFAULT 65,
        auto_create_deals BOOLEAN NOT NULL DEFAULT true,
        auto_generate_outreach BOOLEAN NOT NULL DEFAULT true,
        auto_create_checkout BOOLEAN NOT NULL DEFAULT false,
        domains_scanned INTEGER NOT NULL DEFAULT 0,
        opportunities_found INTEGER NOT NULL DEFAULT 0,
        deals_created INTEGER NOT NULL DEFAULT 0,
        outreach_generated INTEGER NOT NULL DEFAULT 0,
        checkouts_created INTEGER NOT NULL DEFAULT 0,
        total_estimated_value NUMERIC(12,2) NOT NULL DEFAULT 0,
        details TEXT,
        error TEXT,
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS monitoring_subscriptions (
        id SERIAL PRIMARY KEY,
        opportunity_id INTEGER,
        domain TEXT NOT NULL,
        client_name TEXT NOT NULL,
        tier TEXT NOT NULL DEFAULT 'standard',
        monthly_price NUMERIC(10,2) NOT NULL DEFAULT 199.00,
        stripe_subscription_id TEXT,
        stripe_price_id TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS revenue_events (
        id SERIAL PRIMARY KEY,
        opportunity_id INTEGER,
        transaction_id INTEGER,
        industry TEXT,
        offer_tier TEXT,
        acquisition_source TEXT,
        contact_type TEXT,
        channel TEXT,
        amount NUMERIC(10,2) NOT NULL,
        event_type TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS outreach_delivery_status TEXT NOT NULL DEFAULT 'draft';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS outreach_provider_id TEXT;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS outreach_attempted_at TIMESTAMP;
      UPDATE opportunities SET outreach_delivery_status = 'sent' WHERE status = 'outreach_sent' AND outreach_delivery_status = 'draft';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS offer_tier TEXT DEFAULT 'remediation';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(10,2);
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS acquisition_source TEXT DEFAULT 'manual';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS autonomous_domain TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS opportunities_autonomous_domain_unique ON opportunities (autonomous_domain);
      ALTER TABLE scan_targets ADD COLUMN IF NOT EXISTS source_evidence TEXT;
      ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS livemode BOOLEAN NOT NULL DEFAULT false;
      UPDATE payment_requests SET livemode = true WHERE provider_session_id LIKE 'cs_live_%';
      ALTER TABLE autonomous_runs ADD COLUMN IF NOT EXISTS auto_send_outreach BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE autonomous_runs ADD COLUMN IF NOT EXISTS max_domains_per_cycle INTEGER NOT NULL DEFAULT 5;

      CREATE TABLE IF NOT EXISTS scheduler_settings (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        enabled BOOLEAN NOT NULL DEFAULT false,
        interval_minutes INTEGER NOT NULL DEFAULT 15,
        score_threshold INTEGER NOT NULL DEFAULT 65,
        auto_create_deals BOOLEAN NOT NULL DEFAULT true,
        auto_generate_outreach BOOLEAN NOT NULL DEFAULT true,
        auto_send_outreach BOOLEAN NOT NULL DEFAULT false,
        auto_create_checkout BOOLEAN NOT NULL DEFAULT false,
        max_domains_per_cycle INTEGER NOT NULL DEFAULT 5,
        stop_requested BOOLEAN NOT NULL DEFAULT false,
        lease_owner TEXT,
        lease_expires_at TIMESTAMP,
        next_run_at TIMESTAMP,
        last_run_at TIMESTAMP,
        last_run_status TEXT,
        last_run_reason TEXT,
        total_runs INTEGER NOT NULL DEFAULT 0,
        consecutive_errors INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Scheduler tables created before these columns existed must be upgraded
      -- additively because CREATE TABLE IF NOT EXISTS does not alter an existing table.
      ALTER TABLE scheduler_settings ADD COLUMN IF NOT EXISTS auto_send_outreach BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE scheduler_settings ADD COLUMN IF NOT EXISTS max_domains_per_cycle INTEGER NOT NULL DEFAULT 5;
      ALTER TABLE scheduler_settings ADD COLUMN IF NOT EXISTS last_run_reason TEXT;
`;
