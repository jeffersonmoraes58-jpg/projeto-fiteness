'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Sparkles, User, Copy, RefreshCw,
  Dumbbell, Target, Zap, TrendingUp, ChevronRight,
  FlaskConical, CheckCircle2, AlertTriangle, Star,
  ChevronDown, ChevronUp, Loader2, Check, ArrowRight,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Chat types ──────────────────────────────────────────────────────────────

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

// ─── Analysis types ───────────────────────────────────────────────────────────

interface ProposedExercise {
  exerciseId: string | null;
  exerciseName: string;
  action: 'add' | 'update' | 'remove';
  current: { sets: number; reps: string; weight: number; rest: number } | null;
  proposed: { sets: number; reps: string; weight: number; rest: number } | null;
  reason: string;
}

interface ProposedPlan {
  planId: string;
  planName: string;
  reason: string;
  exercises: ProposedExercise[];
}

interface AnalysisResult {
  rating: number;
  summary: string;
  positives: string[];
  concerns: string[];
  recommendations: string[];
  proposedChanges: ProposedPlan[];
  _studentName: string;
  _plans: { id: string; name: string; workoutId: string }[];
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TrainerAI() {
  const [tab, setTab] = useState<'chat' | 'analysis'>('chat');

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
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

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 glass rounded-xl w-fit">
        <button
          onClick={() => setTab('chat')}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
            tab === 'chat' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Chat
        </button>
        <button
          onClick={() => setTab('analysis')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
            tab === 'analysis' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Análise de Aluno
        </button>
      </div>

      {tab === 'chat' ? <ChatTab /> : <AnalysisTab />}
    </div>
  );
}

// ─── Chat tab ─────────────────────────────────────────────────────────────────

function ChatTab() {
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
    <>
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
    </>
  );
}

// ─── Analysis tab ─────────────────────────────────────────────────────────────

function AnalysisTab() {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [appliedPlans, setAppliedPlans] = useState<Set<string>>(new Set());

  const { data: students } = useQuery({
    queryKey: ['trainer-students-list'],
    queryFn: () => api.get('/trainers/me/students').then((r) => (r.data?.data ?? r.data) as any[]),
  });

  const analyzeMutation = useMutation({
    mutationFn: (studentId: string) =>
      api.post(`/ai/analyze-student/${studentId}`).then((r) => r.data?.data ?? r.data),
    onSuccess: (data) => {
      setAnalysis(data);
      setAppliedPlans(new Set());
    },
  });

  const applyMutation = useMutation({
    mutationFn: ({ planId, exercises }: { planId: string; exercises: any[] }) =>
      api.post('/ai/apply-changes', { planId, exercises }).then((r) => r.data?.data ?? r.data),
    onSuccess: (_, vars) => {
      setAppliedPlans((prev) => { const next = new Set(prev); next.add(vars.planId); return next; });
    },
  });

  const handleAnalyze = () => {
    if (!selectedStudent) return;
    setAnalysis(null);
    analyzeMutation.mutate(selectedStudent);
  };

  const handleApply = (plan: ProposedPlan) => {
    applyMutation.mutate({ planId: plan.planId, exercises: plan.exercises });
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pr-1">
      {/* Student selector */}
      <div className="glass-card">
        <h2 className="text-sm font-semibold mb-3">Selecionar aluno para análise</h2>
        <div className="flex gap-3">
          <select
            value={selectedStudent}
            onChange={(e) => { setSelectedStudent(e.target.value); setAnalysis(null); }}
            className="flex-1 bg-background border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Escolha um aluno...</option>
            {(students || []).map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.user?.profile?.firstName} {s.user?.profile?.lastName} — {s.user?.email}
              </option>
            ))}
          </select>
          <button
            onClick={handleAnalyze}
            disabled={!selectedStudent || analyzeMutation.isPending}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
              selectedStudent && !analyzeMutation.isPending
                ? 'bg-primary hover:bg-primary/80 text-primary-foreground'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            {analyzeMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
            ) : (
              <><FlaskConical className="w-4 h-4" /> Analisar</>
            )}
          </button>
        </div>
        {analyzeMutation.isPending && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 animate-pulse text-purple-400" />
            A IA está analisando treinos, cargas, frequência e histórico do aluno. Isso pode levar alguns segundos...
          </p>
        )}
        {analyzeMutation.isError && (
          <p className="text-xs text-red-400 mt-3">Erro ao analisar. Verifique se o aluno possui planos ativos e tente novamente.</p>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Overview */}
            <div className="glass-card">
              <div className="flex items-start gap-4">
                <RatingGauge rating={analysis.rating} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{analysis._studentName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Análise completa</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
                </div>
              </div>
            </div>

            {/* Positives + Concerns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Pontos positivos</span>
                </div>
                <ul className="space-y-2">
                  {analysis.positives.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-card">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-400">Pontos de atenção</span>
                </div>
                <ul className="space-y-2">
                  {analysis.concerns.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-yellow-400 flex-shrink-0 mt-0.5">!</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Strategic recommendations */}
            <div className="glass-card">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold">Recomendações estratégicas</span>
              </div>
              <ol className="space-y-2">
                {analysis.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs flex-shrink-0 font-semibold mt-0.5">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ol>
            </div>

            {/* Proposed changes per plan */}
            {analysis.proposedChanges.length === 0 ? (
              <div className="glass-card text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-medium">Nenhuma alteração necessária</p>
                <p className="text-xs text-muted-foreground mt-1">O treino atual está adequado para os objetivos do aluno.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Alterações propostas por plano</h3>
                {analysis.proposedChanges.map((plan) => (
                  <PlanChangesCard
                    key={plan.planId}
                    plan={plan}
                    applied={appliedPlans.has(plan.planId)}
                    applying={applyMutation.isPending && applyMutation.variables?.planId === plan.planId}
                    onApply={() => handleApply(plan)}
                  />
                ))}
              </div>
            )}

            {/* Apply all */}
            {analysis.proposedChanges.length > 1 && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    analysis.proposedChanges
                      .filter((p) => !appliedPlans.has(p.planId))
                      .forEach((p) => handleApply(p));
                  }}
                  disabled={
                    applyMutation.isPending ||
                    analysis.proposedChanges.every((p) => appliedPlans.has(p.planId))
                  }
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
                    analysis.proposedChanges.every((p) => appliedPlans.has(p.planId))
                      ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                      : 'bg-primary hover:bg-primary/80 text-primary-foreground',
                  )}
                >
                  {analysis.proposedChanges.every((p) => appliedPlans.has(p.planId)) ? (
                    <><Check className="w-4 h-4" /> Todas as alterações aplicadas</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Aplicar todas as alterações</>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Rating gauge ─────────────────────────────────────────────────────────────

function RatingGauge({ rating }: { rating: number }) {
  const color = rating >= 8 ? 'text-emerald-400' : rating >= 6 ? 'text-yellow-400' : 'text-red-400';
  const bg = rating >= 8 ? 'from-emerald-600 to-teal-600' : rating >= 6 ? 'from-yellow-600 to-amber-600' : 'from-red-600 to-orange-600';
  return (
    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${bg} flex flex-col items-center justify-center flex-shrink-0`}>
      <span className="text-2xl font-bold text-white leading-none">{rating}</span>
      <span className="text-[10px] text-white/80">/10</span>
    </div>
  );
}

// ─── Plan changes card ────────────────────────────────────────────────────────

function PlanChangesCard({
  plan, applied, applying, onApply,
}: {
  plan: ProposedPlan;
  applied: boolean;
  applying: boolean;
  onApply: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const ACTION_LABEL: Record<string, { label: string; color: string }> = {
    add: { label: 'Adicionar', color: 'text-emerald-400 bg-emerald-500/10' },
    update: { label: 'Atualizar', color: 'text-blue-400 bg-blue-500/10' },
    remove: { label: 'Remover', color: 'text-red-400 bg-red-500/10' },
  };

  return (
    <div className="glass-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="font-medium text-sm">{plan.planName}</span>
            {applied && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3" /> Aplicado
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-6">{plan.reason}</p>
        </div>
        <button onClick={() => setExpanded((v) => !v)} className="text-muted-foreground hover:text-foreground p-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Exercício</th>
                    <th className="text-center py-2 px-2 text-muted-foreground font-medium">Ação</th>
                    <th className="text-center py-2 px-2 text-muted-foreground font-medium">Atual</th>
                    <th className="text-center py-2 px-2 text-muted-foreground font-medium"></th>
                    <th className="text-center py-2 px-2 text-muted-foreground font-medium">Proposto</th>
                    <th className="text-left py-2 pl-4 text-muted-foreground font-medium">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.exercises.map((ex, i) => {
                    const badge = ACTION_LABEL[ex.action] || { label: ex.action, color: 'text-muted-foreground' };
                    return (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        <td className="py-2.5 pr-4 font-medium">{ex.exerciseName}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', badge.color)}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center text-muted-foreground">
                          {ex.current
                            ? <span>{ex.current.sets}×{ex.current.reps} {ex.current.weight ? `@ ${ex.current.weight}kg` : ''}</span>
                            : <span className="text-white/20">—</span>
                          }
                        </td>
                        <td className="py-2.5 px-1 text-muted-foreground">
                          {ex.action !== 'remove' && <ArrowRight className="w-3 h-3 mx-auto" />}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {ex.proposed && ex.action !== 'remove'
                            ? <span className="text-primary font-medium">{ex.proposed.sets}×{ex.proposed.reps} {ex.proposed.weight ? `@ ${ex.proposed.weight}kg` : ''}</span>
                            : <span className="text-white/20">—</span>
                          }
                        </td>
                        <td className="py-2.5 pl-4 text-muted-foreground max-w-[180px]">{ex.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!applied && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={onApply}
                  disabled={applying}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    applying ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary/80 text-primary-foreground',
                  )}
                >
                  {applying ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Aplicando...</>
                  ) : (
                    <><Zap className="w-3.5 h-3.5" /> Aplicar alterações neste plano</>
                  )}
                </button>
              </div>
            )}

            {applied && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Alterações aplicadas com sucesso. O treino do aluno foi atualizado.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
