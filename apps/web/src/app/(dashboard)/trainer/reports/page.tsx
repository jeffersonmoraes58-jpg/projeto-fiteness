'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Dumbbell, TrendingUp, Activity,
  ArrowUpRight, Download, BarChart3, Calendar,
  Flame, Trophy, Target,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const PERIODS = ['7 dias', '30 dias', '3 meses', '6 meses'];

export default function TrainerReports() {
  const [period, setPeriod] = useState('30 dias');

  const { data: stats } = useQuery({
    queryKey: ['trainer-reports', period],
    queryFn: () => api.get(`/trainers/me/reports`).then((r) => r.data.data),
  });

  const { data: students } = useQuery({
    queryKey: ['trainer-students-list'],
    queryFn: () => api.get('/trainers/me/students').then((r) => r.data.data),
  });

  const kpis = [
    { label: 'Alunos ativos', value: stats?.activeStudents ?? students?.filter((s: any) => s.isActive).length ?? 0, icon: Users, color: 'from-purple-600 to-indigo-600', delta: '+2' },
    { label: 'Check-ins no período', value: stats?.totalCheckins ?? 0, icon: Activity, color: 'from-emerald-600 to-teal-600', delta: '+15%' },
    { label: 'Treinos criados', value: stats?.totalWorkouts ?? 0, icon: Dumbbell, color: 'from-cyan-600 to-blue-600', delta: '+3' },
    { label: 'Sequência média', value: `${stats?.avgStreak ?? 0}d`, icon: Flame, color: 'from-orange-600 to-red-600', delta: '+1.2d' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral do desempenho</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm py-2">
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
              period === p ? 'bg-primary text-primary-foreground border-primary' : 'glass border-transparent hover:bg-accent',
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center`}>
                <kpi.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />{kpi.delta}
              </span>
            </div>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-in trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Check-ins por dia
            </h2>
            <span className="text-xs text-muted-foreground">{period}</span>
          </div>
          <CheckinChart data={stats?.dailyCheckins} />
        </motion.div>

        {/* Goal distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              Objetivos dos Alunos
            </h2>
          </div>
          <GoalDistribution students={students} />
        </motion.div>
      </div>

      {/* Top students */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Ranking de Alunos
          </h2>
          <span className="text-xs text-muted-foreground">{period}</span>
        </div>
        <StudentRanking students={students} />
      </motion.div>

      {/* Student progress table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass-card"
      >
        <h2 className="font-semibold mb-6">Progresso dos Alunos</h2>
        <StudentProgressTable students={students} />
      </motion.div>
    </div>
  );
}

function CheckinChart({ data }: { data?: number[] }) {
  const values = data || [8, 12, 15, 10, 18, 14, 20, 16, 22, 19, 25, 21, 18, 24];
  const max = Math.max(...values, 1);

  return (
    <div>
      <div className="flex items-end gap-1 h-32">
        {values.map((v, i) => (
          <div key={i} className="flex-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(v / max) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.03 }}
              className="w-full rounded-t-sm bg-gradient-to-t from-purple-600 to-indigo-600 opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
        <span>Início</span>
        <span>Agora</span>
      </div>
    </div>
  );
}

function GoalDistribution({ students }: { students?: any[] }) {
  if (!students?.length) return <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>;

  const goalLabels: Record<string, string> = {
    LOSE_WEIGHT: 'Perda de peso',
    GAIN_MUSCLE: 'Ganho muscular',
    MAINTAIN_WEIGHT: 'Manutenção',
    IMPROVE_ENDURANCE: 'Resistência',
    INCREASE_FLEXIBILITY: 'Flexibilidade',
    ATHLETIC_PERFORMANCE: 'Performance',
    REHABILITATION: 'Reabilitação',
  };

  const counts: Record<string, number> = {};
  students.forEach((s: any) => {
    const g = s.goalType || 'GAIN_MUSCLE';
    counts[g] = (counts[g] || 0) + 1;
  });

  const total = students.length;
  const colors = ['bg-purple-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-blue-500', 'bg-yellow-500'];
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      {sorted.map(([goal, count], i) => {
        const pct = Math.round((count / total) * 100);
        return (
          <div key={goal}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{goalLabels[goal] || goal}</span>
              <span className="font-medium">{count} ({pct}%)</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, delay: i * 0.08 }}
                className={`h-full rounded-full ${colors[i % colors.length]}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StudentRanking({ students }: { students?: any[] }) {
  if (!students?.length) return <p className="text-sm text-muted-foreground text-center py-6">Sem dados</p>;

  const ranked = [...students]
    .sort((a, b) => (b.streak || 0) - (a.streak || 0))
    .slice(0, 5);

  const medals = ['🥇', '🥈', '🥉', '4', '5'];
  const colors = ['from-yellow-500 to-orange-500', 'from-gray-400 to-gray-500', 'from-orange-700 to-orange-800', 'from-purple-600 to-indigo-600', 'from-cyan-600 to-blue-600'];

  return (
    <div className="space-y-3">
      {ranked.map((s: any, i: number) => (
        <div key={s.id} className="flex items-center gap-4">
          <div className="w-7 text-center text-lg">{medals[i]}</div>
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${colors[i]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {s.user?.profile?.firstName?.[0]}{s.user?.profile?.lastName?.[0]}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{s.user?.profile?.firstName} {s.user?.profile?.lastName}</div>
            <div className="text-xs text-muted-foreground">{s.points || 0} pontos</div>
          </div>
          <div className="text-sm font-bold text-orange-400 flex items-center gap-1">
            {s.streak || 0}<Flame className="w-3 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StudentProgressTable({ students }: { students?: any[] }) {
  if (!students?.length) return <p className="text-sm text-muted-foreground text-center py-8">Nenhum aluno cadastrado</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left text-xs text-muted-foreground font-medium pb-3">Aluno</th>
            <th className="text-center text-xs text-muted-foreground font-medium pb-3">Sequência</th>
            <th className="text-center text-xs text-muted-foreground font-medium pb-3">Treinos/sem</th>
            <th className="text-center text-xs text-muted-foreground font-medium pb-3">Nível</th>
            <th className="text-center text-xs text-muted-foreground font-medium pb-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {students.slice(0, 10).map((s: any) => (
            <tr key={s.id} className="hover:bg-accent/50 transition-all">
              <td className="py-3 font-medium">{s.user?.profile?.firstName} {s.user?.profile?.lastName}</td>
              <td className="py-3 text-center">
                <span className="text-orange-400 font-medium flex items-center justify-center gap-1">
                  {s.streak || 0}<Flame className="w-3 h-3" />
                </span>
              </td>
              <td className="py-3 text-center text-muted-foreground">{s.weeklyCheckins || 0}</td>
              <td className="py-3 text-center text-muted-foreground">{s.level || 1}</td>
              <td className="py-3 text-center">
                <span className={cn('text-xs px-2 py-0.5 rounded-full', s.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground')}>
                  {s.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
