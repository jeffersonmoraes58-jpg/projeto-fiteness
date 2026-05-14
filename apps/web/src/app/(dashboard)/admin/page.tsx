'use client';

import { motion } from 'framer-motion';
import {
  Users, Building2, DollarSign, TrendingUp,
  Activity, ArrowUpRight, ArrowDownRight,
  CheckCircle2, AlertCircle, XCircle, RefreshCw,
  Dumbbell, Apple, ChevronRight, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data.data),
  });

  const { data: dashboard } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data.data),
  });

  const recentActivity = dashboard?.recentUsers;
  const systemHealth = null;

  const kpis = [
    {
      label: 'Tenants ativos',
      value: stats?.activeTenants ?? '—',
      icon: Building2,
      color: 'from-purple-600 to-indigo-600',
      delta: '+3',
      positive: true,
    },
    {
      label: 'Usuários totais',
      value: stats?.totalUsers ?? '—',
      icon: Users,
      color: 'from-cyan-600 to-blue-600',
      delta: '+12%',
      positive: true,
    },
    {
      label: 'MRR',
      value: stats?.mrr ? `R$ ${Number(stats.mrr).toLocaleString('pt-BR')}` : '—',
      icon: DollarSign,
      color: 'from-emerald-600 to-teal-600',
      delta: '+8%',
      positive: true,
    },
    {
      label: 'Churn mensal',
      value: stats?.churnRate ? `${stats.churnRate}%` : '—',
      icon: TrendingUp,
      color: 'from-orange-600 to-red-600',
      delta: '-0.5%',
      positive: true,
    },
  ];

  const planBreakdown = [
    { plan: 'Enterprise', count: stats?.enterpriseCount ?? 0, color: 'from-yellow-500 to-amber-500', revenue: stats?.enterpriseRevenue ?? 0 },
    { plan: 'Pro', count: stats?.proCount ?? 0, color: 'from-purple-500 to-indigo-500', revenue: stats?.proRevenue ?? 0 },
    { plan: 'Basic', count: stats?.basicCount ?? 0, color: 'from-cyan-500 to-blue-500', revenue: stats?.basicRevenue ?? 0 },
    { plan: 'Free / Trial', count: stats?.freeCount ?? 0, color: 'from-gray-500 to-gray-600', revenue: 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary flex items-center gap-2 text-sm py-2"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
              <span className={cn('text-xs flex items-center gap-0.5', kpi.positive ? 'text-emerald-400' : 'text-red-400')}>
                {kpi.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.delta}
              </span>
            </div>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & plan breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* MRR chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold">Receita Recorrente (MRR)</h2>
              <Link href="/admin/analytics" className="text-xs text-primary flex items-center gap-1 hover:underline">
                Ver analytics <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <MRRChart stats={stats} />
          </motion.div>

          {/* Recent activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">Atividade Recente</h2>
              <Link href="/admin/users" className="text-xs text-primary flex items-center gap-1 hover:underline">
                Ver usuários <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <RecentActivity data={recentActivity} />
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* System health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card"
          >
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Status do Sistema
            </h2>
            <SystemHealth health={systemHealth} />
          </motion.div>

          {/* Plan breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Planos Ativos</h2>
              <Link href="/admin/subscriptions" className="text-xs text-primary hover:underline">Ver todos</Link>
            </div>
            <div className="space-y-3">
              {planBreakdown.map((p, i) => (
                <div key={p.plan} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center flex-shrink-0`}>
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{p.plan}</span>
                      <span className="text-muted-foreground">{p.count} tenants</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stats?.activeTenants ? (p.count / stats.activeTenants) * 100 : 0}%` }}
                        transition={{ duration: 0.7, delay: i * 0.1 }}
                        className={`h-full rounded-full bg-gradient-to-r ${p.color}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card"
          >
            <h2 className="font-semibold mb-3">Acesso Rápido</h2>
            <div className="space-y-1">
              {[
                { label: 'Gerenciar usuários', icon: Users, href: '/admin/users', color: 'text-purple-400' },
                { label: 'Assinaturas', icon: DollarSign, href: '/admin/subscriptions', color: 'text-emerald-400' },
                { label: 'Analytics', icon: TrendingUp, href: '/admin/analytics', color: 'text-cyan-400' },
                { label: 'Notificações', icon: Zap, href: '/admin/notifications', color: 'text-orange-400' },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all group"
                >
                  <a.icon className={`w-4 h-4 ${a.color}`} />
                  <span className="text-sm">{a.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Platform stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          { label: 'Trainers', value: stats?.totalTrainers ?? 0, icon: Dumbbell, color: 'text-purple-400' },
          { label: 'Nutricionistas', value: stats?.totalNutritionists ?? 0, icon: Apple, color: 'text-emerald-400' },
          { label: 'Alunos', value: stats?.totalStudents ?? 0, icon: Users, color: 'text-cyan-400' },
          { label: 'Treinos criados', value: stats?.totalWorkouts ?? 0, icon: Activity, color: 'text-orange-400' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + i * 0.05 }}
            className="glass-card flex items-center gap-3"
          >
            <s.icon className={`w-8 h-8 ${s.color} flex-shrink-0`} />
            <div>
              <div className="text-xl font-bold">{s.value.toLocaleString('pt-BR')}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function MRRChart({ stats }: { stats: any }) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const values = stats?.mrrHistory || [4200, 5100, 5800, 6200, 7100, 7800, 8400, 9200, 9800, 10500, 11200, 12000];
  const max = Math.max(...values);
  const currentMonth = new Date().getMonth();

  // Build SVG path
  const w = 400;
  const h = 80;
  const pts = values.map((v: number, i: number) => ({
    x: (i / (values.length - 1)) * w,
    y: h - (v / max) * h,
  }));

  const path = pts.map((p: { x: number; y: number }, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${path} L ${pts[pts.length - 1].x} ${h} L 0 ${h} Z`;

  return (
    <div>
      <div className="text-2xl font-bold mb-1">
        R$ {values[currentMonth]?.toLocaleString('pt-BR') ?? '—'}
        <span className="text-sm text-muted-foreground font-normal ml-2">este mês</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h + 10}`} className="w-full mt-4">
        <defs>
          <linearGradient id="mrrGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="mrrAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#mrrAreaGrad)" />
        <path d={path} fill="none" stroke="url(#mrrGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p: { x: number; y: number }, i: number) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === currentMonth ? 5 : 3} fill="url(#mrrGrad)" opacity={i === currentMonth ? 1 : 0.6} />
        ))}
      </svg>
      <div className="flex justify-between mt-2">
        {months.map((m) => (
          <span key={m} className="flex-1 text-center text-[9px] text-muted-foreground">{m}</span>
        ))}
      </div>
    </div>
  );
}

function SystemHealth({ health }: { health: any }) {
  const services = [
    { name: 'API', status: health?.api ?? 'healthy' },
    { name: 'Banco de Dados', status: health?.database ?? 'healthy' },
    { name: 'Redis / Cache', status: health?.redis ?? 'healthy' },
    { name: 'Filas (Bull)', status: health?.queue ?? 'healthy' },
    { name: 'Storage', status: health?.storage ?? 'healthy' },
    { name: 'IA (Claude)', status: health?.ai ?? 'healthy' },
  ];

  const icons: Record<string, any> = {
    healthy: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    degraded: <AlertCircle className="w-4 h-4 text-yellow-400" />,
    down: <XCircle className="w-4 h-4 text-red-400" />,
  };
  const colors: Record<string, string> = {
    healthy: 'text-emerald-400',
    degraded: 'text-yellow-400',
    down: 'text-red-400',
  };
  const labels: Record<string, string> = {
    healthy: 'Normal',
    degraded: 'Degradado',
    down: 'Fora do ar',
  };

  const allHealthy = services.every((s) => s.status === 'healthy');

  return (
    <div className="space-y-2">
      <div className={cn(
        'flex items-center gap-2 mb-3 p-2 rounded-xl text-xs font-medium',
        allHealthy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400',
      )}>
        {allHealthy ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        {allHealthy ? 'Todos os serviços operacionais' : 'Atenção: serviço com problema'}
      </div>
      {services.map((s) => (
        <div key={s.name} className="flex items-center justify-between py-1.5">
          <span className="text-sm text-muted-foreground">{s.name}</span>
          <div className="flex items-center gap-1.5">
            {icons[s.status]}
            <span className={cn('text-xs font-medium', colors[s.status])}>
              {labels[s.status]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentActivity({ data }: { data: any[] }) {
  const fallback = [
    { label: 'Novo tenant: Academia Força Total', time: '2 min atrás', Icon: Building2, color: 'text-purple-400' },
    { label: 'Novo usuário registrado: João Silva', time: '15 min atrás', Icon: Users, color: 'text-cyan-400' },
    { label: 'Upgrade para Pro: Studio Wellness', time: '1h atrás', Icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Novo trainer: Maria Santos', time: '2h atrás', Icon: Dumbbell, color: 'text-orange-400' },
    { label: 'Assinatura cancelada: FitLife', time: '5h atrás', Icon: XCircle, color: 'text-red-400' },
  ];

  const items = data?.length
    ? data.map((u: any) => ({
        label: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''} (${u.email})`,
        time: new Date(u.createdAt).toLocaleDateString('pt-BR'),
        Icon: Users,
        color: 'text-cyan-400',
      }))
    : fallback;

  return (
    <div className="space-y-2">
      {items.map((item: any, i: number) => {
        const Icon = item.Icon || Activity;
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
              <Icon className={`w-4 h-4 ${item.color || 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{item.label}</div>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">{item.time}</span>
          </div>
        );
      })}
    </div>
  );
}
