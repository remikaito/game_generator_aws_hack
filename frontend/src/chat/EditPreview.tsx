import { Loader2 } from 'lucide-react';
import type { EditResult } from '../types';

interface EditPreviewProps {
  edit: EditResult;
}

/**
 * Preview component showing edit in progress
 */
export function EditPreview({ edit }: EditPreviewProps) {
  const actionIcon = {
    add: '➕',
    remove: '➖',
    modify: '✏️',
    regenerate: '🔄',
  }[edit.action];

  const targetIcon = {
    room: '🏠',
    corridor: '🚪',
    asset: '🎮',
    prop: '📦',
    poi: '📍',
    skybox: '🌅',
    lighting: '💡',
  }[edit.target_type];

  return (
    <div className="bg-game-accent/10 border border-game-accent/30 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 size={16} className="animate-spin text-game-accent" />
        <span className="text-sm font-medium text-game-accent">
          Processing Edit
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {/* Action and target */}
        <div className="flex items-center gap-2">
          <span>{actionIcon}</span>
          <span className="capitalize">{edit.action}</span>
          <span>{targetIcon}</span>
          <span className="capitalize">{edit.target_type}</span>
        </div>

        {/* Explanation */}
        <div className="text-gray-300">{edit.explanation}</div>

        {/* API call indicator */}
        {edit.requires_api_call && (
          <div className="flex items-center gap-2 text-game-warning text-xs">
            <Loader2 size={12} className="animate-spin" />
            <span>
              Generating 3D asset...
            </span>
          </div>
        )}

        {/* Progress bar */}
        {edit.status === 'processing' && (
          <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-game-accent animate-pulse w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
