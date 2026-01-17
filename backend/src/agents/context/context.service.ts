import { Injectable, Logger } from '@nestjs/common';
import { ClaudeService } from '../../shared/claude/claude.service';
import { GameContext } from '../../shared/interfaces';

/**
 * Context Agent
 * Analyzes user prompts and extracts structured game context
 * 
 * Input: User's game description prompt
 * Output: GameContext with characters, environment, and level intent
 */
@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);

  // System prompt for Claude
  private readonly SYSTEM_PROMPT = `You are a Game Context and Level Intent Extractor. Analyze the user's game idea and extract structured information.

You must output valid JSON with the following structure:
{
  "game_title": "A fitting name for the game",
  "genre": "RPG | platformer | shooter | adventure | horror | puzzle | etc.",
  "mood": "dark | cheerful | epic | mysterious | tense | etc.",
  "style": "medieval | sci-fi | cartoon | realistic | pixel | steampunk | etc.",
  "level": {
    "type": "dungeon | arena | castle | forest | city | spaceship | etc.",
    "scale": "small | medium | large",
    "layout_style": "linear | hub-and-spoke | branching | looped",
    "constraints": ["list of spatial constraints like 'narrow corridors', 'verticality', 'open spaces']
  },
  "characters": [
    {
      "id": "char_001",
      "name": "Character Name",
      "role": "protagonist | antagonist | npc",
      "description": "Visual description of the character",
      "tripo_prompt": "Optimized prompt for 3D generation, include 'game character, low poly stylized'"
    }
  ],
  "environment": {
    "name": "Environment Name",
    "description": "Detailed description of the environment",
    "skybox_prompt": "Optimized prompt for 360° skybox generation",
    "lighting": "dim torchlight | bright daylight | neon | moonlight | etc.",
    "time_of_day": "day | night | dawn | dusk | indoor"
  },
  "props": [
    {
      "id": "prop_001",
      "name": "Prop Name",
      "description": "Visual description",
      "tripo_prompt": "Optimized prompt for 3D generation",
      "placement_tags": ["entry", "goal", "mid", "corridor"]
    }
  ]
}

Important guidelines:
- Be specific and visual in descriptions
- Optimize tripo_prompt for AI 3D generation (include style keywords)
- ALWAYS include "game character, low poly stylized" in character tripo_prompts
- Create 1-3 characters maximum (protagonist required, antagonist optional, 1 NPC max)
- Create 0-3 props relevant to the game theme
- The skybox_prompt should describe a panoramic 360° scene
- Return ONLY valid JSON, no markdown or explanations`;

  constructor(private claudeService: ClaudeService) {}

  /**
   * Extract game context from a user prompt
   * @param userPrompt - User's game description
   * @returns Structured GameContext
   */
  async extractContext(userPrompt: string): Promise<GameContext> {
    this.logger.log(`Extracting context from prompt: "${userPrompt.substring(0, 50)}..."`);

    try {
      const context = await this.claudeService.chatJSON<GameContext>(
        this.SYSTEM_PROMPT,
        `Create a game context for the following game idea:\n\n${userPrompt}`,
      );

      // Validate essential fields
      this.validateContext(context);

      this.logger.log(`Context extracted: "${context.game_title}" (${context.genre})`);
      return context;
    } catch (error) {
      this.logger.error(`Failed to extract context: ${error}`);
      throw error;
    }
  }

  /**
   * Validate the extracted context has all required fields
   */
  private validateContext(context: GameContext): void {
    if (!context.game_title) {
      throw new Error('Missing game_title in context');
    }
    if (!context.characters || context.characters.length === 0) {
      throw new Error('At least one character is required');
    }
    if (!context.environment) {
      throw new Error('Environment is required');
    }
    if (!context.level) {
      throw new Error('Level intent is required');
    }

    // Ensure all characters have valid tripo_prompts
    for (const char of context.characters) {
      if (!char.tripo_prompt || char.tripo_prompt.length < 10) {
        throw new Error(`Character "${char.name}" has invalid tripo_prompt`);
      }
    }

    // Ensure environment has skybox_prompt
    if (!context.environment.skybox_prompt || context.environment.skybox_prompt.length < 10) {
      throw new Error('Environment missing valid skybox_prompt');
    }
  }
}
