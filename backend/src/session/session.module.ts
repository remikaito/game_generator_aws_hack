import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { SessionService } from './session.service';
import { SessionGateway } from './session.gateway';

/**
 * Session module - Manages generation sessions and WebSocket communication
 */
@Module({
  imports: [AgentsModule],
  providers: [SessionService, SessionGateway],
  exports: [SessionService],
})
export class SessionModule {}
