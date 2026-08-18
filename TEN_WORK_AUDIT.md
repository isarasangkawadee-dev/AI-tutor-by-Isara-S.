# WORK 01–10 Release Audit — 2026-08-17

## Executive status

**NOT PRODUCTION READY**. The repository is materially more complete after this audit, but production gates requiring installed npm dependencies, Prisma CLI, PostgreSQL, real Auth.js wiring, browser E2E, Docker boot and external provider infrastructure remain unexecuted or incomplete.

## Findings and remediation by workstream

| Work | Main deficiency found in integrated repository | Remediation in this audit | Remaining gate |
|---|---|---|---|
| 01 Core Architecture | Canonical schema lacked Auth.js tables, outbox, several shared persistence contracts; API shell remains thin | Added Account/Session/VerificationToken, security token/event/rate bucket models, generic OutboxEvent; retained UUID/RBAC/v1 authority | Real Auth.js/Prisma adapter, shared API envelope/validation packages and DB validation still required |
| 02 Question Bank | Integrated schema lacked Topic/Tag/revisions/statistics/ImportItem and source metadata | Added Topic, Tag, QuestionTag, QuestionRevision, QuestionStatistics, ImportItem, review/source fields and supporting indexes/migration | OCR/object storage/queue/provider adapters and DB import tests remain |
| 03 Exam Engine | Missing persisted choice order, result JSON and submission idempotency field | Added choiceOrder, result, submissionIdempotencyKey and OutboxEvent persistence | Server transaction/row lock, autosave API, timer/type-specific grading and browser resume tests remain |
| 04 Auth/Membership | Missing Auth.js persistence, reset/verify persistence and membership ledger; offline password baseline was weak | Added auth/token/security/membership models; changed deterministic core password hash from salted SHA-256 to scrypt; CSRF now fails closed when Origin is missing | Production Argon2id/Auth.js adapter, email delivery, serializable redeem transaction remain |
| 05 AI Tutor | No usage/session/message persistence in canonical schema | Added TutorSession, TutorMessage and AiTutorUsage with prompt/provider/token/cost/cache fields | Real provider adapter, structured-output validator, quota/cache adapters and eval suite remain |
| 06 Gamification | Only RewardLedger existed; achievements/challenges/preferences/leaderboards absent | Added Achievement, UserAchievement, ChallengeDefinition, UserChallengeProgress, RewardPreference, LeaderboardSnapshot | Snapshot worker, versioned rules and PostgreSQL concurrency test remain |
| 07 Community | Only CommunityPost existed | Added board, answer, comment, reaction, bookmark, follow, report, protected question link, notification, sanction and banned-term persistence | Route/service implementation, FTS, transactional counters/outbox and XSS corpus remain |
| 08 Admin/Teacher | Teacher-student access model absent; sensitive read/write APIs not implemented | Added TeacherStudentAccess plus stronger AuditLog metadata/index | Actual server-side admin/teacher endpoints, analytics read models and audit tests remain |
| 09 Frontend | Only 6 pages existed; most required routes would 404 | Added full required route surface (28 page routes total) and shared PageShell; repository test checks required pages | These pages are integration shells, not full production UI; API binding, Auth guards, axe/keyboard/VoiceOver and responsive E2E remain |
| 10 Integration/QA/DevOps | Redeem per-user limit bug; weak offline hashing; missing schema coverage; only 8 tests | Fixed code-scoped redeem limit; scrypt baseline; fail-closed CSRF; expanded schema+migration; added repository audit tests | npm lock/dependency install, Prisma/Postgres, Next build, Docker, Playwright, load/backup drills remain |

## Bugs fixed directly

1. Redeem `perUserLimit` is now counted per redeem code, not across every code a user has ever redeemed.
2. Offline credential hashing now uses Node scrypt and rejects passwords shorter than 8 characters; production still requires the WORK 04 Argon2id/Auth.js adapter.
3. Cookie mutation CSRF guard now rejects requests missing an Origin instead of silently allowing them.
4. Required frontend routes are present to prevent integration-level 404s.
5. Canonical schema now has persistent structures required by Question Bank, Exam, Membership, AI Tutor, Gamification, Community and Teacher access.
6. A second additive migration captures the expanded canonical schema for an empty database deployment after the initial migration.

## Verification executed

`npm run verify:offline` passes:

- 11 deterministic core/security/integration tests
- 4 repository contract tests
- 0 failures

The repository contract tests assert route presence, critical Prisma model presence, additive migration coverage and absence of literal production credentials in Docker/CI configuration.

## Release blockers not representable as a truthful local pass

- npm dependency resolution/lock file generation timed out in this runtime.
- Prisma `generate`/`validate` cannot run without installed Prisma dependencies.
- PostgreSQL migration and transaction/concurrency tests cannot run without PostgreSQL/Docker.
- Next.js production build cannot run without installed web dependencies.
- Production Auth.js + Argon2id adapter and route authorization are still not wired.
- Browser Playwright/axe/mobile/assistive-technology E2E is not run.
- Object storage, malware scanner, OCR and approved AI provider require external infrastructure/credentials.

These are release blockers; they are not marked passed by inference.
