import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async validateSessionToken(token: string): Promise<AuthUser | null> {
    const session = await this.prisma.db.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.user;
  }
}
