import { Module } from "@nestjs/common";
import { DocumentController } from "./document.controller";
import { DocumentService } from "./document.service";
import { ConversationModule } from "../conversation/conversation.module";
import { UsageModule } from "../usage/usage.module";
import { PdfProcessingService } from "../pdf/pdf-processing.service";

@Module({
  imports: [ConversationModule, UsageModule],
  controllers: [DocumentController],
  providers: [DocumentService, PdfProcessingService],
  exports: [DocumentService, PdfProcessingService],
})
export class DocumentModule {}
