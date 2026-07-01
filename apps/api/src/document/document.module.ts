import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DocumentController } from "./document.controller";
import { DocumentService, PDF_QUEUE } from "./document.service";
import { ConversationModule } from "../conversation/conversation.module";

@Module({
  imports: [BullModule.registerQueue({ name: PDF_QUEUE }), ConversationModule],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
