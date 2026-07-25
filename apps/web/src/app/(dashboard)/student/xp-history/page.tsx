'use client';

import { motion } from 'framer-motion';
import { Zap, ArrowLeft, Dumbbell, Flame, Trophy, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';

const SOURCE_ICONS: Record<string, typeof Dumbbell> = {
  workout: Dumbbell,
  streak: Flame,
  achievement: Trophy,
  bonus: Star,
};

const SOURCE_COLORS: Record<string, string> = {
  workout: 'from-purple-500 to-indigo-500',
  streak: 'from-orange-500 to-red-500',
  achievement: 'from-yellow-500 to-amber-500',
  bonus: 'from-emerald-500 to-teal-500',
};

const SOURCE_LABELS: Record<string, string> = {
  workout: 'Treino',
  streak: 'Sequência',
  achievement: 'Conquista',
  bonus: 'Bônus',
};

export default function XpHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['gamification-xp-history'],
    queryFn: () => api.get('/gamification/xp-history?limit=50').then((r) => r.data.data),
  });

  const history: any[] = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/student"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          Histórico de XP
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {history.length} registros
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse flex items-center gap-3 p-4">
              <div className="w-9 h-9 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-white/10 rounded w-1/2" />
                <div className="h-2 bg-white/5 rounded w-1/3" />
              </div>
              <div className="h-4 bg-white/10 rounded w-10" />
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="glass-card text-center py-12">
          <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum XP registrado</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Complete treinos para ganhar XP!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((entry: any, i: number) => {
            const Icon = SOURCE_ICONS[entry.source] ?? Zap;
            const color = SOURCE_COLORS[entry.source] ?? 'from-gray-500 to-gray-600';
            const label = SOURCE_LABELS[entry.source] ?? entry.source;

            return (
              <motion.div
                key={entry.id ?? i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card flex items-center gap-3 p-3"
              >
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {entry.description || label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {label}
                    {entry.createdAt && (
                      <> · {new Date(entry.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</>
                    )}
                  </div>
                </div>
                <div className="text-sm font-bold text-yellow-400 flex-shrink-0">
                  +{entry.amount}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
