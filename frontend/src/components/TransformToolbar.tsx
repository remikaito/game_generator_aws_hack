import { useEffect } from 'react';
import { useTransformStore, TransformMode } from '../store/transformStore';

interface TransformToolbarProps {
  /** Callback pour annuler les modifications */
  onCancel?: () => void;
}

/**
 * Toolbar pour les contrôles de transformation des objets 3D
 * 
 * Raccourcis clavier:
 * - G: Translate (Move)
 * - R: Rotate
 * - S: Scale
 * - Escape: Deselect
 * - Tab: Cycle modes
 */
export function TransformToolbar({ onCancel }: TransformToolbarProps) {
  const {
    selectedObjectId,
    transformMode,
    setTransformMode,
    selectObject,
    isTransforming,
    pendingTransforms,
    clearAllPendingTransforms,
    cycleTransformMode,
  } = useTransformStore();

  // Gestion des raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si on tape dans un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'g':
          setTransformMode('translate');
          break;
        case 'r':
          setTransformMode('rotate');
          break;
        case 's':
          // Éviter le conflit avec Ctrl+S pour save
          if (!e.ctrlKey && !e.metaKey) {
            setTransformMode('scale');
          }
          break;
        case 'escape':
          selectObject(null);
          break;
        case 'tab':
          e.preventDefault();
          cycleTransformMode();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTransformMode, selectObject, cycleTransformMode]);

  const hasPendingChanges = pendingTransforms.size > 0;

  const ModeButton = ({ 
    mode, 
    label, 
    shortcut 
  }: { 
    mode: TransformMode; 
    label: string; 
    shortcut: string;
  }) => (
    <button
      onClick={() => setTransformMode(mode)}
      className={`
        px-3 py-2 rounded-lg text-sm font-medium transition-all
        flex items-center gap-2
        ${transformMode === mode
          ? 'bg-indigo-600 text-white shadow-lg'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }
      `}
      title={`${label} (${shortcut})`}
    >
      <span>{label}</span>
      <kbd className="text-xs bg-black/30 px-1.5 py-0.5 rounded">{shortcut}</kbd>
    </button>
  );

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700 p-3">
        <div className="flex items-center gap-4">
          {/* Mode buttons */}
          <div className="flex gap-2">
            <ModeButton mode="translate" label="Move" shortcut="G" />
            <ModeButton mode="rotate" label="Rotate" shortcut="R" />
            <ModeButton mode="scale" label="Scale" shortcut="S" />
          </div>

          {/* Separator */}
          <div className="w-px h-8 bg-gray-600" />

          {/* Selection info */}
          <div className="text-sm">
            {selectedObjectId ? (
              <div className="flex items-center gap-2">
                <span className="text-green-400">●</span>
                <span className="text-gray-300">Object selected</span>
                <button
                  onClick={() => selectObject(null)}
                  className="text-gray-400 hover:text-white ml-2"
                  title="Deselect (Escape)"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className="text-gray-500">Click an object to select</span>
            )}
          </div>

          {/* Cancel button - visible si modifications en attente */}
          {hasPendingChanges && onCancel && (
            <>
              <div className="w-px h-8 bg-gray-600" />
              <button
                onClick={() => {
                  clearAllPendingTransforms();
                  onCancel();
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {/* Help text */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          {isTransforming 
            ? 'Drag to transform • Release to confirm'
            : selectedObjectId
              ? 'Camera controls paused • Tab to cycle modes • Escape to deselect'
              : 'Tab to cycle modes • Escape to deselect'
          }
        </div>
      </div>
    </div>
  );
}
