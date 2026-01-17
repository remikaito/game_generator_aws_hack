import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { LevelsService, SavedLevel, SavedLevelData } from './levels.service';
import { SessionState } from '../shared/interfaces';

/**
 * DTO pour sauvegarder un level
 */
interface SaveLevelDto {
  sessionState: SessionState;
  existingId?: string;
}

/**
 * Controller REST pour la gestion des levels sauvegardés
 * 
 * Endpoints:
 * - GET /levels - Liste tous les levels
 * - GET /levels/:id - Charge un level complet
 * - POST /levels - Sauvegarde un nouveau level
 * - DELETE /levels/:id - Supprime un level
 */
@Controller('levels')
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  /**
   * Liste tous les levels sauvegardés
   * Retourne les métadonnées triées par date (plus récent en premier)
   */
  @Get()
  listLevels(): SavedLevel[] {
    return this.levelsService.listLevels();
  }

  /**
   * Charge les données complètes d'un level
   */
  @Get(':id')
  loadLevel(@Param('id') id: string): SavedLevelData {
    const level = this.levelsService.loadLevel(id);
    
    if (!level) {
      throw new NotFoundException(`Level ${id} not found`);
    }
    
    return level;
  }

  /**
   * Sauvegarde un level (nouveau ou mise à jour)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  saveLevel(@Body() dto: SaveLevelDto): SavedLevel {
    return this.levelsService.saveLevel(dto.sessionState, dto.existingId);
  }

  /**
   * Supprime un level
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLevel(@Param('id') id: string): void {
    const deleted = this.levelsService.deleteLevel(id);
    
    if (!deleted) {
      throw new NotFoundException(`Level ${id} not found`);
    }
  }
}
