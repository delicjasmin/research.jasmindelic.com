import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PdfModule } from "./pdf/pdf.module.js";
import { getRedisConnection } from "./redis-connection.js";

@Module({
  imports: [
    BullModule.forRoot({
      connection: getRedisConnection(),
    }),
    PdfModule,
  ],
})
export class AppModule {}
