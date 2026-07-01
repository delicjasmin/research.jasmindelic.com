import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DocumentController } from "./document.controller";
import { DocumentService, PDF_QUEUE } from "./document.service";

@Module({
  imports: [BullModule.registerQueue({ name: PDF_QUEUE })],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
