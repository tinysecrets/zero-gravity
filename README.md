# Zero Gravity

A Next.js/PostgreSQL workflow for discovering public business domains, verifying published business contacts, auditing DNS, drafting service offers, generating customer-approved Stripe Checkout payments, and recording signed payment events. **It does not transfer funds out, make bank payouts, guarantee revenue, or perform customer DNS changes.** A checkout link is not a payment; a confirmed card payment is not a confirmed bank payout. The ledger records gross confirmed receipts, not an available account balance; provider fees, refunds, and disputes are not automatically reconciled.

## Enable autonomous collection on the existing Vercel project

Configure these under **Vercel → Project → Settings → Environment Variables → Production**. Do not put credentials in source control or chat.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Your PostgreSQL connection string, including the provider's SSL configuration. |
| `APP_URL` | Public production HTTPS URL, e.g. `https://your-project.vercel.app`. Not localhost. |
| `OPERATOR_USERNAME` / `OPERATOR_PASSWORD` | Protect the dashboard and management APIs with HTTP Basic Auth. Both are required in production; the password must be at least 32 UTF-8 bytes. Management routes fail closed if either is missing or invalid. |
| `CRON_SECRET` | Separate strong random secret used by Vercel to authenticate cron invocations. |
| `ALLOW_PREVIEW_OPERATIONS` | Optional Preview-only opt-in. Leave `false` until Preview uses an isolated database; otherwise all Preview management/provider mutations are blocked. |
| `CTLOGS_API_KEY` | Optional independent CT-index fallback. Use a key/plan licensed for commercial use ([API docs and limits](https://api.ctlogs.dev/)); the organization lookup is used only when crt.sh does not fill the current batch. |
| `STRIPE_SECRET_KEY` | Your Stripe secret key. Start with a test key in a separate test environment/database. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the matching Stripe mode and this webhook destination. |
| `AUTONOMOUS_ENABLED` | Set `true` to bootstrap the scheduler enabled on a new database. |
| `AUTONOMOUS_CREATE_CHECKOUT` | Set `true` to bootstrap automatic checkout creation. |
| `AUTONOMOUS_SEND_OUTREACH` | Initially `false`. Enable only after reviewing contacts, service scope, email configuration, and opt-out handling. |

Generate separate random values for the operator password and cron secret, for example by running `openssl rand -hex 32` on your own machine. Set `OPERATOR_USERNAME` and `OPERATOR_PASSWORD` for both Production and Preview; do not reuse `CRON_SECRET`. Production management routes and automation fail closed until operator credentials are valid. Preview management/provider mutations return 403 by default; set `ALLOW_PREVIEW_OPERATIONS=true` only after Preview has its own isolated database and separate provider configuration. Provider routes remain available in Production only through their own authentication boundary: the cron Bearer secret, Stripe webhook signature, or an unguessable Checkout Session ID. Vercel Deployment Protection is a useful additional layer, not a replacement for the application gate.

1. Configure the database, operator credentials, public URL, and cron secret. Use an isolated preview database; production and preview deployments must not share financial or prospect data.
2. Optionally configure `CTLOGS_API_KEY` with a plan whose terms permit commercial use. This provides a second CT-index lookup; it is not required when the primary index returns enough candidates.
3. In Stripe, create a webhook destination at `https://YOUR_DOMAIN/api/payments/webhook` for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.expired`
4. Set the matching Stripe secret/signing keys in Vercel. Test keys and test events **never count as real revenue**. Use an isolated test/preview database, not your production database.
5. Deploy the updated code to **Production** on the existing Vercel project, with Fluid compute enabled and a 300-second function duration available. Environment changes require a redeployment. A Git branch preview alone does not activate production cron jobs.
6. Open the dashboard using the configured Basic Auth credentials. **No contact list is required.** Each enabled cycle searches crt.sh for a rotating business-niche query. If crt.sh fails or does not fill the batch, a configured `CTLOGS_API_KEY` enables a second organization-index search. The engine retries transient source errors once, records each source's status/provenance, and continues with the rest of the cycle. Without the optional key, there is no independent automatic fallback. CT certificates are candidates, not proof of a business or a paid need. Only a published same-business-domain contact with official website URL and non-null MX evidence can advance to an offer. Optional manual domain imports remain available. Fresh production databases contain no sample prospects.
7. Inspect the readiness checklist. For a first immediate run, use **Run Single Cycle**. Otherwise the next Vercel Cron invocation runs automatically without a browser visit.
8. Enable email only after the sender/contact/service checks below. Customers must choose to pay on Stripe's hosted checkout before signed live events enter the verified ledger.
9. Link your bank and manage payout schedules **in your Stripe Dashboard**. No bank linking, payout, transfer, automatic debit, or trading API is called by this app.

### Email delivery setup

Automatic sending is a separate opt-in from drafting. Configure:

- `RESEND_API_KEY`
- `FROM_EMAIL`: a sender on a domain you have verified with Resend
- `OUTREACH_REPLY_TO`: a monitored mailbox for replies and unsubscribe requests
- `OUTREACH_POSTAL_ADDRESS`: the sender's valid postal address included in commercial emails
- `OUTREACH_COMPLIANCE_CONFIRMED=true`: explicit operator confirmation that the reply/opt-out mailbox is monitored and the postal address is a real business address. The software cannot independently prove either fact; do not confirm them until verified.
- `OUTREACH_TEST_RECIPIENT`: your own inbox for test-mode emails; test checkout links are never emailed to prospects

Resend credentials must permit read-only domain verification: before sending, the app checks that the exact `FROM_EMAIL` domain is verified and sending-enabled in Resend. It also retrieves the saved Stripe session to verify that checkout is open and matches the invoice and configured mode. Provider verification failures withhold email without claiming a delivery attempt. These checks do not replace the separate explicit **Send email** authorization.

Review recipients and your legal/compliance obligations before enabling commercial outreach. Honor opt-outs promptly by pausing automation and deactivating the relevant target; no automated follow-up campaign is implemented. Offers use observed public DNS findings, not invented lost revenue, fabricated lead-capture faults, or guaranteed inbox placement. Guessed addresses such as `info@domain` are not eligible for automatic offers. You are responsible for agreeing scope and delivering any purchased service.

A durable delivery claim prevents parallel sends. An interrupted or uncertain send stays `sending`/`needs_review`; it is **not automatically resent**. Review provider logs before any manual retry. Provider acceptance is not proof of inbox delivery.

### Schedule and persistent controls

`vercel.json` schedules `/api/autonomous/cron` **daily at 13:00 UTC** (`0 13 * * *`). This matches Vercel Hobby's daily cron restriction; Hobby execution can occur in the 13:00–13:59 UTC window. More frequent production jobs require a suitable Vercel plan and coordinated changes to both `vercel.json` and `src/lib/automation-config.ts`/the dashboard schedule description. See [Vercel cron usage and limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) and [function duration configuration](https://vercel.com/docs/functions/configuring-functions/duration).

Configuration, pause state, run counters, due times, and an execution lease live in PostgreSQL. Run history is created before acquisition; per-source status/provenance, errors, cycle steps, and counters are persisted together. Transient discovery errors get one bounded retry with backoff; a configured second CT index is tried when the primary fails or underfills the batch, and the cycle continues with existing targets if both sources fail. Only a definitive NXDOMAIN from the root-domain DNS checks automatically deactivates a target; timeouts, SERVFAIL, and provider errors rotate and remain active for retry. Retired targets stay in the database for operator review/reactivation. Bootstrap environment flags initialize only a **new** settings row. On an existing database, use the authenticated dashboard to enable/configure the scheduler; redeploying or visiting a page does not undo Pause. `AUTONOMOUS_ENABLED=false` is an emergency runtime kill switch, including manual cycles; remove it or set `true` to allow running again. Preview deployments do not run scheduled cycles, and all preview mutations are disabled unless `ALLOW_PREVIEW_OPERATIONS=true` is explicitly set for an isolated Preview database.

On Vercel, **Enable Vercel Cron** saves configuration and waits for cron; it does not launch a detached serverless task. Manual and cron cycles are awaited, bounded to a batch of up to 10 domains (default 5) and a 240-second work budget with cleanup headroom. The database lease prevents overlap across instances. Remaining/failed targets rotate into subsequent runs. Stop/Pause is checked between steps; an already in-flight provider call cannot be undone.

Production dashboard and management APIs require HTTP Basic Auth (`OPERATOR_USERNAME` and `OPERATOR_PASSWORD`); absent or partial credentials fail closed, and production automation readiness is blocked until both are valid. Local development remains open only when neither is set. `/api/health` is read-only/public, cron requires its separate Bearer secret, Stripe webhooks require their signature, and the payment-success return path relies on an unguessable Checkout Session ID. Missing cron secrets fail closed. A blocked or skipped cycle stores its reason, and the authenticated dashboard and `GET /api/autonomous/schedule` show the last attempt with that reason, so a stalled funnel can be diagnosed without server-log access. Webhook signatures are checked before database work; recording uses a transaction and row lock, validates session/reference/amount/currency/mode, excludes test payments from real cash, and is safe against concurrent paid-event retries. Database failures return 5xx so Stripe can retry.

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

Tests use an isolated in-memory PostgreSQL-compatible PGlite database and mocked external providers. They do not contact prospects or move funds. `GET /api/health` read-only checks the columns required by the scheduler, runs, targets, opportunities, invoices, revenue events, and transaction ledger, as well as database connectivity and bootstrap environment readiness, without exposing credential values; the Revenue Engine dashboard shows readiness for the persisted configuration. Database initialization creates/updates tables idempotently and has no job-start or email-send side effects.

On a persistent non-Vercel server, an in-process timer can be explicitly enabled from the dashboard. Vercel never relies on that timer. Local example data is opt-in via `SEED_DEMO_DATA=true`; it is not used as automatic scan targets.

## Production verification (not a revenue claim)

- A successful build or `vercel.json` cron entry does not prove a production invocation. Confirm the deployment SHA/environment in Vercel, then inspect authenticated `/api/autonomous/schedule`, `/api/autonomous/history`, and `/api/autonomous/cycle` and the actual cron execution logs.
- `/api/health` must report `database: "connected"` and `schema.ready: true`. The existing idempotent initialization applies additive schema changes on an authenticated application/cron request, preserving existing records; health itself does not migrate or seed anything.
- For an actual cron run, verify the persisted run ID, acquisition result/errors, completed/failed/stopped state and timestamp, cycle counters, released lease, and next daily due time. Do not bypass dashboard or cron authentication to inspect these.
- Verified revenue requires an actual customer-authorized live Stripe payment, a matching signed live webhook, and the linked payment request, verified transaction, and `payment_verified` attribution event. Tests and checkout creation alone are not revenue verification.
