import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PdfProcessor } from "./pdf.processor.js";
import { PDF_QUEUE } from "./pdf.types.js";

@Module({
  imports: [BullModule.registerQueue({ name: PDF_QUEUE })],
  providers: [PdfProcessor],
})
export class PdfModule {}
