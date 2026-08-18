# Database Schema

Canonical schema: `packages/db/prisma/schema.prisma`.

## Integration decisions

- WORK 01 UUID identity is authoritative. Feature fragments using `cuid()` are mapped to UUID rather than creating dual identity systems.
- Subjects use the WORK 01 enum for contract stability in this integration baseline. Adding future subjects requires a coordinated v1-compatible strategy or a later normalized subject catalog migration.
- Question Bank retains compound indexes on subject/grade/difficulty/status and publication state. Full-text/near-duplicate candidate search uses PostgreSQL `pg_trgm`.
- Exam attempts pin question ID + question version. Answers are owner-scoped and unique per attempt/question.
- Reward ledger has event idempotency and logical uniqueness `(userId, sourceType, sourceId, reason)`.
- Redeem requests are idempotent via unique request ID; production redemption executes in SERIALIZABLE transaction with retry.
- Community and destructive workflows retain moderation/audit state rather than hard-deleting immediately.

## Scale

20k, 100k and 1M questions all remain in PostgreSQL with bounded cursor pagination, indexed filtering and field projection. Do not fetch all questions into Node.js for filtering, duplicate detection, leaderboard generation or analytics. High-read leaderboards/analytics should use snapshots/materialized aggregates.
