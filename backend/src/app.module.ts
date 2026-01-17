import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Feature modules
import { AgentsModule } from './agents/agents.module';
import { ToolsModule } from './tools/tools.module';
import { SessionModule } from './session/session.module';
import { ChatModule } from './chat/chat.module';
import { SharedModule } from './shared/shared.module';
import { LevelsModule } from './levels/levels.module';

/**
 * Main application module
 * Configures environment variables, static file serving, and imports all feature modules
 */
@Module({
  imports: [
    // Load environment variables from .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Serve generated assets (GLB models, skybox images)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'assets'),
      serveRoot: '/assets',
    }),

    // Feature modules
    SharedModule,
    ToolsModule,
    AgentsModule,
    SessionModule,
    ChatModule,
    LevelsModule,
  ],
})
export class AppModule {}
