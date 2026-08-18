# Known Issues / Release Blockers — audited 2026-08-17

## P0/P1 release blockers

No failing P0/P1 deterministic-domain test remains in the locally executable suite, but the application is **not production-ready** because these mandatory gates are unresolved:

1. **Production Auth.js integration is incomplete.** Canonical Account/Session/token persistence now exists, but login/register/reset/verification route handlers are not wired to Prisma + Argon2id and server-side route authorization.
2. **Prisma schema/migrations are not CLI-validated.** The canonical schema and additive migration were expanded in this audit, but `prisma validate/generate/migrate deploy` cannot run until dependencies/PostgreSQL are available.
3. **Full API adapters are incomplete.** The integrated repository still lacks production route/service adapters for Question Bank, Exam autosave/submit, Redeem serializable transaction, AI Tutor, Community, Rewards, Admin and Teacher read/write operations.
4. **Frontend routes are integration shells.** Required routes now exist, but most are not yet bound to production APIs/session state and therefore are not complete feature implementations.
5. **No successful dependency lock/install.** `npm install --package-lock-only` timed out; a verified `package-lock.json` is still required for reproducible `npm ci` and Docker build.
6. **PostgreSQL/Docker/browser gates are unexecuted.** DB concurrency, Docker health, Next production build, Playwright/axe and load/backup drills remain NOT RUN.
7. **External import/AI infrastructure is unconfigured.** Object storage, malware scanning, OCR, queue and approved AI provider adapters require external infrastructure/credentials.

## P2 engineering follow-up

- Implement versioned reward rule sets and leaderboard snapshot worker.
- Implement analytics aggregation/materialized summaries for DAU/WAU/MAU and difficult-topic metrics.
- Add Community PostgreSQL FTS/trigram authorization-safe search and transactional counter reconciliation.
- Add structured logger/tracing and an outbox worker with retry/dead-letter policy.
- Add comprehensive per-question-type grading tests and exam timer boundary tests.
- Add import file magic-byte validation, archive-bomb limits and malware scanner integration.
