import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  SessionState,
  createSessionState,
  SessionStep,
  StepStatus,
  GameContext,
  LevelLayout,
  SceneConfig,
  GeneratedAsset,
  GeneratedSkybox,
} from '../shared/interfaces';

/**
 * Session Service
 * Manages the state of all active generation sessions
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly sessions = new Map<string, SessionState>();

  /**
   * Create a new session
   */
  createSession(prompt: string): SessionState {
    const sessionId = uuidv4();
    const session = createSessionState(sessionId, prompt);
    
    this.sessions.set(sessionId, session);
    this.logger.log(`Session created: ${sessionId}`);
    
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session progress
   */
  updateProgress(
    sessionId: string,
    step: SessionStep,
    status: StepStatus,
    message?: string,
    progress?: number,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.progress = { step, status, message, progress };
    session.updated_at = Date.now();
  }

  /**
   * Set game context for a session
   */
  setGameContext(sessionId: string, context: GameContext): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.game_context = context;
    session.updated_at = Date.now();
  }

  /**
   * Set level layout for a session
   */
  setLevelLayout(sessionId: string, layout: LevelLayout): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.level_layout = layout;
    session.updated_at = Date.now();
  }

  /**
   * Set assets for a session
   */
  setAssets(sessionId: string, assets: GeneratedAsset[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.assets = assets;
    session.updated_at = Date.now();
  }

  /**
   * Set skybox for a session
   */
  setSkybox(sessionId: string, skybox: GeneratedSkybox): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.skybox = skybox;
    session.updated_at = Date.now();
  }

  /**
   * Set scene config for a session
   */
  setSceneConfig(sessionId: string, sceneConfig: SceneConfig): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.scene_config = sceneConfig;
    session.updated_at = Date.now();
  }

  /**
   * Set session error
   */
  setError(sessionId: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.error = error;
    session.progress.status = 'error';
    session.updated_at = Date.now();
  }

  /**
   * Mark session as ready (generation complete)
   */
  markReady(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.progress = { step: 'ready', status: 'done' };
    session.updated_at = Date.now();
  }

  /**
   * Mark session as editing (in edit mode)
   */
  markEditing(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.progress = { step: 'editing', status: 'done' };
    session.updated_at = Date.now();
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger.log(`Session deleted: ${sessionId}`);
  }

  /**
   * Get all active sessions (for debugging)
   */
  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up old sessions (older than 1 hour)
   */
  cleanupOldSessions(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (session.updated_at < oneHourAgo) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} old sessions`);
    }
  }
}
