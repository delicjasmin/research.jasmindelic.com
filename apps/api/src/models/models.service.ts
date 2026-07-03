import { Injectable } from "@nestjs/common";
import {
  DEFAULT_MODEL_ID,
  listAvailableChatModels,
  listChatModels,
} from "ai";
import { UsageService } from "../usage/usage.service";

@Injectable()
export class ModelsService {
  constructor(private readonly usageService: UsageService) {}

  async listForUser(userId: string) {
    const plan = await this.usageService.getUserPlan(userId);
    const models = listChatModels(plan);
    const available = listAvailableChatModels(plan);

    return {
      defaultModelId:
        available.find((model) => model.id === DEFAULT_MODEL_ID)?.id ??
        available[0]?.id ??
        null,
      models,
    };
  }
}
