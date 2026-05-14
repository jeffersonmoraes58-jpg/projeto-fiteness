'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Search, Phone, Video, MoreVertical,
  Smile, Paperclip, Mic, ChevronLeft, Wifi, WifiOff,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useChatSocket, ChatSocketMessage } from '@/hooks/useChatSocket';
import { cn } from '@/lib/utils';

export default function StudentChat() {
  const { user } = useAuthStore();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<ChatSocketMessage[]>([]);
  const [message, setMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const { connected, joinChat, leaveChat, sendMessage, markAsRead, startTyping, stopTyping } = useChatSocket({
    onMessage: (msg) => {
      setLocalMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      queryClient.invalidateQueries({ queryKey: ['student-chats'] });
    },
    onTypingStart: (userId) => {
      if (userId !== user?.id) setTypingUsers((s) => new Set(s).add(userId));
    },
    onTypingStop: (userId) => {
      setTypingUsers((s) => { const n = new Set(s); n.delete(userId); return n; });
    },
  });

  const { data: chats } = useQuery({
    queryKey: ['student-chats'],
    queryFn: () => api.get('/chat').then((r) => r.data.data),
    refetchInterval: 15000,
  });

  const { data: initialMessages } = useQuery({
    queryKey: ['chat-messages', selectedChat],
    queryFn: () => api.get(`/chat/${selectedChat}/messages`).then((r) => r.data.data),
    enabled: !!selectedChat,
  });

  useEffect(() => {
    if (initialMessages) {
      setLocalMessages(Array.isArray(initialMessages) ? initialMessages : initialMessages.messages || []);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (selectedChat) {
      joinChat(selectedChat);
      markAsRead(selectedChat);
    }
    return () => { if (selectedChat) leaveChat(selectedChat); };
  }, [selectedChat, joinChat, leaveChat, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const filteredChats = (chats || []).filter((c: any) => {
    const other = c.participants?.find((p: any) => p.userId !== user?.id);
    const name = `${other?.user?.profile?.firstName || ''} ${other?.user?.profile?.lastName || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const activeChat = (chats || []).find((c: any) => c.id === selectedChat);
  const otherUser = activeChat?.participants?.find((p: any) => p.userId !== user?.id)?.user;

  const handleTyping = useCallback(() => {
    if (!selectedChat) return;
    startTyping(selectedChat);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => stopTyping(selectedChat), 2000);
  }, [selectedChat, startTyping, stopTyping]);

  const handleSend = async () => {
    if (!message.trim() || !selectedChat) return;
    const content = message.trim();
    setMessage('');
    stopTyping(selectedChat);
    try {
      await sendMessage(selectedChat, content);
    } catch {
      api.post(`/chat/${selectedChat}/messages`, { content, type: 'TEXT' }).then(() =>
        queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedChat] }),
      );
    }
  };

  const handleSelectChat = (chatId: string) => {
    setLocalMessages([]);
    setTypingUsers(new Set());
    setSelectedChat(chatId);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Chat list */}
      <div className={cn(
        'w-full lg:w-80 flex-shrink-0 flex flex-col glass rounded-2xl overflow-hidden',
        selectedChat && 'hidden lg:flex',
      )}>
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Mensagens</h2>
            <span className={cn('flex items-center gap-1 text-[10px] font-medium', connected ? 'text-emerald-400' : 'text-muted-foreground')}>
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connected ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat: any) => {
              const other = chat.participants?.find((p: any) => p.userId !== user?.id)?.user;
              const lastMsg = chat.messages?.[0];
              const initials = `${other?.profile?.firstName?.[0] || ''}${other?.profile?.lastName?.[0] || ''}`;
              const colors = ['from-purple-600 to-indigo-600', 'from-cyan-600 to-blue-600', 'from-emerald-600 to-teal-600'];
              const ci = chat.id.charCodeAt(0) % colors.length;
              const hasUnread = chat.unreadCount > 0;

              return (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 hover:bg-accent transition-all text-left border-b border-border/20',
                    selectedChat === chat.id && 'bg-primary/10',
                  )}
                >
                  <div className="relative">
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${colors[ci]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                      {other?.profile?.avatarUrl
                        ? <img src={other.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                        : initials}
                    </div>
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={cn('text-sm truncate', hasUnread ? 'font-semibold' : 'font-medium')}>
                        {other?.profile?.firstName} {other?.profile?.lastName}
                      </span>
                      {lastMsg && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">
                          {new Date(lastMsg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className={cn('text-xs truncate mt-0.5', hasUnread ? 'text-foreground' : 'text-muted-foreground')}>
                      {lastMsg?.content || 'Nenhuma mensagem ainda'}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                <Send className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma conversa ainda</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat window */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col glass rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border/50">
            <button onClick={() => setSelectedChat(null)} className="lg:hidden w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
              {otherUser?.profile?.firstName?.[0]}{otherUser?.profile?.lastName?.[0]}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{otherUser?.profile?.firstName} {otherUser?.profile?.lastName}</div>
              <div className="text-xs text-muted-foreground">{otherUser?.role === 'TRAINER' ? 'Trainer' : 'Nutricionista'}</div>
            </div>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all"><Phone className="w-4 h-4 text-muted-foreground" /></button>
              <button className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all"><Video className="w-4 h-4 text-muted-foreground" /></button>
              <button className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
            <AnimatePresence initial={false}>
              {localMessages.map((msg: any) => {
                const isMine = msg.senderId === user?.id;
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[75%] px-4 py-2.5 rounded-2xl text-sm',
                      isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'glass rounded-bl-sm')}>
                      <p>{msg.content}</p>
                      <div className={cn('text-[10px] mt-1', isMine ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground')}>
                        {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {typingUsers.size > 0 && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <div className="glass rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-xl hover:bg-accent flex items-center justify-center transition-all flex-shrink-0"><Paperclip className="w-4 h-4 text-muted-foreground" /></button>
              <input
                type="text"
                placeholder="Digite uma mensagem..."
                value={message}
                onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                className="input-field flex-1 py-2.5 text-sm"
              />
              <button className="w-9 h-9 rounded-xl hover:bg-accent flex items-center justify-center transition-all flex-shrink-0"><Smile className="w-4 h-4 text-muted-foreground" /></button>
              {message.trim() ? (
                <button onClick={handleSend} className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center hover:bg-primary/80 transition-all flex-shrink-0">
                  <Send className="w-4 h-4 text-white" />
                </button>
              ) : (
                <button className="w-9 h-9 rounded-xl hover:bg-accent flex items-center justify-center transition-all flex-shrink-0"><Mic className="w-4 h-4 text-muted-foreground" /></button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 glass rounded-2xl items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Selecione uma conversa</h3>
            <p className="text-sm text-muted-foreground">Escolha uma conversa à esquerda para começar</p>
          </div>
        </div>
      )}
    </div>
  );
}
