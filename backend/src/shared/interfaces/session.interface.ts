/**
 * Session - Manages the state of a generation session
 */

import { GameContext } from './game-context.interface';
import { LevelLayout } from './level-layout.interface';
import { SceneConfig } from './scene-config.interface';

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
  /** Current step */
  step: SessionStep;
  /** Step status */
  status: StepStatus;
  /** Progress message */
  message?: string;
  /** Progress percentage (0-100) for generation step */
  progress?: number;
}

export interface GeneratedAsset {
  /** Asset ID */
  id: string;
  /** Asset name */
  name: string;
  /** Asset type */
  type: 'character' | 'prop';
  /** Path to generated GLB file */
  path: string;
  /** Generation status */
  status: 'pending' | 'generating' | 'ready' | 'failed';
  /** Original prompt used */
  prompt: string;
}

export interface GeneratedSkybox {
  /** Skybox ID */
  id: string;
  /** Path to skybox image */
  path: string;
  /** Generation status */
  status: 'pending' | 'generating' | 'ready' | 'failed';
  /** Original prompt used */
  prompt: string;
}

export interface SessionState {
  /** Session unique identifier */
  session_id: string;
  /** Original user prompt */
  prompt: string;
  /** Session creation timestamp */
  created_at: number;
  /** Last update timestamp */
  updated_at: number;
  /** Current progress */
  progress: SessionProgress;
  /** Extracted game context */
  game_context?: GameContext;
  /** Generated level layout */
  level_layout?: LevelLayout;
  /** Generated assets */
  assets: GeneratedAsset[];
  /** Generated skybox */
  skybox?: GeneratedSkybox;
  /** Final scene configuration */
  scene_config?: SceneConfig;
  /** Error message if any */
  error?: string;
}

/**
 * Create a new session state
 */
export function createSessionState(sessionId: string, prompt: string): SessionState {
  const now = Date.now();
  return {
    session_id: sessionId,
    prompt,
    created_at: now,
    updated_at: now,
    progress: {
      step: 'idle',
      status: 'pending',
    },
    assets: [],
  };
}
