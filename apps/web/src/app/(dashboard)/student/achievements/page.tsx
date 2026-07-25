'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Star, Flame, Dumbbell, Droplets,
  Target, Zap, Lock, CheckCircle2, Salad,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const ALL_ACHIEVEMENTS = [
  // Treino
  { id: 'first_workout', title: 'Primeiro Treino', description: 'Complete seu primeiro treino', icon: Dumbbell, points: 50, category: 'treino', color: 'from-purple-500 to-indigo-500' },
  { id: 'five_workouts', title: '5 Treinos', description: 'Complete 5 treinos', icon: Dumbbell, points: 75, category: 'treino', color: 'from-blue-500 to-indigo-500' },
  { id: 'ten_workouts', title: '10 Treinos', description: 'Complete 10 treinos', icon: Dumbbell, points: 100, category: 'treino', color: 'from-cyan-500 to-blue-500' },
  { id: 'twentyfive_workouts', title: '25 Treinos', description: 'Complete 25 treinos', icon: Dumbbell, points: 200, category: 'treino', color: 'from-teal-500 to-cyan-500' },
  { id: 'fifty_workouts', title: '50 Treinos', description: 'Complete 50 treinos', icon: Trophy, points: 300, category: 'treino', color: 'from-yellow-500 to-orange-500' },
  { id: 'century', title: '100 Treinos', description: 'Complete 100 treinos', icon: Trophy, points: 500, category: 'treino', color: 'from-amber-400 to-yellow-300' },
  { id: 'two_hundred', title: '200 Treinos', description: 'Complete 200 treinos', icon: Trophy, points: 1000, category: 'treino', color: 'from-orange-500 to-red-500' },
  { id: 'five_hundred', title: '500 Treinos', description: 'Complete 500 treinos', icon: Trophy, points: 2500, category: 'treino', color: 'from-red-500 to-rose-600' },

  // Sequência
  { id: 'three_streak', title: '3 dias seguidos', description: 'Treine 3 dias consecutivos', icon: Flame, points: 30, category: 'sequencia', color: 'from-orange-400 to-red-400' },
  { id: 'week_streak', title: '7 dias seguidos', description: 'Treine 7 dias consecutivos', icon: Flame, points: 150, category: 'sequencia', color: 'from-orange-500 to-red-500' },
  { id: 'two_week_streak', title: '14 dias seguidos', description: 'Treine 14 dias consecutivos', icon: Flame, points: 300, category: 'sequencia', color: 'from-red-500 to-pink-500' },
  { id: 'three_week_streak', title: '21 dias seguidos', description: 'Treine 21 dias consecutivos', icon: Flame, points: 400, category: 'sequencia', color: 'from-red-500 to-rose-500' },
  { id: 'month_streak', title: '30 dias seguidos', description: 'Treine 30 dias consecutivos', icon: Flame, points: 500, category: 'sequencia', color: 'from-red-500 to-rose-600' },
  { id: 'two_month_streak', title: '60 dias seguidos', description: 'Treine 60 dias consecutivos', icon: Flame, points: 750, category: 'sequencia', color: 'from-rose-500 to-pink-600' },
  { id: 'three_month_streak', title: '90 dias seguidos', description: 'Treine 90 dias consecutivos', icon: Flame, points: 1000, category: 'sequencia', color: 'from-pink-500 to-fuchsia-600' },
  { id: 'half_year_streak', title: '180 dias seguidos', description: 'Treine 180 dias consecutivos', icon: Flame, points: 2000, category: 'sequencia', color: 'from-fuchsia-500 to-purple-600' },
  { id: 'year_streak', title: '365 dias seguidos', description: 'Treine 365 dias consecutivos!', icon: Flame, points: 5000, category: 'sequencia', color: 'from-purple-500 to-indigo-600' },

  // Semanal
  { id: 'beast_mode', title: 'Beast Mode', description: 'Treine 5x em uma semana', icon: Zap, points: 200, category: 'semanal', color: 'from-purple-600 to-pink-600' },
  { id: 'perfect_week', title: 'Semana Perfeita', description: 'Treine todos os dias da semana', icon: Zap, points: 500, category: 'semanal', color: 'from-pink-500 to-fuchsia-500' },

  // Nível
  { id: 'level_5', title: 'Nível 5', description: 'Alcance o nível 5', icon: Star, points: 250, category: 'nivel', color: 'from-yellow-400 to-amber-500' },
  { id: 'level_10', title: 'Nível 10', description: 'Alcance o nível 10', icon: Star, points: 500, category: 'nivel', color: 'from-yellow-500 to-orange-500' },
  { id: 'level_15', title: 'Nível 15', description: 'Alcance o nível 15', icon: Star, points: 750, category: 'nivel', color: 'from-amber-500 to-orange-500' },
  { id: 'level_25', title: 'Nível 25', description: 'Alcance o nível 25', icon: Star, points: 1000, category: 'nivel', color: 'from-orange-500 to-red-500' },
  { id: 'level_50', title: 'Nível 50', description: 'Alcance o nível 50', icon: Star, points: 2500, category: 'nivel', color: 'from-red-500 to-rose-600' },

  // Pontos
  { id: 'points_1k', title: '1.000 Pontos', description: 'Acumule 1.000 pontos', icon: Target, points: 100, category: 'pontos', color: 'from-emerald-500 to-teal-500' },
  { id: 'points_5k', title: '5.000 Pontos', description: 'Acumule 5.000 pontos', icon: Target, points: 250, category: 'pontos', color: 'from-teal-500 to-cyan-500' },
  { id: 'points_10k', title: '10.000 Pontos', description: 'Acumule 10.000 pontos', icon: Target, points: 500, category: 'pontos', color: 'from-cyan-500 to-blue-500' },
  { id: 'points_50k', title: '50.000 Pontos', description: 'Acumule 50.000 pontos', icon: Target, points: 1000, category: 'pontos', color: 'from-blue-500 to-indigo-500' },
];

const CATEGORIES = ['todos', 'treino', 'sequencia', 'semanal', 'nivel', 'pontos'];

export default function StudentAchievements() {
  const [filter, setFilter] = useState('todos');

  const { data: earned } = useQuery({
    queryKey: ['student-achievements'],
    queryFn: () => api.get('/students/me/achievements').then((r) => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['student-stats'],
    queryFn: () => api.get('/students/me/dashboard').then((r) => r.data.data),
  });

  const earnedIds = new Set((earned || []).map((a: any) => a.title?.toLowerCase().replace(/ /g, '_') || a.category));
  const totalPoints = (earned || []).reduce((sum: number, a: any) => sum + (a.points || 0), 0);

  const filtered = filter === 'todos'
    ? ALL_ACHIEVEMENTS
    : ALL_ACHIEVEMENTS.filter((a) => a.category === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Conquistas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {earned?.length ?? 0} de {ALL_ACHIEVEMENTS.length} desbloqueadas
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Desbloqueadas', value: earned?.length ?? 0, icon: Trophy, color: 'from-yellow-500 to-orange-500' },
          { label: 'Pontos ganhos', value: stats?.stats?.points ?? totalPoints, icon: Star, color: 'from-purple-500 to-indigo-500' },
          { label: 'Nível atual', value: stats?.stats?.level ?? 1, icon: Zap, color: 'from-cyan-500 to-blue-500' },
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

      {/* Level progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card bg-gradient-to-br from-purple-600/10 to-indigo-600/10 border border-purple-600/20"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              {stats?.level ?? 1}
            </div>
            <div>
              <div className="font-semibold">Nível {stats?.stats?.level ?? 1}</div>
              <div className="text-xs text-muted-foreground">{stats?.stats?.points ?? totalPoints} / {(stats?.stats?.level ?? 1) * 500} pontos</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Próximo nível</div>
            <div className="text-sm font-semibold">{Math.max(((stats?.stats?.level ?? 1) * 500) - (stats?.stats?.points ?? totalPoints), 0)} pts</div>
          </div>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(((stats?.stats?.points ?? totalPoints) / ((stats?.stats?.level ?? 1) * 500)) * 100, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
          />
        </div>
      </motion.div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 capitalize transition-all border',
              filter === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : 'glass border-transparent hover:bg-accent',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Achievements grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((achievement, i) => {
          const isEarned = earned?.some((e: any) => e.title === achievement.title);
          return (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              isEarned={isEarned}
              index={i}
            />
          );
        })}
      </div>
    </div>
  );
}

function AchievementCard({ achievement, isEarned, index }: {
  achievement: typeof ALL_ACHIEVEMENTS[0];
  isEarned: boolean;
  index: number;
}) {
  const Icon = achievement.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'glass-card flex flex-col items-center text-center p-4 relative overflow-hidden transition-all',
        isEarned ? 'border border-yellow-500/20' : 'opacity-50',
      )}
    >
      {isEarned && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
      )}

      <div className={cn(
        'w-14 h-14 rounded-2xl flex items-center justify-center mb-3 relative',
        isEarned ? `bg-gradient-to-br ${achievement.color}` : 'bg-white/10',
      )}>
        {isEarned
          ? <Icon className="w-7 h-7 text-white" />
          : <Lock className="w-6 h-6 text-muted-foreground" />
        }
        {isEarned && (
          <div className={cn(
            'absolute inset-0 rounded-2xl bg-gradient-to-br opacity-20 blur-lg',
            achievement.color,
          )} />
        )}
      </div>

      <div className="font-semibold text-sm leading-tight mb-1">{achievement.title}</div>
      <div className="text-xs text-muted-foreground leading-tight mb-2">{achievement.description}</div>
      <div className="flex items-center gap-1 text-xs font-medium text-yellow-400">
        <Star className="w-3 h-3" />
        {achievement.points} pts
      </div>
    </motion.div>
  );
}

