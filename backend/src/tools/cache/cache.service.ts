import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Cache Service
 * Manages caching of generated assets to avoid regeneration
 * 
 * Uses prompt hashing to identify similar assets
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cacheDir: string;
  private readonly cacheIndex: Map<string, CacheEntry> = new Map();
  private readonly cacheFilePath: string;

  constructor() {
    this.cacheDir = path.resolve('./assets');
    this.cacheFilePath = path.join(this.cacheDir, '.cache-index.json');
    this.loadCacheIndex();
  }

  /**
   * Generate a hash key from a prompt
   */
  private generateKey(prompt: string): string {
    const normalized = prompt.toLowerCase().trim();
    return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 12);
  }

  /**
   * Check if an asset is cached
   * @param prompt - The generation prompt
   * @param type - Asset type ('model' or 'skybox')
   * @returns Cached path or null if not cached
   */
  getCached(prompt: string, type: 'model' | 'skybox'): string | null {
    const key = `${type}_${this.generateKey(prompt)}`;
    const entry = this.cacheIndex.get(key);

    if (entry) {
      // Verify file still exists
      const fullPath = path.resolve(this.cacheDir, path.basename(entry.path));
      if (fs.existsSync(fullPath)) {
        this.logger.log(`Cache hit for ${type}: ${prompt.substring(0, 30)}...`);
        entry.lastAccessed = Date.now();
        this.saveCacheIndex();
        return entry.path;
      } else {
        // File missing, remove from cache
        this.cacheIndex.delete(key);
        this.saveCacheIndex();
      }
    }

    this.logger.debug(`Cache miss for ${type}: ${prompt.substring(0, 30)}...`);
    return null;
  }

  /**
   * Add an asset to the cache
   * @param prompt - The generation prompt
   * @param type - Asset type
   * @param assetPath - Path to the generated asset
   */
  addToCache(prompt: string, type: 'model' | 'skybox', assetPath: string): void {
    const key = `${type}_${this.generateKey(prompt)}`;

    this.cacheIndex.set(key, {
      prompt: prompt.substring(0, 200), // Store truncated prompt for debugging
      type,
      path: assetPath,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    });

    this.saveCacheIndex();
    this.logger.log(`Added to cache: ${type} - ${prompt.substring(0, 30)}...`);
  }

  /**
   * Clear old cache entries
   * @param maxAgeMs - Maximum age in milliseconds (default: 7 days)
   */
  clearOldEntries(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cacheIndex.entries()) {
      if (now - entry.lastAccessed > maxAgeMs) {
        this.cacheIndex.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.saveCacheIndex();
      this.logger.log(`Cleared ${cleared} old cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let totalSize = 0;
    let modelCount = 0;
    let skyboxCount = 0;

    for (const entry of this.cacheIndex.values()) {
      if (entry.type === 'model') modelCount++;
      else skyboxCount++;

      // Try to get file size
      try {
        const fullPath = path.resolve(this.cacheDir, path.basename(entry.path));
        const stats = fs.statSync(fullPath);
        totalSize += stats.size;
      } catch {
        // File might not exist
      }
    }

    return {
      totalEntries: this.cacheIndex.size,
      modelCount,
      skyboxCount,
      totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
    };
  }

  /**
   * Load cache index from disk
   */
  private loadCacheIndex(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.cacheFilePath, 'utf-8'));
        for (const [key, value] of Object.entries(data)) {
          this.cacheIndex.set(key, value as CacheEntry);
        }
        this.logger.log(`Loaded ${this.cacheIndex.size} cache entries`);
      }
    } catch (error) {
      this.logger.warn(`Failed to load cache index: ${error}`);
    }
  }

  /**
   * Save cache index to disk
   */
  private saveCacheIndex(): void {
    try {
      // Ensure directory exists
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      const data: Record<string, CacheEntry> = {};
      for (const [key, value] of this.cacheIndex.entries()) {
        data[key] = value;
      }
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
      this.logger.error(`Failed to save cache index: ${error}`);
    }
  }
}

interface CacheEntry {
  prompt: string;
  type: 'model' | 'skybox';
  path: string;
  createdAt: number;
  lastAccessed: number;
}

interface CacheStats {
  totalEntries: number;
  modelCount: number;
  skyboxCount: number;
  totalSizeMB: number;
}
