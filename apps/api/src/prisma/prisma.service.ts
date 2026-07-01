import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { prisma, type PrismaClientType } from "database";

type PrismaConnectable = {
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
};

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly db: PrismaClientType = prisma as PrismaClientType;

  async onModuleInit(): Promise<void> {
    await (prisma as PrismaConnectable).$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await (prisma as PrismaConnectable).$disconnect();
  }
}

export type { PrismaClientType };
