'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2, ArrowLeft, Users, CreditCard, CheckCircle2,
  AlertCircle, XCircle, Clock, Edit2, Save, X,
  Calendar, Globe, Hash, Settings2, Zap,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const PLAN_CONFIG: Record<string, { label: string; gradient: string; price: number }> = {
  FREE: { label: 'Free', gradient: 'from-gray-500 to-gray-600', price: 0 },
  BASIC: { label: 'Basic', gradient: 'from-cyan-500 to-blue-500', price: 99 },
  PRO: { label: 'Pro', gradient: 'from-purple-500 to-indigo-500', price: 249 },
  ENTERPRISE: { label: 'Enterprise', gradient: 'from-yellow-500 to-amber-500', price: 599 },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  TRIAL: { label: 'Trial', color: 'bg-blue-500/10 text-blue-400', icon: Clock },
  ACTIVE: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle2 },
  PAST_DUE: { label: 'Em atraso', color: 'bg-orange-500/10 text-orange-400', icon: AlertCircle },
  CANCELED: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400', icon: XCircle },
};

export default function AdminTenantDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ name: string; slug: string }>({ name: '', slug: '' });

  const { data: tenant, isLoading } = useQuery<any>({
    queryKey: ['admin-tenant', id],
    queryFn: () => api.get(`/admin/tenants/${id}`).then((r) => r.data.data),
  });

  useEffect(() => {
    if (tenant) setForm({ name: tenant.name || '', slug: tenant.slug || '' });
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/admin/tenants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      setEditing(false);
      toast.success('Academia atualizada');
    },
    onError: () => toast.error('Erro ao salvar alterações'),
  });

  const changePlanMutation = useMutation({
    mutationFn: (plan: string) => api.patch(`/admin/tenants/${id}`, { plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', id] });
      toast.success('Plano alterado com sucesso');
    },
    onError: () => toast.error('Erro ao alterar plano'),
  });

  const changeStatusMutation = useMutation({
    mutationFn: (subscriptionStatus: string) =>
      api.patch(`/admin/tenants/${id}`, { subscriptionStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', id] });
      toast.success('Status atualizado');
    },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-white/10 rounded w-48" />
        <div className="glass-card h-40" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <Building2 className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Tenant não encontrado</p>
        <Link href="/admin/tenants" className="btn-primary text-sm">Voltar</Link>
      </div>
    );
  }

  const plan = PLAN_CONFIG[tenant.subscription?.plan || 'FREE'];
  const statusKey = tenant.subscription?.status || 'TRIAL';
  const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.TRIAL;
  const StatusIcon = status.icon;

  const initials = (tenant.name || 'T')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const createdAt = tenant.createdAt
    ? new Date(tenant.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/tenants" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all">
        <ArrowLeft className="w-4 h-4" />
        Academias & Estúdios
      </Link>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
      >
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white text-2xl font-bold flex-shrink-0`}>
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <input
                  className="input-field text-lg font-semibold"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nome da academia"
                />
                <input
                  className="input-field text-sm"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="Slug (ex: minha-academia)"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateMutation.mutate(form)}
                    disabled={updateMutation.isPending}
                    className="btn-primary text-sm py-2 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-secondary text-sm py-2 flex items-center gap-2">
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold">{tenant.name}</h1>
                  <span className={cn('text-xs px-2 py-1 rounded-full flex items-center gap-1', status.color)}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  {tenant.slug && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" /> {tenant.slug}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" /> {tenant.id.slice(0, 8)}…
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Desde {createdAt}
                  </span>
                </div>
              </>
            )}
          </div>

          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="btn-secondary text-sm py-2 flex items-center gap-2 flex-shrink-0"
            >
              <Edit2 className="w-4 h-4" /> Editar
            </button>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de usuários', value: tenant._count?.users ?? 0, icon: Users, gradient: 'from-purple-600 to-indigo-600' },
          { label: 'Plano atual', value: plan.label, icon: Zap, gradient: plan.gradient },
          { label: 'Valor mensal', value: plan.price > 0 ? `R$ ${plan.price}` : 'Grátis', icon: CreditCard, gradient: 'from-emerald-600 to-teal-600' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            className="stat-card"
          >
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3`}>
              <card.icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Alterar Plano</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(PLAN_CONFIG).map(([key, p]) => (
              <button
                key={key}
                onClick={() => changePlanMutation.mutate(key)}
                disabled={changePlanMutation.isPending || (tenant.subscription?.plan || 'FREE') === key}
                className={cn(
                  'glass rounded-xl p-3 text-left transition-all hover:bg-accent/50 disabled:opacity-60',
                  (tenant.subscription?.plan || 'FREE') === key && 'ring-1 ring-primary',
                )}
              >
                <div className={`text-xs font-bold mb-1 bg-gradient-to-r ${p.gradient} bg-clip-text text-transparent`}>
                  {p.label}
                </div>
                <div className="text-sm font-semibold">
                  {p.price > 0 ? `R$ ${p.price}/mês` : 'Grátis'}
                </div>
                {(tenant.subscription?.plan || 'FREE') === key && (
                  <div className="text-[10px] text-primary mt-1">Plano atual</div>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Change status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Status da Assinatura</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(STATUS_CONFIG).map(([key, s]) => {
              const SIcon = s.icon;
              const isCurrent = (tenant.subscription?.status || 'TRIAL') === key;
              return (
                <button
                  key={key}
                  onClick={() => !isCurrent && changeStatusMutation.mutate(key)}
                  disabled={changeStatusMutation.isPending || isCurrent}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
                    isCurrent ? 'glass ring-1 ring-primary' : 'hover:bg-accent/50 glass',
                  )}
                >
                  <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', s.color)}>
                    <SIcon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-sm font-medium">{s.label}</span>
                  {isCurrent && <span className="ml-auto text-[10px] text-primary">Atual</span>}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Subscription detail */}
      {tenant.subscription && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Detalhes da Assinatura</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: 'Trial até',
                value: tenant.subscription.trialEndsAt
                  ? new Date(tenant.subscription.trialEndsAt).toLocaleDateString('pt-BR')
                  : '—',
              },
              {
                label: 'Início do período',
                value: tenant.subscription.currentPeriodStart
                  ? new Date(tenant.subscription.currentPeriodStart).toLocaleDateString('pt-BR')
                  : '—',
              },
              {
                label: 'Fim do período',
                value: tenant.subscription.currentPeriodEnd
                  ? new Date(tenant.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')
                  : '—',
              },
              {
                label: 'Cancelado em',
                value: tenant.subscription.canceledAt
                  ? new Date(tenant.subscription.canceledAt).toLocaleDateString('pt-BR')
                  : '—',
              },
            ].map((item) => (
              <div key={item.label} className="glass rounded-xl p-3">
                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                <div className="text-sm font-medium">{item.value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
