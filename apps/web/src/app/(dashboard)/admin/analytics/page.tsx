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

export default function AdminAnalytics() {
  const [period, setPeriod] = useState('30d');
  const [metric, setMetric] = useState<'users' | 'revenue'>('users');

  const { data: analytics } = useQuery<any>({
    queryKey: ['admin-analytics', period],
    queryFn: () => api.get(`/admin/analytics?period=${period}`).then((r) => r.data?.data ?? r.data),
  });

  const stats = analytics?.stats ?? {};
  const topTenants: any[] = analytics?.topTenants ?? [];
  const featureUsage: any[] = analytics?.featureUsage ?? [];
  const cohortData: any[] = analytics?.cohort ?? [];
  const chartData: Array<{ label: string; users: number; revenue: number }> = analytics?.growth ?? [];
  const userGrowthPct: number = analytics?.userGrowthPct ?? 0;
  const tenantGrowthPct: number = analytics?.tenantGrowthPct ?? 0;

  const maxVal = chartData.length > 0
    ? Math.max(1, ...chartData.map((d) => (metric === 'users' ? d.users : d.revenue)))
    : 1;

  const fmtDelta = (pct: number) => {
    const rounded = Math.round(pct * 10) / 10;
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded}%`;
  };

  const lastTwo = chartData.slice(-2);
  const mrrPrev = lastTwo[0]?.revenue ?? 0;
  const mrrCurr = lastTwo[1]?.revenue ?? stats.mrr ?? 0;
  const mrrDeltaPct = mrrPrev > 0 ? ((mrrCurr - mrrPrev) / mrrPrev) * 100 : mrrCurr > 0 ? 100 : 0;

  const kpis = [
    {
      label: 'Total de Usuários',
      value: (stats.totalUsers ?? 0).toLocaleString('pt-BR'),
      delta: fmtDelta(userGrowthPct),
      up: userGrowthPct >= 0,
      icon: Users,
      color: 'from-purple-600 to-indigo-600',
    },
    {
      label: 'Receita Total (MRR)',
      value: `R$ ${(stats.mrr ?? 0).toLocaleString('pt-BR')}`,
      delta: fmtDelta(mrrDeltaPct),
      up: mrrDeltaPct >= 0,
      icon: DollarSign,
      color: 'from-emerald-600 to-teal-600',
    },
    {
      label: 'Tenants Ativos',
      value: (stats.activeTenants ?? 0).toLocaleString('pt-BR'),
      delta: fmtDelta(tenantGrowthPct),
      up: tenantGrowthPct >= 0,
      icon: Globe,
      color: 'from-blue-600 to-cyan-600',
    },
    {
      label: 'Taxa de Retenção',
      value: `${stats.retentionRate ?? 0}%`,
      delta: '',
      up: true,
      icon: UserCheck,
      color: 'from-orange-600 to-amber-600',
    },
  ];

  const FEATURE_ICONS: Record<string, any> = {
    Treinos: Dumbbell,
    Dietas: Apple,
    Chat: Activity,
    Agenda: Calendar,
    Gamificação: TrendingUp,
    'IA Fitness': BarChart3,
  };

  const featureStats = featureUsage.map((f) => ({
    ...f,
    icon: FEATURE_ICONS[f.name] ?? Activity,
  }));
  const maxFeature = featureStats.length > 0 ? Math.max(1, ...featureStats.map((f: any) => f.count)) : 1;

  const planColors: Record<string, string> = {
    FREE: 'bg-gray-500/10 text-gray-400',
    BASIC: 'bg-cyan-500/10 text-cyan-400',
    PRO: 'bg-purple-500/10 text-purple-400',
    ENTERPRISE: 'bg-yellow-500/10 text-yellow-400',
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
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
        {chartData.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Sem dados de crescimento ainda.
          </div>
        ) : (
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
        )}
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
          {featureStats.length === 0 || featureStats.every((f: any) => f.count === 0) ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Sem uso registrado no período.
            </div>
          ) : (
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
          )}
        </motion.div>

        {/* Top tenants */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card"
        >
          <h2 className="font-semibold mb-4">Top Tenants</h2>
          {topTenants.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Sem tenants cadastrados.
            </div>
          ) : (
          <div className="space-y-3">
            {topTenants.map((t: any, i: number) => (
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
          )}
        </motion.div>
      </div>

      {cohortData.length > 0 && (
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
              {cohortData.map((row: any) => (
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
      )}
    </div>
  );
}
