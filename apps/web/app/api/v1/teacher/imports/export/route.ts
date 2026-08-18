import { requireRole, requireSession, withErrorHandling } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["TEACHER", "ADMIN"]);

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 200), 1), 500);

  const rows = (await prisma.$queryRaw`
    SELECT "id","subject","grade","difficulty","type","stem","explanation","correctAnswer"
    FROM "Question" WHERE "authorId" = ${user.id}::uuid
    ORDER BY "createdAt" DESC LIMIT ${limit}`) as unknown as Array<{
    id: string; subject: string; grade: number; difficulty: string; type: string;
    stem: string; explanation: string | null; correctAnswer: { choiceIds: string[] };
  }>;

  const enriched = [];
  for (const r of rows) {
    const choices = (await prisma.$queryRaw`
      SELECT "label","content","isCorrect","sortOrder" FROM "QuestionChoice"
      WHERE "questionId" = ${r.id} ORDER BY "sortOrder" ASC`) as unknown as Array<{
      label: string; content: string; isCorrect: boolean; sortOrder: number;
    }>;

    const correctIndices: number[] = [];
    const choiceTexts: string[] = [];
    for (const c of choices.sort((a, b) => a.sortOrder - b.sortOrder)) {
      choiceTexts.push(c.content);
      if (c.isCorrect) {
        const idx = choices.findIndex((x) => x.label === c.label);
        if (idx >= 0) correctIndices.push(idx);
      }
    }

    enriched.push({
      subject: r.subject,
      grade: r.grade,
      difficulty: r.difficulty,
      type: r.type,
      stem: r.stem,
      explanation: r.explanation ?? undefined,
      choices: choiceTexts,
      correct: correctIndices
    });
  }

  const filename = `teacher-questions-${user.id.slice(0, 8)}-${Date.now()}.json`;
  const jsonContent = JSON.stringify(enriched, null, 2);

  return new Response(jsonContent, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(Buffer.byteLength(jsonContent, "utf-8"))
    }
  });
});
