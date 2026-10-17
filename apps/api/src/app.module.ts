import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SearchModule } from "./search/search.module";
import { DocumentModule } from "./document/document.module";
import { ConversationModule } from "./conversation/conversation.module";
import { ResearchModule } from "./research/research.module";
import { UsageModule } from "./usage/usage.module";
import { ModelsModule } from "./models/models.module";

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    SearchModule,
    ConversationModule,
    DocumentModule,
    ResearchModule,
    UsageModule,
    ModelsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
