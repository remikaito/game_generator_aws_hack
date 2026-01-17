import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SessionService } from '../session/session.service';
import { EditService } from '../agents/edit/edit.service';
import { AssetService } from '../agents/asset/asset.service';
import { EnvironmentService } from '../agents/environment/environment.service';
import { AssemblyService } from '../agents/assembly/assembly.service';
import { EditResult, SceneConfig, LevelLayout } from '../shared/interfaces';

/**
 * Chat Gateway
 * WebSocket gateway for edit chat functionality
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private sessionService: SessionService,
    private editService: EditService,
    private assetService: AssetService,
    private environmentService: EnvironmentService,
    private assemblyService: AssemblyService,
  ) {}

  /**
   * Handle edit command from chat
   */
  @SubscribeMessage('edit')
  async handleEdit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { session_id: string; instruction: string },
  ): Promise<void> {
    const { session_id, instruction } = data;
    this.logger.log(`Edit request: "${instruction.substring(0, 50)}..."`);

    // Get session
    const session = this.sessionService.getSession(session_id);
    if (!session || !session.game_context || !session.level_layout || !session.scene_config) {
      client.emit('edit_error', { message: 'Session not ready for editing' });
      return;
    }

    // Add user message
    const userMessage = this.chatService.addUserMessage(session_id, instruction);
    client.emit('chat_message', userMessage);

    // Set processing state
    this.chatService.setProcessing(session_id, true);

    try {
      // Process edit with Edit Agent
      client.emit('edit_started', { instruction, edit_id: 'processing' });

      const editResult = await this.editService.processEdit(
        instruction,
        session.game_context,
        session.level_layout,
        session.scene_config,
      );

      // Emit preview
      client.emit('edit_preview', editResult);
      this.chatService.setCurrentEdit(session_id, editResult);

      // Apply edit and handle API calls if needed
      const updatedConfig = await this.applyEdit(
        client,
        session_id,
        editResult,
        session.scene_config,
        session.level_layout,
        session.game_context.mood,
        session.game_context.style,
      );

      // Update session with new config
      this.sessionService.setSceneConfig(session_id, updatedConfig);
      this.sessionService.markEditing(session_id);

      // Update edit status
      editResult.status = 'completed';
      this.chatService.updateEditStatus(session_id, editResult.id, 'completed');

      // Add assistant message
      const assistantMessage = this.chatService.addAssistantMessage(
        session_id,
        editResult.explanation,
        editResult,
      );
      client.emit('chat_message', assistantMessage);

      // Emit scene update
      client.emit('scene_updated', updatedConfig);
      client.emit('edit_applied', {
        edit_id: editResult.id,
        scene_config: updatedConfig,
        explanation: editResult.explanation,
      });

    } catch (error) {
      this.logger.error(`Edit failed: ${error}`);
      
      const errorMessage = this.chatService.addAssistantMessage(
        session_id,
        `Sorry, I couldn't process that edit: ${error}`,
      );
      client.emit('chat_message', errorMessage);
      client.emit('edit_error', { message: String(error) });
    } finally {
      this.chatService.setProcessing(session_id, false);
      this.chatService.setCurrentEdit(session_id, undefined);
    }
  }

  /**
   * Apply an edit result, handling API calls if needed
   */
  private async applyEdit(
    client: Socket,
    sessionId: string,
    editResult: EditResult,
    currentConfig: SceneConfig,
    currentLayout: LevelLayout | undefined,
    mood: string,
    style: string,
  ): Promise<SceneConfig> {
    let updatedConfig = { ...currentConfig };
    let updatedLayout = currentLayout ? { ...currentLayout } : undefined;

    // Handle API calls for new assets
    if (editResult.requires_api_call && editResult.api_params) {
      const { type, prompt, target_id } = editResult.api_params;

      if (type === 'tripo') {
        // Generate new 3D asset
        client.emit('edit_asset_progress', {
          edit_id: editResult.id,
          status: 'Generating 3D model...',
          progress: 0,
        });

        const asset = await this.assetService.generateCustomAsset(
          target_id,
          editResult.changes.new_objects?.[0]?.name || 'New Asset',
          prompt,
          'prop',
          (status, progress) => {
            client.emit('edit_asset_progress', {
              edit_id: editResult.id,
              status,
              progress,
            });
          },
        );

        // Update the object path in changes
        if (asset.status === 'ready' && editResult.changes.new_objects) {
          editResult.changes.new_objects[0].model_path = asset.path;
        }
      } else if (type === 'blockade') {
        // Generate new skybox
        client.emit('edit_asset_progress', {
          edit_id: editResult.id,
          status: 'Generating skybox...',
          progress: 0,
        });

        const skybox = await this.environmentService.generateCustomSkybox(
          prompt,
          mood,
          style,
          (status, progress) => {
            client.emit('edit_asset_progress', {
              edit_id: editResult.id,
              status,
              progress,
            });
          },
        );

        if (skybox.status === 'ready') {
          updatedConfig.skybox_path = skybox.path;
        }
      }
    }

    // Apply non-API changes
    if (updatedLayout) {
      const result = this.editService.applyEdit(updatedConfig, updatedLayout, editResult);
      updatedConfig = result.sceneConfig;

      // If rooms were added, modified (including materials), or corridors changed, recalculate geometry
      const needsReassembly = 
        editResult.changes.new_rooms || 
        editResult.changes.new_corridors ||
        editResult.changes.modified_rooms ||  // Important: re-assemble for material/color changes
        editResult.changes.removed_room_ids;
        
      if (needsReassembly) {
        const session = this.sessionService.getSession(sessionId);
        if (session?.game_context) {
          // Update layout in session
          this.sessionService.setLevelLayout(sessionId, result.layout);
          
          // Reassemble geometry with updated materials
          const newConfig = this.assemblyService.assemble(
            session.game_context,
            result.layout,
            session.assets,
            session.skybox,
          );
          
          // Merge with existing objects
          updatedConfig = {
            ...newConfig,
            objects: [
              ...newConfig.objects,
              ...updatedConfig.objects.filter(
                (obj) => !newConfig.objects.find((no) => no.id === obj.id),
              ),
            ],
          };
        }
      }
    }

    // Add new objects from changes
    if (editResult.changes.new_objects) {
      for (const newObj of editResult.changes.new_objects) {
        if (newObj.model_path) {
          updatedConfig.objects.push(newObj);
        }
      }
    }

    return updatedConfig;
  }

  /**
   * Handle get chat history request
   */
  @SubscribeMessage('get_chat')
  handleGetChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { session_id: string },
  ): void {
    const chat = this.chatService.getOrCreateChat(data.session_id);
    client.emit('chat_state', chat);
  }

  /**
   * Handle init chat request (when scene is ready)
   */
  @SubscribeMessage('init_chat')
  handleInitChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { session_id: string },
  ): void {
    const chat = this.chatService.getOrCreateChat(data.session_id);
    client.emit('chat_state', chat);
    this.logger.log(`Chat initialized via WebSocket for: ${data.session_id}`);
  }
}
