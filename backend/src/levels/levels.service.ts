import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SessionState } from '../shared/interfaces';

/**
 * Interface pour un level sauvegardé
 */
export interface SavedLevel {
  /** ID unique du level */
  id: string;
  /** Titre du jeu */
  title: string;
  /** Genre du jeu */
  genre: string;
  /** Style visuel */
  style: string;
  /** Prompt original */
  prompt: string;
  /** Date de création */
  createdAt: number;
  /** Date de dernière modification */
  updatedAt: number;
  /** Chemin vers le fichier de données complet */
  dataPath: string;
  /** Nombre de rooms */
  roomCount: number;
  /** Nombre d'assets générés */
  assetCount: number;
  /** Thumbnail/preview (optionnel) */
  thumbnail?: string;
}

/**
 * Données complètes d'un level sauvegardé
 */
export interface SavedLevelData {
  /** Métadonnées */
  metadata: SavedLevel;
  /** État complet de la session */
  sessionState: SessionState;
}

/**
 * Service de gestion des levels sauvegardés
 * Stocke les levels en JSON dans un dossier local
 */
@Injectable()
export class LevelsService {
  private readonly logger = new Logger(LevelsService.name);
  private readonly levelsPath: string;
  private readonly indexPath: string;

  constructor(private configService: ConfigService) {
    // Dossier de stockage des levels
    this.levelsPath = path.resolve(
      this.configService.get<string>('LEVELS_PATH') || './saved-levels'
    );
    this.indexPath = path.join(this.levelsPath, 'index.json');

    // Créer le dossier s'il n'existe pas
    this.ensureDirectory();
  }

  /**
   * Crée le dossier de stockage s'il n'existe pas
   */
  private ensureDirectory(): void {
    if (!fs.existsSync(this.levelsPath)) {
      fs.mkdirSync(this.levelsPath, { recursive: true });
      this.logger.log(`Created levels directory: ${this.levelsPath}`);
    }

    // Créer l'index s'il n'existe pas
    if (!fs.existsSync(this.indexPath)) {
      fs.writeFileSync(this.indexPath, JSON.stringify([], null, 2));
    }
  }

  /**
   * Charge l'index des levels sauvegardés
   */
  private loadIndex(): SavedLevel[] {
    try {
      const content = fs.readFileSync(this.indexPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Failed to load index: ${error}`);
      return [];
    }
  }

  /**
   * Sauvegarde l'index
   */
  private saveIndex(levels: SavedLevel[]): void {
    fs.writeFileSync(this.indexPath, JSON.stringify(levels, null, 2));
  }

  /**
   * Liste tous les levels sauvegardés
   * @returns Liste des métadonnées des levels (sans les données complètes)
   */
  listLevels(): SavedLevel[] {
    const levels = this.loadIndex();
    // Trier par date de modification (plus récent en premier)
    return levels.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Sauvegarde un nouveau level ou met à jour un existant
   * @param sessionState - État complet de la session à sauvegarder
   * @param existingId - ID existant si mise à jour
   * @returns Les métadonnées du level sauvegardé
   */
  saveLevel(sessionState: SessionState, existingId?: string): SavedLevel {
    const now = Date.now();
    const id = existingId || `level_${uuidv4().substring(0, 8)}`;
    const dataFileName = `${id}.json`;
    const dataPath = path.join(this.levelsPath, dataFileName);

    // Extraire les métadonnées
    const metadata: SavedLevel = {
      id,
      title: sessionState.game_context?.game_title || 'Untitled Level',
      genre: sessionState.game_context?.genre || 'Unknown',
      style: sessionState.game_context?.style || 'Unknown',
      prompt: sessionState.prompt,
      createdAt: existingId ? this.getLevelCreatedAt(existingId) : now,
      updatedAt: now,
      dataPath: dataFileName,
      roomCount: (sessionState.level_layout as any)?.level?.rooms?.length || 0,
      assetCount: sessionState.assets?.filter(a => a.status === 'ready').length || 0,
    };

    // Sauvegarder les données complètes
    const levelData: SavedLevelData = {
      metadata,
      sessionState,
    };
    fs.writeFileSync(dataPath, JSON.stringify(levelData, null, 2));

    // Mettre à jour l'index
    const levels = this.loadIndex();
    const existingIndex = levels.findIndex(l => l.id === id);
    
    if (existingIndex >= 0) {
      levels[existingIndex] = metadata;
    } else {
      levels.push(metadata);
    }
    
    this.saveIndex(levels);
    this.logger.log(`Level saved: ${id} - "${metadata.title}"`);

    return metadata;
  }

  /**
   * Récupère la date de création d'un level existant
   */
  private getLevelCreatedAt(id: string): number {
    const levels = this.loadIndex();
    const existing = levels.find(l => l.id === id);
    return existing?.createdAt || Date.now();
  }

  /**
   * Charge les données complètes d'un level
   * @param id - ID du level à charger
   * @returns Les données complètes ou null si non trouvé
   */
  loadLevel(id: string): SavedLevelData | null {
    const levels = this.loadIndex();
    const level = levels.find(l => l.id === id);

    if (!level) {
      this.logger.warn(`Level not found: ${id}`);
      return null;
    }

    try {
      const dataPath = path.join(this.levelsPath, level.dataPath);
      const content = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Failed to load level ${id}: ${error}`);
      return null;
    }
  }

  /**
   * Supprime un level sauvegardé
   * @param id - ID du level à supprimer
   * @returns true si supprimé, false sinon
   */
  deleteLevel(id: string): boolean {
    const levels = this.loadIndex();
    const levelIndex = levels.findIndex(l => l.id === id);

    if (levelIndex < 0) {
      return false;
    }

    // Supprimer le fichier de données
    const level = levels[levelIndex];
    const dataPath = path.join(this.levelsPath, level.dataPath);
    
    try {
      if (fs.existsSync(dataPath)) {
        fs.unlinkSync(dataPath);
      }
    } catch (error) {
      this.logger.error(`Failed to delete level file: ${error}`);
    }

    // Mettre à jour l'index
    levels.splice(levelIndex, 1);
    this.saveIndex(levels);
    
    this.logger.log(`Level deleted: ${id}`);
    return true;
  }
}
