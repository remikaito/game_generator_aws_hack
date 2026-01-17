import { Injectable, Logger } from '@nestjs/common';
import {
  ChatState,
  ChatMessage,
  createChatState,
  createUserMessage,
  createAssistantMessage,
  EditResult,
} from '../shared/interfaces';

/**
 * Chat Service
 * Manages chat state for all sessions
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly chats = new Map<string, ChatState>();

  /**
   * Initialize chat for a session
   */
  initChat(sessionId: string): ChatState {
    const chat = createChatState(sessionId);
    this.chats.set(sessionId, chat);
    this.logger.log(`Chat initialized for session: ${sessionId}`);
    return chat;
  }

  /**
   * Get chat state for a session
   */
  getChat(sessionId: string): ChatState | undefined {
    return this.chats.get(sessionId);
  }

  /**
   * Get or create chat for a session
   */
  getOrCreateChat(sessionId: string): ChatState {
    let chat = this.chats.get(sessionId);
    if (!chat) {
      chat = this.initChat(sessionId);
    }
    return chat;
  }

  /**
   * Add a user message to the chat
   */
  addUserMessage(sessionId: string, content: string): ChatMessage {
    const chat = this.getOrCreateChat(sessionId);
    const message = createUserMessage(content);
    chat.messages.push(message);
    return message;
  }

  /**
   * Add an assistant message to the chat
   */
  addAssistantMessage(
    sessionId: string,
    content: string,
    editResult?: EditResult,
  ): ChatMessage {
    const chat = this.getOrCreateChat(sessionId);
    const message = createAssistantMessage(content, editResult);
    chat.messages.push(message);
    return message;
  }

  /**
   * Set processing state
   */
  setProcessing(sessionId: string, isProcessing: boolean): void {
    const chat = this.chats.get(sessionId);
    if (chat) {
      chat.is_processing = isProcessing;
    }
  }

  /**
   * Set current edit being processed
   */
  setCurrentEdit(sessionId: string, editResult?: EditResult): void {
    const chat = this.chats.get(sessionId);
    if (chat) {
      chat.current_edit = editResult;
    }
  }

  /**
   * Update the status of the current edit
   */
  updateEditStatus(
    sessionId: string,
    editId: string,
    status: EditResult['status'],
  ): void {
    const chat = this.chats.get(sessionId);
    if (!chat) return;

    // Update current edit if it matches
    if (chat.current_edit?.id === editId) {
      chat.current_edit.status = status;
    }

    // Update in message history
    for (const message of chat.messages) {
      if (message.edit_result?.id === editId) {
        message.edit_result.status = status;
      }
    }
  }

  /**
   * Get chat history for Claude context
   * Returns last N messages formatted for the API
   */
  getChatHistory(
    sessionId: string,
    limit: number = 10,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const chat = this.chats.get(sessionId);
    if (!chat) return [];

    return chat.messages
      .slice(-limit)
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }

  /**
   * Delete chat for a session
   */
  deleteChat(sessionId: string): void {
    this.chats.delete(sessionId);
    this.logger.log(`Chat deleted for session: ${sessionId}`);
  }
}
