import { Injectable, Logger } from '@nestjs/common';
import { ClaudeService } from '../../shared/claude/claude.service';
import { 
  GameContext, 
  LevelLayout, 
  GridRoom, 
  GridCorridor, 
  GridPOI,
  GridLevelData,
  GRID_CELL_SIZE,
  CorridorSegment,
} from '../../shared/interfaces';

/**
 * Level Layout Agent - Version Grille
 * 
 * Génère l'architecture spatiale du niveau sur une grille 2D simple.
 * Toutes les positions sont des entiers (cellules de grille).
 * Cela garantit un alignement parfait des pièces et corridors.
 * 
 * Input: GameContext with level intent
 * Output: LevelLayout avec grille de pièces et corridors
 */
@Injectable()
export class LevelLayoutService {
  private readonly logger = new Logger(LevelLayoutService.name);

  // System prompt simplifié pour le système de grille
  private readonly SYSTEM_PROMPT = `You are a Level Layout Generator using a simple 2D GRID system.

GRID RULES:
- Each cell = ${GRID_CELL_SIZE} meters
- All positions and sizes are INTEGER cell coordinates
- Rooms are rectangles defined by (gridX, gridY, width, height)
- Rooms MUST NOT overlap
- Corridors connect adjacent rooms with straight horizontal or vertical segments
- Everything is on the same plane (no elevation)

OUTPUT FORMAT (JSON only, no markdown):
{
  "level": {
    "name": "Level Name",
    "type": "dungeon/arena/castle/etc",
    "theme": "Visual theme",
    "grid": {
      "cellSize": ${GRID_CELL_SIZE},
      "totalWidth": 30,
      "totalHeight": 40
    },
    "rooms": [
      {
        "id": "room_1",
        "name": "Entry Hall",
        "gridX": 10,
        "gridY": 0,
        "width": 4,
        "height": 3,
        "tags": ["entry"]
      }
    ],
    "corridors": [
      {
        "id": "corr_1",
        "fromRoom": "room_1",
        "toRoom": "room_2",
        "startX": 12,
        "startY": 3,
        "endX": 12,
        "endY": 5,
        "widthCells": 1
      }
    ],
    "pois": [
      {
        "id": "poi_spawn",
        "type": "spawn",
        "roomId": "room_1",
        "offsetX": 0,
        "offsetY": 0
      }
    ],
    "criticalPath": ["room_1", "room_2", "room_3"]
  }
}

IMPORTANT RULES:
1. Rooms: 3-5 for small, 5-8 for medium scale
2. Room sizes: minimum 3x3, maximum 8x6 cells
3. First room: tag "entry", has spawn POI
4. Last room: tag "goal", has goal POI
5. CRITICAL: Corridors must be STRAIGHT (startX=endX for vertical, startY=endY for horizontal)
6. Corridor start/end must be at room edges
7. Leave space between rooms for corridors (at least 2 cells gap)
8. Layout rooms vertically (increasing Y) along the critical path

CORRIDOR PLACEMENT:
- For vertical corridor between room A (above) and room B (below):
  - startY = roomA.gridY + roomA.height (bottom edge of A)
  - endY = roomB.gridY (top edge of B)
  - startX = endX = a value within both rooms' X range
- For horizontal corridor:
  - startX = roomA.gridX + roomA.width (right edge of A)
  - endX = roomB.gridX (left edge of B)
  - startY = endY = a value within both rooms' Y range`;

  constructor(private claudeService: ClaudeService) {}

  /**
   * Generate level layout from game context
   * @param context - GameContext with level intent
   * @returns LevelLayout with grid-based structure
   */
  async generateLayout(context: GameContext): Promise<LevelLayout> {
    this.logger.log(`Generating grid layout for: "${context.game_title}"`);

    try {
      const userMessage = `Generate a GRID-BASED level layout for:

Game: ${context.game_title}
Genre: ${context.genre}
Mood: ${context.mood}

Level:
- Type: ${context.level.type}
- Scale: ${context.level.scale} (small=3-4 rooms, medium=5-6 rooms)
- Style: ${context.level.layout_style}

Environment: ${context.environment.name}

Create rooms arranged primarily VERTICALLY (Y axis), with corridors connecting them.
Remember: ALL values must be INTEGERS. Corridors must be STRAIGHT lines.`;

      const layout = await this.claudeService.chatJSON<LevelLayout>(
        this.SYSTEM_PROMPT,
        userMessage,
      );

      // Validate and fix the layout
      this.validateAndFixLayout(layout);

      this.logger.log(
        `Grid layout generated: ${layout.level.rooms.length} rooms, ${layout.level.corridors.length} corridors`,
      );
      return layout;
    } catch (error) {
      this.logger.error(`Failed to generate layout: ${error}`);
      throw error;
    }
  }

  /**
   * Validate and automatically fix the generated layout
   * Ensures all values are integers and corridors connect rooms properly
   */
  private validateAndFixLayout(layout: LevelLayout): void {
    const level = layout.level as GridLevelData;

    if (!level) {
      throw new Error('Missing level in layout');
    }
    if (!level.rooms || level.rooms.length < 2) {
      throw new Error('At least 2 rooms required');
    }

    // Ensure grid config exists
    if (!level.grid) {
      level.grid = {
        cellSize: GRID_CELL_SIZE,
        totalWidth: 30,
        totalHeight: 50,
      };
    }

    // Fix rooms: ensure all values are integers
    const roomsMap = new Map<string, GridRoom>();
    for (const room of level.rooms as GridRoom[]) {
      room.gridX = Math.round(room.gridX);
      room.gridY = Math.round(room.gridY);
      room.width = Math.max(2, Math.round(room.width));
      room.height = Math.max(2, Math.round(room.height));
      room.tags = room.tags || ['mid'];
      roomsMap.set(room.id, room);
    }

    // Rebuild corridors with proper connections
    const fixedCorridors: GridCorridor[] = [];
    for (const corridor of level.corridors as GridCorridor[]) {
      const fromRoom = roomsMap.get(corridor.fromRoom);
      const toRoom = roomsMap.get(corridor.toRoom);
      
      if (fromRoom && toRoom) {
        const fixedCorridor = this.buildCorridorBetweenRooms(
          corridor.id,
          fromRoom,
          toRoom,
          corridor.widthCells || 1,
        );
        fixedCorridors.push(fixedCorridor);
      }
    }
    level.corridors = fixedCorridors;

    // Validate POIs
    if (!level.pois || level.pois.length < 2) {
      level.pois = this.generateDefaultPOIs(level.rooms as GridRoom[]);
    }

    // Ensure spawn and goal exist
    const hasSpawn = level.pois.some((p: GridPOI) => p.type === 'spawn');
    const hasGoal = level.pois.some((p: GridPOI) => p.type === 'goal');
    
    if (!hasSpawn || !hasGoal) {
      level.pois = this.generateDefaultPOIs(level.rooms as GridRoom[]);
    }

    // Ensure critical path exists
    if (!level.criticalPath || level.criticalPath.length < 2) {
      level.criticalPath = level.rooms.map((r: GridRoom) => r.id);
    }
  }

  /**
   * Construit un corridor entre deux rooms avec un algorithme robuste
   * 
   * Stratégie:
   * 1. Détermine si les rooms sont alignées (chevauchement sur un axe)
   * 2. Si alignées: corridor droit (1 segment)
   * 3. Si non alignées: corridor en L (2 segments)
   * 
   * Le corridor part TOUJOURS du bord exact de la room source
   * et arrive TOUJOURS au bord exact de la room destination.
   */
  private buildCorridorBetweenRooms(
    corridorId: string,
    fromRoom: GridRoom,
    toRoom: GridRoom,
    widthCells: number,
  ): GridCorridor {
    // Calculer les bords des rooms
    const from = {
      minX: fromRoom.gridX,
      maxX: fromRoom.gridX + fromRoom.width,
      minY: fromRoom.gridY,
      maxY: fromRoom.gridY + fromRoom.height,
      centerX: fromRoom.gridX + fromRoom.width / 2,
      centerY: fromRoom.gridY + fromRoom.height / 2,
    };
    
    const to = {
      minX: toRoom.gridX,
      maxX: toRoom.gridX + toRoom.width,
      minY: toRoom.gridY,
      maxY: toRoom.gridY + toRoom.height,
      centerX: toRoom.gridX + toRoom.width / 2,
      centerY: toRoom.gridY + toRoom.height / 2,
    };

    // Vérifier le chevauchement sur chaque axe
    const overlapX = this.getOverlap(from.minX, from.maxX, to.minX, to.maxX);
    const overlapY = this.getOverlap(from.minY, from.maxY, to.minY, to.maxY);

    let segments: CorridorSegment[];

    if (overlapX.hasOverlap) {
      // Les rooms se chevauchent sur X -> corridor VERTICAL droit
      segments = this.buildVerticalCorridor(from, to, overlapX);
    } else if (overlapY.hasOverlap) {
      // Les rooms se chevauchent sur Y -> corridor HORIZONTAL droit
      segments = this.buildHorizontalCorridor(from, to, overlapY);
    } else {
      // Pas de chevauchement -> corridor en L
      segments = this.buildLShapedCorridor(from, to);
    }

    // Créer le corridor avec les segments
    const corridor: GridCorridor = {
      id: corridorId,
      fromRoom: fromRoom.id,
      toRoom: toRoom.id,
      segments,
      widthCells,
      // Legacy fields pour compatibilité
      startX: segments[0].startX,
      startY: segments[0].startY,
      endX: segments[segments.length - 1].endX,
      endY: segments[segments.length - 1].endY,
    };

    return corridor;
  }

  /**
   * Calcule le chevauchement entre deux intervalles
   */
  private getOverlap(
    min1: number,
    max1: number,
    min2: number,
    max2: number,
  ): { hasOverlap: boolean; start: number; end: number } {
    const overlapStart = Math.max(min1, min2);
    const overlapEnd = Math.min(max1, max2);
    
    return {
      hasOverlap: overlapStart < overlapEnd,
      start: overlapStart,
      end: overlapEnd,
    };
  }

  /**
   * Construit un corridor vertical droit (rooms alignées sur X)
   */
  private buildVerticalCorridor(
    from: { minX: number; maxX: number; minY: number; maxY: number },
    to: { minX: number; maxX: number; minY: number; maxY: number },
    overlapX: { start: number; end: number },
  ): CorridorSegment[] {
    // Position X au centre du chevauchement
    const x = Math.floor((overlapX.start + overlapX.end) / 2);
    
    // Déterminer qui est au-dessus
    let startY: number, endY: number;
    if (from.maxY <= to.minY) {
      // fromRoom est au-dessus de toRoom
      startY = from.maxY;
      endY = to.minY;
    } else {
      // fromRoom est en-dessous de toRoom
      startY = from.minY;
      endY = to.maxY;
    }

    return [{
      startX: x,
      startY,
      endX: x,
      endY,
    }];
  }

  /**
   * Construit un corridor horizontal droit (rooms alignées sur Y)
   */
  private buildHorizontalCorridor(
    from: { minX: number; maxX: number; minY: number; maxY: number },
    to: { minX: number; maxX: number; minY: number; maxY: number },
    overlapY: { start: number; end: number },
  ): CorridorSegment[] {
    // Position Y au centre du chevauchement
    const y = Math.floor((overlapY.start + overlapY.end) / 2);
    
    // Déterminer qui est à gauche
    let startX: number, endX: number;
    if (from.maxX <= to.minX) {
      // fromRoom est à gauche de toRoom
      startX = from.maxX;
      endX = to.minX;
    } else {
      // fromRoom est à droite de toRoom
      startX = from.minX;
      endX = to.maxX;
    }

    return [{
      startX,
      startY: y,
      endX,
      endY: y,
    }];
  }

  /**
   * Construit un corridor en L (rooms non alignées)
   * 
   * Stratégie: 
   * - Segment 1: part horizontalement du bord de fromRoom
   * - Segment 2: tourne et va verticalement vers toRoom
   */
  private buildLShapedCorridor(
    from: { minX: number; maxX: number; minY: number; maxY: number; centerX: number; centerY: number },
    to: { minX: number; maxX: number; minY: number; maxY: number; centerX: number; centerY: number },
  ): CorridorSegment[] {
    // Déterminer la direction principale
    const goingRight = to.centerX > from.centerX;
    const goingDown = to.centerY > from.centerY;

    // Point de départ: bord de fromRoom (horizontal d'abord)
    const startX = goingRight ? from.maxX : from.minX;
    const startY = Math.floor(from.centerY);

    // Point d'arrivée: bord de toRoom
    const endX = Math.floor(to.centerX);
    const endY = goingDown ? to.minY : to.maxY;

    // Point de jonction (coin du L)
    const cornerX = endX;
    const cornerY = startY;

    return [
      // Segment 1: horizontal de fromRoom vers le coin
      {
        startX,
        startY,
        endX: cornerX,
        endY: cornerY,
      },
      // Segment 2: vertical du coin vers toRoom
      {
        startX: cornerX,
        startY: cornerY,
        endX,
        endY,
      },
    ];
  }

  /**
   * Generate default POIs for spawn and goal
   */
  private generateDefaultPOIs(rooms: GridRoom[]): GridPOI[] {
    const pois: GridPOI[] = [];

    // Find entry room
    const entryRoom = rooms.find(r => r.tags?.includes('entry')) || rooms[0];
    pois.push({
      id: 'poi_spawn',
      type: 'spawn',
      roomId: entryRoom.id,
      offsetX: 0,
      offsetY: 0,
    });

    // Find goal room
    const goalRoom = rooms.find(r => r.tags?.includes('goal')) || rooms[rooms.length - 1];
    pois.push({
      id: 'poi_goal',
      type: 'goal',
      roomId: goalRoom.id,
      offsetX: 0,
      offsetY: 0,
    });

    return pois;
  }
}
