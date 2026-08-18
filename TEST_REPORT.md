# Test Report — 2026-08-17

## Executed locally

Command:

```bash
tsc -p packages/core/tsconfig.json
node --test packages/core/tests/*.test.js
```

Result: **8 passed, 0 failed**.

Covered:

- Student: register -> login -> start exam -> answer -> score -> reward -> AI Tutor -> history.
- Admin: import -> publish -> create redeem code -> user redeem.
- Redeem request idempotency.
- RBAC denial for student authoring/admin actions.
- IDOR denial between students.
- XSS text escaping / `javascript:` stripping for baseline plain-text community input.
- Same-origin CSRF rejection.
- Fixed-window brute-force limiter behavior.
- 50-way duplicate exam submit -> exactly one reward grant.

## Handoff evidence reviewed

Upstream handoffs reported pure-domain tests passing for Exam Engine, Question Bank, AI Tutor and Gamification. Those results are treated as upstream evidence, not re-labeled as locally executed WORK 10 tests.

## NOT RUN in this environment

- `npm ci`
- Prisma generate/validate/migrate against PostgreSQL
- PostgreSQL serializable redeem race
- PostgreSQL concurrent exam submit/outbox race
- Next.js production build
- Playwright browser E2E
- Lighthouse/accessibility automation
- k6 load run
- Docker Compose boot / health check
- backup + restore drill
- dependency/SBOM vulnerability scanner

A gate remains NOT RUN until executed in CI or deployment infrastructure.
