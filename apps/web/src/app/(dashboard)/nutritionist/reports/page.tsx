'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, Apple, Target,
  ArrowUpRight, Calendar, BarChart3,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const PERIODS = ['7 dias', '30 dias', '3 meses', '6 meses'];

export default function NutritionistReports() {
  const [period, setPeriod] = useState('30 dias');

  const { data: dashboard } = useQuery({
    queryKey: ['nutritionist-dashboard'],
    queryFn: () => api.get('/nutritionists/me/dashboard').then((r) => r.data.data),
  });

  const { data: patients } = useQuery({
    queryKey: ['nutritionist-patients-list'],
    queryFn: () => api.get('/nutritionists/me/patients').then((r) => r.data.data),
  });

  const { data: financials } = useQuery({
    queryKey: ['nutritionist-financials'],
    queryFn: () => api.get('/nutritionists/me/financials').then((r) => r.data.data),
  });

  const stats = dashboard?.stats;
  const totalPatients = patients?.length ?? 0;
  const activePatients = patients?.filter((p: any) => p.isActive).length ?? 0;

  const kpis = [
    { label: 'Pacientes ativos', value: activePatients, total: totalPatients, icon: Users, color: 'from-emerald-600 to-teal-600' },
    { label: 'Adesão média', value: stats?.avgCompliance ?? 0, suffix: '%', icon: Target, color: 'from-cyan-600 to-blue-600' },
    { label: 'Consultas hoje', value: stats?.consultationsToday ?? 0, icon: Calendar, color: 'from-purple-600 to-indigo-600' },
    { label: 'Dietas ativas', value: stats?.diets ?? 0, icon: Apple, color: 'from-green-600 to-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral do desempenho</p>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
              period === p
                ? 'bg-primary text-primary-foreground border-primary'
                : 'glass border-transparent hover:bg-accent',
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
              {kpi.total !== undefined && (
                <span className="text-xs text-muted-foreground">de {kpi.total}</span>
              )}
            </div>
            <div className="text-2xl font-bold">
              {kpi.value}{kpi.suffix || ''}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Adesão às Dietas
            </h2>
            <span className="text-xs text-muted-foreground">últimos 7 dias</span>
          </div>
          <ComplianceTrendChart data={stats?.weeklyCompliance} />
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
              Objetivos dos Pacientes
            </h2>
          </div>
          <GoalDistribution patients={patients} />
        </motion.div>
      </div>

      {/* Financial summary */}
      {financials && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Resumo Financeiro
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Faturamento Mensal</div>
              <div className="text-xl font-bold">R$ {financials.totalMonthly}</div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Ticket Médio</div>
              <div className="text-xl font-bold">R$ {financials.ticketMedio}</div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Projeção Anual</div>
              <div className="text-xl font-bold">R$ {financials.projectedAnnual}</div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Pacientes Pagantes</div>
              <div className="text-xl font-bold">{financials.payingPatients} / {financials.totalPatients}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Patient progress table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass-card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">Progresso dos Pacientes</h2>
        </div>
        <PatientProgressTable patients={patients} />
      </motion.div>
    </div>
  );
}

function ComplianceTrendChart({ data }: { data?: number[] }) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const values = data && data.length > 0 ? data : [];
  const hasData = values.length > 0;
  const max = 100;

  return (
    <div>
      <div className="flex items-end gap-1.5 h-32">
        {days.map((day, i) => {
          const value = hasData ? values[i] : 0;
          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              {hasData ? (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(value / max) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.04 }}
                  className={cn(
                    'w-full rounded-t-md',
                    value >= 80 ? 'bg-gradient-to-t from-emerald-600 to-teal-500' : 'bg-gradient-to-t from-orange-600 to-amber-500',
                  )}
                />
              ) : (
                <div className="w-full h-full bg-white/5 rounded-t-md" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        {days.map((day, i) => (
          <span key={day} className="flex-1 text-center text-[9px] text-muted-foreground">
            {day}
            {hasData && <span className="block text-[10px] font-medium text-foreground">{values[i]}%</span>}
          </span>
        ))}
      </div>
      {hasData && (
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-emerald-600 to-teal-500" />
            ≥ 80% (bom)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-orange-600 to-amber-500" />
            {'<'} 80% (atenção)
          </div>
        </div>
      )}
      {!hasData && (
        <p className="text-sm text-muted-foreground text-center py-8">Sem dados de adesão disponíveis</p>
      )}
    </div>
  );
}

function GoalDistribution({ patients }: { patients?: any[] }) {
  if (!patients?.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum paciente cadastrado</p>;
  }

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
  patients.forEach((p: any) => {
    const g = p.goalType || 'MAINTAIN_WEIGHT';
    counts[g] = (counts[g] || 0) + 1;
  });

  const total = patients.length;
  const colors = ['bg-emerald-500', 'bg-cyan-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-blue-500', 'bg-yellow-500'];
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

function PatientProgressTable({ patients }: { patients?: any[] }) {
  if (!patients?.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum paciente cadastrado</p>;
  }

  const goalMap: Record<string, string> = {
    LOSE_WEIGHT: 'Emagrecimento', GAIN_MUSCLE: 'Massa', MAINTAIN_WEIGHT: 'Manutenção',
    IMPROVE_ENDURANCE: 'Resistência', INCREASE_FLEXIBILITY: 'Flexibilidade',
    ATHLETIC_PERFORMANCE: 'Performance', REHABILITATION: 'Reabilitação',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left text-xs text-muted-foreground font-medium pb-3">Paciente</th>
            <th className="text-center text-xs text-muted-foreground font-medium pb-3">Objetivo</th>
            <th className="text-center text-xs text-muted-foreground font-medium pb-3">Mensalidade</th>
            <th className="text-center text-xs text-muted-foreground font-medium pb-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {patients.slice(0, 10).map((p: any) => (
            <tr key={p.id} className="hover:bg-accent/50 transition-all">
              <td className="py-3">
                <Link href={`/nutritionist/patients/${p.id}`} className="font-medium hover:text-primary transition-colors">
                  {p.user?.profile?.firstName} {p.user?.profile?.lastName}
                </Link>
              </td>
              <td className="py-3 text-center">
                <span className="text-xs text-muted-foreground">
                  {goalMap[p.goalType] || p.goalType || '—'}
                </span>
              </td>
              <td className="py-3 text-center">
                <span className="text-xs text-muted-foreground">
                  {p.monthlyFee ? `R$ ${p.monthlyFee}` : '—'}
                </span>
              </td>
              <td className="py-3 text-center">
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  p.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground',
                )}>
                  {p.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}