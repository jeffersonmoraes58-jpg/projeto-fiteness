'use client';

import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Star, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Link from 'next/link';

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['gamification-leaderboard'],
    queryFn: () => api.get('/gamification/leaderboard').then((r) => r.data.data),
  });

  const leaderboard: any[] = data?.leaderboard ?? [];
  const myRank = data?.myRank;

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/student"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Ranking
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Seu grupo de treino
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse flex items-center gap-3 p-4">
              <div className="w-8 h-8 rounded-full bg-white/10" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-2 bg-white/5 rounded w-1/4" />
              </div>
              <div className="h-4 bg-white/10 rounded w-12" />
            </div>
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="glass-card text-center py-12">
          <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum dado de ranking disponível</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Complete treinos para subir de posição!</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {podium.length >= 1 && (
            <div className="flex items-end justify-center gap-3 pt-4">
              {/* 2nd place */}
              {podium[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-lg border-2 border-gray-300 mb-2">
                    {podium[1].avatarUrl ? (
                      <img src={podium[1].avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{(podium[1].studentName ?? 'A')[0]}</span>
                    )}
                  </div>
                  <div className="text-xs font-semibold truncate max-w-[70px] text-center">
                    {podium[1].studentName ?? 'Aluno'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{podium[1].points} pts</div>
                  <div className="w-16 h-20 bg-gradient-to-t from-gray-400/20 to-gray-400/5 rounded-t-xl mt-2 flex items-start justify-center pt-2">
                    <Medal className="w-5 h-5 text-gray-400" />
                  </div>
                </motion.div>
              )}

              {/* 1st place */}
              {podium[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl border-2 border-yellow-400 mb-2 shadow-lg shadow-yellow-500/20">
                    {podium[0].avatarUrl ? (
                      <img src={podium[0].avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{(podium[0].studentName ?? 'A')[0]}</span>
                    )}
                  </div>
                  <div className="text-xs font-semibold truncate max-w-[80px] text-center">
                    {podium[0].studentName ?? 'Aluno'}
                  </div>
                  <div className="text-[10px] text-yellow-400 font-medium">{podium[0].points} pts</div>
                  <div className="w-20 h-28 bg-gradient-to-t from-yellow-500/20 to-yellow-500/5 rounded-t-xl mt-2 flex items-start justify-center pt-2">
                    <Crown className="w-6 h-6 text-yellow-400" />
                  </div>
                </motion.div>
              )}

              {/* 3rd place */}
              {podium[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg border-2 border-orange-400 mb-2">
                    {podium[2].avatarUrl ? (
                      <img src={podium[2].avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{(podium[2].studentName ?? 'A')[0]}</span>
                    )}
                  </div>
                  <div className="text-xs font-semibold truncate max-w-[70px] text-center">
                    {podium[2].studentName ?? 'Aluno'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{podium[2].points} pts</div>
                  <div className="w-16 h-14 bg-gradient-to-t from-orange-500/20 to-orange-500/5 rounded-t-xl mt-2 flex items-start justify-center pt-2">
                    <Medal className="w-5 h-5 text-orange-400" />
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Rest of ranking */}
          <div className="space-y-2">
            {rest.map((entry: any, i: number) => {
              const isMe = entry.studentId === userId || entry.userId === userId;
              return (
                <motion.div
                  key={entry.studentId ?? i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className={`glass-card flex items-center gap-3 p-3 ${
                    isMe ? 'border border-primary/30 bg-primary/5' : ''
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-muted-foreground">{i + 4}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{(entry.studentName ?? 'A')[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {entry.studentName ?? 'Aluno'}
                      {isMe && <span className="text-primary text-xs ml-1">(você)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>Nv. {entry.level ?? 1}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 text-yellow-400" />
                        {entry.streak ?? 0} dias
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-yellow-400">{entry.points ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground">pontos</div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* My position (if not in top list) */}
          {myRank && !leaderboard.some((e: any) => (e.studentId ?? e.userId) === userId) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-card border border-primary/30 bg-primary/5 flex items-center gap-3 p-3"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{myRank.position}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user?.profile?.firstName?.[0] ?? 'V'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {user?.profile?.firstName ?? 'Você'} <span className="text-primary text-xs">(você)</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-yellow-400">{myRank.points ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">pontos</div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
