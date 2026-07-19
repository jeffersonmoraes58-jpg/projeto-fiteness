'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Building2, DollarSign, TrendingUp, TrendingDown,
  ArrowUpRight, MoreVertical, CheckCircle2, AlertCircle,
  XCircle, Clock, Zap, Download, Search,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const PLANS = ['Todos', 'FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
const STATUSES = ['Todos', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED'];

/** Preços alinhados com apps/api/src/common/plan-limits.ts */
const PRICE_MONTHLY: Record<string, number> = { FREE: 0, BASIC: 35, PRO: 55, ENTERPRISE: 95 };
const PRICE_ANNUAL: Record<string, number> = { FREE: 0, BASIC: 350, PRO: 550, ENTERPRISE: 950 };

const PLAN_CONFIG: Record<string, { label: string; color: string; gradient: string }> = {
  FREE: { label: 'Free', color: 'text-gray-400', gradient: 'from-gray-500 to-gray-600' },
  BASIC: { label: 'Starter', color: 'text-cyan-400', gradient: 'from-cyan-500 to-blue-500' },
  PRO: { label: 'Pro', color: 'text-purple-400', gradient: 'from-purple-500 to-indigo-500' },
  ENTERPRISE: { label: 'Elite', color: 'text-yellow-400', gradient: 'from-yellow-500 to-amber-500' },
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

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => api.get('/admin/tenants?limit=100').then((r) => {
      const tenants = r.data.data?.tenants || r.data.data || [];
      return tenants.map((t: any) => ({
        tenantId: t.id,
        subscriptionId: t.subscription?.id,
        plan: t.subscription?.plan || 'FREE',
        status: t.subscription?.status || 'TRIAL',
        billingCycle: t.subscription?.billingCycle || 'MONTHLY',
        currentPeriodEnd: t.subscription?.currentPeriodEnd,
        trialEndsAt: t.subscription?.trialEndsAt,
        tenant: { id: t.id, name: t.name, slug: t.slug },
        userCount: t._count?.users ?? 0,
        createdAt: t.createdAt,
      }));
    }),
  });

  const subs = subscriptions || [];

  const changePlanMutation = useMutation({
    mutationFn: ({ tenantId, plan }: { tenantId: string; plan: string }) =>
      api.patch(`/admin/tenants/${tenantId}/subscription`, { plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success('Plano alterado com sucesso');
    },
    onError: () => toast.error('Erro ao alterar plano'),
  });

  const cancelMutation = useMutation({
    mutationFn: (tenantId: string) =>
      api.patch(`/admin/tenants/${tenantId}/subscription`, { status: 'CANCELED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success('Assinatura cancelada');
    },
    onError: () => toast.error('Erro ao cancelar assinatura'),
  });

  const filtered = subs.filter((s: any) => {
    const name = (s.tenant?.name || '').toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchPlan = planFilter === 'Todos' || s.plan === planFilter;
    const matchStatus = statusFilter === 'Todos' || s.status === statusFilter;
    return matchSearch && matchPlan && matchStatus;
  });

  const mrr = subs
    .filter((s: any) => s.status === 'ACTIVE')
    .reduce((sum: number, s: any) => {
      if (s.billingCycle === 'ANNUAL') return sum + Math.round((PRICE_ANNUAL[s.plan] || 0) / 12);
      return sum + (PRICE_MONTHLY[s.plan] || 0);
    }, 0);

  const trialCount = subs.filter((s: any) => s.status === 'TRIAL').length;
  const pastDueCount = subs.filter((s: any) => s.status === 'PAST_DUE').length;
  const activeCount = subs.filter((s: any) => s.status === 'ACTIVE').length;

  const exportCsv = () => {
    const headers = ['Tenant', 'Plano', 'Status', 'Ciclo', 'Próxima cobrança', 'Valor/mês'];
    const rows = subs.map((s: any) => {
      const planCfg = PLAN_CONFIG[s.plan] || PLAN_CONFIG.FREE;
      const nextBill = s.currentPeriodEnd
        ? new Date(s.currentPeriodEnd).toLocaleDateString('pt-BR')
        : s.trialEndsAt
        ? `Trial até ${new Date(s.trialEndsAt).toLocaleDateString('pt-BR')}`
        : '—';
      const price = s.billingCycle === 'ANNUAL'
        ? Math.round((PRICE_ANNUAL[s.plan] || 0) / 12)
        : (PRICE_MONTHLY[s.plan] || 0);
      return [
        s.tenant?.name || '',
        planCfg.label,
        STATUS_CONFIG[s.status]?.label || s.status,
        s.billingCycle === 'ANNUAL' ? 'Anual' : 'Mensal',
        nextBill,
        price > 0 ? `R$ ${price}` : 'Grátis',
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assinaturas-fitlynutri-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportado com sucesso');
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Assinaturas</h1>
          <p className="text-muted-foreground text-sm mt-1">{subs.length} tenants cadastrados</p>
        </div>
        <button onClick={exportCsv} className="btn-secondary flex items-center gap-2 text-sm py-2">
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* Revenue metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'MRR', value: `R$ ${mrr.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'from-emerald-600 to-teal-600', delta: `${activeCount} ativas`, up: null },
          { label: 'Assinaturas ativas', value: activeCount, icon: CheckCircle2, color: 'from-purple-600 to-indigo-600', delta: 'com pagamento em dia', up: null },
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
          {Object.entries(PLAN_CONFIG).map(([key, planCfg]) => {
            const count = subs.filter((s: any) => s.plan === key && s.status === 'ACTIVE').length;
            const revenue = subs
              .filter((s: any) => s.plan === key && s.status === 'ACTIVE')
              .reduce((sum: number, s: any) => {
                if (s.billingCycle === 'ANNUAL') return sum + Math.round((PRICE_ANNUAL[key] || 0) / 12);
                return sum + (PRICE_MONTHLY[key] || 0);
              }, 0);
            return (
              <div key={key} className="glass rounded-xl p-4">
                <div className={`text-xs font-bold mb-1 ${planCfg.color}`}>
                  {planCfg.label}
                </div>
                <div className="text-xl font-bold">
                  {revenue > 0 ? `R$ ${revenue.toLocaleString('pt-BR')}` : '—'}
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
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_60px] gap-4 px-4 py-3 border-b border-border/50 text-xs text-muted-foreground font-medium">
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
              <div key={i}>
                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_60px] gap-4 px-4 py-4 animate-pulse items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10" />
                    <div className="h-3 bg-white/10 rounded w-32" />
                  </div>
                  {[...Array(4)].map((__, j) => <div key={j} className="h-3 bg-white/5 rounded" />)}
                  <div className="h-6 bg-white/10 rounded-lg" />
                </div>
                <div className="sm:hidden px-4 py-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-white/10 rounded w-32" />
                      <div className="h-2.5 bg-white/5 rounded w-20" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 ml-[48px]">
                    <div className="h-5 bg-white/5 rounded-full w-14" />
                    <div className="h-5 bg-white/5 rounded-full w-16" />
                  </div>
                </div>
              </div>
            ))
          ) : filtered.length > 0 ? (
            filtered.map((sub: any, i: number) => (
              <SubscriptionRow
                key={sub.tenantId}
                subscription={sub}
                index={i}
                onChangePlan={(plan) => changePlanMutation.mutate({ tenantId: sub.tenantId, plan })}
                onCancel={() => cancelMutation.mutate(sub.tenantId)}
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

function SubActionMenu({ sub, onChangePlan, onCancel }: {
  sub: any; onChangePlan: (p: string) => void; onCancel: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setMenuOpen((v) => !v)}
        className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
      >
        <MoreVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div
            className="fixed z-50 w-48 glass-card !p-1 shadow-xl"
            style={{
              top: btnRef.current
                ? Math.min(btnRef.current.getBoundingClientRect().bottom + 4, window.innerHeight - 240)
                : 'auto',
              right: btnRef.current
                ? window.innerWidth - btnRef.current.getBoundingClientRect().right
                : 0,
            }}
          >
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
                <button onClick={() => { if (confirm('Cancelar esta assinatura?')) { onCancel(); } setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all text-red-400">
                  <XCircle className="w-3.5 h-3.5" /> Cancelar
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SubscriptionRow({ subscription: sub, index, onChangePlan, onCancel }: {
  subscription: any; index: number; onChangePlan: (p: string) => void; onCancel: () => void;
}) {
  const planCfg = PLAN_CONFIG[sub.plan] || PLAN_CONFIG.FREE;
  const status = STATUS_CONFIG[sub.status] || STATUS_CONFIG.ACTIVE;
  const StatusIcon = status.icon;

  const cycleLabel = sub.billingCycle === 'ANNUAL' ? 'Anual' : 'Mensal';
  const monthlyPrice = sub.billingCycle === 'ANNUAL'
    ? Math.round((PRICE_ANNUAL[sub.plan] || 0) / 12)
    : (PRICE_MONTHLY[sub.plan] || 0);

  const nextBilling = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : sub.trialEndsAt
    ? `Trial até ${new Date(sub.trialEndsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
    : '—';

  return (
    <>
      {/* Mobile card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className="sm:hidden px-4 py-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${planCfg.gradient} flex items-center justify-center flex-shrink-0`}>
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{sub.tenant?.name || 'Tenant'}</div>
              <div className="text-xs text-muted-foreground truncate">{sub.tenant?.slug}</div>
            </div>
          </div>
          <SubActionMenu sub={sub} onChangePlan={onChangePlan} onCancel={onCancel} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2 ml-[48px]">
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r text-white', planCfg.gradient)}>
            {planCfg.label}{sub.plan !== 'FREE' && <span className="opacity-75 ml-1">{cycleLabel}</span>}
          </span>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1', status.color)}>
            <StatusIcon className="w-2.5 h-2.5" />
            {status.label}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            {monthlyPrice > 0 ? `R$ ${monthlyPrice}/mês` : 'Grátis'}
          </span>
          {nextBilling !== '—' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground truncate max-w-[180px]">
              {nextBilling}
            </span>
          )}
        </div>
      </motion.div>

      {/* Desktop row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.03 }}
        className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_60px] gap-4 px-4 py-4 hover:bg-accent/50 transition-all items-center text-sm"
      >
        {/* Tenant */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${planCfg.gradient} flex items-center justify-center flex-shrink-0`}>
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{sub.tenant?.name || 'Tenant'}</div>
            <div className="text-xs text-muted-foreground truncate">{sub.tenant?.slug}</div>
          </div>
        </div>

        {/* Plan */}
        <div>
          <span className={cn('text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r', planCfg.gradient, 'text-white')}>
            {planCfg.label}
          </span>
          {sub.plan !== 'FREE' && (
            <span className="text-[10px] text-muted-foreground ml-1.5">{cycleLabel}</span>
          )}
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
          {monthlyPrice > 0 ? (
            <>{`R$ ${monthlyPrice}`}<span className="text-xs text-muted-foreground">/mês</span></>
          ) : (
            <span className="text-muted-foreground">Grátis</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <SubActionMenu sub={sub} onChangePlan={onChangePlan} onCancel={onCancel} />
        </div>
      </motion.div>
    </>
  );
}
