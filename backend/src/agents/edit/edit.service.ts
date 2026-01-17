import { Injectable, Logger } from '@nestjs/common';
import { ClaudeService } from '../../shared/claude/claude.service';
import {
  GameContext,
  LevelLayout,
  SceneConfig,
  EditResult,
  EditAction,
  EditTargetType,
  GridRoom,
  GridCorridor,
  GridPOI,
  GridLevelData,
  SceneObject,
  GRID_CELL_SIZE,
} from '../../shared/interfaces';
import { v4 as uuidv4 } from 'uuid';

/**
 * Edit Agent
 * Interprets natural language edit commands and generates modifications
 * 
 * Input: Current scene state + user instruction
 * Output: EditResult with changes to apply
 */
@Injectable()
export class EditService {
  private readonly logger = new Logger(EditService.name);

  // System prompt for Claude - GRID-BASED EDITING
  private readonly SYSTEM_PROMPT = `You are a Level Editor Assistant for a 3D game prototype generator using a GRID system.

The level uses a 2D grid where each cell = ${GRID_CELL_SIZE} meters. All room positions and sizes are in grid cells (integers).

Analyze the instruction and output valid JSON:

{
  "action": "add" | "remove" | "modify" | "regenerate",
  "target_type": "room" | "corridor" | "asset" | "prop" | "poi" | "skybox" | "lighting" | "material",
  "changes": {
    // For adding rooms (GRID coordinates - integers):
    "new_rooms": [{
      "id": "room_XXX",
      "name": "Room Name",
      "gridX": 10,       // X position on grid (integer)
      "gridY": 15,       // Y position on grid (integer) - becomes Z in 3D
      "width": 4,        // Width in cells (integer)
      "height": 3,       // Depth in cells (integer)
      "tags": ["secret"],
      "material": {      // Optional custom material
        "floorColor": "#3a5a3a",
        "wallColor": "#2a4a2a",
        "floorTexture": "stone",
        "wallTexture": "brick"
      }
    }],
    
    // For adding corridors (GRID coordinates):
    "new_corridors": [{
      "id": "corr_XXX",
      "fromRoom": "source_room_id",
      "toRoom": "dest_room_id",
      "startX": 12,      // Must be at room edge
      "startY": 8,
      "endX": 12,        // Same X for vertical, same Y for horizontal
      "endY": 10,
      "widthCells": 1
    }],
    
    // For adding 3D objects (world coordinates in meters):
    "new_objects": [{
      "id": "obj_XXX",
      "reference_id": "prop_XXX",
      "name": "Object Name",
      "model_path": "",
      "position": [x, 0, z],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1]
    }],
    
    // For removing:
    "removed_room_ids": ["room_id"],
    "removed_object_ids": ["obj_id"],
    
    // For modifying objects (position, rotation, scale):
    "modified_objects": [{
      "id": "obj_char_001",        // Object ID (starts with "obj_")
      "position": [10.5, 0, 20.3], // World position in meters [x, y, z]
      "rotation": [0, 1.57, 0],    // Rotation in radians [x, y, z]
      "scale": [2.0, 2.0, 2.0]     // Scale multiplier [x, y, z]
    }],
    
    // For modifying room materials/colors/textures:
    "modified_rooms": [{
      "id": "room_001",
      "material": {
        "floorColor": "#ff5500",    // Hex color for floor
        "wallColor": "#884422",     // Hex color for walls
        "floorTexture": "lava",     // Texture type: stone, wood, metal, grass, lava, ice, sand
        "wallTexture": "obsidian"   // Texture type: brick, stone, concrete, wood, metal
      }
    }],
    
    // For skybox/lighting:
    "skybox_prompt": "new skybox description",
    "ambient_light_changes": { "intensity": 0.5 },
    "directional_light_changes": { "color": "#ffaa55" }
  },
  "requires_api_call": true/false,
  "api_params": {
    "type": "tripo" | "blockade",
    "prompt": "generation prompt",
    "target_id": "id for the generated asset"
  },
  "explanation": "Brief explanation of what you did"
}

GRID RULES:
- All room positions (gridX, gridY) and sizes (width, height) are INTEGERS
- Corridors must be STRAIGHT: startX=endX (vertical) or startY=endY (horizontal)
- Corridor endpoints must touch room edges
- To convert grid to world: worldX = gridX * ${GRID_CELL_SIZE}, worldZ = gridY * ${GRID_CELL_SIZE}
- When adding a room, create a corridor to connect it
- Leave 2+ cells gap between rooms for corridors

MATERIAL/TEXTURE RULES:
- Use "material" target_type for color/texture changes
- Colors must be valid hex codes (e.g., "#ff0000" for red)
- Available floor textures: stone, wood, metal, grass, lava, ice, sand, marble, dirt
- Available wall textures: brick, stone, concrete, wood, metal, obsidian, ice
- When user says "red room", "blue floor", etc., modify the material.floorColor or material.wallColor
- You can change multiple rooms at once by adding multiple entries to modified_rooms
- Use "all" or describe rooms by tags (e.g., "all entry rooms") to target multiple rooms

- Return ONLY valid JSON`;

  constructor(private claudeService: ClaudeService) {}

  /**
   * Process an edit instruction
   * @param instruction - Natural language edit command
   * @param context - Current game context
   * @param layout - Current level layout
   * @param sceneConfig - Current scene configuration
   * @returns EditResult with changes to apply
   */
  async processEdit(
    instruction: string,
    context: GameContext,
    layout: LevelLayout,
    sceneConfig: SceneConfig,
  ): Promise<EditResult> {
    this.logger.log(`Processing edit: "${instruction.substring(0, 50)}..."`);

    const editId = `edit_${uuidv4().substring(0, 8)}`;

    try {
      // Build context for Claude
      const stateDescription = this.buildStateDescription(context, layout, sceneConfig);

      const response = await this.claudeService.chatJSON<RawEditResponse>(
        this.SYSTEM_PROMPT,
        `Current scene state:\n${stateDescription}\n\nUser instruction: ${instruction}`,
      );

      const editResult: EditResult = {
        id: editId,
        action: response.action,
        target_type: response.target_type,
        changes: this.processChanges(response.changes, layout),
        requires_api_call: response.requires_api_call || false,
        api_params: response.api_params,
        explanation: response.explanation,
        status: 'pending',
      };

      this.logger.log(`Edit processed: ${editResult.action} ${editResult.target_type}`);
      return editResult;
    } catch (error) {
      this.logger.error(`Failed to process edit: ${error}`);
      return {
        id: editId,
        action: 'modify',
        target_type: 'room',
        changes: {},
        requires_api_call: false,
        explanation: `Failed to process: ${error}`,
        status: 'failed',
      };
    }
  }

  /**
   * Build a description of the current state for Claude
   * Uses GRID coordinates for rooms and corridors
   */
  private buildStateDescription(
    context: GameContext,
    layout: LevelLayout,
    sceneConfig: SceneConfig,
  ): string {
    const level = layout.level as GridLevelData;

    const roomList = level.rooms
      .map((r: GridRoom) => `- ${r.id}: "${r.name}" at grid(${r.gridX}, ${r.gridY}), size ${r.width}x${r.height} cells, tags: [${(r.tags || []).join(', ')}]`)
      .join('\n');

    const corridorList = level.corridors
      .map((c: GridCorridor) => `- ${c.id}: ${c.fromRoom} → ${c.toRoom} from (${c.startX},${c.startY}) to (${c.endX},${c.endY})`)
      .join('\n');

    const objectList = sceneConfig.objects
      .map((o) => `- ${o.id}: "${o.name}" at [${o.position.join(', ')}], scale: [${o.scale.join(', ')}]`)
      .join('\n');

    const poiList = level.pois
      .map((p: GridPOI) => `- ${p.id}: ${p.type} in ${p.roomId}`)
      .join('\n');

    return `
Game: ${context.game_title} (${context.genre}, ${context.mood})
Grid cell size: ${GRID_CELL_SIZE} meters

ROOMS (grid coordinates):
${roomList}

CORRIDORS (grid coordinates):
${corridorList}

POINTS OF INTEREST:
${poiList}

3D OBJECTS (world coordinates):
${objectList}

Current skybox: ${sceneConfig.skybox_path || 'none'}
Ambient light: ${JSON.stringify(sceneConfig.ambient_light)}
`;
  }

  /**
   * Process and validate changes from Claude's response
   * Ensures all grid values are integers
   */
  private processChanges(
    changes: RawEditResponse['changes'],
    layout: LevelLayout,
  ): EditResult['changes'] {
    const processed: EditResult['changes'] = {};
    const level = layout.level as GridLevelData;

    // Process new rooms (grid-based)
    if (changes.new_rooms) {
      processed.new_rooms = changes.new_rooms.map((room) => ({
        id: room.id || `room_${level.rooms.length + 1}`.padStart(3, '0'),
        name: room.name || 'New Room',
        gridX: Math.round(room.gridX || 0),
        gridY: Math.round(room.gridY || 0),
        width: Math.max(2, Math.round(room.width || 3)),
        height: Math.max(2, Math.round(room.height || 3)),
        tags: room.tags || ['mid'],
      })) as GridRoom[];
    }

    // Process new corridors (grid-based)
    if (changes.new_corridors) {
      processed.new_corridors = changes.new_corridors.map((corridor) => ({
        id: corridor.id || `corr_${level.corridors.length + 1}`.padStart(3, '0'),
        fromRoom: corridor.fromRoom || '',
        toRoom: corridor.toRoom || '',
        startX: Math.round(corridor.startX || 0),
        startY: Math.round(corridor.startY || 0),
        endX: Math.round(corridor.endX || 0),
        endY: Math.round(corridor.endY || 0),
        widthCells: corridor.widthCells || 1,
      })) as GridCorridor[];
    }

    // Process new objects
    if (changes.new_objects) {
      processed.new_objects = changes.new_objects.map((obj) => ({
        ...obj,
        rotation: obj.rotation || [0, 0, 0],
        scale: obj.scale || [1, 1, 1],
      })) as SceneObject[];
    }

    // Pass through other changes
    if (changes.removed_room_ids) {
      processed.removed_room_ids = changes.removed_room_ids;
    }
    if (changes.removed_object_ids) {
      processed.removed_object_ids = changes.removed_object_ids;
    }
    if (changes.modified_objects) {
      processed.modified_objects = changes.modified_objects;
    }
    if (changes.modified_rooms) {
      // Traiter les modifications de rooms (incluant les matériaux)
      processed.modified_rooms = changes.modified_rooms.map((room) => ({
        id: room.id,
        ...(room.name && { name: room.name }),
        ...(room.tags && { tags: room.tags }),
        ...(room.material && { material: room.material }),
      }));
    }
    if (changes.skybox_prompt) {
      processed.skybox_prompt = changes.skybox_prompt;
    }
    if (changes.ambient_light_changes) {
      processed.ambient_light_changes = changes.ambient_light_changes;
    }
    if (changes.directional_light_changes) {
      processed.directional_light_changes = changes.directional_light_changes;
    }

    return processed;
  }

  /**
   * Apply an edit result to the current scene config
   * (For simple edits that don't require API calls)
   */
  applyEdit(
    sceneConfig: SceneConfig,
    layout: LevelLayout,
    editResult: EditResult,
  ): { sceneConfig: SceneConfig; layout: LevelLayout } {
    const newSceneConfig = { ...sceneConfig };
    const level = layout.level as GridLevelData;
    const newLayout: LevelLayout = { 
      level: { 
        ...level,
        rooms: [...level.rooms],
        corridors: [...level.corridors],
        pois: [...level.pois],
      } 
    };
    const newLevel = newLayout.level as GridLevelData;

    // Apply room additions
    if (editResult.changes.new_rooms) {
      newLevel.rooms = [
        ...newLevel.rooms,
        ...(editResult.changes.new_rooms as GridRoom[]),
      ];
    }

    // Apply corridor additions
    if (editResult.changes.new_corridors) {
      newLevel.corridors = [
        ...newLevel.corridors,
        ...(editResult.changes.new_corridors as GridCorridor[]),
      ];
    }

    // Apply room removals
    if (editResult.changes.removed_room_ids) {
      newLevel.rooms = newLevel.rooms.filter(
        (room) => !editResult.changes.removed_room_ids!.includes(room.id),
      );
    }

    // Apply object removals
    if (editResult.changes.removed_object_ids) {
      newSceneConfig.objects = newSceneConfig.objects.filter(
        (obj) => !editResult.changes.removed_object_ids!.includes(obj.id),
      );
    }

    // Apply object modifications
    if (editResult.changes.modified_objects) {
      for (const mod of editResult.changes.modified_objects) {
        const objIndex = newSceneConfig.objects.findIndex((o) => o.id === mod.id);
        if (objIndex !== -1) {
          newSceneConfig.objects[objIndex] = {
            ...newSceneConfig.objects[objIndex],
            ...mod,
          };
        }
      }
    }

    // Apply room modifications (including materials)
    if (editResult.changes.modified_rooms) {
      for (const mod of editResult.changes.modified_rooms) {
        const roomIndex = newLevel.rooms.findIndex((r) => r.id === mod.id);
        if (roomIndex !== -1) {
          const existingRoom = newLevel.rooms[roomIndex];
          newLevel.rooms[roomIndex] = {
            ...existingRoom,
            ...(mod.name && { name: mod.name }),
            ...(mod.tags && { tags: mod.tags }),
            // Fusionner les matériaux existants avec les nouveaux
            material: {
              ...existingRoom.material,
              ...mod.material,
            },
          };
        }
      }
    }

    // Apply lighting changes
    if (editResult.changes.ambient_light_changes) {
      newSceneConfig.ambient_light = {
        ...newSceneConfig.ambient_light,
        ...editResult.changes.ambient_light_changes,
      };
    }
    if (editResult.changes.directional_light_changes) {
      newSceneConfig.directional_light = {
        ...newSceneConfig.directional_light,
        ...editResult.changes.directional_light_changes,
      };
    }

    return { sceneConfig: newSceneConfig, layout: newLayout };
  }
}

/**
 * Raw response from Claude for edit operations
 * Uses grid-based coordinates for rooms and corridors
 */
interface RawEditResponse {
  action: EditAction;
  target_type: EditTargetType;
  changes: {
    // Grid-based room format
    new_rooms?: Array<{
      id?: string;
      name?: string;
      gridX?: number;
      gridY?: number;
      width?: number;
      height?: number;
      tags?: string[];
      material?: {
        floorColor?: string;
        wallColor?: string;
        floorTexture?: string;
        wallTexture?: string;
      };
    }>;
    // Grid-based corridor format
    new_corridors?: Array<{
      id?: string;
      fromRoom?: string;
      toRoom?: string;
      startX?: number;
      startY?: number;
      endX?: number;
      endY?: number;
      widthCells?: number;
    }>;
    new_pois?: Array<{
      id?: string;
      type?: 'spawn' | 'goal' | 'treasure' | 'checkpoint';
      roomId?: string;
      offsetX?: number;
      offsetY?: number;
    }>;
    new_objects?: Partial<SceneObject>[];
    removed_room_ids?: string[];
    removed_object_ids?: string[];
    modified_objects?: Array<{ id: string } & Partial<SceneObject>>;
    // Room modifications (including materials)
    modified_rooms?: Array<{
      id: string;
      name?: string;
      tags?: string[];
      material?: {
        floorColor?: string;
        wallColor?: string;
        floorTexture?: string;
        wallTexture?: string;
      };
    }>;
    skybox_prompt?: string;
    ambient_light_changes?: { color?: string; intensity?: number };
    directional_light_changes?: { color?: string; intensity?: number; position?: [number, number, number] };
  };
  requires_api_call: boolean;
  api_params?: {
    type: 'tripo' | 'blockade';
    prompt: string;
    target_id: string;
  };
  explanation: string;
}
