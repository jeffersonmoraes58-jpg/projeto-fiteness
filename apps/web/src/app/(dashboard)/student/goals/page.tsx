'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Plus, CheckCircle2, Clock, TrendingUp,
  Dumbbell, Apple, Activity, Zap, X, ChevronRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Perder peso',
  GAIN_MUSCLE: 'Ganhar músculo',
  IMPROVE_ENDURANCE: 'Melhorar resistência',
  INCREASE_FLEXIBILITY: 'Aumentar flexibilidade',
  MAINTAIN_WEIGHT: 'Manter peso',
  ATHLETIC_PERFORMANCE: 'Performance atlética',
  REHABILITATION: 'Reabilitação',
};

const GOAL_ICONS: Record<string, any> = {
  LOSE_WEIGHT: TrendingUp,
  GAIN_MUSCLE: Dumbbell,
  IMPROVE_ENDURANCE: Activity,
  INCREASE_FLEXIBILITY: Zap,
  MAINTAIN_WEIGHT: Target,
  ATHLETIC_PERFORMANCE: Zap,
  REHABILITATION: Plus,
};

const GOAL_COLORS = [
  'from-purple-600 to-indigo-600',
  'from-cyan-600 to-blue-600',
  'from-emerald-600 to-teal-600',
  'from-orange-600 to-amber-600',
  'from-pink-600 to-rose-600',
];

export default function StudentGoals() {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'GAIN_MUSCLE', targetValue: '', unit: '', targetDate: '' });
  const queryClient = useQueryClient();

  const { data: goals } = useQuery({
    queryKey: ['student-goals-list'],
    queryFn: () => api.get('/goals').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/goals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-goals-list'] });
      setShowNew(false);
      setForm({ title: '', type: 'GAIN_MUSCLE', targetValue: '', unit: '', targetDate: '' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/goals/${id}`, { isCompleted: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student-goals-list'] }),
  });

  const active = goals?.filter((g: any) => !g.isCompleted) || [];
  const completed = goals?.filter((g: any) => g.isCompleted) || [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Minhas Metas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {active.length} ativas • {completed.length} concluídas
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="btn-primary flex items-center gap-2 text-sm py-2"
        >
          <Plus className="w-4 h-4" />
          Nova meta
        </button>
      </div>

      {/* New goal form */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card border border-primary/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Nova Meta</h2>
              <button onClick={() => setShowNew(false)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Título da meta"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field"
              />
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="input-field bg-background"
              >
                {Object.entries(GOAL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Valor alvo (ex: 75)"
                  value={form.targetValue}
                  onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Unidade (ex: kg)"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="input-field"
                />
              </div>
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className="input-field"
              />
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowNew(false)}
                  className="btn-secondary flex-1 text-sm py-2"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => createMutation.mutate({
                    title: form.title,
                    type: form.type,
                    targetValue: form.targetValue ? Number(form.targetValue) : undefined,
                    unit: form.unit || undefined,
                    targetDate: form.targetDate || undefined,
                  })}
                  disabled={!form.title || createMutation.isPending}
                  className="btn-primary flex-1 text-sm py-2"
                >
                  {createMutation.isPending ? 'Salvando...' : 'Criar meta'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active goals */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Em andamento</h2>
          {active.map((goal: any, i: number) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              index={i}
              onComplete={() => completeMutation.mutate(goal.id)}
            />
          ))}
        </div>
      )}

      {/* Completed goals */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Concluídas</h2>
          {completed.map((goal: any, i: number) => (
            <GoalCard key={goal.id} goal={goal} index={i} completed />
          ))}
        </div>
      )}

      {goals?.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">Sem metas definidas</h3>
          <p className="text-sm text-muted-foreground mb-4">Crie sua primeira meta e comece a acompanhar seu progresso.</p>
          <button onClick={() => setShowNew(true)} className="btn-primary text-sm py-2">
            Criar primeira meta
          </button>
        </motion.div>
      )}
    </div>
  );
}

function GoalCard({ goal, index, completed, onComplete }: {
  goal: any;
  index: number;
  completed?: boolean;
  onComplete?: () => void;
}) {
  const Icon = GOAL_ICONS[goal.type] || Target;
  const color = GOAL_COLORS[index % GOAL_COLORS.length];
  const progress = goal.targetValue
    ? Math.min(Math.round(((goal.currentValue ?? 0) / goal.targetValue) * 100), 100)
    : completed ? 100 : 0;

  const daysLeft = goal.targetDate
    ? Math.max(Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000), 0)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn('glass-card', completed && 'opacity-60')}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
          completed ? 'bg-emerald-600/20' : `bg-gradient-to-br ${color}`,
        )}>
          {completed
            ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            : <Icon className="w-5 h-5 text-white" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium">{goal.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {GOAL_LABELS[goal.type] || goal.type}
                {goal.targetValue ? ` • Meta: ${goal.targetValue}${goal.unit || ''}` : ''}
              </div>
            </div>
            {!completed && daysLeft !== null && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <Clock className="w-3 h-3" />
                {daysLeft === 0 ? 'Hoje!' : `${daysLeft}d`}
              </div>
            )}
            {completed && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                Concluída
              </span>
            )}
          </div>

          {goal.targetValue && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{goal.currentValue ?? 0}{goal.unit || ''}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className={cn(
                    'h-full rounded-full',
                    completed ? 'bg-emerald-500' : `bg-gradient-to-r ${color}`,
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {!completed && onComplete && (
          <button
            onClick={onComplete}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-all flex-shrink-0"
            title="Marcar como concluída"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
