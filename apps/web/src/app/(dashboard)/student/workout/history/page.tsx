'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, ChevronLeft, ChevronRight, Dumbbell, Clock,
  Flame, Trophy, Filter, Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Concluído',
  SKIPPED: 'Pulado',
  PARTIAL: 'Parcial',
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'text-emerald-400 bg-emerald-500/10',
  SKIPPED: 'text-amber-400 bg-amber-500/10',
  PARTIAL: 'text-blue-400 bg-blue-500/10',
};

export default function WorkoutHistoryPage() {
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const { data, isLoading } = useQuery({
    queryKey: ['student-workout-history', page],
    queryFn: () =>
      api
        .get(`/students/me/workout-logs?page=${page}&limit=${LIMIT}`)
        .then((r) => r.data.data ?? r.data),
    placeholderData: keepPreviousData,
  });

  const data_ = data as any;
  const logs = data_?.logs ?? [];
  const totalPages = data_?.totalPages ?? 1;
  const total = data_?.total ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/student/workout"
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-gray-300" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Histórico de Treinos</h1>
            <p className="text-xs text-gray-400">{total} treinos registrados</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <Dumbbell className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum treino registrado ainda.</p>
            <Link href="/student/workout" className="text-xs text-indigo-400 hover:underline mt-2 inline-block">
              Iniciar um treino
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {logs.map((log: any, i: number) => {
                const workoutName = log.workoutPlan?.workout?.name ?? 'Treino';
                const duration = log.duration ? `${Math.round(log.duration / 60)}min` : null;
                const exerciseCount = log.exerciseLogs?.length ?? 0;
                const totalVolume = (log.exerciseLogs ?? []).reduce(
                  (sum: number, el: any) => sum + (el.weight || 0) * (el.reps || 0) * (el.setNumber || 1),
                  0,
                );

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white truncate">{workoutName}</h3>
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', STATUS_COLOR[log.status] ?? STATUS_COLOR.COMPLETED)}>
                            {STATUS_LABEL[log.status] ?? log.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {log.completedAt
                              ? new Date(log.completedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                              : new Date(log.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                          {duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {duration}
                            </span>
                          )}
                          {exerciseCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Dumbbell className="w-3 h-3" />
                              {exerciseCount} exs
                            </span>
                          )}
                        </div>
                      </div>
                      {log.feeling && (
                        <div className="text-lg">
                          {log.feeling >= 4 ? '💪' : log.feeling === 3 ? '👍' : '😐'}
                        </div>
                      )}
                    </div>

                    {totalVolume > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
                        <Flame className="w-3 h-3 text-orange-400" />
                        Volume total: {totalVolume.toLocaleString('pt-BR')} kg
                      </div>
                    )}

                    {log.notes && (
                      <p className="mt-2 text-[11px] text-gray-400 italic truncate">"{log.notes}"</p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center disabled:opacity-30 hover:bg-white/10 transition-all"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-300" />
                </button>
                <span className="text-xs text-gray-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center disabled:opacity-30 hover:bg-white/10 transition-all"
                >
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
