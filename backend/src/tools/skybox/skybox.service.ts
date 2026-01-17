import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Blockade Labs Skybox AI Service
 * Generates 360° skybox images from text prompts
 * 
 * API Documentation: https://docs.blockadelabs.com/
 */
@Injectable()
export class SkyboxService implements OnModuleInit {
  private readonly logger = new Logger(SkyboxService.name);
  private readonly client: AxiosInstance;
  private readonly assetsPath: string;

  // API Configuration
  private readonly BASE_URL = 'https://backend.blockadelabs.com/api/v1';
  private readonly POLL_INTERVAL = 2000; // 2 seconds
  private readonly MAX_POLL_TIME = 60000; // 1 minute timeout

  // Available style IDs (Model 3 - Updated January 2026)
  // Full list available at: GET /api/v1/skybox/styles?model_version=3
  static readonly STYLES = {
    // Model 3 styles (current)
    PHOTOREAL: 67,           // M3 Photoreal - realistic photography
    ANIME: 43,               // M3 Anime art style
    DIGITAL_PAINTING: 58,    // M3 Digital Painting
    FANTASY_LANDSCAPE: 57,   // M3 Fantasy Landscape
    SCI_FI: 59,              // M3 Sci-Fi
    DREAMLIKE: 60,           // M3 Dreamlike/Surreal
    LOW_POLY: 61,            // M3 Low Poly game style
    
    // Fallback - most versatile
    DEFAULT: 67,             // Photoreal as default
  };

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('BLOCKADE_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('BLOCKADE_API_KEY not found in environment variables');
    } else {
      // Log key info for debugging (first 8 chars only for security)
      const keyPreview = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
      this.logger.log(`BLOCKADE_API_KEY loaded: ${keyPreview} (length: ${apiKey.length})`);
    }

    this.client = axios.create({
      baseURL: this.BASE_URL,
      headers: {
        'x-api-key': apiKey?.trim() || '', // trim() pour enlever espaces parasites
        'Content-Type': 'application/json',
      },
    });

    this.assetsPath = this.configService.get<string>('ASSETS_PATH') || '../assets';
  }

  /**
   * Called when the module is initialized - tests API connection
   */
  async onModuleInit() {
    this.logger.log('Initializing SkyboxService - testing API connection...');
    const result = await this.testConnection();
    
    if (result.success) {
      this.logger.log(`✓ Blockade Labs API: ${result.message}`);
    } else {
      this.logger.error(`✗ Blockade Labs API: ${result.message}`);
    }
  }

  /**
   * Test API connection by fetching available styles
   * This does NOT consume credits - useful for debugging
   */
  async testConnection(): Promise<{ success: boolean; message: string; styles?: any[] }> {
    try {
      this.logger.log('Testing Blockade Labs API connection...');
      
      const response = await this.client.get('/skybox/styles');
      
      this.logger.log(`API test successful - ${response.data.length} styles available`);
      return {
        success: true,
        message: `Connected! ${response.data.length} styles available`,
        styles: response.data.slice(0, 5), // Return first 5 styles as sample
      };
    } catch (error: any) {
      const status = error.response?.status;
      const data = error.response?.data;
      
      this.logger.error(`API test failed: ${status} - ${JSON.stringify(data)}`);
      
      if (status === 403) {
        return {
          success: false,
          message: `403 Forbidden - Clé API invalide ou expirée. Vérifiez BLOCKADE_API_KEY dans .env`,
        };
      }
      if (status === 401) {
        return {
          success: false,
          message: `401 Unauthorized - Clé API manquante ou incorrecte`,
        };
      }
      
      return {
        success: false,
        message: `Erreur ${status}: ${data?.message || error.message}`,
      };
    }
  }

  /**
   * Generate a skybox from a text prompt
   * @param prompt - Description of the skybox to generate
   * @param styleId - Style ID (use STYLES constants)
   * @param onProgress - Callback for progress updates
   * @returns Path to the downloaded skybox image
   */
  async generateSkybox(
    prompt: string,
    styleId: number = SkyboxService.STYLES.FANTASY_LANDSCAPE,
    onProgress?: (status: string, progress: number) => void,
  ): Promise<string> {
    try {
      this.logger.log(`Starting skybox generation for: ${prompt.substring(0, 50)}...`);
      onProgress?.('starting', 0);

      // Step 1: Create skybox request
      const skyboxId = await this.createSkybox(prompt, styleId);
      this.logger.debug(`Skybox created: ${skyboxId}`);
      onProgress?.('processing', 20);

      // Step 2: Poll for completion
      const imageUrl = await this.pollSkybox(skyboxId, onProgress);
      this.logger.debug(`Skybox ready: ${imageUrl}`);
      onProgress?.('downloading', 80);

      // Step 3: Download image
      const filePath = await this.downloadSkybox(imageUrl);
      this.logger.log(`Skybox saved: ${filePath}`);
      onProgress?.('completed', 100);

      return filePath;
    } catch (error) {
      this.logger.error(`Failed to generate skybox: ${error}`);
      throw error;
    }
  }

  /**
   * Create a skybox generation request
   */
  private async createSkybox(prompt: string, styleId: number): Promise<number> {
    try {
      const response = await this.client.post('/skybox', {
        prompt: prompt,
        skybox_style_id: styleId,
      });

      this.logger.debug(`Skybox creation response: ${JSON.stringify(response.data)}`);
      
      // Response structure: { id, status, ... } directly
      return response.data.id;
    } catch (error: any) {
      // Log detailed error for debugging
      if (error.response) {
        this.logger.error(`Skybox API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Poll skybox status until completion
   * API: GET /imagine/requests/{id}
   */
  private async pollSkybox(
    skyboxId: number,
    onProgress?: (status: string, progress: number) => void,
  ): Promise<string> {
    const startTime = Date.now();
    let progressValue = 20;

    while (Date.now() - startTime < this.MAX_POLL_TIME) {
      const response = await this.client.get(`/imagine/requests/${skyboxId}`);
      
      // Response is directly the data object (not nested in .request)
      const data = response.data.request || response.data;

      this.logger.debug(`Skybox ${skyboxId} status: ${data.status}`);

      if (data.status === 'complete') {
        if (!data.file_url) {
          this.logger.error(`Skybox complete but no file_url: ${JSON.stringify(data)}`);
          throw new Error('Skybox complete but no file URL returned');
        }
        return data.file_url;
      }

      if (data.status === 'error' || data.status === 'abort') {
        throw new Error(`Skybox generation failed: ${data.error_message || 'Unknown error'}`);
      }

      // Update progress
      progressValue = Math.min(progressValue + 10, 75);
      onProgress?.('processing', progressValue);

      await this.sleep(this.POLL_INTERVAL);
    }

    throw new Error(`Skybox generation timeout after ${this.MAX_POLL_TIME / 1000}s`);
  }

  /**
   * Download the skybox image
   */
  private async downloadSkybox(url: string): Promise<string> {
    // Ensure assets directory exists
    const assetsDir = path.resolve(this.assetsPath);
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const fileName = `skybox_${Date.now()}.jpg`;
    const filePath = path.join(assetsDir, fileName);

    // Download file
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(filePath, response.data);

    // Return relative path for frontend
    return `/assets/${fileName}`;
  }

  /**
   * Get the appropriate style ID based on game mood/style
   * Updated for Model 3 styles
   */
  static getStyleForMood(mood: string, style: string): number {
    const combined = `${mood} ${style}`.toLowerCase();

    // Sci-Fi / Futuristic
    if (combined.includes('sci-fi') || combined.includes('future') || combined.includes('cyber') || combined.includes('space')) {
      return SkyboxService.STYLES.SCI_FI;
    }
    
    // Anime / Cartoon
    if (combined.includes('anime') || combined.includes('cartoon') || combined.includes('manga')) {
      return SkyboxService.STYLES.ANIME;
    }
    
    // Low Poly / Game style
    if (combined.includes('low poly') || combined.includes('lowpoly') || combined.includes('voxel') || combined.includes('pixel')) {
      return SkyboxService.STYLES.LOW_POLY;
    }
    
    // Realistic / Photo
    if (combined.includes('realistic') || combined.includes('photo') || combined.includes('real')) {
      return SkyboxService.STYLES.PHOTOREAL;
    }
    
    // Dreamlike / Surreal
    if (combined.includes('dream') || combined.includes('surreal') || combined.includes('abstract')) {
      return SkyboxService.STYLES.DREAMLIKE;
    }
    
    // Digital / Stylized
    if (combined.includes('digital') || combined.includes('stylized') || combined.includes('painted')) {
      return SkyboxService.STYLES.DIGITAL_PAINTING;
    }
    
    // Fantasy / Medieval / RPG
    if (combined.includes('fantasy') || combined.includes('medieval') || combined.includes('magic') || combined.includes('rpg')) {
      return SkyboxService.STYLES.FANTASY_LANDSCAPE;
    }

    // Default to fantasy landscape for most game scenarios
    return SkyboxService.STYLES.FANTASY_LANDSCAPE;
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
