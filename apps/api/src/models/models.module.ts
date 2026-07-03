import { Module } from "@nestjs/common";
import { UsageModule } from "../usage/usage.module";
import { ModelsController } from "./models.controller";
import { ModelsService } from "./models.service";

@Module({
  imports: [UsageModule],
  controllers: [ModelsController],
  providers: [ModelsService],
})
export class ModelsModule {}
