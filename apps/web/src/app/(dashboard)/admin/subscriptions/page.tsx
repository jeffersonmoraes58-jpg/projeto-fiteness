'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, DollarSign, TrendingUp, TrendingDown,
  ArrowUpRight, MoreVertical, CheckCircle2, AlertCircle,
  XCircle, Clock, Zap, Download, Search,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const PLANS = ['Todos', 'FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
const STATUSES = ['Todos', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED'];

const PLAN_CONFIG: Record<string, { label: string; color: string; price: number }> = {
  FREE: { label: 'Free', color: 'from-gray-500 to-gray-600', price: 0 },
  BASIC: { label: 'Basic', color: 'from-cyan-500 to-blue-500', price: 99 },
  PRO: { label: 'Pro', color: 'from-purple-500 to-indigo-500', price: 249 },
  ENTERPRISE: { label: 'Enterprise', color: 'from-yellow-500 to-amber-500', price: 599 },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  TRIAL: { label: 'Trial', color: 'bg-blue-500/10 text-blue-400', icon: Clock },
  ACTIVE: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle2 },
  PAST_DUE: { label: 'Em atraso', color: 'bg-orange-500/10 text-orange-400', icon: AlertCircle },
  CANCELED: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400', icon: XCircle },
  EXPIRED: { label: 'Expirado', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

export default function AdminSubscriptions() {
  const [planFilter, setPlanFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => api.get('/admin/tenants?limit=100').then((r) => {
      const tenants = r.data.data?.tenants || r.data.data || [];
      return tenants.map((t: any) => ({
        id: t.subscription?.id || t.id,
        plan: t.subscription?.plan || 'FREE',
        status: t.subscription?.status || 'TRIAL',
        tenant: { id: t.id, name: t.name },
        createdAt: t.createdAt,
      }));
    }),
  });
  const subscriptions = tenantsData;

  const changePlanMutation = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) =>
      api.patch(`/admin/tenants/${id}`, { plan }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/tenants/${id}`, { subscriptionStatus: 'CANCELED' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] }),
  });

  const subs = subscriptions || [];

  const filtered = subs.filter((s: any) => {
    const name = (s.tenant?.name || '').toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchPlan = planFilter === 'Todos' || s.plan === planFilter;
    const matchStatus = statusFilter === 'Todos' || s.status === statusFilter;
    return matchSearch && matchPlan && matchStatus;
  });

  const mrr = subs
    .filter((s: any) => s.status === 'ACTIVE')
    .reduce((sum: number, s: any) => sum + (PLAN_CONFIG[s.plan]?.price || 0), 0);

  const trialCount = subs.filter((s: any) => s.status === 'TRIAL').length;
  const pastDueCount = subs.filter((s: any) => s.status === 'PAST_DUE').length;
  const activeCount = subs.filter((s: any) => s.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assinaturas</h1>
          <p className="text-muted-foreground text-sm mt-1">{subs.length} tenants cadastrados</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm py-2">
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* Revenue metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'MRR', value: `R$ ${mrr.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'from-emerald-600 to-teal-600', delta: '+8%', up: true },
          { label: 'Assinaturas ativas', value: activeCount, icon: CheckCircle2, color: 'from-purple-600 to-indigo-600', delta: `+${Math.max(0, activeCount - 5)}`, up: true },
          { label: 'Em trial', value: trialCount, icon: Clock, color: 'from-blue-600 to-cyan-600', delta: `${trialCount} pendentes`, up: null },
          { label: 'Em atraso', value: pastDueCount, icon: AlertCircle, color: 'from-orange-600 to-red-600', delta: pastDueCount > 0 ? 'Atenção' : 'OK', up: pastDueCount === 0 },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
              <span className={cn('text-xs flex items-center gap-0.5',
                card.up === true ? 'text-emerald-400' : card.up === false ? 'text-red-400' : 'text-muted-foreground',
              )}>
                {card.up === true && <ArrowUpRight className="w-3 h-3" />}
                {card.delta}
              </span>
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Plan revenue breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card"
      >
        <h2 className="font-semibold mb-4">Receita por Plano</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(PLAN_CONFIG).map(([key, plan]) => {
            const count = subs.filter((s: any) => s.plan === key && s.status === 'ACTIVE').length;
            const revenue = count * plan.price;
            return (
              <div key={key} className="glass rounded-xl p-4">
                <div className={`text-xs font-bold mb-2 px-2 py-0.5 rounded-full bg-gradient-to-r ${plan.color} bg-clip-text text-transparent inline-block`}>
                  {plan.label}
                </div>
                <div className="text-xl font-bold">
                  {plan.price > 0 ? `R$ ${revenue.toLocaleString('pt-BR')}` : '—'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{count} tenants</div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar tenant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {PLANS.map((p) => (
            <button key={p} onClick={() => setPlanFilter(p)}
              className={cn('px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 transition-all border',
                planFilter === p ? 'bg-primary text-primary-foreground border-primary' : 'glass border-transparent hover:bg-accent',
              )}>
              {p === 'Todos' ? 'Todos' : PLAN_CONFIG[p]?.label}
            </button>
          ))}
          <div className="w-px bg-border/50 mx-1" />
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 transition-all border',
                statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'glass border-transparent hover:bg-accent',
              )}>
              {s === 'Todos' ? 'Todos status' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions table */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_60px] gap-4 px-4 py-3 border-b border-border/50 text-xs text-muted-foreground font-medium">
          <span>Tenant</span>
          <span>Plano</span>
          <span>Status</span>
          <span>Próxima cobrança</span>
          <span>Valor</span>
          <span />
        </div>
        <div className="divide-y divide-border/30">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_60px] gap-4 px-4 py-4 animate-pulse items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10" />
                  <div className="h-3 bg-white/10 rounded w-32" />
                </div>
                {[...Array(4)].map((__, j) => <div key={j} className="h-3 bg-white/5 rounded" />)}
                <div className="h-6 bg-white/10 rounded-lg" />
              </div>
            ))
          ) : filtered.length > 0 ? (
            filtered.map((sub: any, i: number) => (
              <SubscriptionRow
                key={sub.id}
                subscription={sub}
                index={i}
                onChangePlan={(plan) => changePlanMutation.mutate({ id: sub.id, plan })}
                onCancel={() => cancelMutation.mutate(sub.id)}
              />
            ))
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma assinatura encontrada</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubscriptionRow({ subscription: sub, index, onChangePlan, onCancel }: {
  subscription: any; index: number; onChangePlan: (p: string) => void; onCancel: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const plan = PLAN_CONFIG[sub.plan] || PLAN_CONFIG.FREE;
  const status = STATUS_CONFIG[sub.status] || STATUS_CONFIG.ACTIVE;
  const StatusIcon = status.icon;

  const nextBilling = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : sub.trialEndsAt
    ? `Trial até ${new Date(sub.trialEndsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
    : '—';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_60px] gap-4 px-4 py-4 hover:bg-accent/50 transition-all items-center text-sm"
    >
      {/* Tenant */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center flex-shrink-0`}>
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{sub.tenant?.name || 'Tenant'}</div>
          <div className="text-xs text-muted-foreground truncate">{sub.tenant?.slug}</div>
        </div>
      </div>

      {/* Plan */}
      <div>
        <span className={cn('text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r', plan.color, 'text-white')}>
          {plan.label}
        </span>
      </div>

      {/* Status */}
      <div>
        <span className={cn('text-xs px-2 py-1 rounded-full flex items-center gap-1 w-fit', status.color)}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>

      {/* Next billing */}
      <div className="text-xs text-muted-foreground">{nextBilling}</div>

      {/* Amount */}
      <div className="font-medium">
        {plan.price > 0 ? `R$ ${plan.price}` : <span className="text-muted-foreground">Grátis</span>}
        {plan.price > 0 && <span className="text-xs text-muted-foreground">/mês</span>}
      </div>

      {/* Actions */}
      <div className="flex justify-end relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-9 bg-card border border-border rounded-xl shadow-xl z-20 py-1 w-44">
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Alterar plano</div>
            {Object.entries(PLAN_CONFIG).filter(([key]) => key !== sub.plan).map(([key, p]) => (
              <button key={key} onClick={() => { onChangePlan(key); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all">
                <Zap className="w-3.5 h-3.5 text-muted-foreground" /> {p.label}
              </button>
            ))}
            {sub.status !== 'CANCELED' && (
              <>
                <div className="border-t border-border/50 my-1" />
                <button onClick={() => { onCancel(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all text-red-400">
                  <XCircle className="w-3.5 h-3.5" /> Cancelar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
