import { INestApplication, ValidationPipe } from "@nestjs/common";

export function configureApp(app: INestApplication): void {
  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

  app.enableCors({
    origin: corsOrigin.split(",").map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
