'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, CheckCircle2, Zap, Crown, Building2,
  Clock, AlertCircle, ExternalLink, Loader2, ArrowRight,
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

const PLANS = [
  {
    key: 'BASIC',
    label: 'Basic',
    price: 99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC || '',
    color: 'from-cyan-500 to-blue-500',
    icon: Zap,
    features: ['Até 50 alunos', 'Até 2 treinadores', 'Chat básico', 'Relatórios mensais'],
  },
  {
    key: 'PRO',
    label: 'Pro',
    price: 249,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || '',
    color: 'from-purple-500 to-indigo-500',
    icon: Crown,
    popular: true,
    features: ['Alunos ilimitados', 'Treinadores ilimitados', 'IA fitness + nutrição', 'Relatórios avançados', 'API access'],
  },
  {
    key: 'ENTERPRISE',
    label: 'Enterprise',
    price: 599,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || '',
    color: 'from-yellow-500 to-amber-500',
    icon: Building2,
    features: ['Tudo do Pro', 'Multi-unidade', 'SLA garantido', 'Onboarding dedicado', 'Suporte 24/7'],
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  TRIAL:    { label: 'Trial gratuito', color: 'text-blue-400 bg-blue-500/10',    icon: Clock },
  ACTIVE:   { label: 'Ativo',          color: 'text-emerald-400 bg-emerald-500/10', icon: CheckCircle2 },
  PAST_DUE: { label: 'Em atraso',      color: 'text-orange-400 bg-orange-500/10', icon: AlertCircle },
  CANCELED: { label: 'Cancelado',      color: 'text-red-400 bg-red-500/10',      icon: AlertCircle },
  EXPIRED:  { label: 'Expirado',       color: 'text-muted-foreground bg-muted',  icon: AlertCircle },
};

export default function BillingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: sub, isLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => api.get('/payments/subscription').then((r) => r.data.data),
  });

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) =>
      api.post('/payments/checkout', {
        priceId,
        successUrl: `${window.location.origin}/admin/billing?success=1`,
        cancelUrl: `${window.location.origin}/admin/billing`,
      }).then((r) => r.data.data),
    onSuccess: (data) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: () => toast.error('Erro ao iniciar checkout. Verifique as configurações do Stripe.'),
    onSettled: () => setLoadingPlan(null),
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      api.post('/payments/portal', {
        returnUrl: `${window.location.origin}/admin/billing`,
      }).then((r) => r.data.data),
    onSuccess: (data) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: () => toast.error('Erro ao abrir portal de cobrança.'),
  });

  const currentPlan = sub?.plan || 'FREE';
  const status = sub?.status || 'TRIAL';
  const StatusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.TRIAL;
  const StatusIcon = StatusConfig.icon;

  const payments = sub?.payments || [];

  const handleUpgrade = (plan: typeof PLANS[0]) => {
    setLoadingPlan(plan.key);
    checkoutMutation.mutate(plan.priceId);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Cobrança & Plano</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie sua assinatura e histórico de pagamentos</p>
      </div>

      {/* Current subscription */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Plano atual</div>
              {isLoading ? (
                <div className="h-6 w-24 bg-white/10 rounded animate-pulse mt-1" />
              ) : (
                <div className="font-bold text-xl">{currentPlan}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-8 w-24 bg-white/10 rounded-full animate-pulse" />
            ) : (
              <span className={cn('text-sm px-3 py-1 rounded-full flex items-center gap-1.5 font-medium', StatusConfig.color)}>
                <StatusIcon className="w-3.5 h-3.5" />
                {StatusConfig.label}
              </span>
            )}

            {sub?.stripeCustomerId && (
              <button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="btn-secondary flex items-center gap-2 text-sm py-2"
              >
                {portalMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Gerenciar cobrança
              </button>
            )}
          </div>
        </div>

        {sub?.currentPeriodEnd && (
          <div className="mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground">
            Próxima renovação:{' '}
            <span className="text-foreground font-medium">
              {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </span>
          </div>
        )}

        {sub?.trialEndsAt && status === 'TRIAL' && (
          <div className="mt-4 pt-4 border-t border-border/50 text-sm text-blue-400">
            Trial encerra em:{' '}
            <span className="font-medium">
              {new Date(sub.trialEndsAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </span>
          </div>
        )}
      </motion.div>

      {/* Plan cards */}
      <div>
        <h2 className="font-semibold mb-4">Escolha seu plano</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            const isCurrent = plan.key === currentPlan;
            const isLoading = loadingPlan === plan.key;

            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'glass-card relative flex flex-col',
                  isCurrent && 'ring-2 ring-primary',
                  plan.popular && !isCurrent && 'ring-1 ring-purple-500/50',
                )}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                      MAIS POPULAR
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full">
                      PLANO ATUAL
                    </span>
                  </div>
                )}

                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                <div className="font-bold text-lg">{plan.label}</div>
                <div className="mt-1 mb-4">
                  <span className="text-3xl font-bold">R$ {plan.price}</span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>

                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isCurrent || isLoading}
                  className={cn(
                    'w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                    isCurrent
                      ? 'bg-primary/10 text-primary cursor-default'
                      : `bg-gradient-to-r ${plan.color} text-white hover:opacity-90`,
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Plano ativo
                    </>
                  ) : (
                    <>
                      Assinar {plan.label}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card"
        >
          <h2 className="font-semibold mb-4">Histórico de pagamentos</h2>
          <div className="divide-y divide-border/30">
            {payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">{p.description || 'Assinatura'}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.paidAt || p.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    p.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
                  )}>
                    {p.status === 'PAID' ? 'Pago' : p.status}
                  </span>
                  <span className="font-semibold">
                    {p.currency} {Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
