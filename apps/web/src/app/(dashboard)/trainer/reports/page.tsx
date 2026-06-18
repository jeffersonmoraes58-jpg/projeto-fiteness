'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Dumbbell, Activity,
  BarChart3, Flame, Trophy, Target, Clock, FileDown,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const PERIODS: { label: string; days: number }[] = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
];

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Perda de peso',
  GAIN_MUSCLE: 'Ganho muscular',
  MAINTAIN_WEIGHT: 'Manutenção',
  IMPROVE_ENDURANCE: 'Resistência',
  INCREASE_FLEXIBILITY: 'Flexibilidade',
  ATHLETIC_PERFORMANCE: 'Performance',
  REHABILITATION: 'Reabilitação',
  __undefined: 'Não definido',
};

export default function TrainerReports() {
  const [periodIdx, setPeriodIdx] = useState(1);
  const period = PERIODS[periodIdx];

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['trainer-reports', period.days],
    queryFn: () => api.get(`/trainers/me/reports?days=${period.days}`).then((r) => r.data.data),
  });

  const { data: students } = useQuery({
    queryKey: ['trainer-students-list'],
    queryFn: () => api.get('/trainers/me/students').then((r) => r.data.data ?? []),
  });

  function exportCSV() {
    if (!students?.length) return;
    const rows = [
      ['Nome', 'Email', 'Objetivo', 'Sequência', 'Nível', 'Pontos', 'Status', 'Último treino'],
      ...students.map((s: any) => [
        `${s.user?.profile?.firstName ?? ''} ${s.user?.profile?.lastName ?? ''}`.trim(),
        s.user?.email ?? '',
        GOAL_LABELS[s.goalType ?? '__undefined'] ?? s.goalType ?? '',
        s.streak ?? 0,
        s.level ?? 1,
        s.points ?? 0,
        s.isActive ? 'Ativo' : 'Inativo',
        s.lastCheckinAt ? new Date(s.lastCheckinAt).toLocaleDateString('pt-BR') : 'Nunca',
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alunos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    if (!students?.length && !stats) return;
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const rows = (students ?? [])
      .sort((a: any, b: any) => (b.streak || 0) - (a.streak || 0))
      .map((s: any) => `
        <tr>
          <td>${`${s.user?.profile?.firstName ?? ''} ${s.user?.profile?.lastName ?? ''}`.trim()}</td>
          <td>${s.user?.email ?? ''}</td>
          <td>${GOAL_LABELS[s.goalType ?? '__undefined'] ?? '—'}</td>
          <td>${s.streak ?? 0}🔥</td>
          <td>${s.level ?? 1}</td>
          <td>${s.points ?? 0}</td>
          <td style="color:${s.isActive ? '#10b981' : '#94a3b8'}">${s.isActive ? 'Ativo' : 'Inativo'}</td>
          <td>${s.lastCheckinAt ? new Date(s.lastCheckinAt).toLocaleDateString('pt-BR') : '—'}</td>
        </tr>
      `).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório — Fitlynutri</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; color: #7c3aed; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 13px; margin-bottom: 28px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
    .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .kpi-value { font-size: 26px; font-weight: 700; color: #7c3aed; }
    .kpi-label { font-size: 11px; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: .05em; }
    h2 { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #334155; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 8px 10px; background: #f1f5f9; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: .05em; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
    tr:hover td { background: #fafafa; }
    .footer { margin-top: 32px; text-align: center; color: #94a3b8; font-size: 11px; }
    @media print { body { padding: 16px; } @page { margin: 1cm; } }
  </style>
</head>
<body>
  <h1>Relatório — Fitlynutri</h1>
  <p class="subtitle">Período: ${period.label} &nbsp;•&nbsp; Gerado em ${date}</p>

  <div class="kpis">
    <div class="kpi"><div class="kpi-value">${stats?.activeStudents ?? '—'}</div><div class="kpi-label">Alunos ativos</div></div>
    <div class="kpi"><div class="kpi-value">${stats?.totalCheckins ?? '—'}</div><div class="kpi-label">Check-ins</div></div>
    <div class="kpi"><div class="kpi-value">${stats?.totalWorkouts ?? '—'}</div><div class="kpi-label">Treinos criados</div></div>
    <div class="kpi"><div class="kpi-value">${stats?.avgStreak != null ? stats.avgStreak + 'd' : '—'}</div><div class="kpi-label">Sequência média</div></div>
  </div>

  <h2>Alunos (${students?.length ?? 0})</h2>
  <table>
    <thead>
      <tr>
        <th>Nome</th><th>Email</th><th>Objetivo</th><th>Sequência</th>
        <th>Nível</th><th>Pontos</th><th>Status</th><th>Último treino</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">Fitlynutri &mdash; ${date}</div>
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };<\/script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  const kpis = [
    {
      label: 'Alunos ativos',
      value: stats?.activeStudents ?? '—',
      icon: Users,
      color: 'from-purple-600 to-indigo-600',
    },
    {
      label: `Check-ins (${period.label})`,
      value: stats?.totalCheckins ?? '—',
      icon: Activity,
      color: 'from-emerald-600 to-teal-600',
    },
    {
      label: 'Treinos criados',
      value: stats?.totalWorkouts ?? '—',
      icon: Dumbbell,
      color: 'from-cyan-600 to-blue-600',
    },
    {
      label: 'Sequência média',
      value: stats?.avgStreak != null ? `${stats.avgStreak}d` : '—',
      icon: Flame,
      color: 'from-orange-600 to-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral do desempenho</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportPDF}
            disabled={!students?.length}
            className="btn-primary flex items-center gap-2 text-sm py-2 disabled:opacity-40"
            title="Exportar relatório em PDF"
          >
            <FileDown className="w-4 h-4" />
            Exportar PDF
          </button>
          <button
            onClick={exportCSV}
            disabled={!students?.length}
            className="btn-secondary flex items-center gap-2 text-sm py-2 disabled:opacity-40"
            title="Exportar lista de alunos em CSV"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 15V3m0 12-4-4m4 4 4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-2">
        {PERIODS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => setPeriodIdx(i)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
              periodIdx === i
                ? 'bg-primary text-primary-foreground border-primary'
                : 'glass border-transparent hover:bg-accent',
            )}
          >
            {p.label}
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
            transition={{ delay: i * 0.08 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center`}>
                <kpi.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold">
              {statsLoading ? <span className="inline-block w-8 h-6 bg-white/10 rounded animate-pulse" /> : kpi.value}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-in chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Check-ins por dia
            </h2>
            <span className="text-xs text-muted-foreground">{period.label}</span>
          </div>
          <CheckinChart data={stats?.dailyCheckins} loading={statsLoading} days={period.days} />
        </motion.div>

        {/* Goal distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              Objetivos dos Alunos
            </h2>
            <span className="text-xs text-muted-foreground">{students?.length ?? 0} alunos</span>
          </div>
          <GoalDistribution students={students} />
        </motion.div>
      </div>

      {/* Ranking */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="glass-card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Ranking de Alunos
          </h2>
          <span className="text-xs text-muted-foreground">por sequência</span>
        </div>
        <StudentRanking students={students} />
      </motion.div>

      {/* Progress table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="glass-card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">Progresso dos Alunos</h2>
          <Link href="/trainer/students" className="text-xs text-primary hover:underline">Ver todos</Link>
        </div>
        <StudentProgressTable students={students} />
      </motion.div>
    </div>
  );
}

function CheckinChart({ data, loading, days }: { data?: number[]; loading?: boolean; days: number }) {
  if (loading) {
    return (
      <div className="flex items-end gap-1 h-32">
        {[...Array(Math.min(days, 30))].map((_, i) => (
          <div key={i} className="flex-1 bg-white/5 rounded-t-sm animate-pulse" style={{ height: `${20 + Math.random() * 60}%` }} />
        ))}
      </div>
    );
  }

  const values = data ?? [];
  if (!values.length || values.every((v) => v === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <Activity className="w-8 h-8 text-muted-foreground mb-2 opacity-40" />
        <p className="text-sm text-muted-foreground">Nenhum check-in no período</p>
      </div>
    );
  }

  const max = Math.max(...values, 1);
  const showEveryN = Math.ceil(values.length / 7);

  return (
    <div>
      <div className="flex items-end gap-0.5 h-32">
        {values.map((v, i) => (
          <div key={i} className="flex-1 flex items-end group relative" style={{ height: '100%' }}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max((v / max) * 100, v > 0 ? 4 : 0)}%` }}
              transition={{ duration: 0.5, delay: i * 0.01 }}
              className={cn(
                'w-full rounded-t-sm transition-opacity',
                v > 0
                  ? 'bg-gradient-to-t from-purple-600 to-indigo-500 opacity-80 hover:opacity-100'
                  : 'bg-white/5',
              )}
            />
            {v > 0 && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-background border border-border rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {v}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
        {values.map((_, i) => {
          if (i % showEveryN !== 0 && i !== values.length - 1) return <span key={i} />;
          const d = new Date(Date.now() - (values.length - 1 - i) * 86400000);
          return (
            <span key={i} className="leading-none">
              {d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function GoalDistribution({ students }: { students?: any[] }) {
  if (!students?.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>;
  }

  const counts: Record<string, number> = {};
  students.forEach((s: any) => {
    const g = s.goalType || '__undefined';
    counts[g] = (counts[g] || 0) + 1;
  });

  const total = students.length;
  const colors = ['bg-purple-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-blue-500', 'bg-yellow-500', 'bg-gray-500'];
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      {sorted.map(([goal, count], i) => {
        const pct = Math.round((count / total) * 100);
        return (
          <div key={goal}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{GOAL_LABELS[goal] || goal}</span>
              <span className="font-medium">{count} ({pct}%)</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
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
  if (!students?.length) {
    return <p className="text-sm text-muted-foreground text-center py-6">Sem dados</p>;
  }

  const ranked = [...students]
    .sort((a, b) => (b.streak || 0) - (a.streak || 0))
    .slice(0, 5);

  const AVATAR_COLORS = [
    'from-yellow-500 to-orange-500',
    'from-gray-400 to-gray-500',
    'from-orange-700 to-orange-800',
    'from-purple-600 to-indigo-600',
    'from-cyan-600 to-blue-600',
  ];

  return (
    <div className="space-y-3">
      {ranked.map((s: any, i: number) => (
        <Link key={s.id} href={`/trainer/students/${s.id}`} className="flex items-center gap-4 p-2 rounded-xl hover:bg-accent transition-all group">
          <div className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 1}</div>
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {s.user?.profile?.avatarUrl
              ? <img src={s.user.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              : `${s.user?.profile?.firstName?.[0] ?? ''}${s.user?.profile?.lastName?.[0] ?? ''}`}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {s.user?.profile?.firstName} {s.user?.profile?.lastName}
            </div>
            <div className="text-xs text-muted-foreground">{s.points || 0} pontos</div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-sm font-bold text-orange-400 flex items-center gap-1">
              {s.streak || 0}<Flame className="w-3 h-3" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function StudentProgressTable({ students }: { students?: any[] }) {
  if (!students?.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum aluno cadastrado</p>;
  }

  const sorted = [...students].sort((a, b) => (b.streak || 0) - (a.streak || 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left text-xs text-muted-foreground font-medium pb-3">Aluno</th>
            <th className="text-center text-xs text-muted-foreground font-medium pb-3">Sequência</th>
            <th className="text-center text-xs text-muted-foreground font-medium pb-3">Nível</th>
            <th className="text-center text-xs text-muted-foreground font-medium pb-3">Pontos</th>
            <th className="text-center text-xs text-muted-foreground font-medium pb-3">Último treino</th>
            <th className="text-center text-xs text-muted-foreground font-medium pb-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {sorted.slice(0, 15).map((s: any) => {
            const lastCheckin = s.lastCheckinAt
              ? new Date(s.lastCheckinAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
              : '—';
            return (
              <tr key={s.id} className="hover:bg-accent/50 transition-all">
                <td className="py-3">
                  <Link href={`/trainer/students/${s.id}`} className="font-medium hover:text-primary transition-colors">
                    {s.user?.profile?.firstName} {s.user?.profile?.lastName}
                  </Link>
                </td>
                <td className="py-3 text-center">
                  <span className="text-orange-400 font-medium flex items-center justify-center gap-1">
                    {s.streak || 0}<Flame className="w-3 h-3" />
                  </span>
                </td>
                <td className="py-3 text-center text-muted-foreground">{s.level || 1}</td>
                <td className="py-3 text-center text-muted-foreground">{s.points || 0}</td>
                <td className="py-3 text-center">
                  <span className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />{lastCheckin}
                  </span>
                </td>
                <td className="py-3 text-center">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    s.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground',
                  )}>
                    {s.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
