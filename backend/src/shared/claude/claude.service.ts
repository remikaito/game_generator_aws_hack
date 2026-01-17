import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';

/**
 * Service for interacting with Claude API (Anthropic)
 * Used by all AI agents for text generation and JSON extraction
 * 
 * Includes JSON repair functionality to handle malformed JSON from LLMs
 */
@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private client: Anthropic;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not found in environment variables');
    }

    this.client = new Anthropic({
      apiKey: apiKey || '',
    });
  }

  /**
   * Send a message to Claude and get a response
   * @param systemPrompt - System instructions for Claude
   * @param userMessage - User message to process
   * @param maxTokens - Maximum tokens in response (default: 4096)
   * @returns Claude's response text
   */
  async chat(
    systemPrompt: string,
    userMessage: string,
    maxTokens: number = 4096,
  ): Promise<string> {
    try {
      this.logger.debug(`Sending request to Claude...`);

      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });

      // Extract text content from response
      const textContent = message.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      this.logger.debug(`Received response from Claude (${textContent.text.length} chars)`);
      return textContent.text;
    } catch (error) {
      this.logger.error(`Claude API error: ${error}`);
      throw error;
    }
  }

  /**
   * Send a message to Claude and parse JSON response
   * Uses jsonrepair to fix common LLM JSON errors (missing commas, trailing commas, etc.)
   * 
   * @param systemPrompt - System instructions (should request JSON output)
   * @param userMessage - User message to process
   * @returns Parsed JSON object
   */
  async chatJSON<T>(
    systemPrompt: string,
    userMessage: string,
  ): Promise<T> {
    const response = await this.chat(systemPrompt, userMessage);

    // Extract JSON from response (handle markdown code blocks)
    let jsonString = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1].trim();
    }

    try {
      // First attempt: direct parse
      return JSON.parse(jsonString) as T;
    } catch (parseError) {
      // Second attempt: repair JSON and try again
      this.logger.warn(`Initial JSON parse failed, attempting repair...`);
      
      try {
        const repairedJson = jsonrepair(jsonString);
        this.logger.debug(`JSON repaired successfully`);
        return JSON.parse(repairedJson) as T;
      } catch (repairError) {
        // Both attempts failed
        this.logger.error(`Failed to parse JSON from Claude response: ${parseError}`);
        this.logger.error(`JSON repair also failed: ${repairError}`);
        this.logger.debug(`Raw response: ${response}`);
        throw new Error('Invalid JSON response from Claude (repair failed)');
      }
    }
  }

  /**
   * Chat with context from previous messages
   * Used for the Edit Agent to maintain conversation context
   */
  async chatWithContext(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    maxTokens: number = 4096,
  ): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages,
      });

      const textContent = message.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      return textContent.text;
    } catch (error) {
      this.logger.error(`Claude API error: ${error}`);
      throw error;
    }
  }
}
