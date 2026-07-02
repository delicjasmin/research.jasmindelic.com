import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import {
  DOCUMENTS_PER_DAY,
  QUESTIONS_PER_DAY,
  isUnlimitedPlan,
  type Prisma,
} from "database";
import { PrismaService } from "../prisma/prisma.service";

export type UsageQuota = {
  used: number;
  limit: number | null;
  remaining: number | null;
};

export type UsageSummary = {
  plan: string;
  documents: UsageQuota;
  questions: UsageQuota;
};

type UserPlanRow = Prisma.UserGetPayload<{ select: { plan: true } }>;

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  private startOfUtcDay(): Date {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  async getUserPlan(userId: string): Promise<string> {
    const user: UserPlanRow | null = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    return user?.plan ?? "free";
  }

  async countDocumentsToday(userId: string): Promise<number> {
    return await this.prisma.db.document.count({
      where: {
        userId,
        createdAt: { gte: this.startOfUtcDay() },
      },
    });
  }

  async countQuestionsToday(userId: string): Promise<number> {
    return await this.prisma.db.message.count({
      where: {
        role: "user",
        createdAt: { gte: this.startOfUtcDay() },
        conversation: {
          document: { userId },
        },
      },
    });
  }

  private buildQuota(used: number, limit: number | null): UsageQuota {
    return {
      used,
      limit,
      remaining: limit === null ? null : Math.max(0, limit - used),
    };
  }

  async getUsage(userId: string): Promise<UsageSummary> {
    const plan = await this.getUserPlan(userId);
    const unlimited = isUnlimitedPlan(plan);
    const documentsUsed = await this.countDocumentsToday(userId);
    const questionsUsed = await this.countQuestionsToday(userId);

    return {
      plan,
      documents: this.buildQuota(
        documentsUsed,
        unlimited ? null : DOCUMENTS_PER_DAY,
      ),
      questions: this.buildQuota(
        questionsUsed,
        unlimited ? null : QUESTIONS_PER_DAY,
      ),
    };
  }

  async assertWithinDailyDocumentLimit(userId: string): Promise<void> {
    const plan = await this.getUserPlan(userId);
    if (isUnlimitedPlan(plan)) return;

    const count = await this.countDocumentsToday(userId);
    if (count >= DOCUMENTS_PER_DAY) {
      throw new HttpException(
        `Daily document limit reached (${DOCUMENTS_PER_DAY} per day). Resets at midnight UTC.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async assertWithinDailyQuestionLimit(userId: string): Promise<void> {
    const plan = await this.getUserPlan(userId);
    if (isUnlimitedPlan(plan)) return;

    const count = await this.countQuestionsToday(userId);
    if (count >= QUESTIONS_PER_DAY) {
      throw new HttpException(
        `Daily question limit reached (${QUESTIONS_PER_DAY} per day). Resets at midnight UTC.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
