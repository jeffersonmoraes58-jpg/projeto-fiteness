'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dumbbell, Plus, Search, Copy, Archive, MoreVertical,
  ChevronRight, Clock, Users, Layers, Zap, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = ['Todos', 'Rascunho', 'Ativo', 'Arquivado', 'Templates'];
const STATUS_MAP: Record<string, string> = { Rascunho: 'DRAFT', Ativo: 'ACTIVE', Arquivado: 'ARCHIVED' };
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-yellow-500/10 text-yellow-400' },
  ACTIVE: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400' },
  ARCHIVED: { label: 'Arquivado', color: 'bg-muted text-muted-foreground' },
};
const LEVEL_LABELS = ['', 'Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Elite'];

export default function TrainerWorkouts() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const queryClient = useQueryClient();

  const { data: workouts, isLoading } = useQuery({
    queryKey: ['trainer-workouts'],
    queryFn: () => api.get('/workouts').then((r) => r.data.data),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/workouts/${id}/duplicate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainer-workouts'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/workouts/${id}`, { status: 'ARCHIVED' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainer-workouts'] }),
  });

  const filtered = (workouts || []).filter((w: any) => {
    const matchSearch = w.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'Todos' ||
      (filter === 'Templates' && w.isTemplate) ||
      w.status === STATUS_MAP[filter];
    return matchSearch && matchFilter;
  });

  const counts = {
    active: workouts?.filter((w: any) => w.status === 'ACTIVE').length ?? 0,
    draft: workouts?.filter((w: any) => w.status === 'DRAFT').length ?? 0,
    templates: workouts?.filter((w: any) => w.isTemplate).length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Treinos</h1>
          <p className="text-muted-foreground text-sm mt-1">Crie e gerencie planos de treino</p>
        </div>
        <Link href="/trainer/workouts/new" className="btn-primary flex items-center gap-2 text-sm py-2">
          <Plus className="w-4 h-4" />
          Novo treino
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Treinos ativos', value: counts.active, color: 'from-purple-600 to-indigo-600', icon: Dumbbell },
          { label: 'Rascunhos', value: counts.draft, color: 'from-yellow-600 to-orange-600', icon: FileText },
          { label: 'Templates', value: counts.templates, color: 'from-cyan-600 to-blue-600', icon: Copy },
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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar treino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium flex-shrink-0 transition-all border',
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

      {/* Workout list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-2 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((workout: any, i: number) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              index={i}
              onDuplicate={() => duplicateMutation.mutate(workout.id)}
              onArchive={() => archiveMutation.mutate(workout.id)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Dumbbell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhum treino encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro treino para seus alunos.</p>
          <Link href="/trainer/workouts/new" className="btn-primary text-sm py-2">Criar treino</Link>
        </div>
      )}
    </div>
  );
}

function WorkoutCard({ workout, index, onDuplicate, onArchive }: {
  workout: any; index: number; onDuplicate: () => void; onArchive: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = STATUS_LABELS[workout.status] || STATUS_LABELS.DRAFT;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card hover:bg-accent/30 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold">{workout.name}</span>
            {workout.isTemplate && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-medium">Template</span>
            )}
            <span className={cn('text-xs px-2 py-0.5 rounded-full', status.color)}>{status.label}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{workout._count?.exercises ?? workout.exercises?.length ?? 0} exercícios</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{workout.duration ?? 45} min</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" />{LEVEL_LABELS[workout.level] || 'Iniciante'}</span>
            <span className="flex items-center gap-1 hidden sm:flex"><Users className="w-3 h-3" />{workout._count?.plans ?? 0} alunos</span>
          </div>
          {workout.tags?.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {workout.tags.slice(0, 3).map((tag: string) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full glass text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link href={`/trainer/workouts/${workout.id}`} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-all">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 bg-card border border-border rounded-xl shadow-xl z-10 py-1 w-40">
                <button onClick={() => { onDuplicate(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all">
                  <Copy className="w-3.5 h-3.5" /> Duplicar
                </button>
                <button onClick={() => { onArchive(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all text-muted-foreground">
                  <Archive className="w-3.5 h-3.5" /> Arquivar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
