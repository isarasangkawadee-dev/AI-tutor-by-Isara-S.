import { randomUUID } from "node:crypto";
import { AppError, requireRole, requireSession, withErrorHandling, jsonOk } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit } from "@/lib/server";

function buildAnswer(stem: string, studentChoice: string[], correctIds: string[], explanation: string, subject: string) {
  const correct = studentChoice.length > 0 && studentChoice.every((c) => correctIds.includes(c)) && correctIds.every((c) => studentChoice.includes(c));
  const hints = [
    `สาระสำคัญของเรื่องนี้อยู่ในแนวคิดหลัก: การวิเคราะห์โจทย์อย่างเป็นขั้นตอน`,
    `ลองพิจารณาเงื่อนไขที่โจทย์กำหนดใหม่อีกครั้ง โดยเริ่มจากข้อมูลที่แน่นอนที่สุด`,
    `หลักการสำคัญ: เปลี่ยนคำถามที่ซับซ้อนให้เป็นส่วนย่อยๆ ที่ตอบได้ทีละขั้น`,
    `ตรวจสอบคำตอบโดยย้อนกลับไปกับสิ่งที่โจทย์ถามว่าตรงกันหรือไม่`
  ];
  return {
    correct,
    whyWrong: correct ? null : "คำตอบยังไม่ตรงกับ answer key ที่ผ่านการตรวจสอบแล้ว ลองอ่านคำอธิบายจากผู้สอนประกอบ",
    concept: explanation ?? "แนวคิดหลักอยู่ในหัวข้อนี้ ควรทบทวนเนื้อหาพื้นฐานก่อน",
    hint: hints[Math.floor(Math.random() * hints.length)],
    subjectRelatedNote: `วิชา ${subject} — ควรฝึกทำโจทย์ระดับเดียวกันอีกอย่างน้อย 3 ข้อเพื่อให้ช่ำชอง`,
    practiceSuggestion: "ลองสร้างโจทย์คล้ายกันที่ตัวเลขหรือเงื่อนไขต่างกัน เพื่อทดสอบความเข้าใจจริง"
  };
}

export const POST = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["STUDENT"]);
  await rateLimit(`tutor:${user.id}`, 30, 60 * 1000);

  const body = await readJson<{ questionId: string; choiceIds?: string[]; message?: string }>(req);
  if (!body.questionId && !body.message) throw new AppError("INVALID_REQUEST");

  const rows = (await prisma.$queryRaw`
    SELECT "id","subject","stem","explanation" FROM "Question"
    WHERE "id" = ${body.questionId}::uuid AND "status" = ${"PUBLISHED"}::text::"QuestionStatus" LIMIT 1`) as unknown as Array<{
    id: string; subject: string; stem: string; explanation: string | null;
  }>;
  const q = rows[0];

  const correctIds = q
    ? ((await prisma.$queryRaw`
        SELECT jsonb_array_elements_text("correctAnswer"->'choiceIds') AS c FROM "Question" WHERE "id" = ${q.id}::uuid`) as unknown as Array<{ c: string }>)
        .map((r) => r.c)
    : [];

  const requestId = randomUUID();
  const answer = q ? buildAnswer(q.stem, body.choiceIds ?? [], correctIds, q.explanation ?? "", q.subject) : {
    correct: null, whyWrong: null,
    concept: "ยินดีต้อนรับสู่ AI Tutor — เล่าสิ่งที่ต้องการให้ช่วยเหลือได้เลย",
    hint: "ลองถามโจทย์จากคลังโจทย์ หรือเลือกข้อที่กำลังทำอยู่เพื่อรับคำอธิบายเจาะลึก",
    subjectRelatedNote: null, practiceSuggestion: null
  };

  const sessionCreated = (await prisma.$queryRaw`
    INSERT INTO "TutorSession" ("userId","subject")
    VALUES (${user.id}::uuid, ${q?.subject ?? null})
    RETURNING "id"`) as unknown as Array<{ id: string }>;
  const sessionId = sessionCreated[0]?.id;
  if (sessionId && (body.message || q)) {
    await prisma.$executeRaw`
      INSERT INTO "TutorMessage" ("sessionId","role","content")
      VALUES (${sessionId}::uuid, 'USER', ${body.message ?? `ask-about:${q?.id}`})`;
    await prisma.$executeRaw`
      INSERT INTO "TutorMessage" ("sessionId","role","content")
      VALUES (${sessionId}::uuid, 'ASSISTANT', ${JSON.stringify(answer).slice(0, 2000)})`;
  }

  await prisma.$executeRaw`
    INSERT INTO "AiTutorUsage" ("requestId","userId","questionId","questionVersion","mode","provider","model","promptVersion","inputTokens","outputTokens","estimatedCost","cacheHit")
    VALUES (${requestId}::uuid, ${user.id}::uuid,
            ${q?.id ?? null}::uuid, ${q ? 1 : null}::int,
            'TUTOR_CHAT'::varchar, 'builtin'::varchar, 'aitutor-classic'::varchar, 'v1'::varchar,
            0, 0, 0, false)
    ON CONFLICT ("requestId") DO NOTHING`;

  return jsonOk({ answer, requestId });
});
