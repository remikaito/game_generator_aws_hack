import { useState } from 'react';
import type { GeneratedAsset } from '../types';

interface AssetPanelProps {
  assets: GeneratedAsset[];
  onAssetSelect: (asset: GeneratedAsset) => void;
}

/**
 * Collapsible panel displaying the list of generated assets
 * Allows users to click on an asset to view it in detail
 */
export function AssetPanel({ assets, onAssetSelect }: AssetPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter only ready assets
  const readyAssets = assets.filter(a => a.status === 'ready' && a.path);

  if (readyAssets.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 z-10">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-4 py-2 bg-game-dark/90 hover:bg-game-dark border border-white/20 rounded-lg backdrop-blur-sm transition-all"
      >
        <span className="text-lg">📦</span>
        <span className="font-medium">Assets</span>
        <span className="text-xs text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">
          {readyAssets.length}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isExpanded && (
        <div className="mt-2 w-72 bg-game-dark/95 border border-white/20 rounded-lg backdrop-blur-sm overflow-hidden shadow-xl">
          <div className="p-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-gray-300">Generated Assets</h3>
            <p className="text-xs text-gray-500 mt-1">
              Click an asset to preview and export
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {readyAssets.map((asset) => (
              <AssetListItem
                key={asset.id}
                asset={asset}
                onClick={() => onAssetSelect(asset)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual asset item in the list
 */
function AssetListItem({ 
  asset, 
  onClick 
}: { 
  asset: GeneratedAsset; 
  onClick: () => void;
}) {
  // Icon based on asset type
  const icon = asset.type === 'character' ? '🎭' : '🏺';
  
  // Status indicator color
  const statusColor = {
    ready: 'bg-green-500',
    generating: 'bg-yellow-500',
    pending: 'bg-gray-500',
    failed: 'bg-red-500',
  }[asset.status];

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-b-0"
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">
        {icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{asset.name}</span>
          <span className={`w-2 h-2 rounded-full ${statusColor}`} />
        </div>
        <p className="text-xs text-gray-500 truncate">
          {asset.type === 'character' ? 'Character' : 'Prop'}
        </p>
      </div>

      {/* Arrow */}
      <svg
        className="w-4 h-4 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
