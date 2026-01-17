import { useState, FormEvent } from 'react';
import { Send } from 'lucide-react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Prompt input component for initial game description
 */
export function PromptInput({ onSubmit, disabled }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !disabled) {
      onSubmit(prompt.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your game... e.g., 'A medieval fantasy RPG with a dragon boss and a knight hero in a dark castle'"
          disabled={disabled}
          className="w-full h-32 px-4 py-3 pr-14 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-game-accent focus:ring-1 focus:ring-game-accent resize-none transition-colors"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || disabled}
          className="absolute bottom-3 right-3 p-2.5 bg-game-accent hover:bg-game-accent-light disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Send size={20} />
        </button>
      </div>
      
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>Include characters, environment, and gameplay style for best results</span>
        <span>{prompt.length} / 500</span>
      </div>
    </form>
  );
}
