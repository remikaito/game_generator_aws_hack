import { Controller, Post, Body, Get } from '@nestjs/common';
import { OrchestratorService, PipelineResult } from './orchestrator.service';

/**
 * Orchestrator Controller
 * REST API endpoint for testing the pipeline (without WebSocket)
 */
@Controller('orchestrator')
export class OrchestratorController {
  constructor(private orchestratorService: OrchestratorService) {}

  /**
   * Test endpoint to run the full pipeline
   * Note: In production, use WebSocket for real-time progress updates
   */
  @Post('generate')
  async generate(@Body('prompt') prompt: string): Promise<PipelineResult> {
    const logs: string[] = [];

    const result = await this.orchestratorService.executePipeline(prompt, {
      onStepStart: (step) => logs.push(`[START] ${step}`),
      onStepComplete: (step) => logs.push(`[DONE] ${step}`),
      onProgress: (step, progress) => logs.push(`[PROGRESS] ${step}: ${progress}%`),
      onLog: (message) => logs.push(message),
      onError: (message) => logs.push(`[ERROR] ${message}`),
    });

    return {
      ...result,
      // Include logs in response for debugging
      ...(process.env.NODE_ENV === 'development' && { logs }),
    } as PipelineResult;
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  health(): { status: string; timestamp: number } {
    return {
      status: 'ok',
      timestamp: Date.now(),
    };
  }
}
