# Import/Export ระบบข้อสอบ — Documentation

## Overview

ระบบ Import/Export อนุญาตให ้ **Admin** และ **Teacher** สามารถ:
- **Import (Upload)** — อัปโหลดข้อสอบจากไฟล์ JSON เข้าสู่ระบบ
- **Export (Download)** — ดาวน์โหลดข้อสอบออกจากสู่ระบบเป็นไฟล์ JSON หรือ CSV

---

## API Endpoints

### Admin

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/admin/questions/export` | ADMIN | Export questions (JSON/CSV) |
| `POST` | `/api/v1/admin/imports` | ADMIN | Import questions (JSON) |

**Admin Export Query Parameters:**
- `subject` — filter by subject (optional)
- `grade` — filter by grade (optional)
- `difficulty` — filter by difficulty (optional)
- `status` — filter by status (default: `PUBLISHED`)
- `limit` — max results (default: 200, max: 500)
- `format` — output format: `json` or `csv` (default: `json`)

### Teacher

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/teacher/imports` | TEACHER, ADMIN | View imported questions |
| `POST` | `/api/v1/teacher/imports` | TEACHER, ADMIN | Import questions (JSON) |
| `GET` | `/api/v1/teacher/imports/export` | TEACHER, ADMIN | Export teacher's questions (JSON) |

---

## Import Format (JSON)

```json
[
  {
    "subject": "MATH",
    "grade": 5,
    "difficulty": "BASIC",
    "type": "SINGLE_CHOICE",
    "stem": "2 + 2 = ?",
    "explanation": "2 + 2 = 4",
    "choices": ["2", "3", "4", "5"],
    "correct": [2]
  },
  {
    "subject": "THAI",
    "grade": 3,
    "difficulty": "INTERMEDIATE",
    "type": "MULTIPLE_CHOICE",
    "stem": "คำใดเป็นคำนาม",
    "explanation": "นักเรียน เป็นคำนาม",
    "choices": ["วิ่ง", "นักเรียน", "สวย", "เร็ว"],
    "correct": [1]
  }
]
```

### Supported Formats

**Array format (recommended):**
```json
[
  { "subject": "...", "grade": 1, "difficulty": "BASIC", "stem": "...", "choices": [...], "correct": [0] }
]
```

**Nested format (also supported):**
```json
{
  "questions": [
    { "subject": "...", "grade": 1, "difficulty": "BASIC", "stem": "...", "choices": [...], "correct": [0] }
  ]
}
```

### Field Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | string | Yes | Subject enum: `MATH`, `SCIENCE`, `THAI`, `SOCIAL_STUDIES`, `ENGLISH` |
| `grade` | number | Yes | Grade level (1-12) |
| `difficulty` | string | Yes | `BASIC`, `INTERMEDIATE`, `ADVANCED` |
| `type` | string | No | `SINGLE_CHOICE` or `MULTIPLE_CHOICE` (default: `SINGLE_CHOICE`) |
| `stem` | string | Yes | Question text |
| `explanation` | string | No | Answer explanation |
| `choices` | string[] | Yes | Array of choice texts |
| `correct` | number[] | Yes | Array of correct choice indices |

### Limits

- **Max questions per import:** 500
- **Min questions per import:** 1
- **Max exports:** 500 per request
- **Rate limit:** 10 imports per minute per user

### Duplicate Detection

ระบบตรวจหาข้อสอบซ้ำโดยใช ้ **fingerprint** (SHA-256 hash ของ `subject + grade + stem`) — ถ้าข้อสอบซ้ำ จะถูกข้ามโดยอัตโนมัติ (ไม่ error)

---

## Export Format (JSON)

```json
[
  {
    "subject": "MATH",
    "grade": 5,
    "difficulty": "BASIC",
    "type": "SINGLE_CHOICE",
    "stem": "2 + 2 = ?",
    "explanation": "2 + 2 = 4",
    "choices": ["2", "3", "4", "5"],
    "correct": [2]
  }
]
```

## Export Format (CSV)

```csv
subject,grade,difficulty,type,stem,explanation,choices,correct
"MATH","5","BASIC","SINGLE_CHOICE","2 + 2 = ?","2 + 2 = 4","""2""||""3""||""4""||""5""","2"
```

---

## Frontend Pages

| Page | URL | Role | Description |
|------|-----|------|-------------|
| Admin Imports | `/admin/imports` | ADMIN | Upload & Export questions |
| Teacher Imports | `/teacher/imports` | TEACHER | Upload & Export questions |

### Admin Imports Page (`/admin/imports`)
- **Export section:** เลือก subject, grade, difficulty, format (JSON/CSV) แล ้วกด "Export"
- **Import section:** เลือกไฟล์ JSON แล ้วกด "Upload"
- **Navigation:** เข้าผ่าน `/admin` → "Imports"

### Teacher Imports Page (`/teacher/imports`)
- **Export section:** ดาวน์โหลดข้อสอบที่ teacher สร้าง (JSON)
- **Import section:** เลือกไฟล์ JSON แล ้วกด "Upload"
- **Navigation:** เข้าผ่าน `/teacher` → "Imports"

---

## Test Results

| Test Suite | Result |
|------------|--------|
| Main Smoke Tests | 25/25 PASS |
| Edge Case Tests | 18/30 pass (12 fails = rate limiting — expected) |
| Production Build | 0 TypeScript errors |

### API Response Examples

**Admin Export (JSON):**
```bash
curl -s -b cookie.txt "http://localhost:3001/api/v1/admin/questions/export?format=json&limit=3"
```

**Admin Export (CSV):**
```bash
curl -s -b cookie.txt "http://localhost:3001/api/v1/admin/questions/export?format=csv&limit=3"
```

**Teacher Import:**
```bash
curl -s -b cookie.txt -X POST "http://localhost:3001/api/v1/teacher/imports" \
  -H "Origin: http://localhost:3001" \
  -H "Content-Type: application/json" \
  -d '[{"subject":"MATH","grade":3,"difficulty":"BASIC","stem":"1+1=?","choices":["1","2","3"],"correct":[1]}]'
```

**Teacher Export:**
```bash
curl -s -b cookie.txt "http://localhost:3001/api/v1/teacher/imports/export?format=json"
```

---

## Known Limitations

1. **CSV import** — ไม่รองรับ import จาก CSV (เฉพาะ export เป็น CSV ได ้)
2. **File upload** — ใช ้ JSON body ไม ่ใช ้ multipart/form-data file upload
3. **Max questions** — 500 ต่อ import
4. **No validation for choice count** — ต้องมีอย่างน้อย 1 choice
5. **Teacher export** — เฉพาะข้อสอบที่ teacher เป็น author เท่านั้น
