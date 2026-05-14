'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, BarChart3, Globe,
  Dumbbell, Apple, UserCheck, Calendar,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const PERIODS = ['7d', '30d', '90d', '12m'];

const MOCK_GROWTH = [
  { label: 'Jan', users: 120, revenue: 8400 },
  { label: 'Fev', users: 185, revenue: 12300 },
  { label: 'Mar', users: 240, revenue: 16800 },
  { label: 'Abr', users: 310, revenue: 21700 },
  { label: 'Mai', users: 390, revenue: 27300 },
  { label: 'Jun', users: 460, revenue: 32200 },
  { label: 'Jul', users: 520, revenue: 36400 },
  { label: 'Ago', users: 610, revenue: 42700 },
  { label: 'Set', users: 720, revenue: 50400 },
  { label: 'Out', users: 850, revenue: 59500 },
  { label: 'Nov', users: 940, revenue: 65800 },
  { label: 'Dez', users: 1080, revenue: 75600 },
];

export default function AdminAnalytics() {
  const [period, setPeriod] = useState('30d');
  const [metric, setMetric] = useState<'users' | 'revenue'>('users');

  const { data: analytics } = useQuery({
    queryKey: ['admin-analytics', period],
    queryFn: () => api.get(`/admin/analytics?period=${period}`).then((r) => r.data.data),
  });

  const stats = analytics?.stats || {};
  const topTenants = analytics?.topTenants || [];
  const featureUsage = analytics?.featureUsage || [];
  const cohortData = analytics?.cohort || [];

  const chartData = MOCK_GROWTH;
  const maxVal = Math.max(...chartData.map((d) => metric === 'users' ? d.users : d.revenue));

  const kpis = [
    {
      label: 'Total de Usuários',
      value: (stats.totalUsers || 1080).toLocaleString('pt-BR'),
      delta: '+14.8%',
      up: true,
      icon: Users,
      color: 'from-purple-600 to-indigo-600',
    },
    {
      label: 'Receita Total (MRR)',
      value: `R$ ${(stats.mrr || 75600).toLocaleString('pt-BR')}`,
      delta: '+22.3%',
      up: true,
      icon: DollarSign,
      color: 'from-emerald-600 to-teal-600',
    },
    {
      label: 'Tenants Ativos',
      value: (stats.activeTenants || 84).toLocaleString('pt-BR'),
      delta: '+6.2%',
      up: true,
      icon: Globe,
      color: 'from-blue-600 to-cyan-600',
    },
    {
      label: 'Taxa de Retenção',
      value: `${stats.retentionRate || 87}%`,
      delta: '+2.1%',
      up: true,
      icon: UserCheck,
      color: 'from-orange-600 to-amber-600',
    },
  ];

  const featureStats = featureUsage.length > 0 ? featureUsage : [
    { name: 'Treinos', count: 8420, icon: Dumbbell, color: 'bg-purple-500' },
    { name: 'Dietas', count: 5310, icon: Apple, color: 'bg-emerald-500' },
    { name: 'Chat', count: 12840, icon: Activity, color: 'bg-blue-500' },
    { name: 'IA Fitness', count: 3290, icon: BarChart3, color: 'bg-orange-500' },
    { name: 'Agenda', count: 6750, icon: Calendar, color: 'bg-cyan-500' },
    { name: 'Gamificação', count: 9120, icon: TrendingUp, color: 'bg-pink-500' },
  ];
  const maxFeature = Math.max(...featureStats.map((f: any) => f.count));

  const tenants = topTenants.length > 0 ? topTenants : [
    { name: 'Studio FitPro', plan: 'ENTERPRISE', users: 142, mrr: 599, growth: 18 },
    { name: 'Academia Alpha', plan: 'PRO', users: 87, mrr: 249, growth: 12 },
    { name: 'NutriClub SP', plan: 'PRO', users: 65, mrr: 249, growth: 8 },
    { name: 'Power Gym', plan: 'BASIC', users: 43, mrr: 99, growth: 5 },
    { name: 'Wellness Center', plan: 'ENTERPRISE', users: 198, mrr: 599, growth: 22 },
  ];

  const planColors: Record<string, string> = {
    FREE: 'bg-gray-500/10 text-gray-400',
    BASIC: 'bg-cyan-500/10 text-cyan-400',
    PRO: 'bg-purple-500/10 text-purple-400',
    ENTERPRISE: 'bg-yellow-500/10 text-yellow-400',
  };

  const cohort = cohortData.length > 0 ? cohortData : [
    { month: 'Out/25', m0: 100, m1: 82, m2: 74, m3: 68 },
    { month: 'Nov/25', m0: 100, m1: 79, m2: 71, m3: 65 },
    { month: 'Dez/25', m0: 100, m1: 85, m2: 76, m3: null },
    { month: 'Jan/26', m0: 100, m1: 88, m2: null, m3: null },
    { month: 'Fev/26', m0: 100, m1: null, m2: null, m3: null },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral da plataforma</p>
        </div>
        <div className="flex gap-1 glass rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                period === p ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground',
              )}
            >
              {p}
            </button>
          ))}
        </div>
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
              <span className={cn('text-xs flex items-center gap-0.5', kpi.up ? 'text-emerald-400' : 'text-red-400')}>
                {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.delta}
              </span>
            </div>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Growth chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">Crescimento da Plataforma</h2>
          <div className="flex gap-1 glass rounded-xl p-1">
            <button
              onClick={() => setMetric('users')}
              className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-all', metric === 'users' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}
            >
              Usuários
            </button>
            <button
              onClick={() => setMetric('revenue')}
              className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-all', metric === 'revenue' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}
            >
              Receita
            </button>
          </div>
        </div>
        <div className="flex items-end gap-2 h-48">
          {chartData.map((d, i) => {
            const val = metric === 'users' ? d.users : d.revenue;
            const h = (val / maxVal) * 100;
            return (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: 160 }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    className="w-full rounded-t-md bg-gradient-to-t from-purple-600 to-indigo-500 opacity-80 hover:opacity-100 transition-opacity cursor-pointer relative group"
                    title={metric === 'users' ? `${val} usuários` : `R$ ${val.toLocaleString('pt-BR')}`}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-2 py-1 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      {metric === 'users' ? val : `R$ ${val.toLocaleString('pt-BR')}`}
                    </div>
                  </motion.div>
                </div>
                <span className="text-[9px] text-muted-foreground">{d.label}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card"
        >
          <h2 className="font-semibold mb-4">Uso de Funcionalidades</h2>
          <div className="space-y-3">
            {featureStats.map((f: any) => (
              <div key={f.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', f.color)} />
                    <span>{f.name}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">{f.count.toLocaleString('pt-BR')}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(f.count / maxFeature) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className={cn('h-full rounded-full', f.color)}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top tenants */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card"
        >
          <h2 className="font-semibold mb-4">Top Tenants</h2>
          <div className="space-y-3">
            {tenants.map((t: any, i: number) => (
              <div key={t.name} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{t.name}</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0', planColors[t.plan])}>
                      {t.plan}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{t.users} usuários</span>
                    <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                      <ArrowUpRight className="w-3 h-3" />+{t.growth}%
                    </span>
                  </div>
                </div>
                <div className="text-sm font-semibold text-right flex-shrink-0">
                  R$ {t.mrr}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Cohort retention */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass-card overflow-x-auto"
      >
        <h2 className="font-semibold mb-4">Retenção por Coorte</h2>
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left pb-3 font-medium">Coorte</th>
              <th className="pb-3 font-medium">Mês 0</th>
              <th className="pb-3 font-medium">Mês 1</th>
              <th className="pb-3 font-medium">Mês 2</th>
              <th className="pb-3 font-medium">Mês 3</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {cohort.map((row: any) => (
              <tr key={row.month}>
                <td className="py-2.5 text-sm font-medium">{row.month}</td>
                {[row.m0, row.m1, row.m2, row.m3].map((val: number | null, j: number) => (
                  <td key={j} className="py-2.5 text-center">
                    {val !== null ? (
                      <span
                        className={cn(
                          'inline-block px-2 py-1 rounded-lg text-xs font-medium',
                          val >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                          val >= 65 ? 'bg-blue-500/10 text-blue-400' :
                          'bg-orange-500/10 text-orange-400',
                        )}
                      >
                        {val}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
