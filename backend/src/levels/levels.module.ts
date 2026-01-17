import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LevelsService } from './levels.service';
import { LevelsController } from './levels.controller';

/**
 * Module de gestion des levels sauvegardés
 * 
 * Permet de :
 * - Sauvegarder un level généré
 * - Lister les levels sauvegardés
 * - Charger un level existant
 * - Supprimer un level
 */
@Module({
  imports: [ConfigModule],
  controllers: [LevelsController],
  providers: [LevelsService],
  exports: [LevelsService],
})
export class LevelsModule {}
