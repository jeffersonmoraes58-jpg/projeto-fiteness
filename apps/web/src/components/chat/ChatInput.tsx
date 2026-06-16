'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Smile, Mic, X } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const EMOJIS = [
  '😀','😂','😍','🥰','😎','🤔','😊','🙏','❤️','🔥',
  '👍','👏','🎉','💪','✅','⭐','🏋️','🥗','💊','🏃',
  '😴','😅','🤗','😁','🙌','💯','🎯','🚀','🌟','😮',
  '😢','😤','🤦','🤷','🙃','😏','🥳','🤩','😬','👌',
  '🤝','✌️','🫂','🫶','💚','💙','🧡','💧','⚡','🎵',
];

export interface ChatInputProps {
  selectedChat: string;
  onSend: (content: string, type?: string, fileUrl?: string, fileName?: string) => Promise<void>;
  onTyping: () => void;
}

export function ChatInput({ selectedChat, onSend, onTyping }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    const content = message.trim();
    setMessage('');
    await onSend(content, 'TEXT');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/uploads/chat', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { url, originalName, resourceType } = res.data.data;
      const type = resourceType === 'image' ? 'IMAGE' : 'FILE';
      await onSend(originalName || file.name, type, url, originalName || file.name);
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      recordingChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        if (blob.size < 500) return;
        setUploading(true);
        try {
          const form = new FormData();
          form.append('file', blob, `voice.${mimeType.includes('webm') ? 'webm' : 'm4a'}`);
          const res = await api.post('/uploads/chat', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          await onSend('Áudio', 'VOICE', res.data.data.url);
        } catch {
          toast.error('Erro ao enviar áudio');
        } finally {
          setUploading(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error('Permissão de microfone negada');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const cancelRecording = () => {
    recordingChunksRef.current = [];
    mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="p-4 border-t border-border/50">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />

      {isRecording ? (
        <div className="flex items-center gap-2">
          <button onClick={cancelRecording} className="w-9 h-9 rounded-xl hover:bg-accent flex items-center justify-center transition-all flex-shrink-0">
            <X className="w-4 h-4 text-destructive" />
          </button>
          <div className="flex-1 flex items-center gap-2 glass rounded-xl px-4 py-2.5">
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"
            />
            <span className="text-sm text-red-400 font-medium">Gravando...</span>
            <span className="text-sm font-mono ml-auto text-muted-foreground">{fmt(recordingTime)}</span>
          </div>
          <button
            onClick={stopRecording}
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center hover:bg-primary/80 transition-all flex-shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-9 h-9 rounded-xl hover:bg-accent flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-50"
          >
            {uploading
              ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              : <Paperclip className="w-4 h-4 text-muted-foreground" />}
          </button>

          <input
            type="text"
            placeholder="Digite uma mensagem..."
            value={message}
            onChange={(e) => { setMessage(e.target.value); onTyping(); }}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="input-field flex-1 py-2.5 text-sm"
          />

          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="w-9 h-9 rounded-xl hover:bg-accent flex items-center justify-center transition-all flex-shrink-0">
                <Smile className="w-4 h-4 text-muted-foreground" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                side="top"
                align="end"
                sideOffset={8}
                className="z-50 w-72 glass border border-border/50 rounded-2xl p-3 shadow-xl"
              >
                <div className="grid grid-cols-10 gap-0.5">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setMessage((m) => m + emoji)}
                      className="w-7 h-7 flex items-center justify-center text-base hover:bg-accent rounded-lg transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {message.trim() ? (
            <button
              onClick={handleSend}
              className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center hover:bg-primary/80 transition-all flex-shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="w-9 h-9 rounded-xl hover:bg-accent flex items-center justify-center transition-all flex-shrink-0"
            >
              <Mic className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
