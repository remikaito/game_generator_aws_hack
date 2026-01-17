import { Injectable, Logger } from '@nestjs/common';
import { TripoService } from '../../tools/tripo/tripo.service';
import { CacheService } from '../../tools/cache/cache.service';
import { GameContext, Character, Prop, GeneratedAsset } from '../../shared/interfaces';

/**
 * Asset Agent
 * Generates 3D models using TRIPO API
 * 
 * Input: GameContext with characters and props
 * Output: Array of GeneratedAsset with model paths
 */
@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private tripoService: TripoService,
    private cacheService: CacheService,
  ) {}

  /**
   * Generate all 3D assets for a game context
   * Runs character and prop generation in parallel
   * 
   * @param context - GameContext with characters and props
   * @param onProgress - Callback for progress updates
   * @returns Array of GeneratedAsset
   */
  async generateAssets(
    context: GameContext,
    onProgress?: (assetId: string, status: string, progress: number) => void,
  ): Promise<GeneratedAsset[]> {
    this.logger.log(`Generating assets for "${context.game_title}"`);

    const assets: GeneratedAsset[] = [];

    // Prepare all generation tasks
    const tasks: AssetGenerationTask[] = [
      // Characters
      ...context.characters.map((char) => ({
        id: char.id,
        name: char.name,
        type: 'character' as const,
        prompt: char.tripo_prompt,
      })),
      // Props
      ...(context.props || []).map((prop) => ({
        id: prop.id,
        name: prop.name,
        type: 'prop' as const,
        prompt: prop.tripo_prompt,
      })),
    ];

    // Process all tasks in parallel
    const results = await Promise.all(
      tasks.map((task) => this.generateSingleAsset(task, onProgress)),
    );

    assets.push(...results);

    this.logger.log(`Generated ${assets.length} assets`);
    return assets;
  }

  /**
   * Generate a single asset (used for both initial generation and edit additions)
   */
  async generateSingleAsset(
    task: AssetGenerationTask,
    onProgress?: (assetId: string, status: string, progress: number) => void,
  ): Promise<GeneratedAsset> {
    const { id, name, type, prompt } = task;

    this.logger.log(`Generating ${type}: ${name}`);
    onProgress?.(id, 'starting', 0);

    // Check cache first
    const cachedPath = this.cacheService.getCached(prompt, 'model');
    if (cachedPath) {
      this.logger.log(`Using cached model for: ${name}`);
      return {
        id,
        name,
        type,
        path: cachedPath,
        status: 'ready',
        prompt,
      };
    }

    try {
      // Generate new model
      const modelPath = await this.tripoService.generateModel(
        prompt,
        id,
        (status, progress) => onProgress?.(id, status, progress),
      );

      // Add to cache
      this.cacheService.addToCache(prompt, 'model', modelPath);

      return {
        id,
        name,
        type,
        path: modelPath,
        status: 'ready',
        prompt,
      };
    } catch (error) {
      this.logger.error(`Failed to generate ${name}: ${error}`);
      return {
        id,
        name,
        type,
        path: '',
        status: 'failed',
        prompt,
      };
    }
  }

  /**
   * Generate a single character model
   */
  async generateCharacter(
    character: Character,
    onProgress?: (status: string, progress: number) => void,
  ): Promise<GeneratedAsset> {
    return this.generateSingleAsset(
      {
        id: character.id,
        name: character.name,
        type: 'character',
        prompt: character.tripo_prompt,
      },
      (_assetId, status, progress) => onProgress?.(status, progress),
    );
  }

  /**
   * Generate a single prop model
   */
  async generateProp(
    prop: Prop,
    onProgress?: (status: string, progress: number) => void,
  ): Promise<GeneratedAsset> {
    return this.generateSingleAsset(
      {
        id: prop.id,
        name: prop.name,
        type: 'prop',
        prompt: prop.tripo_prompt,
      },
      (_assetId, status, progress) => onProgress?.(status, progress),
    );
  }

  /**
   * Generate a custom asset from a prompt
   * Used by the Edit Agent for adding new assets via chat
   */
  async generateCustomAsset(
    id: string,
    name: string,
    prompt: string,
    type: 'character' | 'prop' = 'prop',
    onProgress?: (status: string, progress: number) => void,
  ): Promise<GeneratedAsset> {
    return this.generateSingleAsset(
      { id, name, type, prompt },
      (_assetId, status, progress) => onProgress?.(status, progress),
    );
  }
}

interface AssetGenerationTask {
  id: string;
  name: string;
  type: 'character' | 'prop';
  prompt: string;
}
