# Deployment Guide — AI Tutor by Isara S.

คู่มือการ deploy ระบบ AI Tutor ขึ้น production เต็มรูปแบบ รองรับ 4 แนวทาง: **Vercel (แนะนำ)**, **Railway**, **Render** และ **Docker/VPS** (DigitalOcean, Hostinger, AWS EC2)

> **ข้อควรทราบสำคัญ**: `NEXT_PUBLIC_APP_URL` ถูก embed ลงใน client-side build ตอน build หากเปลี่ยน domain/port หลัง build แล้ว ต้อง set env ตัวนี้ให้ถูกต้อง **ก่อน** build เสมอ

---

## 1. Vercel (แนะนำ — ง่ายที่สุด, ฟรีสำหรับโปรเจกต์เล็ก)

Vercel เข้ากันกับ Next.js 100% เพราะเป็นบริษัทเดียวกัน

### ขั้นตอน

1. เข้า [vercel.com](https://vercel.com) → New Project → Import Git Repository → เลือก repo `ai-tutor-platform`
2. Framework Preset: **Next.js** (อัตโนมัติ)
3. ตั้ง Environment Variables ในแท็บ Settings → Environment Variables:
   - `DATABASE_URL` = connection string ของ PostgreSQL (แนะนำใช้ **Vercel Postgres** หรือ Neon/Vercel KV)
   - `POSTGRES_PASSWORD` = รหัสผ่านฐานข้อมูล
   - `AUTH_SECRET` = สุ่มค่า ≥ 32 ตัวอักษร (`openssl rand -hex 32`)
   - `AUTH_TRUST_HOST=true`
   - `NEXT_PUBLIC_APP_URL` = `https://ชื่อโปรเจกต์.vercel.app` (Vercel จะ assign ให้อัตโนมัติหลัง deploy รอบแรก)
   - `APP_URL` = ค่าเดียวกับ `NEXT_PUBLIC_APP_URL`
   - `AI_PROVIDER` = `openai` และ `AI_API_KEY` = คีย์ของคุณ (หรือ `mock` สำหรับโหมดจำลอง)
4. กด **Deploy**

### หมายเหตุสำคัญสำหรับ Vercel

- Vercel เป็น Serverless: หากใช้ AI Provider แบบ long-running ต้องตั้งค่า `maxDuration` ใน route config
- Prisma adapter ที่ใช้คือ `@prisma/adapter-pg` (plain driver) ทำงานได้กับ Vercel
- Migration: หลัง deploy รอบแรก ให้เปิด Console แล้วรัน:
  ```bash
  npx prisma migrate deploy
  npm run db:seed
  ```
  (รันผ่าน Vercel CLI: `npx vercel env pull` แล้ว `npm run db:migrate:deploy`)

---

## 2. Railway

เหมาะกับระบบที่ต้องการ PostgreSQL ในตัวและ Docker build

### ขั้นตอน

1. เข้า [railway.app](https://railway.app) → New Project → **Deploy from GitHub repo** → เลือก repo
2. Railway จะ detect `apps/web/Dockerfile` อัตโนมัติ (ต้องตั้ง Build Context เป็น root repo)
3. เพิ่ม service **PostgreSQL** (Add Database) ในโปรเจกต์เดียวกัน
4. ตั้ง Variables ในแท็บ Variables ของ service `web`:
   - `DATABASE_URL` = connection string จาก PostgreSQL service (Railway inject `$DATABASE_URL` โดยอัตโนมัติหากชื่อตัวแปรตรงกัน)
   - `POSTGRES_PASSWORD` = รหัสฐานข้อมูล
   - `AUTH_SECRET` = สุ่ม ≥ 32 ตัวอักษร
   - `AUTH_TRUST_HOST=true`
   - `NEXT_PUBLIC_APP_URL` = `https://ชื่อโปรเจกต์.up.railway.app`
   - `APP_URL` = ค่าเดียวกัน
5. Railway รัน migration ก่อน start ได้โดยตั้ง **Start Command**:
  ```bash
  npm run db:migrate:deploy && node apps/web/server.js
  ```
   หรือเพิ่ม service แยกแบบ cron สำหรับ seed

---

## 3. Render

ฟรี tier (web service หยุดเมื่อ idle) — เหมาะสำหรับทดสอบ production

### ขั้นตอน

1. เข้า [render.com](https://render.com) → New → **Web Service** → เชื่อมต่อ GitHub repo
2. Build Command:
   ```bash
   npm ci && npm run db:generate && npm run build
   ```
3. Start Command:
   ```bash
   npm run db:migrate:deploy && node apps/web/server.js
   ```
4. Environment:
   - เพิ่ม PostgreSQL database (Render Managed Database) → คัดลอก Internal Connection String
   - `DATABASE_URL` = internal connection string
   - `POSTGRES_PASSWORD`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`
   - `NEXT_PUBLIC_APP_URL` = `https://ชื่อ-app.onrender.com`
   - `APP_URL` = ค่าเดียวกัน
5. ตั้ง **Health Check Path**: `/api/v1/health`

---

## 4. Docker / VPS (DigitalOcean, Hostinger, AWS EC2, Linode)

แนวทางแบบ self-hosted เต็มรูปแบบ ควบคุมได้ทั้งหมด — ใช้ `docker-compose.yml` ที่มีอยู่ใน repo

### ขั้นตอนที่ 1: เตรียมเซิร์ฟเวอร์

```bash
# Ubuntu 24.04 LTS
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

### ขั้นตอนที่ 2: Clone และติดตั้ง

```bash
git clone https://github.com/isarasangkawadee-dev/AI-tutor-by-Isara-S..git /opt/aitutor
cd /opt/aitutor
cp .env.example .env
# แก้ .env: DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL (https://domain.com)
```

### ขั้นตอนที่ 3: Build และรัน

```bash
sudo docker compose build
sudo docker compose up -d
# รอให้ PostgreSQL พร้อม แล้วรัน migration + seed ใน container web:
sudo docker compose exec web sh -c "npm run db:migrate:deploy"
sudo docker compose exec web sh -c "npm run db:seed"
```

> หมายเหตุ: `db:seed` จำเป็นต้องเชื่อมต่อ DB ได้ ดังนั้นสั่ง migration/seed จาก container `web` หลัง service `db` healthcheck ผ่าน

### ขั้นตอนที่ 4: Reverse Proxy (HTTPS)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
# /etc/nginx/sites-available/aitutor:
#   server_name domain.com;
#   location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
sudo certbot --nginx -d domain.com
sudo systemctl reload nginx
```

แล้ว set `NEXT_PUBLIC_APP_URL=https://domain.com` และ **build ใหม่**:

```bash
sudo docker compose build --no-cache
sudo docker compose up -d
```

### การ backup / restore

Repo มีสคริปต์ `scripts/db-backup.sh` และ `scripts/db-restore.sh` ใช้งาน:

```bash
sudo docker compose exec db bash /scripts/db-backup.sh   # (คัดลอกสคริปต์เข้าไปใน volume ก่อน)
```

หรือใช้ pg_dump ตรง: `docker compose exec db pg_dump -U aitutor aitutor > backup.sql`

---

## สรุปเปรียบเทียบ

| แพลตฟอร์ม | ความยาก | ค่าใช้จ่าย | เหมาะกับ |
|---|---|---|---|
| **Vercel** | ง่ายมาก | ฟรี tier / $20 Pro | ทีมเล็ก, deploy รัว, ใช้ Vercel Postgres |
| **Railway** | ง่าย | ใช้ตาม usage (~$5+/เดือน) | ต้องการ Docker + PostgreSQL ในตัว |
| **Render** | ปานกลาง | ฟรี tier (idle) / $7 Static+ | ทดสอบ production, โปรเจกต์เล็ก |
| **Docker/VPS** | ปานกลาง | ตาม VPS (~$5–6/เดือน) | ควบคุมเต็ม, data อยู่ในมือ, production จริงระยะยาว |

---

## Checklist ก่อน Go-Live

- [ ] `DATABASE_URL` ชี้ไปที่ PostgreSQL production (ไม่ใช่ dev)
- [ ] `AUTH_SECRET` สุ่มใหม่ ≥ 32 ตัวอักษร
- [ ] `NEXT_PUBLIC_APP_URL` = URL จริง **และ build ใหม่หลังเปลี่ยน**
- [ ] `AI_API_KEY` ตั้งค่า provider จริง (หากต้องการ AI จริง)
- [ ] รัน `npx prisma migrate deploy` ก่อน start
- [ ] HTTPS เปิดใช้งาน (certbot/Cloudflare)
- [ ] เปลี่ยนรหัสผ่าน seed accounts หลังสร้าง admin จริง
- [ ] ตั้งค่า firewall: เปิดเฉพาะพอร์ต 80/443
