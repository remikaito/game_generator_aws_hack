import { Module } from '@nestjs/common';
import { ToolsModule } from '../tools/tools.module';

// Agent services
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { OrchestratorController } from './orchestrator/orchestrator.controller';
import { ContextService } from './context/context.service';
import { LevelLayoutService } from './level-layout/level-layout.service';
import { AssetService } from './asset/asset.service';
import { EnvironmentService } from './environment/environment.service';
import { AssemblyService } from './assembly/assembly.service';
import { EditService } from './edit/edit.service';

/**
 * Agents module - All AI agents for the generation pipeline
 */
@Module({
  imports: [ToolsModule],
  controllers: [OrchestratorController],
  providers: [
    OrchestratorService,
    ContextService,
    LevelLayoutService,
    AssetService,
    EnvironmentService,
    AssemblyService,
    EditService,
  ],
  exports: [
    OrchestratorService,
    ContextService,
    LevelLayoutService,
    AssetService,
    EnvironmentService,
    AssemblyService,
    EditService,
  ],
})
export class AgentsModule {}
