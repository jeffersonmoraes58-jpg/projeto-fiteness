'use client';

import { motion } from 'framer-motion';
import {
  Users, Dumbbell, TrendingUp, DollarSign,
  Activity, Calendar, MessageCircle, Star, Trophy,
  ArrowUpRight, Plus, ChevronRight, Brain,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Perda de peso',
  GAIN_MUSCLE: 'Ganho muscular',
  MAINTAIN_WEIGHT: 'Manutenção',
  IMPROVE_ENDURANCE: 'Resistência',
  INCREASE_FLEXIBILITY: 'Flexibilidade',
  ATHLETIC_PERFORMANCE: 'Performance',
  REHABILITATION: 'Reabilitação',
};

const statCards = [
  { key: 'totalStudents', label: 'Alunos Ativos', icon: Users, color: 'from-purple-600 to-indigo-600', prefix: '' },
  { key: 'totalWorkouts', label: 'Treinos Criados', icon: Dumbbell, color: 'from-cyan-600 to-blue-600', prefix: '' },
  { key: 'checkins', label: 'Check-ins Hoje', icon: Activity, color: 'from-emerald-600 to-teal-600', prefix: '' },
  { key: 'revenue', label: 'Receita Mensal', icon: DollarSign, color: 'from-orange-600 to-amber-600', prefix: 'R$ ', format: (v: number) => v.toLocaleString('pt-BR') },
];

export default function TrainerDashboard() {
  const { data: dashboard } = useQuery({
    queryKey: ['trainer-dashboard'],
    queryFn: () => api.get('/trainers/me/dashboard').then((r) => r.data.data),
  });

  const { data: students } = useQuery({
    queryKey: ['trainer-students'],
    queryFn: () => api.get('/trainers/me/students').then((r) => r.data.data),
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Link href="/trainer/students/new" className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
            <Plus className="w-4 h-4" />
            Novo aluno
          </Link>
          <Link href="/trainer/workouts/new" className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
            <Dumbbell className="w-4 h-4" />
            Novo treino
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, i) => {
          const raw = dashboard?.[card.key];
          const display = raw == null ? '—' : (card as any).format ? (card as any).format(raw) : raw;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="stat-card"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center flex-shrink-0`}>
                  <card.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold">
                {card.prefix}{display}
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">{card.label}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Students list */}
        <div className="lg:col-span-2">
          <div className="glass-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold">Alunos Recentes</h2>
              <Link href="/trainer/students" className="text-xs text-primary flex items-center gap-1 hover:underline">
                Ver todos <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {(students?.slice(0, 6) || [...Array(5)]).map((student: any, i: number) => (
                <StudentRow key={i} student={student} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions + upcoming */}
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="glass-card">
            <h2 className="font-semibold mb-4">Ações Rápidas</h2>
            <div className="space-y-2">
              {[
                { label: 'Criar treino', icon: Dumbbell, href: '/trainer/workouts/new', color: 'text-purple-400' },
                { label: 'Adicionar aluno', icon: Users, href: '/trainer/students/new', color: 'text-cyan-400' },
                { label: 'Desafios', icon: Trophy, href: '/trainer/challenges', color: 'text-yellow-400' },
                { label: 'Agendar aula', icon: Calendar, href: '/trainer/schedule', color: 'text-emerald-400' },
                { label: 'Ver mensagens', icon: MessageCircle, href: '/trainer/chat', color: 'text-orange-400' },
                { label: 'Relatórios', icon: TrendingUp, href: '/trainer/reports', color: 'text-pink-400' },
                { label: 'IA — Análise de aluno', icon: Brain, href: '/trainer/ai', color: 'text-violet-400' },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all group"
                >
                  <action.icon className={`w-4 h-4 ${action.color}`} />
                  <span className="text-sm">{action.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

          {/* AI suggestion */}
          <Link href="/trainer/ai" className="block glass-card bg-gradient-to-br from-purple-600/10 to-cyan-600/10 border border-purple-600/20 hover:border-purple-600/40 transition-all group">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold">IA Fitness</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Analise o histórico completo de um aluno e receba sugestões precisas de ajuste de treino com aplicação automática.
            </p>
            <span className="text-xs text-primary font-medium">Analisar aluno →</span>
          </Link>
        </div>
      </div>

      {/* Weekly overview */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">Check-ins da Semana</h2>
          <span className="text-xs text-muted-foreground">Últimos 7 dias</span>
        </div>
        <WeeklyChart values={dashboard?.weeklyCheckins} />
      </div>
    </div>
  );
}

function StudentRow({ student, index }: { student: any; index: number }) {
  if (!student?.user) {
    return (
      <div className="flex items-center gap-4 p-3 rounded-xl">
        <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/10 rounded animate-pulse w-1/3" />
          <div className="h-2 bg-white/5 rounded animate-pulse w-1/4" />
        </div>
        <div className="h-5 w-16 bg-white/10 rounded-full animate-pulse" />
      </div>
    );
  }

  const initials = `${student.user.profile?.firstName?.[0] || ''}${student.user.profile?.lastName?.[0] || ''}`;
  const colors = ['from-purple-600 to-indigo-600', 'from-cyan-600 to-blue-600', 'from-emerald-600 to-teal-600', 'from-orange-600 to-red-600', 'from-pink-600 to-rose-600'];

  return (
    <Link
      href={`/trainer/students/${student.id}`}
      className="flex items-center gap-3 p-2 sm:p-3 rounded-xl hover:bg-accent transition-all"
    >
      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
        {student.user.profile?.avatarUrl ? (
          <img src={student.user.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {student.user.profile?.firstName} {student.user.profile?.lastName}
        </div>
        <div className="text-xs text-muted-foreground truncate">{GOAL_LABELS[student.goalType] || student.goalType || 'Sem objetivo definido'}</div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`hidden xs:inline text-xs px-2 py-0.5 rounded-full ${student.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {student.isActive ? 'Ativo' : 'Inativo'}
        </span>
        <span className="text-xs text-muted-foreground">{student.streak || 0}🔥</span>
      </div>
    </Link>
  );
}

/**
 * Retorna string YYYY-MM-DD no fuso America/Sao_Paulo, compatível com backend toBRDate().
 */
function toBRDate(date: Date): string {
  const br = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const y = br.getFullYear();
  const m = String(br.getMonth() + 1).padStart(2, '0');
  const d = String(br.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function WeeklyChart({ values }: { values?: number[] }) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  // Build labels for the last 7 days in BR timezone (aligned with backend)
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    // Use BR date so day-of-week matches backend key aggregation
    const br = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    return days[br.getDay()];
  });
  const data = values && values.length === 7 ? values : Array(7).fill(0);
  const max = Math.max(...data, 1);

  return (
    <div className="flex items-end gap-1 sm:gap-3 h-24 sm:h-32">
      {dayLabels.map((day, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 sm:gap-2">
          <div className="flex-1 w-full flex items-end">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(data[i] / max) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="w-full bg-gradient-to-t from-purple-600 to-indigo-600 rounded-t-md opacity-80 hover:opacity-100 transition-opacity min-h-[2px]"
            />
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">{day}</div>
          <div className="text-[10px] sm:text-xs font-medium">{data[i]}</div>
        </div>
      ))}
    </div>
  );
}
