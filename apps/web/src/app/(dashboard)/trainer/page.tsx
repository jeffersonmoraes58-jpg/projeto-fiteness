'use client';

import { motion } from 'framer-motion';
import {
  Users, Dumbbell, TrendingUp, DollarSign,
  Activity, Calendar, MessageCircle, Star,
  ArrowUpRight, Plus, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const statCards = [
  { key: 'students', label: 'Alunos Ativos', icon: Users, color: 'from-purple-600 to-indigo-600', prefix: '' },
  { key: 'workouts', label: 'Treinos Criados', icon: Dumbbell, color: 'from-cyan-600 to-blue-600', prefix: '' },
  { key: 'checkins', label: 'Check-ins Hoje', icon: Activity, color: 'from-emerald-600 to-teal-600', prefix: '' },
  { key: 'revenue', label: 'Receita Mensal', icon: DollarSign, color: 'from-orange-600 to-amber-600', prefix: 'R$ ' },
];

export default function TrainerDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['trainer-stats'],
    queryFn: () => api.get('/trainers/me/dashboard').then((r) => r.data.data),
  });

  const { data: students } = useQuery({
    queryKey: ['trainer-students'],
    queryFn: () => api.get('/trainers/me/students').then((r) => r.data.data),
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Segunda-feira, 12 de Maio de 2025</p>
        </div>
        <div className="flex gap-3">
          <Link href="/trainer/students/new" className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Plus className="w-4 h-4" />
            Novo aluno
          </Link>
          <Link href="/trainer/workouts/new" className="btn-primary flex items-center gap-2 text-sm py-2">
            <Dumbbell className="w-4 h-4" />
            Novo treino
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-emerald-500 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +12%
              </span>
            </div>
            <div className="text-2xl font-bold">
              {card.prefix}{stats?.[card.key] ?? '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                { label: 'Agendar aula', icon: Calendar, href: '/trainer/schedule', color: 'text-emerald-400' },
                { label: 'Ver mensagens', icon: MessageCircle, href: '/trainer/chat', color: 'text-orange-400' },
                { label: 'Relatórios', icon: TrendingUp, href: '/trainer/reports', color: 'text-pink-400' },
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
          <div className="glass-card bg-gradient-to-br from-purple-600/10 to-cyan-600/10 border border-purple-600/20">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold">Sugestão da IA</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              3 alunos com objetivo de ganho muscular ainda não têm treino de pernas esta semana.
            </p>
            <button className="text-xs text-primary hover:underline">
              Ver alunos →
            </button>
          </div>
        </div>
      </div>

      {/* Weekly overview */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">Check-ins da Semana</h2>
          <span className="text-xs text-muted-foreground">Últimos 7 dias</span>
        </div>
        <WeeklyChart />
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
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent transition-all"
    >
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
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
        <div className="text-xs text-muted-foreground truncate">{student.goalType || 'Sem objetivo definido'}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">Ativo</span>
        <span className="text-xs text-muted-foreground">{student.streak || 0}🔥</span>
      </div>
    </Link>
  );
}

function WeeklyChart() {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const values = [12, 18, 15, 22, 19, 25, 8];
  const max = Math.max(...values);

  return (
    <div className="flex items-end gap-3 h-32">
      {days.map((day, i) => (
        <div key={day} className="flex-1 flex flex-col items-center gap-2">
          <div className="flex-1 w-full flex items-end">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(values[i] / max) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="w-full bg-gradient-to-t from-purple-600 to-indigo-600 rounded-t-md opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
          <div className="text-xs text-muted-foreground">{day}</div>
          <div className="text-xs font-medium">{values[i]}</div>
        </div>
      ))}
    </div>
  );
}
