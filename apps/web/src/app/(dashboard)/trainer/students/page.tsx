'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plus, Users, Dumbbell, TrendingUp,
  ChevronRight, MoreVertical, MessageCircle, Flame,
  Activity, Calendar, Filter,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const FILTERS = ['Todos', 'Ativos', 'Inativos'];
const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Perda de peso',
  GAIN_MUSCLE: 'Ganho muscular',
  MAINTAIN_WEIGHT: 'Manutenção',
  IMPROVE_ENDURANCE: 'Resistência',
  INCREASE_FLEXIBILITY: 'Flexibilidade',
  ATHLETIC_PERFORMANCE: 'Performance',
  REHABILITATION: 'Reabilitação',
};

export default function TrainerStudents() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');

  const { data: students, isLoading } = useQuery({
    queryKey: ['trainer-students-list'],
    queryFn: () => api.get('/trainers/me/students').then((r) => r.data.data),
  });

  const filtered = (students || []).filter((s: any) => {
    const name = `${s.user?.profile?.firstName || ''} ${s.user?.profile?.lastName || ''}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchFilter =
      filter === 'Todos' ||
      (filter === 'Ativos' && s.isActive) ||
      (filter === 'Inativos' && !s.isActive);
    return matchSearch && matchFilter;
  });

  const totalStudents = students?.length ?? 0;
  const activeStudents = students?.filter((s: any) => s.isActive).length ?? 0;
  const avgStreak = students?.length
    ? Math.round(students.reduce((sum: number, s: any) => sum + (s.streak || 0), 0) / students.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alunos</h1>
          <p className="text-muted-foreground text-sm mt-1">{totalStudents} alunos cadastrados</p>
        </div>
        <Link href="/trainer/students/new" className="btn-primary flex items-center gap-2 text-sm py-2">
          <Plus className="w-4 h-4" />
          Novo aluno
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: totalStudents, icon: Users, color: 'from-purple-600 to-indigo-600' },
          { label: 'Ativos', value: activeStudents, icon: Activity, color: 'from-emerald-600 to-teal-600' },
          { label: 'Sequência média', value: `${avgStreak}d`, icon: Flame, color: 'from-orange-600 to-red-600' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar aluno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'glass border-transparent hover:bg-accent',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-2/3" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((student: any, i: number) => (
            <StudentCard key={student.id} student={student} index={i} />
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhum aluno encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? 'Tente outro nome.' : 'Adicione seu primeiro aluno para começar.'}
          </p>
          {!search && (
            <Link href="/trainer/students/new" className="btn-primary text-sm py-2">
              Adicionar aluno
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const COLORS = ['from-purple-600 to-indigo-600', 'from-cyan-600 to-blue-600', 'from-emerald-600 to-teal-600', 'from-orange-600 to-amber-600', 'from-pink-600 to-rose-600'];

function StudentCard({ student, index }: { student: any; index: number }) {
  const initials = `${student.user?.profile?.firstName?.[0] || ''}${student.user?.profile?.lastName?.[0] || ''}`;
  const color = COLORS[index % COLORS.length];
  const lastCheckin = student.lastCheckinAt
    ? new Date(student.lastCheckinAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : 'Nunca';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card card-hover"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
            {student.user?.profile?.avatarUrl
              ? <img src={student.user.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              : initials}
          </div>
          <div>
            <div className="font-semibold">{student.user?.profile?.firstName} {student.user?.profile?.lastName}</div>
            <div className="text-xs text-muted-foreground">{GOAL_LABELS[student.goalType] || 'Sem objetivo'}</div>
          </div>
        </div>
        <button className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-sm font-bold flex items-center justify-center gap-1">
            {student.streak || 0}<Flame className="w-3 h-3 text-orange-400" />
          </div>
          <div className="text-[10px] text-muted-foreground">Sequência</div>
        </div>
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-sm font-bold">{student.weeklyCheckins || 0}</div>
          <div className="text-[10px] text-muted-foreground">Treinos/sem</div>
        </div>
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-sm font-bold">{student.level || 1}</div>
          <div className="text-[10px] text-muted-foreground">Nível</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            student.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground',
          )}>
            {student.isActive ? 'Ativo' : 'Inativo'}
          </span>
          <span className="text-xs text-muted-foreground">último: {lastCheckin}</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/trainer/chat" className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all">
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
          <Link href={`/trainer/workouts`} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all">
            <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
          <Link href={`/trainer/students/${student.id}`} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
