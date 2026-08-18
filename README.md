# AI Tutor & Exam Platform — WORK 10 Integration Repository

Production-integration baseline for WORK 01–09. WORK 01 contracts are authoritative: `/api/v1`, roles `ADMIN|TEACHER|STUDENT`, server-side authorization, centralized Prisma schema, PostgreSQL, Next.js, Auth.js and Docker.

## What is implemented

- Canonical integration schema with User, Question Bank, Exam Attempt, Reward ledger, Redeem Code, Community, Import and Audit entities.
- Deterministic domain core covering registration/login, question author/review/publish, exam flow, scoring, reward idempotency, AI Tutor grounding, history, redeem code idempotency, community ownership and basic sanitization.
- Security primitives for RBAC, IDOR ownership, same-origin CSRF checks, XSS text escaping and rate limiting.
- Next.js App Router shell, health endpoint, security headers and product/admin/teacher/community entry pages.
- Dockerfile, Compose, CI, backup/restore scripts and k6 load-test scenario.
- QA tests for critical flows and security invariants.

## Requirements

- Node.js 22
- npm 10+
- PostgreSQL 17 recommended
- Docker/Compose optional but recommended

## Install

```bash
cp .env.example .env
# replace all CHANGE_ME values
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run build
npm test
```

## Offline-verifiable core

The deterministic integration core has no runtime third-party dependencies and can be checked with a local TypeScript compiler:

```bash
tsc -p packages/core/tsconfig.json
node --test packages/core/tests/*.test.js
```

## Deployment

See `DEPLOYMENT.md`. Never use example passwords or secrets in production. Run migrations as a release job before switching traffic.

## Current release status

See `FINAL_INTEGRATION_REPORT.md` and `TEST_REPORT.md`. The repository is marked **NOT PRODUCTION READY** until the external dependency install, canonical Prisma migration against PostgreSQL, Next.js production build, Docker boot and real browser/API E2E suite are executed successfully in CI or a deployment environment.


## WORK 01–10 audit

See `TEN_WORK_AUDIT.md` for the latest deficiency/remediation matrix and current release blockers.
