'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Sparkles, User, Copy, RefreshCw,
  Dumbbell, Target, Zap, TrendingUp, ChevronRight,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  { icon: Dumbbell, label: 'Monte um treino de hipertrofia para iniciantes 3x por semana', color: 'text-purple-400' },
  { icon: Target, label: 'Crie um programa periodizado de 12 semanas para ganho de força', color: 'text-cyan-400' },
  { icon: TrendingUp, label: 'Monte um treino HIIT de 30 minutos para perda de gordura', color: 'text-emerald-400' },
  { icon: Zap, label: 'Sugira exercícios de mobilidade e aquecimento para treino de pernas', color: 'text-orange-400' },
];

export default function TrainerAI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Olá! Sou sua assistente de IA especializada em fitness e treinamento. Posso ajudar com:\n\n• Criação de programas de treino personalizados\n• Periodização e progressão de cargas\n• Exercícios alternativos e substituições\n• Estratégias para objetivos específicos\n• Análise de treinos e sugestões de melhoria\n\nComo posso ajudar você hoje?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const buildHistory = (msgs: Message[]) =>
    msgs.slice(1).map((m) => ({ role: m.role, content: m.content }));

  const sendMutation = useMutation({
    mutationFn: ({ message, history }: { message: string; history: any[] }) =>
      api.post('/ai/assistant', { message, history }).then((r) => r.data.data),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.reply || data.response || String(data),
        timestamp: new Date(),
      }]);
    },
    onError: () => {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
        timestamp: new Date(),
      }]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text?: string) => {
    const content = text || input.trim();
    if (!content) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      sendMutation.mutate({ message: content, history: buildHistory(next) });
      return next;
    });
    setInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">IA Fitness</h1>
          <p className="text-sm text-muted-foreground">Assistente especializado em treinamento</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pr-1">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}
            >
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                msg.role === 'assistant' ? 'bg-gradient-to-br from-purple-600 to-indigo-600' : 'bg-gradient-to-br from-cyan-600 to-blue-600',
              )}>
                {msg.role === 'assistant' ? <Brain className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
              </div>
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm relative group',
                msg.role === 'assistant' ? 'glass rounded-tl-sm' : 'bg-primary text-primary-foreground rounded-tr-sm',
              )}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <div className={cn('text-[10px] mt-2', msg.role === 'assistant' ? 'text-muted-foreground' : 'text-primary-foreground/70')}>
                  {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-accent flex items-center justify-center transition-all"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {sendMutation.isPending && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {messages.length === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
            <p className="text-xs text-muted-foreground text-center mb-3">Sugestões</p>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s.label)}
                className="w-full flex items-center gap-3 p-3 glass rounded-xl hover:bg-accent transition-all text-left group"
              >
                <s.icon className={`w-4 h-4 ${s.color} flex-shrink-0`} />
                <span className="text-sm flex-1">{s.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4 glass rounded-2xl p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Descreva o que precisa... (Enter para enviar)"
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none py-2 px-2 max-h-32 overflow-y-auto scrollbar-hide"
            style={{ fieldSizing: 'content' } as any}
          />
          <div className="flex items-center gap-1.5 pb-1">
            <button onClick={() => setMessages([messages[0]])} className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all" title="Nova conversa">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sendMutation.isPending}
              className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                input.trim() && !sendMutation.isPending ? 'bg-primary hover:bg-primary/80' : 'bg-muted cursor-not-allowed',
              )}
            >
              {sendMutation.isPending
                ? <Sparkles className="w-4 h-4 text-muted-foreground animate-spin" />
                : <Send className="w-4 h-4 text-white" />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
