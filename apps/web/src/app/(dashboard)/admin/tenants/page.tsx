'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2, Search, Users, CreditCard, CheckCircle2,
  AlertCircle, XCircle, Clock, ChevronRight, ArrowUpRight,
  Filter, TrendingUp,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const PLAN_CONFIG: Record<string, { label: string; color: string; gradient: string; price: number }> = {
  FREE: { label: 'Free', color: 'text-gray-400', gradient: 'from-gray-500 to-gray-600', price: 0 },
  BASIC: { label: 'Basic', color: 'text-cyan-400', gradient: 'from-cyan-500 to-blue-500', price: 99 },
  PRO: { label: 'Pro', color: 'text-purple-400', gradient: 'from-purple-500 to-indigo-500', price: 249 },
  ENTERPRISE: { label: 'Enterprise', color: 'text-yellow-400', gradient: 'from-yellow-500 to-amber-500', price: 599 },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  TRIAL: { label: 'Trial', color: 'bg-blue-500/10 text-blue-400', icon: Clock },
  ACTIVE: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle2 },
  PAST_DUE: { label: 'Em atraso', color: 'bg-orange-500/10 text-orange-400', icon: AlertCircle },
  CANCELED: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400', icon: XCircle },
};

const PLAN_FILTERS = ['Todos', 'FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
const STATUS_FILTERS = ['Todos', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED'];

export default function AdminTenants() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants', search, page],
    queryFn: () =>
      api
        .get(`/admin/tenants?search=${search}&page=${page}&limit=${PER_PAGE}`)
        .then((r) => r.data.data),
  });

  const allTenants: any[] = data?.tenants || data || [];
  const total: number = data?.total ?? allTenants.length;

  const filtered = allTenants.filter((t) => {
    const matchPlan = planFilter === 'Todos' || (t.subscription?.plan || 'FREE') === planFilter;
    const matchStatus = statusFilter === 'Todos' || (t.subscription?.status || 'TRIAL') === statusFilter;
    return matchPlan && matchStatus;
  });

  const planCounts = PLAN_FILTERS.slice(1).map((p) => ({
    plan: p,
    count: allTenants.filter((t) => (t.subscription?.plan || 'FREE') === p).length,
  }));

  const mrr = allTenants
    .filter((t) => t.subscription?.status === 'ACTIVE')
    .reduce((sum, t) => sum + (PLAN_CONFIG[t.subscription?.plan]?.price || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Academias & Estúdios</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} tenants cadastrados na plataforma</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total de tenants',
            value: total,
            icon: Building2,
            gradient: 'from-purple-600 to-indigo-600',
            delta: `+${allTenants.filter((t) => {
              const d = new Date(t.createdAt);
              return d > new Date(Date.now() - 30 * 86400000);
            }).length} este mês`,
            up: true,
          },
          {
            label: 'MRR',
            value: `R$ ${mrr.toLocaleString('pt-BR')}`,
            icon: CreditCard,
            gradient: 'from-emerald-600 to-teal-600',
            delta: 'receita mensal',
            up: null,
          },
          {
            label: 'Tenants ativos',
            value: allTenants.filter((t) => t.subscription?.status === 'ACTIVE').length,
            icon: CheckCircle2,
            gradient: 'from-cyan-600 to-blue-600',
            delta: 'com assinatura ativa',
            up: null,
          },
          {
            label: 'Em atraso',
            value: allTenants.filter((t) => t.subscription?.status === 'PAST_DUE').length,
            icon: AlertCircle,
            gradient: 'from-orange-600 to-red-600',
            delta: allTenants.filter((t) => t.subscription?.status === 'PAST_DUE').length > 0 ? 'Requer atenção' : 'Tudo OK',
            up: allTenants.filter((t) => t.subscription?.status === 'PAST_DUE').length === 0,
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
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

      {/* Plan breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {planCounts.map((p, i) => {
          const cfg = PLAN_CONFIG[p.plan];
          return (
            <motion.button
              key={p.plan}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.07 }}
              onClick={() => setPlanFilter(planFilter === p.plan ? 'Todos' : p.plan)}
              className={cn(
                'glass-card flex items-center gap-3 text-left transition-all',
                planFilter === p.plan && 'ring-1 ring-primary',
              )}
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center flex-shrink-0`}>
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold">{p.count}</div>
                <div className="text-[11px] text-muted-foreground">{cfg.label}</div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Search & status filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome da academia..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-2.5 rounded-xl text-xs font-medium flex-shrink-0 transition-all border',
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'glass border-transparent hover:bg-accent',
              )}
            >
              {s === 'Todos' ? 'Todos' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tenant list */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_48px] gap-4 px-4 py-3 border-b border-border/50 text-xs text-muted-foreground font-medium">
          <span>Academia / Estúdio</span>
          <span>Plano</span>
          <span>Status</span>
          <span>Usuários</span>
          <span>Cadastro</span>
          <span />
        </div>

        <div className="divide-y divide-border/30">
          {isLoading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_48px] gap-4 px-4 py-4 animate-pulse items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex-shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-white/10 rounded w-32" />
                    <div className="h-2.5 bg-white/5 rounded w-20" />
                  </div>
                </div>
                {[...Array(4)].map((__, j) => <div key={j} className="h-3 bg-white/5 rounded" />)}
                <div className="h-6 bg-white/10 rounded-lg" />
              </div>
            ))
          ) : filtered.length > 0 ? (
            filtered.map((tenant, i) => (
              <TenantRow key={tenant.id} tenant={tenant} index={i} />
            ))
          ) : (
            <div className="py-16 flex flex-col items-center gap-3">
              <Filter className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma academia encontrada</p>
            </div>
          )}
        </div>

        {total > PER_PAGE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              Mostrando {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} de {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg glass text-sm disabled:opacity-40 hover:bg-accent transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * PER_PAGE >= total}
                className="px-3 py-1.5 rounded-lg glass text-sm disabled:opacity-40 hover:bg-accent transition-all"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TenantRow({ tenant, index }: { tenant: any; index: number }) {
  const plan = PLAN_CONFIG[tenant.subscription?.plan || 'FREE'];
  const statusKey = tenant.subscription?.status || 'TRIAL';
  const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.TRIAL;
  const StatusIcon = status.icon;

  const createdAt = tenant.createdAt
    ? new Date(tenant.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const initials = (tenant.name || 'T')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_48px] gap-4 px-4 py-4 hover:bg-accent/50 transition-all items-center text-sm"
    >
      {/* Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
          {initials}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{tenant.name}</div>
          <div className="text-xs text-muted-foreground truncate">{tenant.slug || tenant.id.slice(0, 8)}</div>
        </div>
      </div>

      {/* Plan */}
      <div>
        <span className={cn('text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r text-white', plan.gradient)}>
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

      {/* User count */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        {tenant._count?.users ?? 0} usuários
      </div>

      {/* Created */}
      <div className="text-xs text-muted-foreground">{createdAt}</div>

      {/* Link */}
      <div className="flex justify-end">
        <Link
          href={`/admin/tenants/${tenant.id}`}
          className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>
    </motion.div>
  );
}
