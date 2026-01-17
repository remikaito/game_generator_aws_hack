import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../store/appStore';
import { useChatStore } from '../store/chatStore';
import { useLevelsStore } from '../store/levelsStore';
import type { SessionState, SceneConfig, ChatMessage, ChatState, EditResult } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

/**
 * Custom hook for WebSocket communication with the backend
 */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  
  const {
    setSession,
    updateProgress,
    setGenerating,
    addLog,
    updateSceneConfig,
    clearLogs,
  } = useAppStore();

  const {
    addMessage,
    setProcessing,
    setCurrentEdit,
    updateEditStatus,
    initFromChatState,
    setOpen,
  } = useChatStore();

  const { saveLevel, fetchLevels } = useLevelsStore();

  // Initialize socket connection
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Session events
    socket.on('session_created', (data: { session_id: string }) => {
      console.log('Session created:', data.session_id);
    });

    socket.on('progress', (data: { step: string; status: string; progress?: number }) => {
      updateProgress(
        data.step as SessionState['progress']['step'],
        data.status as SessionState['progress']['status'],
        data.progress,
      );
    });

    socket.on('log', (message: string) => {
      addLog(message);
    });

    socket.on('complete', async (session: SessionState) => {
      setSession(session);
      setGenerating(false);
      addLog('Generation complete!');
      
      // Auto-save the level
      try {
        addLog('Auto-saving level...');
        await saveLevel(session);
        addLog('Level saved successfully!');
        // Refresh the levels list
        await fetchLevels();
      } catch (error) {
        console.error('Auto-save failed:', error);
        addLog('Warning: Could not auto-save level');
      }
      
      // Initialize chat
      if (session.session_id) {
        socket.emit('init_chat', { session_id: session.session_id });
      }
    });

    socket.on('error', (data: { message: string }) => {
      addLog(`Error: ${data.message}`);
      setGenerating(false);
    });

    // Chat events
    socket.on('chat_state', (chatState: ChatState) => {
      initFromChatState(chatState);
    });

    socket.on('chat_message', (message: ChatMessage) => {
      addMessage(message);
    });

    socket.on('edit_started', (data: { instruction: string; edit_id: string }) => {
      setProcessing(true);
      addLog(`Processing edit: ${data.instruction}`);
    });

    socket.on('edit_preview', (editResult: EditResult) => {
      setCurrentEdit(editResult);
    });

    socket.on('edit_asset_progress', (data: { edit_id: string; status: string; progress: number }) => {
      addLog(`[Edit] ${data.status} (${data.progress}%)`);
    });

    socket.on('edit_applied', (data: { edit_id: string; scene_config: SceneConfig; explanation: string }) => {
      updateSceneConfig(data.scene_config);
      updateEditStatus(data.edit_id, 'completed');
      setCurrentEdit(null);
      setProcessing(false);
      addLog(`Edit applied: ${data.explanation}`);
    });

    socket.on('scene_updated', (sceneConfig: SceneConfig) => {
      updateSceneConfig(sceneConfig);
    });

    socket.on('edit_error', (data: { message: string }) => {
      addLog(`Edit error: ${data.message}`);
      setCurrentEdit(null);
      setProcessing(false);
    });

    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, []);

  // Generate function
  const generate = useCallback((prompt: string) => {
    if (!socketRef.current) return;

    clearLogs();
    setGenerating(true);
    addLog(`Starting generation for: "${prompt}"`);
    
    socketRef.current.emit('generate', { prompt });
  }, [clearLogs, setGenerating, addLog]);

  // Send edit command
  const sendEdit = useCallback((sessionId: string, instruction: string) => {
    if (!socketRef.current) return;

    setProcessing(true);
    socketRef.current.emit('edit', { session_id: sessionId, instruction });
  }, [setProcessing]);

  // Initialize chat for a session
  const initChat = useCallback((sessionId: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit('init_chat', { session_id: sessionId });
    setOpen(true);
  }, [setOpen]);

  return {
    socket: socketRef.current,
    generate,
    sendEdit,
    initChat,
  };
}
