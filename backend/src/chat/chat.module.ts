import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { SessionModule } from '../session/session.module';
import { ToolsModule } from '../tools/tools.module';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

/**
 * Chat module - Manages edit chat functionality
 */
@Module({
  imports: [AgentsModule, SessionModule, ToolsModule],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
