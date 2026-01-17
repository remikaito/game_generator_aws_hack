import { Module, Global } from '@nestjs/common';
import { ClaudeService } from './claude/claude.service';

/**
 * Shared module providing common services across the application
 * Global module - services are available everywhere without importing
 */
@Global()
@Module({
  providers: [ClaudeService],
  exports: [ClaudeService],
})
export class SharedModule {}
