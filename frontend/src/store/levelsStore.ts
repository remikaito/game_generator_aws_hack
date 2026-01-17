import { create } from 'zustand';
import type { SavedLevel, SavedLevelData, SessionState } from '../types';

const API_BASE = 'http://localhost:3001/api';

interface LevelsState {
  // State
  savedLevels: SavedLevel[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchLevels: () => Promise<void>;
  saveLevel: (sessionState: SessionState, existingId?: string) => Promise<SavedLevel>;
  loadLevel: (id: string) => Promise<SavedLevelData | null>;
  deleteLevel: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useLevelsStore = create<LevelsState>((set, get) => ({
  savedLevels: [],
  isLoading: false,
  error: null,

  /**
   * Récupère la liste des levels sauvegardés
   * Gère silencieusement les erreurs pour ne pas bloquer l'UI
   */
  fetchLevels: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_BASE}/levels`);
      
      if (!response.ok) {
        // Si l'API n'est pas disponible, on continue silencieusement
        console.warn('Levels API not available');
        set({ savedLevels: [], isLoading: false });
        return;
      }
      
      const levels = await response.json();
      set({ savedLevels: levels, isLoading: false });
    } catch (error) {
      // Erreur silencieuse - l'API n'est peut-être pas encore prête
      console.warn('Could not fetch levels (this is normal on first load):', (error as Error).message);
      set({ savedLevels: [], isLoading: false });
    }
  },

  /**
   * Sauvegarde un level
   */
  saveLevel: async (sessionState: SessionState, existingId?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_BASE}/levels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionState, existingId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save level');
      }
      
      const savedLevel = await response.json();
      
      // Refresh the list
      await get().fetchLevels();
      
      set({ isLoading: false });
      return savedLevel;
    } catch (error) {
      console.error('Error saving level:', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  /**
   * Charge un level complet
   */
  loadLevel: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_BASE}/levels/${id}`);
      
      if (!response.ok) {
        throw new Error('Level not found');
      }
      
      const levelData = await response.json();
      set({ isLoading: false });
      return levelData;
    } catch (error) {
      console.error('Error loading level:', error);
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  /**
   * Supprime un level
   */
  deleteLevel: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_BASE}/levels/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete level');
      }
      
      // Refresh the list
      await get().fetchLevels();
      
      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('Error deleting level:', error);
      set({ error: (error as Error).message, isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
