import { AppError, requireSession, withErrorHandling, jsonOk } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit, notFound } from "@/lib/server";

export const GET = withErrorHandling(async (req, opts) => {
  const user = await requireSession(req.headers);
  const postId = opts.params?.postId ?? "";

  const rows = (await prisma.$queryRaw`
    SELECT "id","authorId","board","title","body","status","moderationStatus","pinned",
           "answerCount","commentCount","upvoteCount","createdAt","deletedAt"
    FROM "CommunityPost" WHERE "id" = ${postId}::uuid AND "deletedAt" IS NULL LIMIT 1`) as unknown as Array<{
    id: string; authorId: string; board: string; title: string; body: string; status: string;
    moderationStatus: string; pinned: boolean; answerCount: number; commentCount: number;
    upvoteCount: number; createdAt: Date; deletedAt: Date | null;
  }>;
  const post = rows[0];
  if (!post || post.moderationStatus !== "VISIBLE") throw notFound();

  const answers = (await prisma.$queryRaw`
    SELECT "id","authorId","body","upvoteCount","createdAt","deletedAt"
    FROM "CommunityAnswer" WHERE "postId" = ${postId}::uuid AND "deletedAt" IS NULL
    ORDER BY "createdAt" LIMIT 50`) as unknown as Array<{
    id: string; authorId: string; body: string; upvoteCount: number; createdAt: Date; deletedAt: Date | null;
  }>;
  const comments = (await prisma.$queryRaw`
    SELECT "id","authorId","body","createdAt"
    FROM "CommunityComment" WHERE "postId" = ${postId}::uuid AND "deletedAt" IS NULL
    ORDER BY "createdAt" LIMIT 50`) as unknown as Array<{
    id: string; authorId: string; body: string; createdAt: Date;
  }>;

  const authorNames = (await prisma.$queryRaw`
    SELECT "id","displayName","email" FROM "User" WHERE "id" = ANY(${[post.authorId, ...answers.map((a) => a.authorId), ...comments.map((c) => c.authorId)]}::uuid[])`) as unknown as Array<{
    id: string; displayName: string | null; email: string;
  }>;
  const nameMap = new Map(authorNames.map((u) => [u.id, u.displayName ?? u.email.split("@")[0]]));

  return jsonOk({
    post: {
      ...post,
      authorName: nameMap.get(post.authorId) ?? null,
      createdAt: post.createdAt.toISOString()
    },
    answers: answers.map((a) => ({ ...a, authorName: nameMap.get(a.authorId) ?? null, createdAt: a.createdAt.toISOString() })),
    comments: comments.map((c) => ({ ...c, authorName: nameMap.get(c.authorId) ?? null, createdAt: c.createdAt.toISOString() }))
  });
});

export const POST = withErrorHandling(async (req, opts) => {
  const user = await requireSession(req.headers);
  if (user.status !== "ACTIVE") throw new AppError("ACCOUNT_NOT_ACTIVE", 403);
  const postId = opts.params?.postId ?? "";
  const body = await readJson<{ action: string; answer?: string; comment?: string; reason?: string }>(req);
  await rateLimit(`community:${body.action}:${user.id}`, 30, 60 * 1000);

  const [check] = (await prisma.$queryRaw`
    SELECT "id" FROM "CommunityPost" WHERE "id" = ${postId}::uuid AND "deletedAt" IS NULL LIMIT 1`) as unknown as Array<{ id: string }>;
  if (!check) throw notFound();

  if (body.action === "answer") {
    const answerBody = String(body.answer ?? "").trim();
    if (!answerBody) throw new AppError("INVALID_BODY");
    const created = (await prisma.$queryRaw`
      INSERT INTO "CommunityAnswer" ("postId","authorId","body")
      VALUES (${postId}::uuid, ${user.id}::uuid, ${answerBody}::text)
      RETURNING "id","createdAt"`) as unknown as Array<{ id: string; createdAt: Date }>;
    await prisma.$executeRaw`UPDATE "CommunityPost" SET "answerCount" = "answerCount" + 1,
      "lastActivityAt" = now() WHERE "id" = ${postId}::uuid`;
    return jsonOk({ answer: { id: created[0].id, createdAt: created[0].createdAt.toISOString() } }, { status: 201 });
  }

  if (body.action === "comment") {
    const commentBody = String(body.comment ?? "").trim();
    if (!commentBody) throw new AppError("INVALID_BODY");
    const created = (await prisma.$queryRaw`
      INSERT INTO "CommunityComment" ("postId","authorId","body")
      VALUES (${postId}::uuid, ${user.id}::uuid, ${commentBody}::text)
      RETURNING "id","createdAt"`) as unknown as Array<{ id: string; createdAt: Date }>;
    await prisma.$executeRaw`UPDATE "CommunityPost" SET "commentCount" = "commentCount" + 1,
      "lastActivityAt" = now() WHERE "id" = ${postId}::uuid`;
    return jsonOk({ comment: { id: created[0].id, createdAt: created[0].createdAt.toISOString() } }, { status: 201 });
  }

  if (body.action === "upvote") {
    await prisma.$executeRaw`
      INSERT INTO "CommunityReaction" ("userId","entityType","entityId","kind")
      VALUES (${user.id}::uuid, 'post', ${postId}::uuid, 'UPVOTE'::varchar)
      ON CONFLICT ("userId","entityType","entityId","kind") DO NOTHING`;
    await prisma.$executeRaw`UPDATE "CommunityPost" SET "upvoteCount" = GREATEST("upvoteCount", 0) + 1
      WHERE "id" = ${postId}::uuid`;
    return jsonOk({ upvoted: true });
  }

  if (body.action === "bookmark") {
    await prisma.$executeRaw`
      INSERT INTO "CommunityBookmark" ("userId","postId")
      VALUES (${user.id}::uuid, ${postId}::uuid)
      ON CONFLICT ("userId","postId") DO NOTHING`;
    return jsonOk({ bookmarked: true });
  }

  if (body.action === "follow") {
    await prisma.$executeRaw`
      INSERT INTO "CommunityFollow" ("userId","postId")
      VALUES (${user.id}::uuid, ${postId}::uuid)
      ON CONFLICT ("userId","postId") DO NOTHING`;
    return jsonOk({ followed: true });
  }

  if (body.action === "report") {
    const reason = String(body.reason ?? "abuse").slice(0, 80) || "abuse";
    const created = (await prisma.$queryRaw`
      INSERT INTO "CommunityReport" ("reporterId","entityType","entityId","reason")
      VALUES (${user.id}::uuid, 'post', ${postId}::uuid, ${reason}::varchar)
      RETURNING "id"`) as unknown as Array<{ id: string }>;
    return jsonOk({ reported: true, reportId: created[0].id }, { status: 201 });
  }

  throw new AppError("INVALID_ACTION");
});
