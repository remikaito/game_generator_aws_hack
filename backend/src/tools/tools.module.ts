import { Module } from '@nestjs/common';
import { TripoService } from './tripo/tripo.service';
import { SkyboxService } from './skybox/skybox.service';
import { CacheService } from './cache/cache.service';

/**
 * Tools module - External API integrations
 * Provides services for 3D model and skybox generation
 */
@Module({
  providers: [TripoService, SkyboxService, CacheService],
  exports: [TripoService, SkyboxService, CacheService],
})
export class ToolsModule {}
