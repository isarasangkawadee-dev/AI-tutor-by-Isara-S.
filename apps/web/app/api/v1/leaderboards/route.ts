import { requireSession, withErrorHandling, jsonOk } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async () => {
  const top = (await prisma.$queryRaw`
    SELECT "id","displayName","points","level" FROM "User"
    WHERE "status" = ${"ACTIVE"}::text::"UserStatus"
    ORDER BY "points" DESC LIMIT 50`) as unknown as Array<{
    id: string; displayName: string | null; points: number; level: number;
  }>;
  return jsonOk({
    items: top.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      displayName: u.displayName ?? `User ${u.id.slice(0, 8)}`,
      points: u.points,
      level: u.level
    }))
  });
});
