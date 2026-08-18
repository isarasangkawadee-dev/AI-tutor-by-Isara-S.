import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@aitutor/db";

export const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pgPool);

function makeClient(): PrismaClient {
  return new PrismaClient({ adapter });
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? makeClient();
if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
