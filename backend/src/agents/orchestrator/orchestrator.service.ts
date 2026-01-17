import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from '../context/context.service';
import { LevelLayoutService } from '../level-layout/level-layout.service';
import { AssetService } from '../asset/asset.service';
import { EnvironmentService } from '../environment/environment.service';
import { AssemblyService } from '../assembly/assembly.service';
import {
  SessionState,
  GameContext,
  LevelLayout,
  GeneratedAsset,
  GeneratedSkybox,
  SceneConfig,
} from '../../shared/interfaces';

/**
 * Orchestrator Agent
 * Coordinates the entire generation pipeline
 * 
 * Pipeline:
 * 1. Context Agent → GameContext
 * 2. Level Layout Agent → LevelLayout
 * 3. Asset Agent + Environment Agent (parallel) → Assets + Skybox
 * 4. Assembly Agent → SceneConfig
 */
@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private contextService: ContextService,
    private levelLayoutService: LevelLayoutService,
    private assetService: AssetService,
    private environmentService: EnvironmentService,
    private assemblyService: AssemblyService,
  ) {}

  /**
   * Execute the full generation pipeline
   * @param prompt - User's game description
   * @param callbacks - Progress callbacks
   * @returns Complete session state with all generated data
   */
  async executePipeline(
    prompt: string,
    callbacks: PipelineCallbacks,
  ): Promise<PipelineResult> {
    this.logger.log(`Starting pipeline for: "${prompt.substring(0, 50)}..."`);

    let gameContext: GameContext | undefined;
    let levelLayout: LevelLayout | undefined;
    let assets: GeneratedAsset[] = [];
    let skybox: GeneratedSkybox | undefined;
    let sceneConfig: SceneConfig | undefined;

    try {
      // Step 1: Extract context
      callbacks.onStepStart('context');
      callbacks.onLog('Analyzing your game concept...');
      
      gameContext = await this.contextService.extractContext(prompt);
      
      callbacks.onLog(`Game identified: "${gameContext.game_title}" (${gameContext.genre})`);
      callbacks.onLog(`Characters: ${gameContext.characters.map(c => c.name).join(', ')}`);
      callbacks.onStepComplete('context');

      // Step 2: Generate level layout
      callbacks.onStepStart('layout');
      callbacks.onLog('Designing level architecture...');
      
      levelLayout = await this.levelLayoutService.generateLayout(gameContext);
      
      callbacks.onLog(`Level created: ${levelLayout.level.rooms.length} rooms, ${levelLayout.level.corridors.length} corridors`);
      callbacks.onStepComplete('layout');

      // Step 3: Generate assets and skybox in parallel
      callbacks.onStepStart('generation');
      callbacks.onLog('Generating 3D assets and environment...');

      const [generatedAssets, generatedSkybox] = await Promise.all([
        // Generate 3D models
        this.assetService.generateAssets(gameContext, (assetId, status, progress) => {
          const asset = [...gameContext!.characters, ...(gameContext!.props || [])]
            .find(a => a.id === assetId);
          if (asset) {
            callbacks.onLog(`[3D] ${asset.name}: ${status} (${progress}%)`);
          }
          callbacks.onProgress('generation', progress / 2); // 0-50%
        }),

        // Generate skybox
        this.environmentService.generateSkybox(gameContext, (status, progress) => {
          callbacks.onLog(`[Skybox] ${status} (${progress}%)`);
          callbacks.onProgress('generation', 50 + progress / 2); // 50-100%
        }),
      ]);

      assets = generatedAssets;
      skybox = generatedSkybox;

      // Log results
      const successAssets = assets.filter(a => a.status === 'ready').length;
      callbacks.onLog(`Generated ${successAssets}/${assets.length} 3D models`);
      callbacks.onLog(`Skybox: ${skybox.status === 'ready' ? 'Ready' : 'Failed'}`);
      callbacks.onStepComplete('generation');

      // Step 4: Assemble scene
      callbacks.onStepStart('assembly');
      callbacks.onLog('Assembling final scene...');
      
      sceneConfig = this.assemblyService.assemble(
        gameContext,
        levelLayout,
        assets,
        skybox,
      );
      
      callbacks.onLog(`Scene ready: ${sceneConfig.objects.length} objects positioned`);
      callbacks.onStepComplete('assembly');

      this.logger.log('Pipeline completed successfully');

      return {
        success: true,
        gameContext,
        levelLayout,
        assets,
        skybox,
        sceneConfig,
      };

    } catch (error) {
      this.logger.error(`Pipeline failed: ${error}`);
      callbacks.onError(`Pipeline failed: ${error}`);

      return {
        success: false,
        error: String(error),
        gameContext,
        levelLayout,
        assets,
        skybox,
        sceneConfig,
      };
    }
  }
}

export interface PipelineCallbacks {
  onStepStart: (step: SessionState['progress']['step']) => void;
  onStepComplete: (step: SessionState['progress']['step']) => void;
  onProgress: (step: SessionState['progress']['step'], progress: number) => void;
  onLog: (message: string) => void;
  onError: (message: string) => void;
}

export interface PipelineResult {
  success: boolean;
  error?: string;
  gameContext?: GameContext;
  levelLayout?: LevelLayout;
  assets: GeneratedAsset[];
  skybox?: GeneratedSkybox;
  sceneConfig?: SceneConfig;
}
