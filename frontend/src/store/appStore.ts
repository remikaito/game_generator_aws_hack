import { create } from 'zustand';
import type { SessionState, SceneConfig, GameContext, LevelLayout } from '../types';

interface AppState {
  // Session state
  session: SessionState | null;
  isGenerating: boolean;
  logs: string[];
  
  // Scene state
  sceneConfig: SceneConfig | null;
  
  // UI state
  showDashboard: boolean;
  selectedObjectId: string | null;
  isGameMode: boolean;
  
  // Actions
  setSession: (session: SessionState | null) => void;
  updateProgress: (step: SessionState['progress']['step'], status: SessionState['progress']['status'], progress?: number) => void;
  setGenerating: (isGenerating: boolean) => void;
  addLog: (message: string) => void;
  clearLogs: () => void;
  setSceneConfig: (config: SceneConfig | null) => void;
  updateSceneConfig: (config: SceneConfig) => void;
  setShowDashboard: (show: boolean) => void;
  setSelectedObject: (id: string | null) => void;
  setGameMode: (enabled: boolean) => void;
  reset: () => void;
}

const initialState = {
  session: null,
  isGenerating: false,
  logs: [],
  sceneConfig: null,
  showDashboard: true,
  selectedObjectId: null,
  isGameMode: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setSession: (session) => {
    set({ session });
    if (session?.scene_config) {
      set({ sceneConfig: session.scene_config });
    }
  },

  updateProgress: (step, status, progress) => {
    const { session } = get();
    if (session) {
      set({
        session: {
          ...session,
          progress: { step, status, progress },
          updated_at: Date.now(),
        },
      });
    }
  },

  setGenerating: (isGenerating) => set({ isGenerating }),

  addLog: (message) => {
    set((state) => ({
      logs: [...state.logs, `[${new Date().toLocaleTimeString()}] ${message}`],
    }));
  },

  clearLogs: () => set({ logs: [] }),

  setSceneConfig: (sceneConfig) => set({ sceneConfig }),

  updateSceneConfig: (config) => {
    set({ sceneConfig: config });
    // Also update in session
    const { session } = get();
    if (session) {
      set({
        session: {
          ...session,
          scene_config: config,
          updated_at: Date.now(),
        },
      });
    }
  },

  setShowDashboard: (showDashboard) => set({ showDashboard }),

  setSelectedObject: (selectedObjectId) => set({ selectedObjectId }),

  setGameMode: (isGameMode) => set({ isGameMode }),

  reset: () => set(initialState),
}));
