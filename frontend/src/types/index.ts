/**
 * Frontend TypeScript types
 * Mirrors backend interfaces for type safety
 */

// Session types
export type SessionStep = 
  | 'idle'
  | 'context'
  | 'layout'
  | 'generation'
  | 'assembly'
  | 'ready'
  | 'editing';

export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export interface SessionProgress {
  step: SessionStep;
  status: StepStatus;
  message?: string;
  progress?: number;
}

// Game Context
export interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'npc';
  description: string;
  tripo_prompt: string;
}

export interface Environment {
  name: string;
  description: string;
  skybox_prompt: string;
  lighting: string;
  time_of_day: string;
}

export interface GameContext {
  game_title: string;
  genre: string;
  mood: string;
  style: string;
  level: {
    type: string;
    scale: string;
    layout_style: string;
    constraints: string[];
  };
  characters: Character[];
  environment: Environment;
  props: Array<{
    id: string;
    name: string;
    description: string;
    tripo_prompt: string;
    placement_tags: string[];
  }>;
}

// Level Layout
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
  position_hint: string;
}

export interface LevelLayout {
  level: {
    name: string;
    type: string;
    theme: string;
    layout_style: string;
    metrics: {
      unit: string;
      grid_size: number;
      player_height: number;
      corridor_width: number;
      door_width: number;
      door_height: number;
    };
    rooms: Room[];
    corridors: Corridor[];
    points_of_interest: PointOfInterest[];
    flow: {
      critical_path: string[];
      loops: number;
      dead_ends: number;
    };
  };
}

// Scene Config
export interface SceneObject {
  id: string;
  reference_id: string;
  name: string;
  model_path: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  poi_id?: string;
}

export interface GeometryRoom {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  tags: string[];
  floorTexture?: string;
  wallTexture?: string;
  wallColor?: string;
}

/**
 * Un segment de corridor en coordonnées 3D
 */
export interface GeometryCorridorSegment {
  start: [number, number, number];
  end: [number, number, number];
}

export interface GeometryCorridor {
  id: string;
  /** 
   * Liste des segments formant le corridor
   * - 1 segment = corridor droit
   * - 2 segments = corridor en L
   */
  segments: GeometryCorridorSegment[];
  width: number;
  color: string;
  floorTexture?: string;
  
  // Legacy fields (pour compatibilité)
  start?: [number, number, number];
  end?: [number, number, number];
  elevation?: number;
  hasRamp?: boolean;
  elevationChange?: number;
}

export interface GeometryWall {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  height: number;
  color: string;
}

export interface GeometryPOI {
  id: string;
  type: 'spawn' | 'goal' | 'treasure' | 'checkpoint';
  position: [number, number, number];
  color: string;
  label: string;
  /** Room ID associée (pour recalculer la position si nécessaire) */
  roomId?: string;
}

export interface SceneConfig {
  skybox_path: string;
  ambient_light: { color: string; intensity: number };
  directional_light: { color: string; intensity: number; position: [number, number, number] };
  geometry: {
    rooms: GeometryRoom[];
    corridors: GeometryCorridor[];
    walls: GeometryWall[];
    poi_markers: GeometryPOI[];
  };
  objects: SceneObject[];
  camera: {
    default: { position: [number, number, number]; look_at: [number, number, number]; fov: number };
    orbit_target: [number, number, number];
    min_distance: number;
    max_distance: number;
  };
}

// Generated assets
export interface GeneratedAsset {
  id: string;
  name: string;
  type: 'character' | 'prop';
  path: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  prompt: string;
}

// Session State
export interface SessionState {
  session_id: string;
  prompt: string;
  created_at: number;
  updated_at: number;
  progress: SessionProgress;
  game_context?: GameContext;
  level_layout?: LevelLayout;
  assets: GeneratedAsset[];
  skybox?: {
    id: string;
    path: string;
    status: string;
    prompt: string;
  };
  scene_config?: SceneConfig;
  error?: string;
}

// Saved Levels
export interface SavedLevel {
  id: string;
  title: string;
  genre: string;
  style: string;
  prompt: string;
  createdAt: number;
  updatedAt: number;
  dataPath: string;
  roomCount: number;
  assetCount: number;
  thumbnail?: string;
}

export interface SavedLevelData {
  metadata: SavedLevel;
  sessionState: SessionState;
}

// Chat types
export type ChatRole = 'user' | 'assistant' | 'system';

export interface EditResult {
  id: string;
  action: 'add' | 'remove' | 'modify' | 'regenerate';
  target_type: 'room' | 'corridor' | 'asset' | 'prop' | 'poi' | 'skybox' | 'lighting' | 'material';
  changes: Record<string, unknown>;
  requires_api_call: boolean;
  explanation: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  edit_result?: EditResult;
}

export interface ChatState {
  session_id: string;
  messages: ChatMessage[];
  is_processing: boolean;
  current_edit?: EditResult;
}
