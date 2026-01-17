/**
 * Edit interfaces - For the Edit Agent and chat-based modifications
 * Uses grid-based types for rooms and corridors
 */

import { GridRoom, GridCorridor, GridPOI } from './level-layout.interface';
import { SceneObject, LightConfig, DirectionalLightConfig } from './scene-config.interface';

export type EditAction = 'add' | 'remove' | 'modify' | 'regenerate';

export type EditTargetType = 
  | 'room'
  | 'corridor'
  | 'asset'
  | 'prop'
  | 'poi'
  | 'skybox'
  | 'lighting'
  | 'material';

export interface EditChanges {
  /** New rooms to add (grid-based) */
  new_rooms?: GridRoom[];
  /** New corridors to add (grid-based) */
  new_corridors?: GridCorridor[];
  /** New POIs to add */
  new_pois?: GridPOI[];
  /** New scene objects to add */
  new_objects?: SceneObject[];
  /** IDs of objects to remove */
  removed_object_ids?: string[];
  /** IDs of rooms to remove */
  removed_room_ids?: string[];
  /** IDs of corridors to remove */
  removed_corridor_ids?: string[];
  /** Modified objects (partial updates) */
  modified_objects?: Array<{ id: string } & Partial<SceneObject>>;
  /** Modified rooms (partial updates) */
  modified_rooms?: Array<{ id: string } & Partial<GridRoom>>;
  /** New skybox prompt */
  skybox_prompt?: string;
  /** Ambient light changes */
  ambient_light_changes?: Partial<LightConfig>;
  /** Directional light changes */
  directional_light_changes?: Partial<DirectionalLightConfig>;
}

export interface EditApiParams {
  /** API to call */
  type: 'tripo' | 'blockade';
  /** Prompt for generation */
  prompt: string;
  /** Target ID for the generated asset */
  target_id: string;
}

export interface EditResult {
  /** Unique edit ID */
  id: string;
  /** Action type */
  action: EditAction;
  /** Target type */
  target_type: EditTargetType;
  /** Changes to apply */
  changes: EditChanges;
  /** Whether an API call is needed */
  requires_api_call: boolean;
  /** API parameters if needed */
  api_params?: EditApiParams;
  /** Human-readable explanation */
  explanation: string;
  /** Processing status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface EditCommand {
  /** Session ID */
  session_id: string;
  /** Natural language instruction */
  instruction: string;
  /** Timestamp */
  timestamp: number;
}
