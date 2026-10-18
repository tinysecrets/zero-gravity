# Security Policy

## Sensitive systems

Zero Gravity can connect to a live payment provider, production database, email sender, deployment platform, and an autonomous scheduler. Treat payment credentials, runner tokens, database URLs, email-provider tokens, session secrets, webhook signing secrets, and customer/outreach data as confidential. Keep them in protected environment configuration; never commit them, print them in logs, paste them into issues, or include them in test fixtures.

## Safe operation defaults

Release verification must not start a live automation cycle. Keep the scheduler paused and preserve `autoSendOutreach=false` and `autoCreateCheckout=false` unless the operator explicitly approves a separate production activation after review. Do not use production to test outreach, payment creation, webhook replay, or failure/rollback paths. Use synthetic records, a disposable database, test payment credentials, and a local/mock email sender for integration tests.

## Reporting

Report potential vulnerabilities privately to the repository owner or through the repository host's private vulnerability-reporting channel. Include the affected component, impact, reproduction steps using synthetic data, and a proposed mitigation. Do not disclose live tokens, customer data, unredacted logs, or exploitable details publicly.

## Release checks

Use the checklist in `RELEASE.md`. A passing health endpoint alone is not proof that payment and scheduler safety gates are correct; verify both the persisted configuration and the negative behavior (no outreach or checkout is initiated while paused).
