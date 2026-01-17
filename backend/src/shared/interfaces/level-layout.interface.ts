/**
 * LevelLayout - Output of the Level Layout Agent
 * 
 * SYSTÈME DE GRILLE SIMPLIFIÉ
 * ===========================
 * 
 * Architecture basée sur une grille 2D où :
 * - Chaque cellule = CELL_SIZE mètres (ex: 4m)
 * - Les pièces sont des rectangles alignés sur la grille
 * - Les corridors sont des segments droits horizontaux ou verticaux
 * - Tout est sur le même plan (Y = 0)
 * 
 * Cela garantit un alignement parfait et élimine tous les bugs de positionnement.
 */

/** Taille d'une cellule de grille en mètres */
export const GRID_CELL_SIZE = 4;

/** Largeur standard d'un corridor en cellules */
export const CORRIDOR_WIDTH_CELLS = 1;

/** Hauteur des murs en mètres */
export const WALL_HEIGHT = 4;

/**
 * Configuration de matériau pour une room
 * Permet de personnaliser l'apparence visuelle
 */
export interface RoomMaterial {
  /** Couleur du sol (hex, ex: "#3a5a3a") */
  floorColor?: string;
  /** Couleur des murs (hex, ex: "#2a4a2a") */
  wallColor?: string;
  /** Type de texture de sol (ex: "stone", "wood", "metal", "grass") */
  floorTexture?: string;
  /** Type de texture des murs (ex: "brick", "stone", "concrete") */
  wallTexture?: string;
}

/**
 * Une pièce sur la grille
 * Position et taille en coordonnées de grille (entiers)
 */
export interface GridRoom {
  /** Unique identifier (e.g., "room_001") */
  id: string;
  /** Room name */
  name: string;
  /** Position X sur la grille (coin supérieur gauche) */
  gridX: number;
  /** Position Y sur la grille (coin supérieur gauche) - Note: Y sur grille = Z en 3D */
  gridY: number;
  /** Largeur en cellules */
  width: number;
  /** Profondeur en cellules */
  height: number;
  /** Tags for categorization (e.g., ["entry"], ["goal"], ["mid"]) */
  tags: string[];
  /** Configuration de matériau personnalisée (optionnel) */
  material?: RoomMaterial;
}

/**
 * Un segment de corridor (ligne droite horizontale ou verticale)
 */
export interface CorridorSegment {
  /** Position de départ sur la grille */
  startX: number;
  startY: number;
  /** Position de fin sur la grille */
  endX: number;
  endY: number;
}

/**
 * Un corridor sur la grille
 * Peut être un segment droit OU un corridor en L (2 segments)
 * 
 * Pour un corridor simple (rooms alignées):
 *   - segments contient 1 élément
 * 
 * Pour un corridor en L (rooms non alignées):
 *   - segments contient 2 éléments formant un L
 */
export interface GridCorridor {
  /** Unique identifier */
  id: string;
  /** Source room ID */
  fromRoom: string;
  /** Destination room ID */
  toRoom: string;
  /** 
   * Liste des segments formant le corridor
   * - 1 segment = corridor droit
   * - 2 segments = corridor en L
   */
  segments: CorridorSegment[];
  /** Largeur en cellules (généralement 1) */
  widthCells: number;
  
  // Legacy fields (pour compatibilité, calculés automatiquement)
  /** @deprecated Utiliser segments[0].startX */
  startX?: number;
  /** @deprecated Utiliser segments[0].startY */
  startY?: number;
  /** @deprecated Utiliser segments[last].endX */
  endX?: number;
  /** @deprecated Utiliser segments[last].endY */
  endY?: number;
}

/**
 * Point d'intérêt sur la grille
 */
export interface GridPOI {
  /** Unique identifier */
  id: string;
  /** POI type */
  type: 'spawn' | 'goal' | 'treasure' | 'checkpoint';
  /** Room containing this POI */
  roomId: string;
  /** Position X relative au centre de la pièce (en cellules, peut être décimal) */
  offsetX: number;
  /** Position Y relative au centre de la pièce (en cellules, peut être décimal) */
  offsetY: number;
}

/**
 * Configuration de la grille
 */
export interface GridConfig {
  /** Taille d'une cellule en mètres */
  cellSize: number;
  /** Largeur totale de la grille en cellules */
  totalWidth: number;
  /** Hauteur totale de la grille en cellules */
  totalHeight: number;
}

/**
 * Données du niveau basées sur la grille
 */
export interface GridLevelData {
  /** Level name */
  name: string;
  /** Level type */
  type: string;
  /** Visual theme */
  theme: string;
  /** Grid configuration */
  grid: GridConfig;
  /** All rooms on the grid */
  rooms: GridRoom[];
  /** All corridors connecting rooms */
  corridors: GridCorridor[];
  /** Points of interest */
  pois: GridPOI[];
  /** Critical path: ordered list of room IDs from spawn to goal */
  criticalPath: string[];
}

/**
 * Output principal du Level Layout Agent
 */
export interface LevelLayout {
  level: GridLevelData;
}

// ============================================================================
// TYPES LEGACY (conservés pour compatibilité, mais plus utilisés en interne)
// ============================================================================

export interface LevelMetrics {
  unit: string;
  grid_size: number;
  player_height: number;
  corridor_width: number;
  door_width: number;
  door_height: number;
}

export interface Room {
  id: string;
  name: string;
  shape: 'rectangle' | 'L-shape' | 'circle';
  size: [number, number];
  elevation: number;
  tags: string[];
  connections: string[];
}

export interface Corridor {
  id: string;
  from: string;
  to: string;
  width: number;
  length: number;
  elevation_change: number;
}

export interface PointOfInterest {
  id: string;
  type: 'spawn' | 'goal' | 'treasure' | 'checkpoint';
  room_id: string;
  position_hint: 'center' | 'corner' | 'edge' | 'near_entrance';
}

export interface LevelFlow {
  critical_path: string[];
  loops: number;
  dead_ends: number;
}

export interface LevelData {
  name: string;
  type: string;
  theme: string;
  layout_style: string;
  metrics: LevelMetrics;
  rooms: Room[];
  corridors: Corridor[];
  points_of_interest: PointOfInterest[];
  flow: LevelFlow;
}
