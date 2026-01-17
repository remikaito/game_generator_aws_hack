import { useState, useCallback } from 'react';
import { Save, Gamepad2, Eye } from 'lucide-react';
import { useAppStore } from './store/appStore';
import { useChatStore } from './store/chatStore';
import { useLevelsStore } from './store/levelsStore';
import { useSocket } from './hooks/useSocket';
import { PromptInput } from './components/PromptInput';
import { ProgressIndicator } from './components/ProgressIndicator';
import { Dashboard } from './components/Dashboard';
import { AssetPanel } from './components/AssetPanel';
import { AssetViewerModal } from './components/AssetViewerModal';
import { SavedLevelsList } from './components/SavedLevelsList';
import { SceneViewer } from './three/SceneViewer';
import { EditChat } from './chat/EditChat';
import type { GeneratedAsset } from './types';

/**
 * Main Application Component
 */
function App() {
  const { session, isGenerating, sceneConfig, logs, setSession, setSceneConfig, isGameMode, setGameMode } = useAppStore();
  const { isOpen: isChatOpen } = useChatStore();
  const { saveLevel, loadLevel } = useLevelsStore();
  const { generate, sendEdit, initChat } = useSocket();

  // State for asset viewer modal
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isReady = session?.progress.step === 'ready' || session?.progress.step === 'editing';
  const showScene = isReady && sceneConfig;

  /**
   * Charge un level sauvegardé
   */
  const handleLoadLevel = async (levelId: string) => {
    const levelData = await loadLevel(levelId);
    
    if (levelData) {
      // Restaurer l'état de la session
      setSession(levelData.sessionState);
      
      if (levelData.sessionState.scene_config) {
        setSceneConfig(levelData.sessionState.scene_config);
      }
    }
  };

  /**
   * Sauvegarde le level courant
   */
  const handleSaveLevel = async () => {
    if (!session) return;
    
    setIsSaving(true);
    try {
      await saveLevel(session);
      // Afficher un feedback visuel (le bouton change temporairement)
    } catch (error) {
      console.error('Failed to save level:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Gère la transformation d'un objet 3D
   * Envoie une commande d'édition au backend pour synchroniser
   */
  const handleObjectTransform = useCallback((
    objectId: string,
    transform: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }
  ) => {
    if (!session?.session_id) return;

    // Construire une commande d'édition pour le backend
    const posStr = `[${transform.position.map(v => v.toFixed(2)).join(', ')}]`;
    const scaleStr = `[${transform.scale.map(v => v.toFixed(2)).join(', ')}]`;
    const rotStr = `[${transform.rotation.map(v => (v * 180 / Math.PI).toFixed(1)).join(', ')}]`;
    
    // Envoyer comme une commande d'édition silencieuse
    const instruction = `update object ${objectId} position to ${posStr}, scale to ${scaleStr}, rotation to ${rotStr} degrees`;
    
    sendEdit(session.session_id, instruction);
  }, [session?.session_id, sendEdit]);

  return (
    <div className="w-screen h-screen flex flex-col bg-game-dark">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-white/10 glass">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-game-accent flex items-center justify-center">
            <span className="text-lg">🎮</span>
          </div>
          <h1 className="text-lg font-semibold">
            {session?.game_context?.game_title || 'Game Prototype Generator'}
          </h1>
          {session?.game_context && (
            <span className="text-sm text-gray-400">
              {session.game_context.genre} • {session.game_context.style}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Bouton Game Mode */}
          {isReady && session && (
            <button
              onClick={() => setGameMode(!isGameMode)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all ${
                isGameMode
                  ? 'bg-game-accent text-white'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-game-accent/50'
              }`}
            >
              {isGameMode ? (
                <>
                  <Eye size={16} />
                  Exit Game
                </>
              ) : (
                <>
                  <Gamepad2 size={16} />
                  Game Mode
                </>
              )}
            </button>
          )}

          {/* Bouton Sauvegarder */}
          {isReady && session && !isGameMode && (
            <button
              onClick={handleSaveLevel}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 border border-white/10 hover:border-game-accent/50 rounded-lg transition-all disabled:opacity-50"
            >
              <Save size={16} className={isSaving ? 'animate-pulse' : ''} />
              {isSaving ? 'Saving...' : 'Save Level'}
            </button>
          )}
          
          {session?.session_id && !isGameMode && (
            <div className="text-xs text-gray-500">
              Session: {session.session_id.substring(0, 8)}...
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Scene or Input */}
        <div className={`flex-1 flex flex-col ${isChatOpen && showScene ? 'w-2/3' : 'w-full'}`}>
          {!showScene ? (
            // Input and Progress view
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              {!isGenerating && !session ? (
                // Initial prompt input
                <div className="w-full max-w-2xl">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-3">
                      Transform Your Ideas into 3D Game Levels
                    </h2>
                    <p className="text-gray-400">
                      Describe your game concept and watch it come to life with AI-generated 3D models and environments.
                    </p>
                  </div>
                  <PromptInput onSubmit={generate} />
                  
                  {/* Examples */}
                  <div className="mt-8">
                    <p className="text-sm text-gray-500 mb-3">Try these examples:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'A medieval fantasy RPG with a dragon boss and knight hero in a dark castle',
                        'A sci-fi shooter with alien enemies on a space station',
                        'A colorful platformer with a cute mascot in a candy world',
                      ].map((example, i) => (
                        <button
                          key={i}
                          onClick={() => generate(example)}
                          className="text-sm px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                        >
                          {example.substring(0, 40)}...
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Saved Levels List */}
                  <SavedLevelsList onLoadLevel={handleLoadLevel} />
                </div>
              ) : (
                // Progress view
                <div className="w-full max-w-xl">
                  <ProgressIndicator progress={session?.progress} />
                  
                  {/* Logs */}
                  <div className="mt-6 bg-black/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="text-xs font-mono text-gray-400 space-y-1">
                      {logs.map((log, i) => (
                        <div key={i}>{log}</div>
                      ))}
                      {isGenerating && (
                        <div className="flex items-center gap-2">
                          <span className="loading-dot inline-block w-1.5 h-1.5 bg-game-accent rounded-full" />
                          <span className="loading-dot inline-block w-1.5 h-1.5 bg-game-accent rounded-full" />
                          <span className="loading-dot inline-block w-1.5 h-1.5 bg-game-accent rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Scene viewer with transform support
            <div className="flex-1 relative">
              <SceneViewer 
                sceneConfig={sceneConfig} 
                isGameMode={isGameMode}
                onExitGameMode={() => setGameMode(false)}
                onObjectTransform={handleObjectTransform}
              />
              
              {/* Asset Panel - Dropdown for viewing generated assets (hidden in game mode) */}
              {session?.assets && session.assets.length > 0 && !isGameMode && (
                <AssetPanel
                  assets={session.assets}
                  onAssetSelect={setSelectedAsset}
                />
              )}

              {/* Open Chat Button (hidden in game mode) */}
              {!isChatOpen && !isGameMode && (
                <button
                  onClick={() => initChat(session!.session_id)}
                  className="absolute bottom-4 right-4 px-4 py-2 bg-game-accent hover:bg-game-accent-light rounded-lg flex items-center gap-2 transition-colors"
                >
                  <span>💬</span>
                  <span>Edit with AI</span>
                </button>
              )}
            </div>
          )}

          {/* Dashboard (hidden in game mode) */}
          {showScene && session?.game_context && !isGameMode && (
            <Dashboard 
              gameContext={session.game_context}
              levelLayout={session.level_layout}
              assets={session.assets}
            />
          )}
        </div>

        {/* Right: Edit Chat (hidden in game mode) */}
        {isChatOpen && showScene && session && !isGameMode && (
          <div className="w-96 border-l border-white/10">
            <EditChat
              sessionId={session.session_id}
              onSendEdit={sendEdit}
            />
          </div>
        )}
      </div>

      {/* Asset Viewer Modal */}
      {selectedAsset && (
        <AssetViewerModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}
    </div>
  );
}

export default App;
