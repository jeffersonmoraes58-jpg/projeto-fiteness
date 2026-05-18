'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plus, Filter, Users, Apple, TrendingUp,
  ChevronRight, MoreVertical, MessageCircle, Calendar,
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

export default function NutritionistPatients() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');

  const { data: patients, isLoading } = useQuery({
    queryKey: ['nutritionist-patients-list'],
    queryFn: () => api.get('/nutritionists/me/patients').then((r) => r.data.data),
  });

  const filtered = (patients || []).filter((p: any) => {
    const name = `${p.user?.profile?.firstName || ''} ${p.user?.profile?.lastName || ''}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchFilter =
      filter === 'Todos' ||
      (filter === 'Ativos' && p.isActive) ||
      (filter === 'Inativos' && !p.isActive);
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {patients?.length ?? 0} pacientes cadastrados
          </p>
        </div>
        <Link href="/nutritionist/patients/new" className="btn-primary flex items-center gap-2 text-sm py-2">
          <Plus className="w-4 h-4" />
          Novo paciente
        </Link>
      </div>

      {/* Search & filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar paciente..."
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

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: patients?.length ?? 0, icon: Users, color: 'from-emerald-600 to-teal-600' },
          { label: 'Com dieta ativa', value: patients?.filter((p: any) => p.isActive).length ?? 0, icon: Apple, color: 'from-green-600 to-emerald-600' },
          { label: 'Adesão média', value: '78%', icon: TrendingUp, color: 'from-cyan-600 to-blue-600' },
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

      {/* Patients grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                  <div className="h-2 bg-white/5 rounded w-1/3" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-white/10 rounded" />
                <div className="h-2 bg-white/5 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((patient: any, i: number) => (
            <PatientCard key={patient.id} patient={patient} index={i} />
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhum paciente encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? 'Tente outro nome ou filtro.' : 'Adicione seu primeiro paciente.'}
          </p>
          {!search && (
            <Link href="/nutritionist/patients/new" className="btn-primary text-sm py-2">
              Adicionar paciente
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const COLORS = ['from-emerald-600 to-teal-600', 'from-cyan-600 to-blue-600', 'from-purple-600 to-indigo-600', 'from-orange-600 to-amber-600', 'from-pink-600 to-rose-600'];

function PatientCard({ patient, index }: { patient: any; index: number }) {
  const initials = `${patient.user?.profile?.firstName?.[0] || ''}${patient.user?.profile?.lastName?.[0] || ''}`;
  const color = COLORS[index % COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card card-hover"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold flex-shrink-0`}>
            {patient.user?.profile?.avatarUrl
              ? <img src={patient.user.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              : initials}
          </div>
          <div>
            <div className="font-semibold">
              {patient.user?.profile?.firstName} {patient.user?.profile?.lastName}
            </div>
            <div className="text-xs text-muted-foreground">
              {GOAL_LABELS[patient.goalType] || 'Sem objetivo'}
            </div>
          </div>
        </div>
        <button className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Diet compliance */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Adesão à dieta</span>
          <span className="font-medium">{patient.dietCompliance ?? 0}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full',
              (patient.dietCompliance ?? 0) >= 70
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-orange-500 to-red-500',
            )}
            style={{ width: `${patient.dietCompliance ?? 0}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={cn(
          'text-xs px-2 py-1 rounded-full',
          patient.isActive
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-muted text-muted-foreground',
        )}>
          {patient.isActive ? 'Ativo' : 'Inativo'}
        </span>
        <div className="flex items-center gap-1">
          <Link
            href={`/nutritionist/chat`}
            className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
          <Link
            href={`/nutritionist/schedule`}
            className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
          >
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
          <Link
            href={`/nutritionist/patients/${patient.id}`}
            className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
