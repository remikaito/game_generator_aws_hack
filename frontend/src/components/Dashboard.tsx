import { ChevronDown, ChevronUp, Users, Map, Package } from 'lucide-react';
import { useState } from 'react';
import type { GameContext, LevelLayout, GeneratedAsset } from '../types';

interface DashboardProps {
  gameContext: GameContext;
  levelLayout?: LevelLayout;
  assets: GeneratedAsset[];
}

/**
 * Dashboard showing game summary at the bottom of the screen
 */
export function Dashboard({ gameContext, levelLayout, assets }: DashboardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const readyAssets = assets.filter((a) => a.status === 'ready');

  return (
    <div className="border-t border-white/10 bg-game-darker">
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-medium text-gray-400">Dashboard</span>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 grid grid-cols-3 gap-4">
          {/* Characters */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2 text-gray-400">
              <Users size={16} />
              <span className="text-sm font-medium">Characters</span>
            </div>
            <div className="space-y-2">
              {gameContext.characters.map((char) => (
                <div key={char.id} className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      char.role === 'protagonist'
                        ? 'bg-game-success'
                        : char.role === 'antagonist'
                        ? 'bg-game-error'
                        : 'bg-game-warning'
                    }`}
                  />
                  <span className="text-sm">{char.name}</span>
                  <span className="text-xs text-gray-500 capitalize">({char.role})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rooms */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2 text-gray-400">
              <Map size={16} />
              <span className="text-sm font-medium">Level Layout</span>
            </div>
            {levelLayout?.level ? (
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-white">{levelLayout.level.rooms?.length || 0}</span>
                  <span className="text-gray-500"> rooms</span>
                </div>
                <div className="text-sm">
                  <span className="text-white">{levelLayout.level.corridors?.length || 0}</span>
                  <span className="text-gray-500"> corridors</span>
                </div>
                <div className="text-sm">
                  {/* Support both old (points_of_interest) and new (pois) format */}
                  <span className="text-white">
                    {(levelLayout.level as any).pois?.length || 
                     (levelLayout.level as any).points_of_interest?.length || 0}
                  </span>
                  <span className="text-gray-500"> POIs</span>
                </div>
                <div className="text-xs text-gray-500 mt-2 capitalize">
                  {levelLayout.level.type || 'Generated'} level
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No layout data</div>
            )}
          </div>

          {/* Assets */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2 text-gray-400">
              <Package size={16} />
              <span className="text-sm font-medium">Generated Assets</span>
            </div>
            <div className="space-y-1">
              <div className="text-sm">
                <span className="text-white">{readyAssets.length}</span>
                <span className="text-gray-500"> / {assets.length} ready</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {assets.map((asset) => (
                  <span
                    key={asset.id}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      asset.status === 'ready'
                        ? 'bg-game-success/20 text-game-success'
                        : asset.status === 'failed'
                        ? 'bg-game-error/20 text-game-error'
                        : 'bg-game-warning/20 text-game-warning'
                    }`}
                  >
                    {asset.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
