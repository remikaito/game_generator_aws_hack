import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TRIPO 3D API Service
 * Generates 3D models from text prompts
 * 
 * API Documentation: https://www.tripo3d.ai/docs
 */
@Injectable()
export class TripoService {
  private readonly logger = new Logger(TripoService.name);
  private readonly client: AxiosInstance;
  private readonly assetsPath: string;

  // API Configuration
  private readonly BASE_URL = 'https://api.tripo3d.ai/v2/openapi';
  private readonly POLL_INTERVAL = 3000; // 3 seconds (reduced API calls)
  private readonly MAX_POLL_TIME = 300000; // 5 minutes timeout (TRIPO can be slow)

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('TRIPO_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('TRIPO_API_KEY not found in environment variables');
    }

    this.client = axios.create({
      baseURL: this.BASE_URL,
      headers: {
        'Authorization': `Bearer ${apiKey || ''}`,
        'Content-Type': 'application/json',
      },
    });

    this.assetsPath = this.configService.get<string>('ASSETS_PATH') || '../assets';
  }

  /**
   * Generate a 3D model from a text prompt
   * @param prompt - Description of the 3D model to generate
   * @param assetId - Unique identifier for the asset
   * @param onProgress - Callback for progress updates
   * @returns Path to the downloaded GLB file
   */
  async generateModel(
    prompt: string,
    assetId: string,
    onProgress?: (status: string, progress: number) => void,
  ): Promise<string> {
    try {
      this.logger.log(`Starting 3D generation for: ${prompt.substring(0, 50)}...`);
      onProgress?.('starting', 0);

      // Step 1: Create task
      const taskId = await this.createTask(prompt);
      this.logger.debug(`Task created: ${taskId}`);
      onProgress?.('processing', 10);

      // Step 2: Poll for completion
      const modelUrl = await this.pollTask(taskId, onProgress);
      this.logger.debug(`Model ready: ${modelUrl}`);
      onProgress?.('downloading', 80);

      // Step 3: Download GLB file
      const filePath = await this.downloadModel(modelUrl, assetId);
      this.logger.log(`Model saved: ${filePath}`);
      onProgress?.('completed', 100);

      return filePath;
    } catch (error) {
      this.logger.error(`Failed to generate model: ${error}`);
      throw error;
    }
  }

  /**
   * Create a text-to-model task
   */
  private async createTask(prompt: string): Promise<string> {
    const response = await this.client.post('/task', {
      type: 'text_to_model',
      prompt: prompt,
    });

    if (response.data.code !== 0) {
      throw new Error(`TRIPO API error: ${response.data.message}`);
    }

    return response.data.data.task_id;
  }

  /**
   * Poll task status until completion
   * 
   * TRIPO API Response structure:
   * {
   *   "data": {
   *     "task_id": "...",
   *     "status": "queued" | "running" | "success" | "failed" | "banned" | "cancelled",
   *     "output": {
   *       "model": "url" (old API) OR
   *       "model_mesh": { "url": "..." } (new API) OR
   *       "pbr_model": { "url": "..." }
   *       "base_model": { "url": "..." }
   *     }
   *   }
   * }
   */
  private async pollTask(
    taskId: string,
    onProgress?: (status: string, progress: number) => void,
  ): Promise<string> {
    const startTime = Date.now();
    let progressValue = 10;

    // Statuts d'erreur à gérer immédiatement (ne pas continuer le polling)
    const errorStatuses = ['failed', 'banned', 'cancelled', 'rejected', 'error'];

    while (Date.now() - startTime < this.MAX_POLL_TIME) {
      const response = await this.client.get(`/task/${taskId}`);
      const data = response.data.data;

      this.logger.debug(`Task ${taskId} status: ${data.status}`);

      if (data.status === 'success') {
        // Log full output structure for debugging
        this.logger.debug(`Task ${taskId} output: ${JSON.stringify(data.output)}`);
        
        // Extract model URL from various possible locations in the response
        const output = data.output || {};
        const modelUrl = 
          // New API structure (nested objects with .url)
          output.model_mesh?.url ||
          output.pbr_model?.url ||
          output.base_model?.url ||
          output.model?.url ||
          // Old API structure (direct URL strings)
          output.model ||
          output.pbr_model ||
          output.base_model ||
          output.model_mesh ||
          // Fallback: any URL-like string in output
          (typeof output === 'string' ? output : null);
        
        if (!modelUrl || typeof modelUrl !== 'string') {
          this.logger.error(`No model URL found in response: ${JSON.stringify(data)}`);
          throw new Error('TRIPO returned success but no model URL found');
        }
        
        this.logger.debug(`Extracted model URL: ${modelUrl}`);
        return modelUrl;
      }

      // Gérer tous les statuts d'erreur (failed, banned, cancelled, etc.)
      if (errorStatuses.includes(data.status)) {
        const errorMessage = data.message || data.error?.message || `Task ${data.status}`;
        this.logger.error(`TRIPO task ${taskId} ${data.status}: ${errorMessage}`);
        
        // Message d'erreur spécifique pour "banned" (contenu inapproprié)
        if (data.status === 'banned') {
          throw new Error(`TRIPO rejected the prompt (content policy violation). Try a different description.`);
        }
        
        throw new Error(`TRIPO task ${data.status}: ${errorMessage}`);
      }

      // Update progress (simulate progress between 10% and 80%)
      progressValue = Math.min(progressValue + 5, 75);
      onProgress?.('processing', progressValue);

      // Wait before next poll
      await this.sleep(this.POLL_INTERVAL);
    }

    throw new Error(`TRIPO task timeout after ${this.MAX_POLL_TIME / 1000}s`);
  }

  /**
   * Download the GLB model file
   */
  private async downloadModel(url: string, assetId: string): Promise<string> {
    // Ensure assets directory exists
    const assetsDir = path.resolve(this.assetsPath);
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const fileName = `${assetId}.glb`;
    const filePath = path.join(assetsDir, fileName);

    // Download file
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(filePath, response.data);

    // Return relative path for frontend
    return `/assets/${fileName}`;
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
