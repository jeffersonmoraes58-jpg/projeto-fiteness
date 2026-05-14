'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Star, Trophy, Clock, Users, Zap, Dumbbell,
  Flame, Target, CheckCircle2, ArrowRight, Calendar,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const TABS = ['Disponíveis', 'Meus desafios', 'Concluídos'];

export default function StudentChallenges() {
  const [tab, setTab] = useState(0);
  const queryClient = useQueryClient();

  const { data: available } = useQuery({
    queryKey: ['challenges-available'],
    queryFn: () => api.get('/challenges/available').then((r) => r.data.data),
  });

  const { data: active } = useQuery({
    queryKey: ['challenges-active'],
    queryFn: () => api.get('/challenges/active').then((r) => r.data.data),
  });

  const { data: done } = useQuery({
    queryKey: ['challenges-completed'],
    queryFn: () => api.get('/challenges/completed').then((r) => r.data.data),
  });

  const joinMutation = useMutation({
    mutationFn: (challengeId: string) => api.post(`/challenges/${challengeId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges-available'] });
      queryClient.invalidateQueries({ queryKey: ['challenges-active'] });
    },
  });

  const activeList = active || [];
  const doneList = done || [];

  const lists = [
    available || [],
    activeList,
    doneList,
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Desafios</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Participe de desafios e ganhe pontos e conquistas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ativos', value: activeList.length, icon: Zap, color: 'from-purple-500 to-indigo-500' },
          { label: 'Concluídos', value: doneList.length, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
          { label: 'Pts ganhos', value: doneList.reduce((s: number, c: any) => s + (c.challenge?.points || 0), 0), icon: Star, color: 'from-yellow-500 to-orange-500' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-2xl p-1">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={cn(
              'flex-1 py-2 rounded-xl text-sm font-medium transition-all',
              tab === i ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
            {i > 0 && lists[i].length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({lists[i].length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {lists[tab].length > 0 ? (
          lists[tab].map((item: any, i: number) => {
            const challenge = tab === 0 ? item : item.challenge;
            if (!challenge) return null;
            return (
              <ChallengeCard
                key={item.id || challenge.id}
                challenge={challenge}
                studentChallenge={tab > 0 ? item : null}
                index={i}
                onJoin={tab === 0 ? () => joinMutation.mutate(challenge.id) : undefined}
                isJoining={joinMutation.isPending}
              />
            );
          })
        ) : (
          <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">
              {tab === 0 ? 'Nenhum desafio disponível' : tab === 1 ? 'Nenhum desafio ativo' : 'Nenhum desafio concluído'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tab === 0 ? 'Novos desafios serão adicionados em breve.' : 'Participe de desafios para vê-los aqui.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const CHALLENGE_ICONS: Record<string, any> = {
  workout: Dumbbell,
  streak: Flame,
  nutrition: Target,
  steps: Zap,
  default: Trophy,
};

const CHALLENGE_COLORS = [
  'from-purple-600 to-indigo-600',
  'from-cyan-600 to-blue-600',
  'from-emerald-600 to-teal-600',
  'from-orange-600 to-red-600',
  'from-pink-600 to-rose-600',
];

function ChallengeCard({ challenge, studentChallenge, index, onJoin, isJoining }: {
  challenge: any;
  studentChallenge: any;
  index: number;
  onJoin?: () => void;
  isJoining?: boolean;
}) {
  const Icon = CHALLENGE_ICONS[challenge.type] || CHALLENGE_ICONS.default;
  const color = CHALLENGE_COLORS[index % CHALLENGE_COLORS.length];
  const progress = studentChallenge?.progress ?? 0;
  const isCompleted = studentChallenge?.isCompleted;

  const daysLeft = challenge.endDate
    ? Math.max(Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / 86400000), 0)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'glass-card',
        isCompleted && 'border border-emerald-600/20',
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
          isCompleted ? 'bg-emerald-600/20' : `bg-gradient-to-br ${color}`,
        )}>
          {isCompleted
            ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            : <Icon className="w-6 h-6 text-white" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold leading-tight">{challenge.title}</h3>
            {isCompleted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                Concluído
              </span>
            )}
          </div>

          {challenge.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{challenge.description}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400" />
              {challenge.points} pts
            </span>
            {daysLeft !== null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {daysLeft === 0 ? 'Último dia!' : `${daysLeft} dias restantes`}
              </span>
            )}
            {challenge.duration && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {challenge.duration} dias
              </span>
            )}
          </div>

          {studentChallenge && challenge.targetValue && (
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className={cn(
                    'h-full rounded-full',
                    isCompleted ? 'bg-emerald-500' : `bg-gradient-to-r ${color}`,
                  )}
                />
              </div>
            </div>
          )}

          {onJoin && (
            <button
              onClick={onJoin}
              disabled={isJoining}
              className="btn-primary text-sm py-1.5 px-4 flex items-center gap-2"
            >
              Participar
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
