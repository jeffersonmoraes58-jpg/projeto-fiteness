'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Apple, Plus, Search, Copy, Archive,
  MoreVertical, ChevronRight, Flame, Beef, Wheat, Droplets,
  FileText, Users,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = ['Todos', 'Rascunho', 'Ativo', 'Arquivado', 'Templates'];
const STATUS_MAP: Record<string, string> = {
  Rascunho: 'DRAFT',
  Ativo: 'ACTIVE',
  Arquivado: 'ARCHIVED',
};
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-yellow-500/10 text-yellow-400' },
  ACTIVE: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400' },
  ARCHIVED: { label: 'Arquivado', color: 'bg-muted text-muted-foreground' },
};

export default function NutritionistDiets() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const queryClient = useQueryClient();

  const { data: diets, isLoading } = useQuery({
    queryKey: ['nutritionist-diets'],
    queryFn: () => api.get('/diets').then((r) => r.data.data),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/diets/${id}/duplicate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nutritionist-diets'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/diets/${id}`, { status: 'ARCHIVED' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nutritionist-diets'] }),
  });

  const filtered = (diets || []).filter((d: any) => {
    const matchSearch = d.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'Todos' ||
      (filter === 'Templates' && d.isTemplate) ||
      d.status === STATUS_MAP[filter];
    return matchSearch && matchFilter;
  });

  const counts = {
    active: diets?.filter((d: any) => d.status === 'ACTIVE').length ?? 0,
    draft: diets?.filter((d: any) => d.status === 'DRAFT').length ?? 0,
    templates: diets?.filter((d: any) => d.isTemplate).length ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dietas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie e gerencie planos alimentares
          </p>
        </div>
        <Link href="/nutritionist/diets/new" className="btn-primary flex items-center gap-2 text-sm py-2">
          <Plus className="w-4 h-4" />
          Nova dieta
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Dietas ativas', value: counts.active, color: 'from-emerald-600 to-teal-600', icon: Apple },
          { label: 'Rascunhos', value: counts.draft, color: 'from-yellow-600 to-orange-600', icon: FileText },
          { label: 'Templates', value: counts.templates, color: 'from-purple-600 to-indigo-600', icon: Copy },
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
            placeholder="Buscar dieta..."
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

      {/* Diet list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((diet: any, i: number) => (
            <DietCard
              key={diet.id}
              diet={diet}
              index={i}
              onDuplicate={() => duplicateMutation.mutate(diet.id)}
              onArchive={() => archiveMutation.mutate(diet.id)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Apple className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhuma dieta encontrada</h3>
          <p className="text-sm text-muted-foreground mb-4">Crie sua primeira dieta para seus pacientes.</p>
          <Link href="/nutritionist/diets/new" className="btn-primary text-sm py-2">
            Criar dieta
          </Link>
        </div>
      )}
    </div>
  );
}

function DietCard({ diet, index, onDuplicate, onArchive }: {
  diet: any;
  index: number;
  onDuplicate: () => void;
  onArchive: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = STATUS_LABELS[diet.status] || STATUS_LABELS.DRAFT;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card hover:bg-accent/30 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center flex-shrink-0">
          <Apple className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold truncate">{diet.name}</span>
            {diet.isTemplate && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium flex-shrink-0">
                Template
              </span>
            )}
            <span className={cn('text-xs px-2 py-0.5 rounded-full flex-shrink-0', status.color)}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
              {diet.totalCalories ?? 0} kcal
            </span>
            <span className="flex items-center gap-1">
              <Beef className="w-3 h-3 text-red-400" />
              P: {diet.totalProtein ?? 0}g
            </span>
            <span className="flex items-center gap-1">
              <Wheat className="w-3 h-3 text-yellow-400" />
              C: {diet.totalCarbs ?? 0}g
            </span>
            <span className="flex items-center gap-1 hidden sm:flex">
              <Droplets className="w-3 h-3 text-blue-400" />
              G: {diet.totalFat ?? 0}g
            </span>
            <span className="flex items-center gap-1 hidden md:flex">
              <Users className="w-3 h-3" />
              {diet._count?.plans ?? 0} pacientes
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Link
            href={`/nutritionist/diets/${diet.id}`}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
          >
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
                <button
                  onClick={() => { onDuplicate(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicar
                </button>
                <button
                  onClick={() => { onArchive(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all text-muted-foreground"
                >
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
