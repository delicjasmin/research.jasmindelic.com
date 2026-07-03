import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/auth.types";
import { ModelsService } from "./models.service";

@Controller("models")
@UseGuards(AuthGuard)
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.modelsService.listForUser(user.id);
  }
}
