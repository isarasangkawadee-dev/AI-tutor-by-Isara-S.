# Deployment

## Release sequence

1. Provision PostgreSQL 17 with encrypted transport, backups and least-privilege application credentials.
2. Inject `DATABASE_URL`, `AUTH_SECRET`, `APP_URL` and approved AI-provider credentials from a secret manager.
3. Run `npm ci` from a committed lock file.
4. Run `npm run db:generate` and `npm run db:validate`.
5. Run `npm run db:migrate:deploy` as a one-shot release job.
6. Run unit/integration/security/E2E suites.
7. Build the standalone Next.js image.
8. Deploy behind TLS ingress/WAF; enforce request body limits and distributed rate limiting.
9. Gate traffic on `/api/v1/health` readiness.
10. Verify login, exam submit, reward, redeem and admin import smoke tests.

## Rollback

Application code may roll back independently only when the database migration is backward compatible. Destructive schema changes require expand/migrate/contract releases. Never automatically roll back a migration that may have transformed user data.

## Backup

Use `scripts/db-backup.sh` on a scheduled basis. Store encrypted backups outside the primary database failure domain. Perform periodic restore drills with `scripts/db-restore.sh` into an isolated database and verify logical counts plus sampled records.

## Observability

Production should ship structured JSON logs with request ID, actor ID (internal only), route, status, latency and security decision. Do not log passwords, reset tokens, redeem codes, answer keys in unauthorized contexts, or raw AI provider secrets.
