import { Injectable, Logger } from '@nestjs/common';
import { SkyboxService } from '../../tools/skybox/skybox.service';
import { CacheService } from '../../tools/cache/cache.service';
import { GameContext, GeneratedSkybox } from '../../shared/interfaces';

/**
 * Environment Agent
 * Generates skybox using Blockade Labs API
 * 
 * Input: GameContext with environment description
 * Output: GeneratedSkybox with image path
 */
@Injectable()
export class EnvironmentService {
  private readonly logger = new Logger(EnvironmentService.name);

  constructor(
    private skyboxService: SkyboxService,
    private cacheService: CacheService,
  ) {}

  /**
   * Generate skybox from game context
   * 
   * @param context - GameContext with environment
   * @param onProgress - Callback for progress updates
   * @returns GeneratedSkybox
   */
  async generateSkybox(
    context: GameContext,
    onProgress?: (status: string, progress: number) => void,
  ): Promise<GeneratedSkybox> {
    const prompt = context.environment.skybox_prompt;
    const { mood, style } = context;

    this.logger.log(`Generating skybox for: "${context.environment.name}"`);
    onProgress?.('starting', 0);

    // Check cache first
    const cachedPath = this.cacheService.getCached(prompt, 'skybox');
    if (cachedPath) {
      this.logger.log(`Using cached skybox`);
      return {
        id: 'skybox_main',
        path: cachedPath,
        status: 'ready',
        prompt,
      };
    }

    try {
      // Determine appropriate style based on game mood
      const styleId = SkyboxService.getStyleForMood(mood, style);

      // Generate skybox
      const skyboxPath = await this.skyboxService.generateSkybox(
        prompt,
        styleId,
        onProgress,
      );

      // Add to cache
      this.cacheService.addToCache(prompt, 'skybox', skyboxPath);

      return {
        id: 'skybox_main',
        path: skyboxPath,
        status: 'ready',
        prompt,
      };
    } catch (error) {
      this.logger.error(`Failed to generate skybox: ${error}`);
      return {
        id: 'skybox_main',
        path: '',
        status: 'failed',
        prompt,
      };
    }
  }

  /**
   * Generate a custom skybox from a prompt
   * Used by the Edit Agent for changing skybox via chat
   */
  async generateCustomSkybox(
    prompt: string,
    mood: string = 'epic',
    style: string = 'fantasy',
    onProgress?: (status: string, progress: number) => void,
  ): Promise<GeneratedSkybox> {
    this.logger.log(`Generating custom skybox: "${prompt.substring(0, 50)}..."`);
    onProgress?.('starting', 0);

    // Check cache first
    const cachedPath = this.cacheService.getCached(prompt, 'skybox');
    if (cachedPath) {
      this.logger.log(`Using cached skybox`);
      return {
        id: `skybox_${Date.now()}`,
        path: cachedPath,
        status: 'ready',
        prompt,
      };
    }

    try {
      const styleId = SkyboxService.getStyleForMood(mood, style);
      const skyboxPath = await this.skyboxService.generateSkybox(
        prompt,
        styleId,
        onProgress,
      );

      this.cacheService.addToCache(prompt, 'skybox', skyboxPath);

      return {
        id: `skybox_${Date.now()}`,
        path: skyboxPath,
        status: 'ready',
        prompt,
      };
    } catch (error) {
      this.logger.error(`Failed to generate custom skybox: ${error}`);
      return {
        id: `skybox_${Date.now()}`,
        path: '',
        status: 'failed',
        prompt,
      };
    }
  }
}
