'use client';

import { motion } from 'framer-motion';
import {
  Dumbbell, Apple, Droplets, Flame, Trophy, Target,
  TrendingUp, ChevronRight, Play, CheckCircle2, Circle,
  Zap, Star, ArrowUpRight, Calendar, Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function StudentDashboard() {
  const { user } = useAuthStore();

  const { data: stats } = useQuery({
    queryKey: ['student-stats'],
    queryFn: () => api.get('/students/me/dashboard').then((r) => r.data.data),
  });

  const { data: todayWorkout } = useQuery({
    queryKey: ['student-today-workout'],
    queryFn: () => api.get('/students/me/workout-plan').then((r) => r.data.data),
  });

  const { data: todayDiet } = useQuery({
    queryKey: ['student-today-diet'],
    queryFn: () => api.get('/students/me/diet').then((r) => r.data.data),
  });

  const { data: goals } = useQuery({
    queryKey: ['student-goals'],
    queryFn: () => api.get('/goals').then((r) => r.data.data),
  });

  const firstName = user?.profile?.firstName || 'Aluno';

  const statCards = [
    {
      label: 'Sequência',
      value: stats?.streak ?? '—',
      suffix: ' dias',
      icon: Flame,
      color: 'from-orange-600 to-red-600',
      bg: 'from-orange-600/10 to-red-600/10',
    },
    {
      label: 'Treinos na semana',
      value: stats?.weeklyWorkouts ?? '—',
      suffix: '',
      icon: Dumbbell,
      color: 'from-purple-600 to-indigo-600',
      bg: 'from-purple-600/10 to-indigo-600/10',
    },
    {
      label: 'Calorias hoje',
      value: stats?.caloriesToday ?? '—',
      suffix: ' kcal',
      icon: Zap,
      color: 'from-yellow-500 to-orange-500',
      bg: 'from-yellow-500/10 to-orange-500/10',
    },
    {
      label: 'Água hoje',
      value: stats?.waterToday ?? '—',
      suffix: ' ml',
      icon: Droplets,
      color: 'from-cyan-500 to-blue-500',
      bg: 'from-cyan-500/10 to-blue-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Olá, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vamos arrasar hoje? Você está em uma sequência de{' '}
            <span className="text-orange-400 font-semibold">{stats?.streak ?? 0} dias</span>!
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 glass rounded-2xl px-4 py-2">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold">{stats?.points ?? 0} pts</span>
          <span className="text-xs text-muted-foreground">Nível {stats?.level ?? 1}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold">
              {card.value}{card.suffix}
            </div>
            <div className="text-xs text-muted-foreground">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's workout */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-purple-400" />
                Treino de Hoje
              </h2>
              <Link href="/student/workout" className="text-xs text-primary flex items-center gap-1 hover:underline">
                Ver completo <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {todayWorkout ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-semibold">{todayWorkout.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{todayWorkout.duration} min</span>
                      <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{todayWorkout.exercises?.length} exercícios</span>
                    </div>
                  </div>
                  <Link
                    href="/student/workout"
                    className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
                  >
                    <Play className="w-4 h-4" />
                    Iniciar
                  </Link>
                </div>
                <div className="space-y-2">
                  {(todayWorkout.exercises?.slice(0, 4) || []).map((ex: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent transition-all">
                      <div className="w-7 h-7 rounded-lg bg-purple-600/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-purple-400">{i + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{ex.exercise?.name}</div>
                        <div className="text-xs text-muted-foreground">{ex.sets}x{ex.reps} • {ex.weight ? `${ex.weight}kg` : 'Sem peso'}</div>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <TodayWorkoutSkeleton />
            )}
          </motion.div>

          {/* Water tracker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Droplets className="w-5 h-5 text-cyan-400" />
                Hidratação
              </h2>
              <span className="text-xs text-muted-foreground">Meta: 2.000 ml</span>
            </div>
            <WaterTracker current={stats?.waterToday ?? 0} goal={2000} />
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Calories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Apple className="w-5 h-5 text-emerald-400" />
                Nutrição Hoje
              </h2>
              <Link href="/student/diet" className="text-xs text-primary hover:underline">
                Ver dieta
              </Link>
            </div>
            <MacroRing
              calories={todayDiet?.calories ?? 0}
              goal={todayDiet?.caloriesGoal ?? 2200}
              protein={todayDiet?.protein ?? 0}
              carbs={todayDiet?.carbs ?? 0}
              fat={todayDiet?.fat ?? 0}
            />
          </motion.div>

          {/* Goals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-pink-400" />
                Minhas Metas
              </h2>
              <Link href="/student/goals" className="text-xs text-primary flex items-center gap-1 hover:underline">
                Ver todas <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {(goals?.slice(0, 3) || [...Array(3)]).map((goal: any, i: number) => (
                <GoalRow key={i} goal={goal} index={i} />
              ))}
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card"
          >
            <h2 className="font-semibold mb-3">Acesso Rápido</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Evolução', icon: TrendingUp, href: '/student/progress', color: 'text-emerald-400' },
                { label: 'Conquistas', icon: Trophy, href: '/student/achievements', color: 'text-yellow-400' },
                { label: 'Desafios', icon: Star, href: '/student/challenges', color: 'text-purple-400' },
                { label: 'Agenda', icon: Calendar, href: '/student/workout', color: 'text-cyan-400' },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-accent transition-all text-center"
                >
                  <a.icon className={`w-5 h-5 ${a.color}`} />
                  <span className="text-xs font-medium">{a.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Weekly activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="glass-card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Atividade da Semana
          </h2>
          <Link href="/student/progress" className="text-xs text-primary flex items-center gap-1 hover:underline">
            Ver histórico <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <WeekActivity stats={stats} />
      </motion.div>
    </div>
  );
}

function TodayWorkoutSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-white/10 rounded animate-pulse w-40" />
          <div className="h-3 bg-white/5 rounded animate-pulse w-24" />
        </div>
        <div className="h-9 bg-white/10 rounded-xl animate-pulse w-24" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
          <div className="w-7 h-7 rounded-lg bg-white/10 animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-white/10 rounded animate-pulse w-1/2" />
            <div className="h-2 bg-white/5 rounded animate-pulse w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function WaterTracker({ current, goal }: { current: number; goal: number }) {
  const percent = Math.min((current / goal) * 100, 100);
  const glasses = Math.round(current / 250);
  const totalGlasses = Math.round(goal / 250);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold">{current} <span className="text-sm font-normal text-muted-foreground">ml</span></span>
        <span className="text-sm text-muted-foreground">{Math.round(percent)}%</span>
      </div>
      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
        />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {[...Array(totalGlasses)].map((_, i) => (
          <div
            key={i}
            className={`w-7 h-8 rounded-lg border-2 transition-all ${
              i < glasses
                ? 'border-cyan-500 bg-cyan-500/20'
                : 'border-white/10 bg-transparent'
            }`}
          >
            <Droplets className={`w-3 h-3 mx-auto mt-1.5 ${i < glasses ? 'text-cyan-400' : 'text-muted-foreground/30'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MacroRing({ calories, goal, protein, carbs, fat }: {
  calories: number; goal: number; protein: number; carbs: number; fat: number;
}) {
  const percent = Math.min(Math.round((calories / goal) * 100), 100);
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
          <motion.circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="url(#calGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-lg font-bold">{percent}%</div>
          <div className="text-[10px] text-muted-foreground">da meta</div>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        <div className="text-sm font-semibold">{calories} kcal</div>
        <div className="space-y-1.5">
          {[
            { label: 'Proteína', value: protein, unit: 'g', color: 'bg-purple-500' },
            { label: 'Carbs', value: carbs, unit: 'g', color: 'bg-yellow-500' },
            { label: 'Gordura', value: fat, unit: 'g', color: 'bg-orange-500' },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${m.color}`} />
              <span className="text-xs text-muted-foreground flex-1">{m.label}</span>
              <span className="text-xs font-medium">{m.value}{m.unit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoalRow({ goal, index }: { goal: any; index: number }) {
  if (!goal?.title) {
    return (
      <div className="space-y-1.5">
        <div className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
        <div className="h-2 bg-white/5 rounded-full animate-pulse" />
      </div>
    );
  }

  const progress = goal.targetValue
    ? Math.min(Math.round(((goal.currentValue ?? 0) / goal.targetValue) * 100), 100)
    : 0;

  const colors = ['from-purple-500 to-indigo-500', 'from-cyan-500 to-blue-500', 'from-emerald-500 to-teal-500'];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium truncate flex-1">{goal.title}</span>
        <span className="text-xs text-muted-foreground ml-2">{progress}%</span>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, delay: index * 0.1 }}
          className={`h-full bg-gradient-to-r ${colors[index % colors.length]} rounded-full`}
        />
      </div>
    </div>
  );
}

function WeekActivity({ stats }: { stats: any }) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const activity = stats?.weekActivity || [0, 1, 1, 0, 1, 1, 0];

  return (
    <div className="flex items-end gap-3 h-20">
      {days.map((day, i) => (
        <div key={day} className="flex-1 flex flex-col items-center gap-2">
          <div className="flex-1 w-full flex items-end">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: activity[i] ? '100%' : '20%' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`w-full rounded-t-md ${
                activity[i]
                  ? 'bg-gradient-to-t from-purple-600 to-indigo-600 opacity-90'
                  : 'bg-white/10'
              }`}
            />
          </div>
          <div className="text-xs text-muted-foreground">{day}</div>
          {activity[i] ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          ) : (
            <Circle className="w-3 h-3 text-muted-foreground/30" />
          )}
        </div>
      ))}
    </div>
  );
}
