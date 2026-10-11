# Security audit — 2026-10-11

## Results

- npm audit --omit=dev --audit-level=high: **0 vulnerabilities** in production dependencies.
- Full npm audit --audit-level=high: reports GitHub advisory GHSA-vfj7-8cjw-p6xm (CVE-2026-93687) through the development-only chain eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces@3.0.3.
- TypeScript, ESLint, the test suite and the optimized production build were run separately.

## Residual finding

The GitHub advisory states that braces versions through 3.0.3 are affected and, as of this audit, lists no patched upstream version. The vulnerable package is reachable only through the development/lint toolchain, not the production dependency tree.

npm audit fix --force proposed downgrading eslint-config-next to 14.2.35, which would be a breaking mismatch with this Next.js 16 project. This audit did not apply that downgrade or replace braces with an unreviewed third-party fork. Recheck when upstream releases a fix, and keep the production-only audit in CI/deploy verification.

Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
