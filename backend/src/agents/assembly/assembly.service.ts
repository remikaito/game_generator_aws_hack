import { Injectable, Logger } from '@nestjs/common';
import {
  GameContext,
  LevelLayout,
  GeneratedAsset,
  GeneratedSkybox,
  SceneConfig,
  SceneGeometry,
  SceneObject,
  GeometryRoom,
  GeometryCorridor,
  GeometryWall,
  GeometryPOI,
  GridRoom,
  GridCorridor,
  GridPOI,
  GridLevelData,
  GRID_CELL_SIZE,
  WALL_HEIGHT,
  CorridorSegment,
} from '../../shared/interfaces';

/**
 * Assembly Agent - Version Grille
 * 
 * Convertit le layout basé sur grille en géométrie 3D précise.
 * 
 * Formules de conversion simples:
 * - Position 3D X = gridX * CELL_SIZE
 * - Position 3D Z = gridY * CELL_SIZE (la grille Y devient Z en 3D)
 * - Position 3D Y = 0 (tout sur le même plan)
 * 
 * Input: GameContext, LevelLayout (grid-based), assets, skybox
 * Output: SceneConfig ready for Three.js rendering
 */
@Injectable()
export class AssemblyService {
  private readonly logger = new Logger(AssemblyService.name);

  // Taille d'une cellule en mètres
  private readonly CELL_SIZE = GRID_CELL_SIZE;

  // Hauteur des murs
  private readonly WALL_HEIGHT_M = WALL_HEIGHT;

  // Schéma de couleurs et textures par tag de pièce
  // Couleurs éclaircies pour une meilleure visibilité
  private readonly ROOM_STYLES = {
    entry: { 
      floorColor: '#5a8a5a', // Vert plus clair
      wallColor: '#4a7a4a',
      floorTexture: 'stone_floor',
      wallTexture: 'brick_wall',
    },
    goal: { 
      floorColor: '#8a5a5a', // Rouge plus clair
      wallColor: '#7a4a4a',
      floorTexture: 'dark_stone',
      wallTexture: 'dungeon_wall',
    },
    mid: { 
      floorColor: '#5a5a8a', // Bleu plus clair
      wallColor: '#4a4a7a',
      floorTexture: 'cobblestone',
      wallTexture: 'stone_wall',
    },
    secret: { 
      floorColor: '#8a7a5a', // Orange/brun plus clair
      wallColor: '#7a6a4a',
      floorTexture: 'old_wood',
      wallTexture: 'hidden_wall',
    },
    default: { 
      floorColor: '#6a6a7a', // Gris plus clair
      wallColor: '#5a5a6a',
      floorTexture: 'stone_floor',
      wallTexture: 'stone_wall',
    },
  };

  // Couleurs des marqueurs POI
  private readonly POI_COLORS = {
    spawn: '#00ff00',
    goal: '#ff0000',
    treasure: '#ffd700',
    checkpoint: '#00bfff',
  };

  /**
   * Assemble the complete scene configuration
   * Version grille: convertit les coordonnées de grille en géométrie 3D
   */
  assemble(
    context: GameContext,
    layout: LevelLayout,
    assets: GeneratedAsset[],
    skybox: GeneratedSkybox | undefined,
  ): SceneConfig {
    this.logger.log(`Assembling scene for "${context.game_title}"`);

    const level = layout.level as GridLevelData;

    // Build geometry from grid
    const geometry = this.buildGridGeometry(level);

    // Position objects (characters, props) at POIs
    const objects = this.positionGridObjects(level, assets, context);

    // Configure lighting
    const lighting = this.configureLighting(context);

    // Configure camera
    const camera = this.configureGridCamera(level);

    const sceneConfig: SceneConfig = {
      skybox_path: skybox?.status === 'ready' ? skybox.path : '',
      ambient_light: lighting.ambient,
      directional_light: lighting.directional,
      geometry,
      objects,
      camera,
    };

    this.logger.log(
      `Scene assembled: ${geometry.rooms.length} rooms, ${geometry.corridors.length} corridors, ${objects.length} objects`,
    );

    return sceneConfig;
  }

  // ============================================================================
  // CONVERSION GRILLE -> 3D
  // ============================================================================

  /**
   * Convertit une coordonnée de grille X en position 3D X
   */
  private gridToWorldX(gridX: number): number {
    return gridX * this.CELL_SIZE;
  }

  /**
   * Convertit une coordonnée de grille Y en position 3D Z
   * (La grille Y devient Z en 3D car Y en 3D = hauteur)
   */
  private gridToWorldZ(gridY: number): number {
    return gridY * this.CELL_SIZE;
  }

  /**
   * Convertit une taille en cellules en mètres
   */
  private cellsToMeters(cells: number): number {
    return cells * this.CELL_SIZE;
  }

  // ============================================================================
  // CONSTRUCTION DE LA GÉOMÉTRIE
  // ============================================================================

  /**
   * Build scene geometry from grid-based layout
   * Conversion directe et précise des cellules en mètres
   */
  private buildGridGeometry(level: GridLevelData): SceneGeometry {
    const rooms = this.buildGridRooms(level.rooms);
    const corridors = this.buildGridCorridors(level.corridors);
    const walls = this.buildGridWalls(level.rooms, level.corridors);
    const poi_markers = this.buildGridPOIs(level.pois, level.rooms);

    return { rooms, corridors, walls, poi_markers };
  }

  /**
   * Build room geometries from grid rooms
   * Position = centre de la pièce
   * Utilise les matériaux personnalisés si définis, sinon les styles par défaut
   */
  private buildGridRooms(gridRooms: GridRoom[]): GeometryRoom[] {
    return gridRooms.map((room) => {
      // Style par défaut basé sur les tags
      const defaultStyle = this.getRoomStyle(room.tags || []);
      
      // Matériaux personnalisés (prioritaires sur les styles par défaut)
      const material = room.material || {};
      
      // Position du centre de la pièce en 3D
      const centerX = this.gridToWorldX(room.gridX + room.width / 2);
      const centerZ = this.gridToWorldZ(room.gridY + room.height / 2);
      
      // Taille en mètres
      const widthM = this.cellsToMeters(room.width);
      const depthM = this.cellsToMeters(room.height);

      return {
        id: room.id,
        position: [centerX, 0, centerZ] as [number, number, number],
        size: [widthM, 0.2, depthM] as [number, number, number],
        // Couleur du sol: matériau personnalisé > style par défaut
        color: material.floorColor || defaultStyle.floorColor,
        tags: room.tags || [],
        // Textures: matériau personnalisé > style par défaut
        floorTexture: material.floorTexture || defaultStyle.floorTexture,
        wallTexture: material.wallTexture || defaultStyle.wallTexture,
        // Couleur des murs: matériau personnalisé > style par défaut
        wallColor: material.wallColor || defaultStyle.wallColor,
      };
    });
  }

  /**
   * Build corridor geometries from grid corridors
   * Supporte les corridors droits (1 segment) et en L (2 segments)
   */
  private buildGridCorridors(gridCorridors: GridCorridor[]): GeometryCorridor[] {
    return gridCorridors.map((corridor) => {
      // Largeur du corridor en mètres
      const widthM = this.cellsToMeters(corridor.widthCells || 1);

      // Convertir les segments de grille en segments 3D
      const segments = this.convertCorridorSegments(corridor);

      // Legacy: premier et dernier point pour compatibilité
      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];

      return {
        id: corridor.id,
        segments,
        width: widthM,
        color: '#3a3a3a',
        floorTexture: 'stone_floor',
        // Legacy fields
        start: firstSegment.start,
        end: lastSegment.end,
      };
    });
  }

  /**
   * Convertit les segments de corridor de grille en coordonnées 3D
   */
  private convertCorridorSegments(
    corridor: GridCorridor,
  ): Array<{ start: [number, number, number]; end: [number, number, number] }> {
    // Si le corridor a des segments définis, les utiliser
    if (corridor.segments && corridor.segments.length > 0) {
      return corridor.segments.map((seg: CorridorSegment) => ({
        start: [
          this.gridToWorldX(seg.startX),
          0,
          this.gridToWorldZ(seg.startY),
        ] as [number, number, number],
        end: [
          this.gridToWorldX(seg.endX),
          0,
          this.gridToWorldZ(seg.endY),
        ] as [number, number, number],
      }));
    }

    // Fallback: utiliser les champs legacy startX/startY/endX/endY
    const startX = corridor.startX ?? 0;
    const startY = corridor.startY ?? 0;
    const endX = corridor.endX ?? 0;
    const endY = corridor.endY ?? 0;

    return [{
      start: [
        this.gridToWorldX(startX),
        0,
        this.gridToWorldZ(startY),
      ] as [number, number, number],
      end: [
        this.gridToWorldX(endX),
        0,
        this.gridToWorldZ(endY),
      ] as [number, number, number],
    }];
  }

  /**
   * Build walls around rooms with openings for corridors
   */
  private buildGridWalls(
    gridRooms: GridRoom[],
    gridCorridors: GridCorridor[],
  ): GeometryWall[] {
    const walls: GeometryWall[] = [];
    let wallId = 0;

    // Pour chaque pièce, créer les 4 murs avec des ouvertures pour les corridors
    for (const room of gridRooms) {
      const style = this.getRoomStyle(room.tags || []);
      
      // Coins de la pièce en coordonnées 3D
      const minX = this.gridToWorldX(room.gridX);
      const maxX = this.gridToWorldX(room.gridX + room.width);
      const minZ = this.gridToWorldZ(room.gridY);
      const maxZ = this.gridToWorldZ(room.gridY + room.height);

      // Trouver les ouvertures pour cette pièce
      const openings = this.findRoomOpenings(room, gridCorridors);

      // Mur Nord (Z min)
      const northOpenings = openings.filter(o => o.side === 'north');
      this.createWallWithOpenings(
        walls, wallId, 
        [minX, 0, minZ], [maxX, 0, minZ], 
        'x', northOpenings, style.wallColor
      );
      wallId += northOpenings.length + 1;

      // Mur Sud (Z max)
      const southOpenings = openings.filter(o => o.side === 'south');
      this.createWallWithOpenings(
        walls, wallId,
        [minX, 0, maxZ], [maxX, 0, maxZ],
        'x', southOpenings, style.wallColor
      );
      wallId += southOpenings.length + 1;

      // Mur Ouest (X min)
      const westOpenings = openings.filter(o => o.side === 'west');
      this.createWallWithOpenings(
        walls, wallId,
        [minX, 0, minZ], [minX, 0, maxZ],
        'z', westOpenings, style.wallColor
      );
      wallId += westOpenings.length + 1;

      // Mur Est (X max)
      const eastOpenings = openings.filter(o => o.side === 'east');
      this.createWallWithOpenings(
        walls, wallId,
        [maxX, 0, minZ], [maxX, 0, maxZ],
        'z', eastOpenings, style.wallColor
      );
      wallId += eastOpenings.length + 1;
    }

    return walls;
  }

  /**
   * Trouve les ouvertures (connexions de corridors) pour une pièce
   * Parcourt tous les segments de chaque corridor pour trouver les connexions
   */
  private findRoomOpenings(
    room: GridRoom,
    corridors: GridCorridor[],
  ): Array<{ side: 'north' | 'south' | 'east' | 'west'; position: number; width: number }> {
    const openings: Array<{ side: 'north' | 'south' | 'east' | 'west'; position: number; width: number }> = [];

    const roomMinX = room.gridX;
    const roomMaxX = room.gridX + room.width;
    const roomMinY = room.gridY;
    const roomMaxY = room.gridY + room.height;

    for (const corridor of corridors) {
      // Ne traiter que les corridors qui connectent cette room
      if (corridor.fromRoom !== room.id && corridor.toRoom !== room.id) {
        continue;
      }

      const corridorWidthM = this.cellsToMeters(corridor.widthCells || 1);
      
      // Obtenir les segments (utiliser segments ou créer depuis legacy)
      const segments = corridor.segments || [{
        startX: corridor.startX ?? 0,
        startY: corridor.startY ?? 0,
        endX: corridor.endX ?? 0,
        endY: corridor.endY ?? 0,
      }];

      // Analyser chaque segment pour trouver les connexions avec cette room
      for (const seg of segments) {
        const isVertical = seg.startX === seg.endX;

        if (isVertical) {
          // Segment vertical: vérifie les bords nord/sud
          const segX = seg.startX;
          
          // Le segment doit être dans la plage X de la room
          if (segX >= roomMinX && segX <= roomMaxX) {
            const positionM = this.gridToWorldX(segX);
            
            // Bord nord (segment touche le haut de la room)
            if (seg.startY === roomMinY || seg.endY === roomMinY) {
              openings.push({ side: 'north', position: positionM, width: corridorWidthM });
            }
            // Bord sud (segment touche le bas de la room)
            if (seg.startY === roomMaxY || seg.endY === roomMaxY) {
              openings.push({ side: 'south', position: positionM, width: corridorWidthM });
            }
          }
        } else {
          // Segment horizontal: vérifie les bords est/ouest
          const segY = seg.startY;
          
          // Le segment doit être dans la plage Y de la room
          if (segY >= roomMinY && segY <= roomMaxY) {
            const positionM = this.gridToWorldZ(segY);
            
            // Bord ouest (segment touche le côté gauche de la room)
            if (seg.startX === roomMinX || seg.endX === roomMinX) {
              openings.push({ side: 'west', position: positionM, width: corridorWidthM });
            }
            // Bord est (segment touche le côté droit de la room)
            if (seg.startX === roomMaxX || seg.endX === roomMaxX) {
              openings.push({ side: 'east', position: positionM, width: corridorWidthM });
            }
          }
        }
      }
    }

    return openings;
  }

  /**
   * Crée un mur avec des ouvertures
   */
  private createWallWithOpenings(
    walls: GeometryWall[],
    startId: number,
    start: [number, number, number],
    end: [number, number, number],
    axis: 'x' | 'z',
    openings: Array<{ position: number; width: number }>,
    color: string,
  ): void {
    if (openings.length === 0) {
      // Pas d'ouverture: mur complet
      walls.push({
        id: `wall_${startId}`,
        start,
        end,
        height: this.WALL_HEIGHT_M,
        color,
      });
      return;
    }

    // Trier les ouvertures par position
    const sortedOpenings = [...openings].sort((a, b) => a.position - b.position);
    
    const wallStart = axis === 'x' ? start[0] : start[2];
    const wallEnd = axis === 'x' ? end[0] : end[2];
    let currentPos = wallStart;
    let id = startId;

    for (const opening of sortedOpenings) {
      const openingStart = opening.position - opening.width / 2;
      const openingEnd = opening.position + opening.width / 2;

      // Segment avant l'ouverture
      if (currentPos < openingStart) {
        const segStart: [number, number, number] = axis === 'x' 
          ? [currentPos, start[1], start[2]]
          : [start[0], start[1], currentPos];
        const segEnd: [number, number, number] = axis === 'x'
          ? [openingStart, end[1], end[2]]
          : [end[0], end[1], openingStart];

        walls.push({
          id: `wall_${id++}`,
          start: segStart,
          end: segEnd,
          height: this.WALL_HEIGHT_M,
          color,
        });
      }

      currentPos = Math.max(currentPos, openingEnd);
    }

    // Segment après la dernière ouverture
    if (currentPos < wallEnd) {
      const segStart: [number, number, number] = axis === 'x'
        ? [currentPos, start[1], start[2]]
        : [start[0], start[1], currentPos];
      const segEnd: [number, number, number] = axis === 'x'
        ? [wallEnd, end[1], end[2]]
        : [end[0], end[1], wallEnd];

      walls.push({
        id: `wall_${id}`,
        start: segStart,
        end: segEnd,
        height: this.WALL_HEIGHT_M,
        color,
      });
    }
  }

  /**
   * Build POI markers
   */
  private buildGridPOIs(pois: GridPOI[], rooms: GridRoom[]): GeometryPOI[] {
    return pois.map((poi) => {
      const room = rooms.find(r => r.id === poi.roomId);
      if (!room) {
        return {
          id: poi.id,
          type: poi.type,
          position: [0, 0.1, 0] as [number, number, number],
          color: this.POI_COLORS[poi.type] || '#ffffff',
          label: poi.type.charAt(0).toUpperCase() + poi.type.slice(1),
          roomId: poi.roomId,
        };
      }

      // Centre de la pièce (ignorer les offsets pour être toujours centré)
      const centerX = this.gridToWorldX(room.gridX + room.width / 2);
      const centerZ = this.gridToWorldZ(room.gridY + room.height / 2);

      return {
        id: poi.id,
        type: poi.type,
        position: [centerX, 0.1, centerZ] as [number, number, number],
        color: this.POI_COLORS[poi.type] || '#ffffff',
        label: poi.type.charAt(0).toUpperCase() + poi.type.slice(1),
        roomId: poi.roomId,
      };
    });
  }

  // ============================================================================
  // POSITIONNEMENT DES OBJETS
  // ============================================================================

  // Configuration des tailles par défaut pour les assets
  // Les modèles Tripo sont généralement petits (~1m), on les agrandit pour le niveau
  private readonly ASSET_SCALES = {
    protagonist: [3, 3, 3] as [number, number, number],   // Personnage joueur: ~3m de haut
    antagonist: [5, 5, 5] as [number, number, number],    // Boss/ennemi principal: ~5m de haut
    npc: [2.5, 2.5, 2.5] as [number, number, number],     // NPCs: ~2.5m de haut
    prop: [2, 2, 2] as [number, number, number],          // Props/objets: ~2m
  };

  /**
   * Position 3D objects at appropriate POIs
   * Les assets sont agrandis et positionnés pour être bien visibles dans le niveau
   */
  private positionGridObjects(
    level: GridLevelData,
    assets: GeneratedAsset[],
    context: GameContext,
  ): SceneObject[] {
    const objects: SceneObject[] = [];

    // Trouver les POIs spawn et goal
    const spawnPOI = level.pois.find(p => p.type === 'spawn');
    const goalPOI = level.pois.find(p => p.type === 'goal');

    // Map des pièces pour accès rapide
    const roomsMap = new Map(level.rooms.map(r => [r.id, r]));

    // Compteur pour espacer les props dans la même pièce
    const roomPropCount = new Map<string, number>();

    for (const asset of assets) {
      if (asset.status !== 'ready' || !asset.path) continue;

      const character = context.characters.find(c => c.id === asset.id);
      const prop = context.props?.find(p => p.id === asset.id);

      let position: [number, number, number] = [0, 0, 0];
      let scale: [number, number, number] = this.ASSET_SCALES.prop;
      let poiId: string | undefined;

      if (character) {
        if (character.role === 'protagonist' && spawnPOI) {
          const room = roomsMap.get(spawnPOI.roomId);
          if (room) {
            position = [
              this.gridToWorldX(room.gridX + room.width / 2),
              0,
              this.gridToWorldZ(room.gridY + room.height / 2),
            ];
            scale = this.ASSET_SCALES.protagonist;
            poiId = spawnPOI.id;
          }
        } else if (character.role === 'antagonist' && goalPOI) {
          const room = roomsMap.get(goalPOI.roomId);
          if (room) {
            position = [
              this.gridToWorldX(room.gridX + room.width / 2),
              0,
              this.gridToWorldZ(room.gridY + room.height / 2),
            ];
            scale = this.ASSET_SCALES.antagonist;
            poiId = goalPOI.id;
          }
        } else {
          // NPCs dans les pièces du milieu
          const midRoom = level.rooms.find(r => r.tags?.includes('mid'));
          if (midRoom) {
            position = [
              this.gridToWorldX(midRoom.gridX + midRoom.width / 2) + 3,
              0,
              this.gridToWorldZ(midRoom.gridY + midRoom.height / 2),
            ];
            scale = this.ASSET_SCALES.npc;
          }
        }
      } else if (prop) {
        // Props basés sur placement_tags
        const targetTag = prop.placement_tags?.[0] || 'mid';
        const targetRoom = level.rooms.find(r => r.tags?.includes(targetTag));
        if (targetRoom) {
          // Espacement des props dans la même pièce
          const propIndex = roomPropCount.get(targetRoom.id) || 0;
          roomPropCount.set(targetRoom.id, propIndex + 1);
          
          // Positionner les props en arc autour du centre de la pièce
          const angle = (propIndex * Math.PI / 3) - Math.PI / 6; // ~60° d'espacement
          const radius = 3; // Distance du centre
          
          position = [
            this.gridToWorldX(targetRoom.gridX + targetRoom.width / 2) + Math.cos(angle) * radius,
            0,
            this.gridToWorldZ(targetRoom.gridY + targetRoom.height / 2) + Math.sin(angle) * radius,
          ];
          scale = this.ASSET_SCALES.prop;
        }
      }

      objects.push({
        id: `obj_${asset.id}`,
        reference_id: asset.id,
        name: asset.name,
        model_path: asset.path,
        position,
        rotation: [0, 0, 0],
        scale,
        poi_id: poiId,
      });
    }

    return objects;
  }

  // ============================================================================
  // CONFIGURATION CAMÉRA
  // ============================================================================

  /**
   * Configure camera based on grid level layout
   */
  private configureGridCamera(level: GridLevelData): SceneConfig['camera'] {
    // Calculer le centre et les limites du niveau
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const room of level.rooms) {
      const roomMinX = this.gridToWorldX(room.gridX);
      const roomMaxX = this.gridToWorldX(room.gridX + room.width);
      const roomMinZ = this.gridToWorldZ(room.gridY);
      const roomMaxZ = this.gridToWorldZ(room.gridY + room.height);

      minX = Math.min(minX, roomMinX);
      maxX = Math.max(maxX, roomMaxX);
      minZ = Math.min(minZ, roomMinZ);
      maxZ = Math.max(maxZ, roomMaxZ);
    }

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const levelWidth = maxX - minX;
    const levelDepth = maxZ - minZ;

    // Position caméra pour voir tout le niveau
    const cameraHeight = Math.max(30, Math.max(levelWidth, levelDepth) * 0.8);
    const cameraDistance = Math.max(40, levelDepth);

    return {
      default: {
        position: [centerX, cameraHeight, maxZ + cameraDistance * 0.5],
        look_at: [centerX, 0, centerZ],
        fov: 60,
      },
      orbit_target: [centerX, 0, centerZ],
      min_distance: 10,
      max_distance: cameraDistance * 2,
    };
  }

  // ============================================================================
  // UTILITAIRES
  // ============================================================================

  /**
   * Get room style based on tags
   */
  private getRoomStyle(tags: string[]): typeof this.ROOM_STYLES.default {
    for (const tag of tags) {
      if (tag in this.ROOM_STYLES) {
        return this.ROOM_STYLES[tag as keyof typeof this.ROOM_STYLES];
      }
    }
    return this.ROOM_STYLES.default;
  }

  /**
   * Configure lighting based on environment
   * Valeurs augmentées pour une meilleure visibilité globale
   */
  private configureLighting(context: GameContext): {
    ambient: { color: string; intensity: number };
    directional: { color: string; intensity: number; position: [number, number, number] };
  } {
    const { lighting, time_of_day } = context.environment;
    const combined = `${lighting} ${time_of_day}`.toLowerCase();

    // Determine ambient light - intensités augmentées pour meilleure visibilité
    let ambientColor = '#ffffff';
    let ambientIntensity = 0.8; // Augmenté de 0.4 à 0.8

    if (combined.includes('dark') || combined.includes('night')) {
      ambientColor = '#4a4a6e'; // Plus clair que #1a1a2e
      ambientIntensity = 0.5; // Augmenté de 0.2 à 0.5
    } else if (combined.includes('torch') || combined.includes('fire')) {
      ambientColor = '#6a5a4a'; // Plus clair que #3a2a1a
      ambientIntensity = 0.6; // Augmenté de 0.3 à 0.6
    } else if (combined.includes('neon') || combined.includes('cyber')) {
      ambientColor = '#4a4a6a'; // Plus clair que #1a1a3a
      ambientIntensity = 0.6; // Augmenté de 0.3 à 0.6
    }

    // Determine directional light - intensités augmentées
    let dirColor = '#ffffff';
    let dirIntensity = 1.2; // Augmenté de 0.8 à 1.2
    let dirPosition: [number, number, number] = [10, 20, 10];

    if (combined.includes('night') || combined.includes('moon')) {
      dirColor = '#8aacdf'; // Plus clair que #6a8caf
      dirIntensity = 0.7; // Augmenté de 0.4 à 0.7
    } else if (combined.includes('dawn') || combined.includes('dusk')) {
      dirColor = '#ffcc77'; // Plus clair que #ffaa55
      dirIntensity = 0.9; // Augmenté de 0.6 à 0.9
    } else if (combined.includes('indoor')) {
      dirIntensity = 0.8; // Augmenté de 0.3 à 0.8
    }

    return {
      ambient: { color: ambientColor, intensity: ambientIntensity },
      directional: { color: dirColor, intensity: dirIntensity, position: dirPosition },
    };
  }
}
