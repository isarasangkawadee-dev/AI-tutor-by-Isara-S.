# Edge Case Test Expansion Plan — AI Tutor Production

## Overview

ระบบ AI Tutor ได ้ผ่านการทดสอบ smoke tests 25/25 (happy paths) และ load tests 0 failures แล ้ว เพื่อให ้ระบบพร ้อม production อย่างแท้จริง ต ้องขยายขอบเขตการทดสอบให ้ครอบคลุม **edge cases, negative tests, security tests, และ concurrency tests** เพิ่มเติม

เอกสารนี้เสนอแผนขยายขอบเขตการทดสอบเป็น 6 ระดับ (L0–L5) พร้อมสคริปต์ที่รันแล ้วจริง 31 tests

---

## Test Coverage Levels

| Level | Category | Tests | Status |
|---|---|---|---|
| L0 | Smoke (Happy Path) | 25 | ✅ 25/25 PASS |
| L1 | Negative Inputs & Edge Cases | 31 | ✅ 31/31 PASS |
| L2 | Security Penetration Tests | 12 | ⬜ Recommended |
| L3 | Concurrency & Race Conditions | 8 | ⬜ Recommended |
| L4 | Integration & Workflow Tests | 10 | ⬜ Recommended |
| L5 | Load & Stress Tests | 5 | ✅ Done (basic) |

---

## L1 — Negative Inputs & Edge Cases (Completed)

**สคริปต์:** `smoke_test3.sh` (31 tests, 31/31 PASS)

### Auth & Registration (8 tests)
- Invalid email format (ไม่มี @, ไม่มี domain)
- Weak password (ไม่ตรง policy)
- Duplicate email (EMAIL_EXISTS)
- Wrong password login (UNAUTHORIZED)
- Empty body login
- Invalid session token (UNAUTHORIZED)
- XSS in displayName (`<script>alert(1)</script>`)
- SQL injection in email (`admin@aitutor-dev.local' OR 1=1 --`)

### Exams (7 tests)
- Invalid mode (`MARATHON` → INVALID_MODE)
- Invalid subject (`QUANTUM_PHYSICS` → INVALID_SUBJECT)
- count = 0 (clamp to 1)
- count = -1 (clamp to 1)
- count = 999 (clamp to 100 or INSUFFICIENT_INVENTORY)
- count as string (`"five"` → INVALID_COUNT)
- Submit non-existent attempt (NOT_FOUND)
- Answer question not in attempt (QUESTION_NOT_IN_ATTEMPT)

### Redeem (5 tests)
- Invalid code (CODE_NOT_FOUND)
- Empty code
- Expired code (CODE_EXPIRED)
- Exhausted code (CODE_EXHAUSTED)
- Per-user limit reached (PER_USER_LIMIT)
- SQL injection in code (`AI-TUTOR-2026-DEMO'; DROP TABLE "User"; --`)

### Admin & RBAC (3 tests)
- Teacher access admin endpoint (FORBIDDEN)
- Admin redeem-codes: invalid durationDays (string → default 30)
- Admin redeem-codes: negative maxUses (rejected)

### Security & Session (4 tests)
- Rate limit: login blocked after 10 failed attempts (RATE_LIMITED)
- Session replay after logout (UNAUTHORIZED)
- CSRF rejects missing Origin header
- GET on POST-only endpoint (ROUTE_NOT_FOUND/405)

---

## Bugs Found & Fixed (from L1 testing)

| # | Bug | Location | Fix |
|---|---|---|---|
| 1 | Admin redeem-codes accept negative `maxUses` | `admin/redeem-codes/route.ts` | Reject `< 1`, cap `maxUses ≤ 100,000`, `durationDays ≤ 3,650` |
| 2 | Exams start accept `count` as string | `exams/route.ts` | Reject non-number `count` (INVALID_COUNT), validate subject enum (INVALID_SUBJECT) |

---

## L2 — Security Penetration Tests (Recommended)

Tests ที่ควรเพิ่มเพื่อวินิจฉัยความปลอดภัยก่อน production:

| Test | Description | Tool |
|---|---|---|
| CSRF Token Bypass | ใช ้ Origin จอมปลอม (http://evil.com) — verify rejection | curl |
| Session Hijacking | สร ้าง session token ที่คาดเดาง่าย (sequential UUIDs) | curl |
| Brute Force Lock | Lock account ด ้วย failed logins 10 ครั้ ง แล ้ว try จริง | curl |
| Privilege Escalation | Student try admin endpoints, Teacher try admin, Student try teacher | curl |
| XSS in Community | Post title/body กับ `<script>`, `<img onerror>`, `javascript:` | curl |
| SQL Injection (all endpoints) | ทุก input parameter (email, code, postId, subject) | curl/sqlmap |
| Directory Traversal | `../../../etc/passwd` ใน file uploads | curl |
| Mass Assignment | POST `/profile` กับ `{"role":"ADMIN"}` — verify role ไม่ถูก change | curl |
| Cookie Tampering | Modify session cookie (change UUID, change signature) | curl |
| Open Redirect | Login redirect parameter manipulation | curl |
| Information Leakage | Test 500 errors — verify no stack traces in response | curl |
| HTTP Method Override | `X-HTTP-Method-Override: DELETE` on POST endpoints | curl |

**Automation:** ใช ้ [OWASP ZAP](https://www.zaproxy.org/) baseline scan:
```bash
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3001 -I
```

---

## L3 — Concurrency & Race Conditions (Recommended)

Tests สำคัญสำหรับระบบที่มี idempotency และ unique constraints:

| # | Test | Expected |
|---|---|---|
| 1 | Two users redeem same code simultaneously | One succeeds, other gets CODE_EXHAUSTED or PER_USER_LIMIT |
| 2 | Same user submits same exam attempt twice | Idempotent (same result, no duplicate rewards) |
| 3 | Same user answers same question twice | Latest answer wins (upsert) |
| 4 | Two requests create same redeem code | Second gets CODE_EXISTS (409) |
| 5 | Concurrent upvotes on same post | No duplicate reactions (unique constraint) |
| 6 | Rapid exam start + submit | Submit after start works; no phantom attempts |
| 7 | Concurrent profile PATCH | Last write wins (no data corruption) |
| 8 | Rate limit under concurrent requests | Exactly 10 allowed, 11th blocked |

**Automation:** ใช ้ [artillery](https://www.artillery.io/) หรือ Python `asyncio`:
```python
import asyncio, httpx
# Concurrent redeem test
async def redeem_concurrent():
    async with httpx.AsyncClient() as client:
        tasks = [client.post("http://localhost:3001/api/v1/redeem", json={"code": "TEST-CODE"}) for _ in range(20)]
        results = await asyncio.gather(*tasks)
        success = sum(1 for r in results if r.json().get("ok"))
        assert success <= 1, f"Race condition: {success} successes"
```

---

## L4 — Integration & Workflow Tests (Recommended)

Tests ที่จำลอง user journey เต็ม workflow:

| # | Workflow | Steps |
|---|---|---|
| 1 | Full Student Journey | Register → Login → Browse Questions → Start Exam → Answer → Submit → Check Rewards → Redeem Code → Check Membership → Post on Community |
| 2 | Full Teacher Journey | Login → View Students → Grant Access → Create Question → Review Submissions |
| 3 | Full Admin Journey | Login → Create User → Create Redeem Code → Moderate Community → Review Audit Logs |
| 4 | Exam Lifecycle | Start PRACTICE → Answer All → Submit → Check Score → Start EXAM (timed) → Wait Expiry → Verify EXPIRED status |
| 5 | Membership Lifecycle | Redeem Code → Check premium → Wait (mock) → Check expiry → Renew with another code |
| 6 | Community Lifecycle | Create Post → Answer → Comment → Upvote → Bookmark → Follow → Report |
| 7 | Reward Chain | Submit Exam → +25 points + score*10 → Check RewardLedger → Check User.points |
| 8 | Password Reset Flow | Request Reset → (mock email) → Use Token → Verify New Password Works |
| 9 | Email Verification Flow | Register → (mock email) → Verify Token → Check emailVerifiedAt |
| 10 | Import Questions Flow | Admin Create Import → Upload CSV → Check Status → Verify Questions Created |

**Automation:** ใช ้ [Playwright](https://playwright.dev/) หรือ fetch scripts:
```bash
npm install -D @playwright/test
npx playwright install chromium
```

---

## L5 — Load & Stress Tests (Extended)

Tests ที่ทำแล ้ว: artillery quick (10 connections × 5 requests)

Tests ที่ควรเพิ่ม:

| Test | Config | Expected |
|---|---|---|
| Sustained Load | 50 req/s for 2 min on /api/v1/questions | 0 errors, p95 < 100ms |
| Peak Load | 200 req/s for 30s on /api/v1/health | 0 errors |
| Auth Under Load | 20 concurrent login attempts | Rate limit works, no crashes |
| Exam Under Load | 10 concurrent exam starts | No race conditions |
| DB Connection Pool | Monitor pg pool under 50 concurrent requests | No connection exhaustion |

**Automation:**
```bash
# Sustained load test
npx artillery quick --count 50 --num 120 --duration 120 \
  http://localhost:3001/api/v1/questions?limit=10

# Custom scenario
npx artillery run scenario.yml
```

---

## Test Infrastructure Recommendations

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: AI Tutor Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: aitutor
          POSTGRES_PASSWORD: dev_password_2026
          POSTGRES_DB: aitutor
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run db:migrate:deploy
      - run: npm run db:seed
      - run: npm run build
      - run: npm run test:core
      - run: |
          cd apps/web/.next/standalone/apps/web
          DATABASE_URL=postgresql://aitutor:dev_password_2026@localhost:5432/aitutor \
          NEXT_PUBLIC_APP_URL=http://localhost:3000 \
          node server.js &
          sleep 10
          bash /home/ubuntu/smoke_test2.sh  # L0
          bash /home/ubuntu/smoke_test3.sh  # L1
```

### Test Database Strategy

- **Unit/Core Tests:** In-memory SQLite หรือ transaction rollback
- **Integration Tests:** Fresh PostgreSQL container per test suite
- **E2E Tests:** Shared dev database (with cleanup between runs)

### Mock External Services

- **LLM API:** Mock responses (current implementation)
- **Payment Gateway:** Mock success/failure scenarios
- **Email Service:** Mock with log verification

---

## Priority Matrix

| Priority | Level | Effort | Impact | Recommendation |
|---|---|---|---|---|
| P0 | L0 Smoke | Done | Critical | Always run before deploy |
| P0 | L1 Negative | Done | Critical | Always run before deploy |
| P1 | L3 Concurrency | 2-3 days | High | Before real user traffic |
| P1 | L2 Security | 1-2 days | High | Before production |
| P2 | L4 Integration | 3-5 days | Medium | Before feature freeze |
| P3 | L5 Extended Load | 1 day | Medium | Before scaling |

---

## Summary

ระบบ AI Tutor มี test coverage 56 tests (25 smoke + 31 edge cases) ที่รันผ่าน 100% พร้อม code fixes 2 รายการจากการทดสอบ edge cases สำหรับ production deployment แนะนำให ้เพิ่ม L2 (Security) และ L3 (Concurrency) ก่อน go-live จริง

---

*Author: Manus AI*
*Date: August 18, 2026*
