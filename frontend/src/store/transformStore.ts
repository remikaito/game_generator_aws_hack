import { create } from 'zustand';
import type { SceneObject } from '../types';

/**
 * Mode de transformation disponibles
 */
export type TransformMode = 'translate' | 'rotate' | 'scale';

/**
 * Interface pour les modifications d'objet
 */
export interface ObjectTransform {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

interface TransformState {
  // État
  selectedObjectId: string | null;
  transformMode: TransformMode;
  isTransforming: boolean;
  
  // Modifications locales (avant synchronisation avec le backend)
  pendingTransforms: Map<string, ObjectTransform>;
  
  // Actions
  selectObject: (objectId: string | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  setTransforming: (value: boolean) => void;
  
  // Gestion des transformations
  updateObjectTransform: (objectId: string, transform: ObjectTransform) => void;
  getObjectTransform: (objectId: string) => ObjectTransform | undefined;
  clearPendingTransform: (objectId: string) => void;
  clearAllPendingTransforms: () => void;
  
  // Raccourcis clavier
  cycleTransformMode: () => void;
}

/**
 * Store pour gérer la sélection et transformation des objets 3D
 */
export const useTransformStore = create<TransformState>((set, get) => ({
  selectedObjectId: null,
  transformMode: 'translate',
  isTransforming: false,
  pendingTransforms: new Map(),

  /**
   * Sélectionner un objet (null pour désélectionner)
   */
  selectObject: (objectId) => {
    set({ selectedObjectId: objectId });
  },

  /**
   * Changer le mode de transformation
   */
  setTransformMode: (mode) => {
    set({ transformMode: mode });
  },

  /**
   * Indiquer si une transformation est en cours
   */
  setTransforming: (value) => {
    set({ isTransforming: value });
  },

  /**
   * Mettre à jour la transformation d'un objet
   */
  updateObjectTransform: (objectId, transform) => {
    const { pendingTransforms } = get();
    const existing = pendingTransforms.get(objectId) || {};
    const updated = new Map(pendingTransforms);
    updated.set(objectId, { ...existing, ...transform });
    set({ pendingTransforms: updated });
  },

  /**
   * Obtenir la transformation pending d'un objet
   */
  getObjectTransform: (objectId) => {
    return get().pendingTransforms.get(objectId);
  },

  /**
   * Effacer la transformation pending d'un objet
   */
  clearPendingTransform: (objectId) => {
    const { pendingTransforms } = get();
    const updated = new Map(pendingTransforms);
    updated.delete(objectId);
    set({ pendingTransforms: updated });
  },

  /**
   * Effacer toutes les transformations pending
   */
  clearAllPendingTransforms: () => {
    set({ pendingTransforms: new Map() });
  },

  /**
   * Cycle entre les modes de transformation (raccourci clavier)
   */
  cycleTransformMode: () => {
    const { transformMode } = get();
    const modes: TransformMode[] = ['translate', 'rotate', 'scale'];
    const currentIndex = modes.indexOf(transformMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    set({ transformMode: modes[nextIndex] });
  },
}));
