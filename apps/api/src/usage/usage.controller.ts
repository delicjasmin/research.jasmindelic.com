import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/auth.types";
import { UsageService } from "./usage.service";

@Controller("usage")
@UseGuards(AuthGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.usageService.getUsage(user.id);
  }
}
