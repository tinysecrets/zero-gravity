# Zero Gravity

A Next.js/PostgreSQL workflow for auditing reviewed prospects, drafting service offers, generating customer-approved Stripe Checkout payments, and recording signed payment events. **It does not transfer funds out, make bank payouts, guarantee revenue, or perform customer DNS changes.** A checkout link is not a payment; a confirmed card payment is not a confirmed bank payout. The ledger records gross confirmed receipts, not an available account balance; provider fees, refunds, and disputes are not automatically reconciled.

## Enable autonomous collection on the existing Vercel project

Configure these under **Vercel → Project → Settings → Environment Variables → Production**. Do not put credentials in source control or chat.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Your PostgreSQL connection string, including the provider's SSL configuration. |
| `APP_URL` | Public production HTTPS URL, e.g. `https://your-project.vercel.app`. Not localhost. |
| `DASHBOARD_PASSWORD` | Strong password protecting the operator dashboard and management APIs. |
| `DASHBOARD_USERNAME` | Optional; defaults to `admin`. |
| `CRON_SECRET` | Separate strong random secret used by Vercel to authenticate cron invocations. |
| `STRIPE_SECRET_KEY` | Your Stripe secret key. Start with a test key in a separate test environment/database. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the matching Stripe mode and this webhook destination. |
| `AUTONOMOUS_ENABLED` | Set `true` to bootstrap the scheduler enabled on a new database. |
| `AUTONOMOUS_CREATE_CHECKOUT` | Set `true` to bootstrap automatic checkout creation. |
| `AUTONOMOUS_SEND_OUTREACH` | Initially `false`. Enable only after reviewing contacts, service scope, email configuration, and opt-out handling. |

Generate independent random values for the dashboard password and cron secret, for example by running `openssl rand -hex 32` twice on your own machine.

1. Configure the database, dashboard protection, public URL, and cron secret.
2. In Stripe, create a webhook destination at `https://YOUR_DOMAIN/api/payments/webhook` for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.expired`
3. Set the matching Stripe secret/signing keys in Vercel. Test keys and test events **never count as real revenue**. Use an isolated test/preview database, not your production database.
4. Deploy the updated code to **Production** on the existing Vercel project, with Fluid compute enabled and a 300-second function duration available. Environment changes require a redeployment. A Git branch preview alone does not activate production cron jobs.
5. Sign in to the dashboard using HTTP Basic Auth. In **Revenue Engine**, add or import reviewed, relevant public business domains. Fresh production databases do not contain sample prospects. Review existing targets on upgraded databases as well.
6. Inspect the readiness checklist. For a first immediate run, use **Run Single Cycle**. Otherwise the next Vercel Cron invocation runs automatically without a browser visit.
7. Enable email only after the sender/contact/service checks below. Customers must choose to pay on Stripe's hosted checkout before signed live events enter the verified ledger.
8. Link your bank and manage payout schedules **in your Stripe Dashboard**. No bank linking, payout, transfer, automatic debit, or trading API is called by this app.

### Email delivery setup

Automatic sending is a separate opt-in from drafting. Configure:

- `RESEND_API_KEY`
- `FROM_EMAIL`: a sender on a domain you have verified with Resend
- `OUTREACH_REPLY_TO`: a monitored mailbox for replies and unsubscribe requests
- `OUTREACH_POSTAL_ADDRESS`: the sender's valid postal address included in commercial emails
- `OUTREACH_TEST_RECIPIENT`: your own inbox for test-mode emails; test checkout links are never emailed to prospects

Review recipients and your legal/compliance obligations before enabling commercial outreach. Honor opt-outs promptly by pausing automation and deactivating the relevant target; no automated follow-up campaign is implemented. Offers use observed public DNS findings, not invented lost revenue, fabricated lead-capture faults, or guaranteed inbox placement. Guessed addresses such as `info@domain` are not eligible for automatic offers. You are responsible for agreeing scope and delivering any purchased service.

A durable delivery claim prevents parallel sends. An interrupted or uncertain send stays `sending`/`needs_review`; it is **not automatically resent**. Review provider logs before any manual retry. Provider acceptance is not proof of inbox delivery.

### Schedule and persistent controls

`vercel.json` schedules `/api/autonomous/cron` **daily at 13:00 UTC** (`0 13 * * *`). This matches Vercel Hobby's daily cron restriction; Hobby execution can occur in the 13:00–13:59 UTC window. More frequent production jobs require a suitable Vercel plan and coordinated changes to both `vercel.json` and `src/lib/automation-config.ts`/the dashboard schedule description. See [Vercel cron usage and limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) and [function duration configuration](https://vercel.com/docs/functions/configuring-functions/duration).

Configuration, pause state, run counters, due times, and an execution lease live in PostgreSQL. Bootstrap environment flags initialize only a **new** settings row. On an existing database, use the dashboard to enable/configure the scheduler; redeploying or visiting a page does not undo Pause. `AUTONOMOUS_ENABLED=false` is an emergency runtime kill switch, including manual cycles; remove it or set `true` to allow running again. Preview deployments do not run automatic scheduled cycles.

On Vercel, **Enable Vercel Cron** saves configuration and waits for cron; it does not launch a detached serverless task. Manual and cron cycles are awaited, bounded to a batch of up to 10 domains (default 5) and a 240-second work budget with cleanup headroom. The database lease prevents overlap across instances. Remaining/failed targets rotate into subsequent runs. Stop/Pause is checked between steps; an already in-flight provider call cannot be undone.

Missing cron secrets fail closed. The dashboard is unavailable on Vercel until its password is set. Webhook signatures are checked before database work; recording uses a transaction and row lock, validates session/reference/amount/currency/mode, excludes test payments from real cash, and is safe against concurrent paid-event retries. Database failures return 5xx so Stripe can retry.

## Development and checks

```sh
npm ci
cp .env.example .env.local
# Set DATABASE_URL for your own local/test PostgreSQL database.
# Leave email and payment automation off unless deliberately testing them.
npm run dev -- --hostname 0.0.0.0
npm run typecheck
npm test
npm run build
```

Tests use an isolated in-memory PostgreSQL-compatible PGlite database and mocked external providers. They do not contact prospects or move funds. `GET /api/health` reports database connectivity and bootstrap environment readiness without exposing credential values; the Revenue Engine dashboard shows readiness for the persisted configuration. Database initialization creates/updates tables idempotently and has no job-start or email-send side effects.

On a persistent non-Vercel server, an in-process timer can be explicitly enabled from the dashboard. Vercel never relies on that timer. Local example data is opt-in via `SEED_DEMO_DATA=true`; it is not used as automatic scan targets.
