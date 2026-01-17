import { useEffect } from 'react';
import { Trash2, Play, Clock, Layers, Box } from 'lucide-react';
import { useLevelsStore } from '../store/levelsStore';
import type { SavedLevel } from '../types';

interface SavedLevelsListProps {
  onLoadLevel: (levelId: string) => void;
}

/**
 * Composant affichant la liste des levels sauvegardés
 * Affiché sous l'input prompt sur la page d'accueil
 */
export function SavedLevelsList({ onLoadLevel }: SavedLevelsListProps) {
  const { savedLevels, isLoading, fetchLevels, deleteLevel } = useLevelsStore();

  // Charger les levels au montage
  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  if (isLoading && savedLevels.length === 0) {
    return (
      <div className="mt-8 text-center text-gray-500">
        <div className="animate-pulse">Loading saved levels...</div>
      </div>
    );
  }

  if (savedLevels.length === 0) {
    return null; // Ne rien afficher s'il n'y a pas de levels sauvegardés
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleDelete = async (e: React.MouseEvent, level: SavedLevel) => {
    e.stopPropagation();
    
    if (confirm(`Delete "${level.title}"? This cannot be undone.`)) {
      await deleteLevel(level.id);
    }
  };

  return (
    <div className="mt-10">
      <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
        <Layers size={16} />
        Your Saved Levels ({savedLevels.length})
      </h3>
      
      <div className="grid gap-3">
        {savedLevels.map((level) => (
          <div
            key={level.id}
            onClick={() => onLoadLevel(level.id)}
            className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-game-accent/50 rounded-xl p-4 cursor-pointer transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              {/* Info principale */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate group-hover:text-game-accent transition-colors">
                  {level.title}
                </h4>
                <p className="text-sm text-gray-500 truncate mt-0.5">
                  {level.prompt.substring(0, 60)}...
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={(e) => handleDelete(e, level)}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete level"
                >
                  <Trash2 size={16} />
                </button>
                <div className="p-1.5 text-game-accent">
                  <Play size={16} />
                </div>
              </div>
            </div>
            
            {/* Métadonnées */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDate(level.updatedAt)}
              </span>
              <span className="px-2 py-0.5 bg-white/5 rounded-full">
                {level.genre}
              </span>
              <span className="flex items-center gap-1">
                <Layers size={12} />
                {level.roomCount} rooms
              </span>
              <span className="flex items-center gap-1">
                <Box size={12} />
                {level.assetCount} assets
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
