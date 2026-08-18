// Development seed — non-production only.
// Reads SEED_* variables from env; falls back to documented dev defaults
// that must never be used in production.
import "dotenv/config";
import { createHash, randomBytes, scryptSync } from "node:crypto";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client.js";

const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pgPool);
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@aitutor-dev.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "DevAdmin#2026";
const TEACHER_EMAIL = process.env.SEED_TEACHER_EMAIL || "teacher@aitutor-dev.local";
const TEACHER_PASSWORD = process.env.SEED_TEACHER_PASSWORD || "DevTeacher#2026";
const STUDENT_EMAIL = process.env.SEED_STUDENT_EMAIL || "student@aitutor-dev.local";
const STUDENT_PASSWORD = process.env.SEED_STUDENT_PASSWORD || "DevStudent#2026";

const REDEEM_CODE = process.env.SEED_REDEEM_CODE || "AITUTOR-2026-DEMO";
const REDEEM_PLAN = process.env.SEED_REDEEM_PLAN || "premium";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${digest}`;
}

function hashSecret(raw) {
  return createHash("sha256").update(raw.trim().toUpperCase()).digest("hex");
}

const SUBJECTS = ["MATHEMATICS", "SCIENCE", "THAI", "SOCIAL_STUDIES", "ENGLISH"];

const QUESTIONS = [
  {
    subject: "MATHEMATICS", grade: 6, difficulty: "BASIC",
    stem: "ผลรวมของ 25 + 37 เท่ากับข้อใด",
    choices: ["52", "62", "72", "60"], correct: [1],
    explanation: "25 + 37 = 62 โดยจัดกลุ่ม (20+30)+(5+7) = 50+12 = 62"
  },
  {
    subject: "MATHEMATICS", grade: 6, difficulty: "INTERMEDIATE",
    stem: "พื้นที่ของสามเหลี่ยมที่มีฐาน 10 เซนติเมตร และสูง 6 เซนติเมตร เท่ากับข้อใด",
    choices: ["30 ตร.ซม.", "60 ตร.ซม.", "16 ตร.ซม.", "20 ตร.ซม."], correct: [0],
    explanation: "พื้นที่สามเหลี่ยม = 1/2 × ฐาน × สูง = 1/2 × 10 × 6 = 30 ตร.ซม."
  },
  {
    subject: "MATHEMATICS", grade: 9, difficulty: "ADVANCED",
    stem: "แก้สมการ 2x + 5 = 17 ค่าของ x เท่ากับข้อใด",
    choices: ["4", "6", "11", "5"], correct: [1],
    explanation: "2x = 17 − 5 = 12 ดังนั้น x = 6"
  },
  {
    subject: "SCIENCE", grade: 6, difficulty: "BASIC",
    stem: "แก๊สใดที่พืชใช้ในการสังเคราะห์แสง",
    choices: ["ออกซิเจน", "นิตโรเจน", "คาร์บอนไดออกไซด์", "ไฮโดรเจน"], correct: [2],
    explanation: "พืชดูดก๊าซคาร์บอนไดออกไซด์ (CO2) ใช้ร่วมกับน้ำและแสงแดดเพื่อสร้างอาหารและคายออกซิเจน"
  },
  {
    subject: "SCIENCE", grade: 9, difficulty: "INTERMEDIATE",
    stem: "หน่วยพื้นฐาน SI ของแรงคือข้อใด",
    choices: ["จูล", "นิวตัน", "วัตต์", "ปาสกาล"], correct: [1],
    explanation: "แรงมีหน่วยเป็นนิวตัน (N) = kg·m/s²"
  },
  {
    subject: "THAI", grade: 6, difficulty: "BASIC",
    stem: "คำในข้อใดเป็นคำควบกล้ำแท้",
    choices: ["จริง", "ทรัพย์", "สร้าง", "ทราบ"], correct: [2],
    explanation: "สร้าง เป็นคำควบกล้ำแท้เพราะออกเสียงทั้งสองพยัญชนะต้น (ส+ร) ส่วนทราบ/ทรัพย์/จริง เป็นควบกล้ำไม่แท้"
  },
  {
    subject: "ENGLISH", grade: 6, difficulty: "BASIC",
    stem: "Choose the correct sentence:",
    choices: ["She go to school.", "She goes to school.", "She going to school.", "She goed to school."],
    correct: [1],
    explanation: "Present simple กับประธานบุรุษที่ 3 เอกพจน์ต้องใช้กริยาเติม -s: goes"
  },
  {
    subject: "SOCIAL_STUDIES", grade: 9, difficulty: "INTERMEDIATE",
    stem: "แม่น้ำสายใดยาวที่สุดในประเทศไทย",
    choices: ["แม่น้ำเจ้าพระยา", "แม่น้ำชี", "แม่น้ำมูล", "แม่น้ำปิง"], correct: [1],
    explanation: "แม่น้ำชียาวประมาณ 765 กิโลเมตร ยาวที่สุดในประเทศไทย ไหลผ่านภาคอีสานลงสู่แม่น้ำมูล"
  }
];

function fingerprintFor(q) {
  return createHash("sha256")
    .update(JSON.stringify([q.subject, q.grade, q.stem]))
    .digest("hex");
}

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.SEED_FORCE_NONPROD) {
    console.log(
      "Seed policy: no production seeding. Set SEED_FORCE_NONPROD only in non-production environments."
    );
    return;
  }

  console.log("Seeding non-production development database...");

  const plan = await prisma.membershipPlan.upsert({
    where: { code: REDEEM_PLAN },
    update: {},
    create: { code: REDEEM_PLAN, name: "Premium (demo plan)" }
  });

  for (const [email, password, role] of [
    [ADMIN_EMAIL, ADMIN_PASSWORD, "ADMIN"],
    [TEACHER_EMAIL, TEACHER_PASSWORD, "TEACHER"],
    [STUDENT_EMAIL, STUDENT_PASSWORD, "STUDENT"]
  ]) {
    const [user] = await prisma.$queryRaw`
      INSERT INTO "User" ("email", "displayName", "role", "passwordHash")
      VALUES (${email}, ${email.split("@")[0]}, ${role}::"UserRole", ${hashPassword(password)})
      ON CONFLICT ("email") DO NOTHING
      RETURNING "id"`;
    console.log(`user ${email} (${role}): ${user ? user.id : "(already exists)"}`);
  }

  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  const admin = users.find((u) => u.role === "ADMIN");

  // Topics
  for (const subject of SUBJECTS) {
    for (const t of ["fundamentals", "practice"]) {
      await prisma.$queryRaw`
        INSERT INTO "Topic" ("subject", "name", "slug")
        VALUES (${subject}::text::"Subject", ${`${subject} ${t}`}, ${`${subject.toLowerCase()}-${t}`})
        ON CONFLICT ("subject", "slug") DO NOTHING`;
    }
  }

  // Questions with choices
  for (const q of QUESTIONS) {
    const fp = fingerprintFor(q);
    const [existing] = await prisma.$queryRaw`
      SELECT "id" FROM "Question" WHERE "fingerprint" = ${fp}`;
    if (existing) {
      console.log(`question "${q.stem.slice(0, 30)}" already exists`);
      continue;
    }
    const [row] = await prisma.$queryRaw`
      INSERT INTO "Question"
        ("subject", "grade", "difficulty", "type", "status", "reviewStatus",
         "stem", "explanation", "correctAnswer", "version", "authorId", "fingerprint")
      VALUES (${q.subject}::text::"Subject", ${q.grade}, ${q.difficulty}::text::"Difficulty",
              ${q.choices.length > 1 ? "SINGLE_CHOICE" : "SHORT_ANSWER"}::text::"QuestionType",
              'PUBLISHED'::"QuestionStatus", 'APPROVED',
              ${q.stem}, ${q.explanation},
              ${JSON.stringify({ choiceIds: q.correct.map((i) => `c${i}`) })}::jsonb,
              1, ${admin ? admin.id : null}::uuid, ${fp})
      RETURNING "id"`;
    for (let i = 0; i < q.choices.length; i++) {
      await prisma.$queryRaw`
        INSERT INTO "QuestionChoice" ("questionId", "label", "content", "isCorrect", "sortOrder")
        VALUES (${row.id}::uuid, ${`c${i}`}, ${q.choices[i]}, ${q.correct.includes(i)}, ${i})`;
    }
    console.log(`question ${row.id}: ${q.subject} grade ${q.grade}`);
  }

  // Redeem code (valid 30 days, 1000 total uses, 100 per user)
  const codeHash = hashSecret(REDEEM_CODE);
  const now = Date.now();
  const [code] = await prisma.$queryRaw`
    INSERT INTO "RedeemCode"
      ("codeHash", "status", "durationDays", "maxUses", "perUserLimit",
       "validFrom", "validUntil", "planCode")
    VALUES (${codeHash}, 'ACTIVE'::"RedeemStatus", 30, 1000, 100,
            to_timestamp(${(now - 1000) / 1000}), to_timestamp(${(now + 30 * 86400000) / 1000}),
            ${plan.code})
    ON CONFLICT ("codeHash") DO NOTHING
    RETURNING "id"`;
  console.log(`redeem code demo (${REDEEM_CODE}): ${code ? "created" : "exists"}`);

  // Achievements and challenges
  for (const [code, name, desc] of [
    ["first_exam", "Exam เดิมแรก", "ทำแบบทดสอบเสร็จเป็นครั้งแรก"],
    ["streak_7", "7 วันติด", "ทำแบบทดสอบต่อเนื่อง 7 วัน"],
    ["perfect_score", "คะแนนเต็ม", "ทำคะแนนเต็ม 100% ในแบบทดสอบใด ๆ"]
  ]) {
    await prisma.$queryRaw`
      INSERT INTO "Achievement" ("code", "name", "description")
      VALUES (${code}, ${name}, ${desc})
      ON CONFLICT ("code") DO NOTHING`;
  }
  const [challenge] = await prisma.$queryRaw`
    INSERT INTO "ChallengeDefinition" ("code", "cadence", "metric", "target", "rewardPoints")
    VALUES ('daily_exam', 'DAILY'::"ChallengeCadence", 'exam_count', 1, 10)
    ON CONFLICT ("code") DO NOTHING
    RETURNING "id"`;
  console.log(`challenge daily_exam: ${challenge ? "created" : "exists"}`);

  // Community boards and demo post
  for (const [slug, name, order] of [
    ["general", "สนทนาทั่วไป", 0],
    ["study-tips", "ทักษาการเรียน", 1],
    ["subject-help", "ช่วยกันการเรียน", 2]
  ]) {
    await prisma.$queryRaw`
      INSERT INTO "CommunityBoard" ("slug", "name", "sortOrder")
      VALUES (${slug}, ${name}, ${order})
      ON CONFLICT ("slug") DO NOTHING`;
  }
  const [existingPost] = await prisma.$queryRaw`
    SELECT "id" FROM "CommunityPost" WHERE "title" = 'ยินดีต้องรับสู่ระบบ AI Tutor!'`;
  let postId = existingPost?.id;
  if (!existingPost) {
    const [post] = await prisma.$queryRaw`
      INSERT INTO "CommunityPost" ("authorId", "board", "title", "body", "moderationStatus")
      VALUES (${admin ? admin.id : null}::uuid, 'general',
              'ยินดีต้องรับสู่ระบบ AI Tutor!',
              'ระบบเผยแพร่แล้ว สามารถเริ่มทำแบบทดสอบและใช้ AI Tutor ได้ทันที',
              'VISIBLE'::"ModerationStatus")
      RETURNING "id"`;
    postId = post?.id;
  }
  console.log(`demo post: ${postId ? (existingPost ? "already exists" : "created") : "failed"}`);

  // Audit log entry
  if (admin) {
    await prisma.$queryRaw`
      INSERT INTO "AuditLog" ("actorId", "action", "resourceType", "resourceId", "requestId")
      VALUES (${admin.id}::uuid, 'SEED_COMPLETED', 'system', 'dev-seed', ${`seed-${now}`})`;
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
