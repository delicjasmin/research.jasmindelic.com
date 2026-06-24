export const prisma = {
  $connect: (): Promise<void> => Promise.resolve(),
  $disconnect: (): Promise<void> => Promise.resolve(),
};

export type PrismaClientType = typeof prisma;

export class PrismaClient {}
