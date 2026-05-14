'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = localStorage.getItem('fitsaas-auth');
    if (!storage) return null;
    const { state } = JSON.parse(storage);
    return state?.accessToken ?? null;
  } catch {
    return null;
  }
}

export interface ChatSocketMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: string;
  createdAt: string;
  sender?: any;
}

interface UseChatSocketOptions {
  onMessage?: (msg: ChatSocketMessage) => void;
  onTypingStart?: (userId: string) => void;
  onTypingStop?: (userId: string) => void;
  onUserOnline?: (userId: string) => void;
  onUserOffline?: (userId: string) => void;
}

export function useChatSocket(options: UseChatSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const currentChatRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const socket = io(`${baseUrl}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('message:received', (msg: ChatSocketMessage) => {
      optionsRef.current.onMessage?.(msg);
    });

    socket.on('typing:start', ({ userId }: { userId: string }) => {
      optionsRef.current.onTypingStart?.(userId);
    });

    socket.on('typing:stop', ({ userId }: { userId: string }) => {
      optionsRef.current.onTypingStop?.(userId);
    });

    socket.on('user:online', ({ userId }: { userId: string }) => {
      optionsRef.current.onUserOnline?.(userId);
    });

    socket.on('user:offline', ({ userId }: { userId: string }) => {
      optionsRef.current.onUserOffline?.(userId);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  const joinChat = useCallback((chatId: string) => {
    if (currentChatRef.current && currentChatRef.current !== chatId) {
      socketRef.current?.emit('chat:leave', { chatId: currentChatRef.current });
    }
    socketRef.current?.emit('chat:join', { chatId });
    currentChatRef.current = chatId;
  }, []);

  const leaveChat = useCallback((chatId: string) => {
    socketRef.current?.emit('chat:leave', { chatId });
    if (currentChatRef.current === chatId) currentChatRef.current = null;
  }, []);

  const sendMessage = useCallback((chatId: string, content: string, type = 'TEXT') => {
    return new Promise<ChatSocketMessage>((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      socketRef.current.emit('message:send', { chatId, content, type }, (response: ChatSocketMessage) => {
        resolve(response);
      });
    });
  }, []);

  const markAsRead = useCallback((chatId: string) => {
    socketRef.current?.emit('message:read', { chatId });
  }, []);

  const startTyping = useCallback((chatId: string) => {
    socketRef.current?.emit('typing:start', { chatId });
  }, []);

  const stopTyping = useCallback((chatId: string) => {
    socketRef.current?.emit('typing:stop', { chatId });
  }, []);

  return { connected, joinChat, leaveChat, sendMessage, markAsRead, startTyping, stopTyping };
}
