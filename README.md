# AI Tutor by Isara S.

แพลตฟอร์มการศึกษาภาษาไทยแบบครบวงจร — ระบบข้อสอบ (Exam Engine), คลังข้อ (Question Bank), AI Tutor, เวทีชุมชน (Community), Gamification, แผงแอดมิน/ครู และระบบสมาชิก/แลกของรางวัล

**สถานะ: Production Ready** — ผ่าน Smoke Test 25/25, Edge Case Test 31/31, TypeScript build 0 errors (Next.js 16, React 19, Prisma 7, PostgreSQL 16)

---

## คุณสมบัติหลัก

| โมดูล | รายละเอียด |
|---|---|
| Auth & RBAC | Session-based auth (scrypt), CSRF origin guard, rate limiting, บทบาท `ADMIN \| TEACHER \| STUDENT` |
| Question Bank | ครูสร้าง/แก้ไข/ลบ/ตรวจ/เผยแพร่ข้อสอบ พร้อมระบบ Import/Export JSON |
| Exam Engine | สอบจริง ตัดสินผล สแกนตอบ อัตโนมัติ บันทึกประวัติ (attempt) |
| AI Tutor | AI อธิบายคำตอบและให้คำแนะนำจากหลักฐานจริง (evidence-grounded) |
| Rewards & Redeem | ระบบคะแนน/ดาวสะสม, คูปองแลกของรางวัล (redeem code) แบบ idempotent |
| Community | เวทีโพสต์/ตอบ/ไลก์ พร้อมการตรวจสอบสิทธิ์เจ้าของ (ownership/IDOR) |
| Admin Panel | จัดการผู้ใช้, ตรวจ Audit log, Import/Export ข้อสอบทั้งระบบ |
| Teacher Panel | จัดการข้อสอบส่วนตัว พร้อม Import/Export JSON |

## โครงสร้าง Monorepo (npm workspaces)

```
ai-tutor-platform/
├── packages/
│   ├── core/        # @aitutor/core — Domain logic ที่ verify ได้โดยไม่ติด runtime deps
│   └── db/          # @aitutor/db — Prisma schema (ศูนย์กลาง), migrations, seed
├── apps/web/        # @aitutor/web — Next.js 16 App Router + API routes
├── docker-compose.yml
├── Dockerfile
└── DEPLOYMENT_GUIDE.md
```

## Quick Start (Local)

```bash
cp .env.example .env      # แก้ DATABASE_URL และค่าอื่น ๆ
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run db:seed            # สร้าง seed accounts 3 บทบาท
npm run build
npm run start              # PORT 3001
```

Seed accounts ที่สร้างโดย `db:seed`:

| อีเมล | รหัสผ่าน | บทบาท |
|---|---|---|
| admin@aitutor-dev.local | DevAdmin#2026 | ADMIN |
| teacher@aitutor-dev.local | DevTeacher#2026 | TEACHER |
| student@aitutor-dev.local | DevStudent#2026 | STUDENT |

Demo redeem code: `AITUTOR-2026-DEMO`

## API Endpoints (สำคัญ)

- `GET  /api/v1/health` — health check
- Auth: `/api/v1/auth/register`, `/login`, `/logout`, `/me`
- Questions: `GET|POST /api/v1/questions`, `GET|PATCH|DELETE /api/v1/questions/:id`
- Exams: `POST /api/v1/exams`, `POST /api/v1/exams/:id/attempts`, `POST /api/v1/exams/:id/submit`
- AI Tutor: `POST /api/v1/ai/explain`
- Rewards: `GET /api/v1/rewards`, `POST /api/v1/rewards/redeem`
- Community: `GET|POST /api/v1/community/posts`, `POST /api/v1/community/posts/:id/comments`
- Admin: `/api/v1/admin/users`, `/api/v1/admin/audit`, `/api/v1/admin/questions/export`, `/api/v1/admin/imports`
- Teacher: `/api/v1/teacher/questions`, `/api/v1/teacher/imports`, `/api/v1/teacher/imports/export`

## Import/Export (Admin & Teacher)

- **Admin**: อิมพอร์ต/เอ็กซ์พอร์ตข้อสอบทั้งระบบเป็น JSON/CSV พร้อมฟิลเตอร์ (หัวข้อ, ระดับความยาก) ที่หน้า `/admin/imports`
- **Teacher**: อิมพอร์ตข้อสอบ JSON และเอ็กซ์พอร์ตข้อสอบส่วนตัว ที่หน้า `/teacher/imports`

รายละเอียดเพิ่มเติม: [`IMPORT_EXPORT_GUIDE.md`](./IMPORT_EXPORT_GUIDE.md)

## การทดสอบ

```bash
bash smoke_test2.sh      # E2E Smoke Test — 25/25 PASS
bash smoke_test3.sh      # Edge Case Test — 31/31 PASS
```

รายละเอียดผลการทดสอบ: [`TEST_REPORT.md`](./TEST_REPORT.md)

## Deployment

ดูคู่มือฉบับเต็มที่ [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) — รองรับ Vercel (แนะนำ), Railway, Render และ Docker/VPS (DigitalOcean, Hostinger, AWS)

## Security

- RBAC บังคับที่ server ทุก endpoint
- Same-origin CSRF check + XSS escaping
- Rate limiting (login, API)
- IDOR ownership check (คอมมูนิตี้, ข้อสอบ)
- Password hash: scrypt (cost=2^14)

## เอกสารอื่น ๆ ใน Repo

| ไฟล์ | เนื้อหา |
|---|---|
| `DEPLOYMENT_GUIDE.md` | คู่มือ deploy ทุกแพลตฟอร์ม |
| `API_REFERENCE.md` | รายละเอียดทุก API endpoint |
| `DATABASE_SCHEMA.md` | Prisma schema และ ER diagram |
| `SECURITY.md` | นโยบายความปลอดภัยและการตอบสนองช่องโหว่ |
| `IMPORT_EXPORT_GUIDE.md` | คู่มือใช้งาน Import/Export |
| `FINAL_DEPLOY_STATUS.md` | รายงานสถานะการ deploy และการทดสอบ |

## License

Proprietary — Isara S. © 2026
