import { AppError, requireSession, withErrorHandling, jsonOk } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit } from "@/lib/server";

function ensureUserActive(user: { status: string }) {
  if (user.status !== "ACTIVE") throw new AppError("ACCOUNT_NOT_ACTIVE", 403);
}

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  const url = new URL(req.url);
  const board = url.searchParams.get("board") ?? "general";

  const posts = (await prisma.$queryRaw`
    SELECT "id","authorId","board","title","pinned","answerCount","commentCount","upvoteCount","lastActivityAt","createdAt","deletedAt"
    FROM "CommunityPost"
    WHERE "board" = ${board}::varchar
      AND "moderationStatus" = ${"VISIBLE"}::text::"ModerationStatus"
      AND "deletedAt" IS NULL
    ORDER BY "pinned" DESC, "lastActivityAt" DESC
    LIMIT 50`) as unknown as Array<{
    id: string; authorId: string; board: string; title: string; pinned: boolean;
    answerCount: number; commentCount: number; upvoteCount: number;
    lastActivityAt: Date; createdAt: Date; deletedAt: Date | null;
  }>;

  return jsonOk({
    items: posts.map((p) => ({
      ...p,
      lastActivityAt: p.lastActivityAt.toISOString(),
      createdAt: p.createdAt.toISOString()
    }))
  });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  ensureUserActive(user);
  await rateLimit(`community:post:${user.id}`, 15, 60 * 1000);

  const body = await readJson<{ board: string; title: string; body: string }>(req);
  const title = String(body.title ?? "").trim();
  const postBody = String(body.body ?? "").trim();
  const board = String(body.board ?? "general").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 80) || "general";

  if (!title || title.length > 240) throw new AppError("INVALID_TITLE");
  if (!postBody) throw new AppError("INVALID_BODY");

  const created = (await prisma.$queryRaw`
    INSERT INTO "CommunityPost" ("authorId","board","title","body")
    VALUES (${user.id}::uuid, ${board}::varchar, ${title}::varchar, ${postBody}::text)
    RETURNING "id","board","title","createdAt"`) as unknown as Array<{ id: string; board: string; title: string; createdAt: Date }>;
  const post = created[0];

  await prisma.$executeRaw`
    INSERT INTO "AuditLog" ("actorId","action","resourceType","resourceId","requestId")
    VALUES (${user.id}::uuid, 'COMMUNITY_POST_CREATED', 'community_post', ${post.id}::uuid, ${`req-${Date.now()}`})`;

  return jsonOk({ post: { ...post, createdAt: post.createdAt.toISOString() } }, { status: 201 });
});
