'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Search, Phone, Video, MoreVertical,
  ChevronLeft, Wifi, WifiOff,
  Dumbbell, Apple, X,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useChatSocket, ChatSocketMessage } from '@/hooks/useChatSocket';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function StudentChatInner() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedChat, setSelectedChat] = useState<string | null>(searchParams.get('chatId'));
  const [localMessages, setLocalMessages] = useState<ChatSocketMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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
    onUserOnline: (userId) => setOnlineUsers((s) => new Set(s).add(userId)),
    onUserOffline: (userId) => setOnlineUsers((s) => { const n = new Set(s); n.delete(userId); return n; }),
    onInitialOnlineUsers: (userIds) => setOnlineUsers(new Set(userIds)),
    onNotificationMessage: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['student-chats'] });
    },
  });

  const { data: chats } = useQuery({
    queryKey: ['student-chats'],
    queryFn: () => api.get('/chat').then((r) => r.data.data),
    refetchInterval: 15000,
  });

  const { data: contacts } = useQuery({
    queryKey: ['student-contacts'],
    queryFn: () => api.get('/students/me/contacts').then((r) => r.data.data),
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
      queryClient.invalidateQueries({ queryKey: ['chat-unread-count'] });
    }
    return () => { if (selectedChat) leaveChat(selectedChat); };
  }, [selectedChat, joinChat, leaveChat, markAsRead, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const filteredChats = (chats || []).filter((c: any) => {
    const other = c.participants?.find((p: any) => p.userId !== user?.id);
    const name = `${other?.user?.profile?.firstName || ''} ${other?.user?.profile?.lastName || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // Contatos que ainda não têm chat iniciado
  const allContacts = [...(contacts?.trainers || []), ...(contacts?.nutritionists || [])];
  const contactsWithoutChat = allContacts.filter((contact: any) =>
    !(chats || []).some((c: any) =>
      c.participants?.some((p: any) => p.userId === contact.userId),
    ),
  );

  const activeChat = (chats || []).find((c: any) => c.id === selectedChat);
  const otherUser = activeChat?.participants?.find((p: any) => p.userId !== user?.id)?.user;
  const isOtherOnline = otherUser?.id ? onlineUsers.has(otherUser.id) : false;

  const handleTyping = useCallback(() => {
    if (!selectedChat) return;
    startTyping(selectedChat);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => stopTyping(selectedChat), 2000);
  }, [selectedChat, startTyping, stopTyping]);

  const handleSend = async (content: string, type = 'TEXT', fileUrl?: string, fileName?: string) => {
    if (!selectedChat) return;
    stopTyping(selectedChat);
    if (type === 'TEXT') {
      try {
        await sendMessage(selectedChat, content);
      } catch {
        const res = await api.post(`/chat/${selectedChat}/messages`, { content, type });
        setLocalMessages((prev) => [...prev, res.data.data]);
        queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedChat] });
      }
    } else {
      const res = await api.post(`/chat/${selectedChat}/messages`, { content, type, fileUrl, fileName });
      setLocalMessages((prev) => [...prev, res.data.data]);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setLocalMessages([]);
    setTypingUsers(new Set());
    setMenuOpen(false);
    setSelectedChat(chatId);
  };

  const handleStartChatWithContact = async (contactUserId: string) => {
    try {
      const res = await api.post(`/chat/direct/${contactUserId}`);
      const chatId = res.data.data?.id ?? res.data.id;
      queryClient.invalidateQueries({ queryKey: ['student-chats'] });
      handleSelectChat(chatId);
    } catch {
      toast.error('Erro ao abrir conversa');
    }
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
          {/* Contatos disponíveis (sem chat iniciado) */}
          {contactsWithoutChat.length > 0 && (
            <div className="p-3 border-b border-border/20">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2 px-1">Seus profissionais</p>
              {contactsWithoutChat.map((contact: any) => {
                const initials = `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`;
                const isTrainer = contact.role === 'TRAINER';
                return (
                  <button
                    key={contact.userId}
                    onClick={() => handleStartChatWithContact(contact.userId)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-all text-left rounded-xl"
                  >
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${isTrainer ? 'from-purple-600 to-indigo-600' : 'from-emerald-600 to-teal-600'} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden`}>
                      {contact.avatarUrl
                        ? <img src={contact.avatarUrl} alt="" className="w-full h-full object-cover" />
                        : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{contact.firstName} {contact.lastName}</div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        {isTrainer ? <Dumbbell className="w-3 h-3" /> : <Apple className="w-3 h-3" />}
                        {isTrainer ? 'Personal Trainer' : 'Nutricionista'}
                      </div>
                    </div>
                    <span className="text-[10px] text-primary font-medium">Iniciar</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Chats existentes */}
          {filteredChats.length > 0 ? (
            <>
              {contactsWithoutChat.length > 0 && (
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium px-4 py-2">Conversas</p>
              )}
              {filteredChats.map((chat: any) => {
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
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${colors[ci]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden`}>
                        {other?.profile?.avatarUrl
                          ? <img src={other.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                          : initials}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${onlineUsers.has(other?.id) ? 'bg-emerald-400' : 'bg-red-500'}`} />
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
              })}
            </>
          ) : contactsWithoutChat.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                <Send className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma conversa ainda</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Seu trainer ou nutricionista irá entrar em contato</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Chat window */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col glass rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border/50">
            <button onClick={() => setSelectedChat(null)} className="lg:hidden w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                {otherUser?.profile?.avatarUrl
                  ? <img src={otherUser.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : `${otherUser?.profile?.firstName?.[0] || ''}${otherUser?.profile?.lastName?.[0] || ''}`}
              </div>
              {isOtherOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-card" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{otherUser?.profile?.firstName} {otherUser?.profile?.lastName}</div>
              <div className="text-xs">
                {isOtherOnline
                  ? <span className="text-emerald-400">Online</span>
                  : <span className="text-muted-foreground">{otherUser?.role === 'TRAINER' ? 'Personal Trainer' : 'Nutricionista'}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toast('Chamadas de voz em breve', { icon: '📞' })}
                className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all"
              >
                <Phone className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => toast('Chamadas de vídeo em breve', { icon: '🎥' })}
                className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all"
              >
                <Video className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className="absolute right-0 top-10 w-44 glass rounded-xl border border-border/50 shadow-xl z-20 overflow-hidden"
                    >
                      <button
                        onClick={() => { setMenuOpen(false); toast('Histórico exportado em breve', { icon: '📄' }); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-all"
                      >
                        Exportar conversa
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setSelectedChat(null);
                          setLocalMessages([]);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-all text-destructive"
                      >
                        Fechar conversa
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
            <AnimatePresence initial={false}>
              {localMessages.map((msg: any) => (
                <ChatBubble key={msg.id} msg={msg} isMine={msg.senderId === user?.id} />
              ))}
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

          <ChatInput selectedChat={selectedChat} onSend={handleSend} onTyping={handleTyping} />
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

export default function StudentChat() {
  return (
    <Suspense>
      <StudentChatInner />
    </Suspense>
  );
}
