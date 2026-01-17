/**
 * Chat interfaces - For the edit chat functionality
 */

import { EditResult } from './edit.interface';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  /** Unique message ID */
  id: string;
  /** Message role */
  role: ChatRole;
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: number;
  /** Attached edit result (for assistant messages) */
  edit_result?: EditResult;
}

export interface ChatState {
  /** Session ID */
  session_id: string;
  /** All messages in the conversation */
  messages: ChatMessage[];
  /** Whether an edit is being processed */
  is_processing: boolean;
  /** Current edit being processed */
  current_edit?: EditResult;
}

/**
 * Create a new chat state
 */
export function createChatState(sessionId: string): ChatState {
  return {
    session_id: sessionId,
    messages: [
      {
        id: 'system_welcome',
        role: 'assistant',
        content: 'Your level is ready! What would you like to modify? You can ask me to add rooms, characters, props, change the lighting, or any other modifications.',
        timestamp: Date.now(),
      },
    ],
    is_processing: false,
  };
}

/**
 * Create a user message
 */
export function createUserMessage(content: string): ChatMessage {
  return {
    id: `user_${Date.now()}`,
    role: 'user',
    content,
    timestamp: Date.now(),
  };
}

/**
 * Create an assistant message
 */
export function createAssistantMessage(
  content: string,
  editResult?: EditResult,
): ChatMessage {
  return {
    id: `assistant_${Date.now()}`,
    role: 'assistant',
    content,
    timestamp: Date.now(),
    edit_result: editResult,
  };
}
