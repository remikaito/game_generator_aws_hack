import { create } from 'zustand';
import type { ChatMessage, EditResult, ChatState } from '../types';

interface ChatStoreState {
  // Chat state
  messages: ChatMessage[];
  isProcessing: boolean;
  currentEdit: EditResult | null;
  isOpen: boolean;
  
  // Actions
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setProcessing: (isProcessing: boolean) => void;
  setCurrentEdit: (edit: EditResult | null) => void;
  updateEditStatus: (editId: string, status: EditResult['status']) => void;
  setOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
  initFromChatState: (chatState: ChatState) => void;
  reset: () => void;
}

const initialState = {
  messages: [],
  isProcessing: false,
  currentEdit: null,
  isOpen: false,
};

export const useChatStore = create<ChatStoreState>((set, get) => ({
  ...initialState,

  setMessages: (messages) => set({ messages }),

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  setProcessing: (isProcessing) => set({ isProcessing }),

  setCurrentEdit: (currentEdit) => set({ currentEdit }),

  updateEditStatus: (editId, status) => {
    set((state) => {
      // Update current edit if it matches
      let currentEdit = state.currentEdit;
      if (currentEdit?.id === editId) {
        currentEdit = { ...currentEdit, status };
      }

      // Update in messages
      const messages = state.messages.map((msg) => {
        if (msg.edit_result?.id === editId) {
          return {
            ...msg,
            edit_result: { ...msg.edit_result, status },
          };
        }
        return msg;
      });

      return { currentEdit, messages };
    });
  },

  setOpen: (isOpen) => set({ isOpen }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  initFromChatState: (chatState) => {
    set({
      messages: chatState.messages,
      isProcessing: chatState.is_processing,
      currentEdit: chatState.current_edit || null,
      isOpen: true, // Open chat when initialized
    });
  },

  reset: () => set(initialState),
}));
