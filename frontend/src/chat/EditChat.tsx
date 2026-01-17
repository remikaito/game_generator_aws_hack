import { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2 } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { ChatMessage } from './ChatMessage';
import { EditPreview } from './EditPreview';

interface EditChatProps {
  sessionId: string;
  onSendEdit: (sessionId: string, instruction: string) => void;
}

/**
 * Edit Chat sidebar component
 */
export function EditChat({ sessionId, onSendEdit }: EditChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, isProcessing, currentEdit, setOpen } = useChatStore();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendEdit(sessionId, input.trim());
      setInput('');
    }
  };

  const handleQuickAction = (instruction: string) => {
    if (!isProcessing) {
      onSendEdit(sessionId, instruction);
    }
  };

  return (
    <div className="h-full flex flex-col bg-game-darker">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Edit Level</h3>
          <p className="text-xs text-gray-500">Use natural language to modify your scene</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Current edit preview */}
        {currentEdit && (
          <EditPreview edit={currentEdit} />
        )}

        {/* Processing indicator */}
        {isProcessing && !currentEdit && (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Processing your request...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-1">
          {[
            'Add a treasure chest',
            'Make it darker',
            'Add a secret room',
          ].map((action) => (
            <button
              key={action}
              onClick={() => handleQuickAction(action)}
              disabled={isProcessing}
              className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 disabled:opacity-50 transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you want to change..."
            disabled={isProcessing}
            className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-game-accent disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-game-accent hover:bg-game-accent-light disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {isProcessing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
