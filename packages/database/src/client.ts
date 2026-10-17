import { PrismaClient } from "../generated/prisma/client.js";
import { withAccelerate } from "@prisma/extension-accelerate";
import "dotenv/config";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  directPrisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const accelerateUrl = process.env.DATABASE_URL;
  if (!accelerateUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return new PrismaClient({
    accelerateUrl,
  }).$extends(withAccelerate());
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type PrismaClientType = typeof prisma;

let directPrisma = globalForPrisma.directPrisma;

/** Bulk PDF chunk writes. The request path keeps using the Accelerate client. */
export async function getDirectPrisma(): Promise<PrismaClient> {
  if (!directPrisma) {
    const connectionString = process.env.DIRECT_URL;
    if (!connectionString) {
      throw new Error("DIRECT_URL is not set");
    }

    const { PrismaPg } = await import("@prisma/adapter-pg");
    directPrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.directPrisma = directPrisma;
    }
  }

  return directPrisma;
}
