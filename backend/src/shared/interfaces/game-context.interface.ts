/**
 * GameContext - Output of the Context Agent
 * Structured extraction of game information from user prompt
 */

export interface Character {
  /** Unique identifier (e.g., "char_001") */
  id: string;
  /** Character name */
  name: string;
  /** Role in the game */
  role: 'protagonist' | 'antagonist' | 'npc';
  /** Visual description */
  description: string;
  /** Optimized prompt for TRIPO 3D generation */
  tripo_prompt: string;
}

export interface Environment {
  /** Environment name */
  name: string;
  /** Detailed description */
  description: string;
  /** Optimized prompt for Blockade Labs skybox */
  skybox_prompt: string;
  /** Lighting style (e.g., "dim torchlight", "bright daylight") */
  lighting: string;
  /** Time of day */
  time_of_day: string;
}

export interface Prop {
  /** Unique identifier */
  id: string;
  /** Prop name */
  name: string;
  /** Visual description */
  description: string;
  /** Optimized prompt for TRIPO 3D */
  tripo_prompt: string;
  /** Suggested placement tags */
  placement_tags: string[];
}

export interface LevelIntent {
  /** Level type (dungeon, arena, castle, etc.) */
  type: string;
  /** Scale (small, medium, large) */
  scale: 'small' | 'medium' | 'large';
  /** Layout style */
  layout_style: 'linear' | 'hub-and-spoke' | 'branching' | 'looped';
  /** Spatial constraints */
  constraints: string[];
}

export interface GameContext {
  /** Generated game title */
  game_title: string;
  /** Game genre (RPG, platformer, shooter, etc.) */
  genre: string;
  /** Emotional tone (dark, cheerful, epic, etc.) */
  mood: string;
  /** Visual style (medieval, sci-fi, cartoon, etc.) */
  style: string;
  /** Level intent for the Layout Agent */
  level: LevelIntent;
  /** Characters to generate */
  characters: Character[];
  /** Environment settings */
  environment: Environment;
  /** Optional props to generate */
  props: Prop[];
}
