import { Check, AlertCircle, Loader2 } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * Individual chat message component
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-game-accent text-white rounded-br-md'
            : isSystem
            ? 'bg-white/5 text-gray-400 text-sm'
            : 'bg-white/10 text-white rounded-bl-md'
        }`}
      >
        {/* Message content */}
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* Edit result badge */}
        {message.edit_result && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <EditResultBadge result={message.edit_result} />
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-xs mt-1 ${
            isUser ? 'text-white/60' : 'text-gray-500'
          }`}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

/**
 * Edit result badge showing what was changed
 */
function EditResultBadge({ result }: { result: ChatMessageType['edit_result'] }) {
  if (!result) return null;

  const statusIcon = {
    pending: <Loader2 size={12} className="animate-spin" />,
    processing: <Loader2 size={12} className="animate-spin" />,
    completed: <Check size={12} />,
    failed: <AlertCircle size={12} />,
  }[result.status];

  const statusColor = {
    pending: 'bg-game-warning/20 text-game-warning',
    processing: 'bg-game-accent/20 text-game-accent',
    completed: 'bg-game-success/20 text-game-success',
    failed: 'bg-game-error/20 text-game-error',
  }[result.status];

  const actionIcon = {
    add: '➕',
    remove: '➖',
    modify: '✏️',
    regenerate: '🔄',
  }[result.action];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusColor}`}
      >
        {statusIcon}
        <span className="capitalize">{result.status}</span>
      </span>
      
      <span className="text-xs text-gray-400">
        {actionIcon} {result.action} {result.target_type}
      </span>
    </div>
  );
}

/**
 * Format timestamp to readable time
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
