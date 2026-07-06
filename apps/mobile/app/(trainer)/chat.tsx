import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView,
  Platform, FlatList, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/auth';

const COLORS = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  primary: '#6f5cf0',
  accent: '#06b6d4',
  success: '#10b981',
  text: '#f1f5f9',
  muted: '#64748b',
  border: 'rgba(255,255,255,0.08)',
  myBubble: '#6f5cf0',
  theirBubble: '#1a1a2e',
};

interface ChatRoom {
  id: string;
  participants?: Array<{
    userId: string;
    user?: {
      id?: string;
      profile?: {
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
      };
      role?: string;
    };
  }>;
  messages?: Array<{
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  }>;
  unreadCount?: number;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  type?: string;
}

const AVATAR_COLORS: [string, string][] = [
  ['#6f5cf0', '#06b6d4'],
  ['#10b981', '#06b6d4'],
  ['#f59e0b', '#ef4444'],
  ['#8b5cf6', '#ec4899'],
];

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function TrainerChatScreen() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<any>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUserId = (user as any)?.id || '';

  const loadRooms = useCallback(async () => {
    try {
      const res = await api.get('/chat');
      const data = res.data;
      setRooms(Array.isArray(data) ? data : []);
    } catch {}
    setLoadingRooms(false);
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const loadMessages = useCallback(async (roomId: string) => {
    try {
      setLoadingMessages(true);
      const res = await api.get(`/chat/${roomId}/messages`);
      const data = res.data;
      const msgs = Array.isArray(data) ? data : (data?.messages || []);
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        Alert.alert('Erro', 'Não foi possível carregar as mensagens.');
      }
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const connectSocket = useCallback((roomId: string) => {
    try {
      const { io } = require('socket.io-client');
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://fitlynutri.com.br';
      const token = (useAuthStore.getState() as any).token;
      const socket = io(API_URL, {
        auth: { token },
        transports: ['websocket'],
        timeout: 5000,
      });

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('joinChat', roomId);
      });

      socket.on('disconnect', () => setConnected(false));

      socket.on('newMessage', (msg: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        loadRooms();
      });

      socket.on('connect_error', () => {
        setConnected(false);
        startPolling(roomId);
      });

      socketRef.current = socket;
    } catch {
      startPolling(roomId);
    }
  }, []);

  const startPolling = useCallback((roomId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/chat/${roomId}/messages`);
        const data = res.data;
        const msgs = Array.isArray(data) ? data : (data?.messages || []);
        setMessages(msgs);
      } catch {}
    }, 5000);
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setConnected(false);
  }, []);

  const handleSelectRoom = useCallback((room: ChatRoom) => {
    disconnectSocket();
    setSelectedRoom(room);
    setMessages([]);
    loadMessages(room.id);
    connectSocket(room.id);
  }, [disconnectSocket, loadMessages, connectSocket]);

  const handleBack = useCallback(() => {
    disconnectSocket();
    setSelectedRoom(null);
    setMessages([]);
    loadRooms();
  }, [disconnectSocket, loadRooms]);

  useEffect(() => {
    return () => { disconnectSocket(); };
  }, [disconnectSocket]);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedRoom) return;
    const content = inputText.trim();
    setInputText('');

    const optimisticMsg: Message = {
      id: `tmp-${Date.now()}`,
      content,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      type: 'TEXT',
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      setSending(true);
      if (socketRef.current?.connected) {
        socketRef.current.emit('sendMessage', { chatId: selectedRoom.id, content, type: 'TEXT' });
      } else {
        const res = await api.post(`/chat/${selectedRoom.id}/messages`, { content, type: 'TEXT' });
        const newMsg = res.data?.data || res.data;
        setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? (newMsg || m) : m));
      }
      loadRooms();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = (room: ChatRoom) => {
    return room.participants?.find((p) => p.userId !== currentUserId)?.user;
  };

  if (selectedRoom) {
    const otherUser = getOtherUser(selectedRoom);
    const first = otherUser?.profile?.firstName;
    const last = otherUser?.profile?.lastName;
    const otherName = `${first || ''} ${last || ''}`.trim() || 'Aluno';
    const otherInitials = getInitials(first, last);

    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <LinearGradient colors={['#6f5cf020', '#06b6d420']} style={styles.chatHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <LinearGradient colors={['#6f5cf0', '#06b6d4']} style={styles.chatAvatar}>
            <Text style={styles.chatAvatarText}>{otherInitials}</Text>
          </LinearGradient>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName}>{otherName}</Text>
            <View style={styles.chatStatusRow}>
              <View style={[styles.statusDot, { backgroundColor: connected ? COLORS.success : COLORS.muted }]} />
              <Text style={[styles.chatStatus, { color: connected ? COLORS.success : COLORS.muted }]}>
                {connected ? 'Online' : 'Aluno'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {loadingMessages ? (
          <View style={styles.messagesLoading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.noMessages}>
                <Text style={styles.noMessagesIcon}>💬</Text>
                <Text style={styles.noMessagesText}>Nenhuma mensagem ainda</Text>
                <Text style={styles.noMessagesSubtext}>Inicie a conversa!</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMine = item.senderId === currentUserId;
              return (
                <View style={[styles.messageWrapper, isMine ? styles.messageWrapperMine : styles.messageWrapperTheirs]}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                      {item.content}
                    </Text>
                    <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
                      {formatMessageTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Escreva uma mensagem..."
            placeholderTextColor={COLORS.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <LinearGradient
              colors={['#6f5cf0', '#06b6d4']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.sendButtonGradient}
            >
              <Text style={styles.sendButtonIcon}>{sending ? '...' : '➤'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6f5cf020', '#06b6d420']} style={styles.header}>
        <Text style={styles.title}>Mensagens</Text>
        <Text style={styles.subtitle}>Converse com seus alunos</Text>
      </LinearGradient>

      {loadingRooms ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando conversas...</Text>
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>Nenhuma conversa ainda</Text>
          <Text style={styles.emptySubtext}>Seus alunos poderão entrar em contato com você aqui</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.roomsList}>
          {rooms.map((room, index) => {
            const otherUser = getOtherUser(room);
            const first = otherUser?.profile?.firstName;
            const last = otherUser?.profile?.lastName;
            const name = `${first || ''} ${last || ''}`.trim() || 'Aluno';
            const initials = getInitials(first, last);
            const lastMsg = room.messages?.[0];
            const avatarColors = AVATAR_COLORS[index % AVATAR_COLORS.length];
            const hasUnread = (room.unreadCount || 0) > 0;

            return (
              <TouchableOpacity
                key={room.id}
                style={[styles.roomCard, hasUnread && styles.roomCardUnread]}
                onPress={() => handleSelectRoom(room)}
                activeOpacity={0.8}
              >
                <LinearGradient colors={avatarColors} style={styles.roomAvatar}>
                  <Text style={styles.roomAvatarText}>{initials}</Text>
                </LinearGradient>
                <View style={styles.roomInfo}>
                  <View style={styles.roomTopRow}>
                    <Text style={[styles.roomName, hasUnread && styles.roomNameUnread]}>{name}</Text>
                    {lastMsg && <Text style={styles.roomTime}>{timeAgo(lastMsg.createdAt)}</Text>}
                  </View>
                  <Text style={styles.roomRole}>Aluno</Text>
                  <Text style={[styles.roomLastMsg, hasUnread && styles.roomLastMsgUnread]} numberOfLines={1}>
                    {lastMsg?.content || 'Nenhuma mensagem ainda'}
                  </Text>
                </View>
                {hasUnread ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{room.unreadCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 60 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: COLORS.muted, marginTop: 12 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptySubtext: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },
  roomsList: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomCardUnread: { borderColor: COLORS.primary + '40', backgroundColor: COLORS.primary + '08' },
  roomAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  roomAvatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  roomInfo: { flex: 1, marginLeft: 12 },
  roomTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomName: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  roomNameUnread: { fontWeight: '700' },
  roomTime: { color: COLORS.muted, fontSize: 11 },
  roomRole: { color: COLORS.accent, fontSize: 11, marginTop: 1 },
  roomLastMsg: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  roomLastMsgUnread: { color: COLORS.text, fontWeight: '500' },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 60, gap: 12 },
  backButton: { padding: 4 },
  backIcon: { color: COLORS.text, fontSize: 22 },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  chatStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  chatStatus: { fontSize: 11 },
  messagesLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messagesList: { paddingHorizontal: 16, paddingVertical: 16 },
  noMessages: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  noMessagesIcon: { fontSize: 40, marginBottom: 12 },
  noMessagesText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  noMessagesSubtext: { color: COLORS.muted, fontSize: 13, marginTop: 6 },
  messageWrapper: { marginBottom: 8, maxWidth: '78%' },
  messageWrapperMine: { alignSelf: 'flex-end' },
  messageWrapperTheirs: { alignSelf: 'flex-start' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: COLORS.myBubble, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: COLORS.theirBubble, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextTheirs: { color: COLORS.text },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  bubbleTimeTheirs: { color: COLORS.muted },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  messageInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sendButtonIcon: { color: '#fff', fontSize: 18 },
});
