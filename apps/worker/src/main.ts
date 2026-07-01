import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "error", "warn"],
  });

  const logger = new Logger("Worker");
  logger.log("PDF worker is running and waiting for jobs…");

  app.enableShutdownHooks();
}

void bootstrap();
