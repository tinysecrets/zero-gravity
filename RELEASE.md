# Release Checklist

## Required checks

Run from the repository root with the locked dependencies installed:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

Inspect the test totals and require every command to exit successfully. Review `git diff --check`, the full staged diff, environment-variable changes, API routes, scheduler transitions, payment/webhook code, and deployment configuration before merging.

## Safety gates

1. Verify Production scheduler state is paused, `nextRunAt` is null, and no cycle is active.
2. Verify `autoSendOutreach=false` and `autoCreateCheckout=false` from persisted Production settings; do not infer this from the UI alone.
3. Never run an automation cycle or create a real checkout/outreach message as part of release verification. Use isolated test data and provider test credentials.
4. Confirm database/schema readiness and webhook configuration separately. A readiness response does not substitute for exercising an isolated integration test.
5. Check the exact Vercel deployment commit and alias after deployment, then re-read the Production safety settings. Stop if a deploy or migration unexpectedly changes them.

## Rollback

Pause the scheduler first and verify it remains paused. Revert the specific release or promote the known-good deployment. Do not delete production data, rotate payment settings, or re-enable automation as an unreviewed rollback step. Record the deployment commit, observed health/readiness, and final scheduler flags without recording secret values.
