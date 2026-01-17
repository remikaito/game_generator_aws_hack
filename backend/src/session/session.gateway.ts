import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SessionService } from './session.service';
import { OrchestratorService } from '../agents/orchestrator/orchestrator.service';
import { SessionState, SessionStep } from '../shared/interfaces';

/**
 * Session Gateway
 * WebSocket gateway for real-time communication with frontend
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SessionGateway.name);

  // Map socket IDs to session IDs
  private socketSessions = new Map<string, string>();

  constructor(
    private sessionService: SessionService,
    private orchestratorService: OrchestratorService,
  ) {}

  /**
   * Handle new client connection
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Clean up session association
    const sessionId = this.socketSessions.get(client.id);
    if (sessionId) {
      this.socketSessions.delete(client.id);
    }
  }

  /**
   * Handle generation request
   */
  @SubscribeMessage('generate')
  async handleGenerate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { prompt: string },
  ): Promise<void> {
    const { prompt } = data;
    this.logger.log(`Generate request: "${prompt.substring(0, 50)}..."`);

    // Create new session
    const session = this.sessionService.createSession(prompt);
    this.socketSessions.set(client.id, session.session_id);

    // Emit session created
    client.emit('session_created', { session_id: session.session_id });

    // Execute pipeline with callbacks
    await this.orchestratorService.executePipeline(prompt, {
      onStepStart: (step) => {
        this.sessionService.updateProgress(session.session_id, step, 'running');
        client.emit('progress', { step, status: 'running' });
      },

      onStepComplete: (step) => {
        this.sessionService.updateProgress(session.session_id, step, 'done');
        client.emit('progress', { step, status: 'done' });
      },

      onProgress: (step, progress) => {
        this.sessionService.updateProgress(session.session_id, step, 'running', undefined, progress);
        client.emit('progress', { step, status: 'running', progress });
      },

      onLog: (message) => {
        client.emit('log', message);
      },

      onError: (message) => {
        this.sessionService.setError(session.session_id, message);
        client.emit('error', { message });
      },
    }).then((result) => {
      if (result.success) {
        // Store results in session
        if (result.gameContext) {
          this.sessionService.setGameContext(session.session_id, result.gameContext);
        }
        if (result.levelLayout) {
          this.sessionService.setLevelLayout(session.session_id, result.levelLayout);
        }
        if (result.assets) {
          this.sessionService.setAssets(session.session_id, result.assets);
        }
        if (result.skybox) {
          this.sessionService.setSkybox(session.session_id, result.skybox);
        }
        if (result.sceneConfig) {
          this.sessionService.setSceneConfig(session.session_id, result.sceneConfig);
        }

        // Mark as ready
        this.sessionService.markReady(session.session_id);

        // Emit complete event with full session state
        const finalSession = this.sessionService.getSession(session.session_id);
        client.emit('complete', finalSession);
      }
    });
  }

  /**
   * Handle session retrieval
   */
  @SubscribeMessage('get_session')
  handleGetSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { session_id: string },
  ): void {
    const session = this.sessionService.getSession(data.session_id);
    
    if (session) {
      client.emit('session_state', session);
    } else {
      client.emit('error', { message: 'Session not found' });
    }
  }

  /**
   * Utility: Emit to a specific session
   */
  emitToSession(sessionId: string, event: string, data: unknown): void {
    // Find all sockets associated with this session
    for (const [socketId, sessId] of this.socketSessions.entries()) {
      if (sessId === sessionId) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  /**
   * Get socket ID for a session
   */
  getSocketForSession(sessionId: string): string | undefined {
    for (const [socketId, sessId] of this.socketSessions.entries()) {
      if (sessId === sessionId) {
        return socketId;
      }
    }
    return undefined;
  }
}
