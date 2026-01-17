import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Bootstrap the NestJS application
 * - Configures CORS for frontend communication
 * - Enables validation pipes for DTO validation
 * - Starts WebSocket server for real-time communication
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`
  🎮 Game Prototype Generator Backend
  ====================================
  🚀 Server running on: http://localhost:${port}
  📡 WebSocket ready for connections
  🔧 Environment: ${process.env.NODE_ENV || 'development'}
  `);
}

bootstrap();
