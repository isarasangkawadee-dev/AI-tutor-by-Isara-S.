# Security

## Authentication

Target production adapter: Auth.js Credentials/OAuth as approved. Password storage must use Argon2id or another approved adaptive password hash. The deterministic offline core uses a SHA-256 salted test-only implementation solely to exercise flow semantics; it is **not** the production password adapter.

Production session requirements: secure/httpOnly/SameSite cookies, bounded lifetime, session revocation/versioning on password reset, generic login failure responses, login lockout and distributed IP+identifier rate limiting.

## Authorization / RBAC

Every sensitive API performs server-side authorization. Student identity is derived from the authenticated session; request bodies must never choose `userId`, role, points, score or subscription state. Owner-scoped resources perform explicit owner checks to prevent IDOR. Teacher student access must be scoped by assignment/enrollment, not merely the TEACHER role.

## Web security

- React escaping by default; rich text must be parsed through an allow-list Markdown/HTML sanitizer.
- Same-origin validation on custom cookie-authenticated mutation routes; Auth.js handles its own CSRF semantics.
- CSP, `frame-ancestors 'none'`, nosniff and restrictive Permissions-Policy are configured in Next.
- Prisma parameterization is the only supported request-path SQL mechanism; raw SQL must use parameter binding and code review.
- Uploads: MIME sniffing, extension allow-list, max size, malware scanning, isolated object storage, random object keys, no executable serving, copyright attestation and async processing.
- Secrets only through environment/secret manager. No credentials in repository or client bundles.

## File upload policy

Accept only required PDF/DOCX/XLSX/CSV/image types. Reject archive bombs and unexpected embedded active content. Store originals outside the web root, scan before processing, and render previews through safe conversion. OCR/AI workers receive short-lived object access only.

## Privilege escalation

Role/status/membership changes are ADMIN-only and audited. Self-profile endpoints must not accept role, status, points, membership or subscription expiry. Sensitive admin writes store actor, action, target, request ID and before/after snapshots.

## Required pre-release security gates

Real Auth.js integration tests, PostgreSQL concurrency tests, XSS corpus tests for rich-text renderer, CSRF browser tests, upload malware/zip-bomb tests, dependency vulnerability scan, secret scan, authorization matrix, and penetration testing of IDOR/admin/teacher boundaries.
