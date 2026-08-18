import { requireRole, requireSession, withErrorHandling } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pgPool } from "@/lib/db";

type ExportFormat = "json" | "csv";

function parseFormat(s: string | null): ExportFormat {
  return s === "csv" ? "csv" : "json";
}

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["ADMIN"]);

  const url = new URL(req.url);
  const subject = url.searchParams.get("subject");
  const grade = url.searchParams.get("grade");
  const difficulty = url.searchParams.get("difficulty");
  const status = url.searchParams.get("status") ?? "PUBLISHED";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 200), 1), 500);
  const format = parseFormat(url.searchParams.get("format"));

  const filters: string[] = [`"reviewStatus" = 'APPROVED'::varchar`, `"status" = $1::"QuestionStatus"`];
  const params: string[] = [status];
  let pi = 1;

  if (subject) {
    filters.push(`"subject" = $${++pi}::text::"Subject"`);
    params.push(subject);
  }
  if (grade) {
    const g = Number(grade);
    if (!Number.isNaN(g)) {
      filters.push(`"grade" = $${++pi}`);
      params.push(String(g));
    }
  }
  if (difficulty) {
    filters.push(`"difficulty" = $${++pi}::text::"Difficulty"`);
    params.push(difficulty);
  }

  const where = filters.join(" AND ");

  const rows = (await pgPool.query(
    `SELECT "id", "subject", "grade", "difficulty", "type", "stem", "explanation", "correctAnswer", "createdAt"
     FROM "Question" WHERE ${where} ORDER BY "createdAt" DESC LIMIT ${limit}`,
    params
  )) as unknown as { rows: Array<{
    id: string; subject: string; grade: number; difficulty: string; type: string;
    stem: string; explanation: string | null; correctAnswer: { choiceIds: string[] };
    createdAt: Date;
  }>};

  const questionRows = rows.rows;

  const enriched = [];
  for (const r of questionRows) {
    const choices = (await pgPool.query(
      `SELECT "label", "content", "isCorrect", "sortOrder" FROM "QuestionChoice" WHERE "questionId" = $1::uuid ORDER BY "sortOrder" ASC`,
      [r.id]
    )) as unknown as { rows: Array<{
      label: string; content: string; isCorrect: boolean; sortOrder: number;
    }>};

    const correctIndices: number[] = [];
    const choiceTexts: string[] = [];
    for (const c of choices.rows.sort((a, b) => a.sortOrder - b.sortOrder)) {
      choiceTexts.push(c.content);
      if (c.isCorrect) {
        const idx = choices.rows.findIndex((x) => x.label === c.label);
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

  const filename = `aitutor-questions-${Date.now()}.${format}`;

  if (format === "csv") {
    const csvRows = [
      "subject,grade,difficulty,type,stem,explanation,choices,correct"
    ];
    for (const q of enriched) {
      const esc = (v: string | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
      csvRows.push([
        esc(q.subject),
        esc(String(q.grade)),
        esc(q.difficulty),
        esc(q.type),
        esc(q.stem),
        esc(q.explanation),
        esc(q.choices.map(esc).join("||")),
        esc(q.correct.join(","))
      ].join(","));
    }
    const csvContent = csvRows.join("\n");
    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(Buffer.byteLength(csvContent, "utf-8"))
      }
    });
  }

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
