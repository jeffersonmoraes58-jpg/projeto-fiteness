'use client';

import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Zap, Star, ChevronLeft, CreditCard, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSubscription, SubscriptionPlan } from '@/hooks/useSubscription';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const PLAN_ORDER: SubscriptionPlan[] = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];

const PLANS: {
  key: SubscriptionPlan;
  name: string;
  price: number;
  description: string;
  popular?: boolean;
  features: { label: string; ok: boolean }[];
}[] = [
  {
    key: 'FREE',
    name: 'Grátis',
    price: 0,
    description: 'Para começar sem compromisso',
    features: [
      { label: '1 aluno ativo', ok: true },
      { label: 'Montagem de treinos', ok: true },
      { label: 'Chat com aluno', ok: true },
      { label: 'Dashboard básico', ok: true },
      { label: 'Agenda de sessões', ok: false },
      { label: 'Cobranças integradas', ok: false },
      { label: 'Avaliação física', ok: false },
      { label: 'IA Fitness', ok: false },
      { label: 'Relatórios', ok: false },
      { label: 'Gamificação', ok: false },
    ],
  },
  {
    key: 'BASIC',
    name: 'Starter',
    price: 35,
    description: 'Para personal trainers autônomos',
    features: [
      { label: 'Até 20 alunos/pacientes', ok: true },
      { label: 'Treinos/dietas ilimitados', ok: true },
      { label: 'Chat (texto, voz, arquivos)', ok: true },
      { label: 'Agenda de sessões', ok: true },
      { label: 'Cobranças via Mercado Pago', ok: true },
      { label: 'Avaliação física', ok: true },
      { label: 'Relatórios CSV', ok: true },
      { label: 'IA Fitness', ok: false },
      { label: 'Gamificação', ok: false },
      { label: 'Player de música', ok: false },
    ],
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: 55,
    description: 'Para quem quer crescer com IA',
    popular: true,
    features: [
      { label: 'Até 60 alunos/pacientes', ok: true },
      { label: 'Tudo do Starter', ok: true },
      { label: 'IA Fitness', ok: true },
      { label: 'Desafios e gamificação', ok: true },
      { label: 'Relatórios PDF', ok: true },
      { label: 'Player de música', ok: true },
      { label: 'KPIs avançados', ok: true },
      { label: 'Notificações automáticas', ok: true },
      { label: 'Planos nutricionais', ok: true },
      { label: 'Suporte prioritário', ok: true },
    ],
  },
  {
    key: 'ENTERPRISE',
    name: 'Elite',
    price: 95,
    description: 'Para studios e equipes',
    features: [
      { label: 'Alunos ilimitados', ok: true },
      { label: 'Tudo do Pro', ok: true },
      { label: 'Nutricionista integrado', ok: true },
      { label: 'Múltiplos trainers', ok: true },
      { label: 'Dashboard multi-profissional', ok: true },
      { label: 'Suporte via WhatsApp', ok: true },
      { label: 'Onboarding dedicado', ok: true },
      { label: 'Acesso antecipado', ok: true },
      { label: 'Relatórios avançados', ok: true },
      { label: 'Marketplace de cursos', ok: true },
    ],
  },
];

function StatusBanner() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  if (!status) return null;

  const config = {
    success: {
      icon: CheckCircle2,
      text: 'Pagamento aprovado! Seu plano será ativado em instantes.',
      className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    },
    pending: {
      icon: Clock,
      text: 'Pagamento em processamento. Ativaremos seu plano assim que for confirmado.',
      className: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    },
    failure: {
      icon: AlertCircle,
      text: 'Pagamento não concluído. Tente novamente ou escolha outro método.',
      className: 'bg-destructive/10 border-destructive/30 text-destructive',
    },
  }[status];

  if (!config) return null;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm mb-2 ${config.className}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      {config.text}
    </div>
  );
}

function SubscriptionPageContent() {
  const router = useRouter();
  const { plan: currentPlan, displayName } = useSubscription();
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null);

  const returnUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';

  const handleUpgrade = async (plan: SubscriptionPlan, planName: string) => {
    setLoadingPlan(plan);
    try {
      const { data } = await api.post('/subscriptions/checkout', { plan, returnUrl });
      const checkoutUrl = data?.checkoutUrl ?? data?.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast.error('Erro ao iniciar checkout');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao iniciar pagamento';
      toast.error(msg);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Meu Plano</h1>
            <p className="text-sm text-muted-foreground">
              Plano atual:{' '}
              <span className="text-primary font-medium">{displayName}</span>
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <StatusBanner />
      </Suspense>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {PLANS.map((plan, index) => {
          const isCurrent = plan.key === currentPlan;
          const isPast = index < currentIndex;
          const isLoadingThis = loadingPlan === plan.key;

          return (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`relative glass-card border-2 flex flex-col ${
                isCurrent
                  ? 'border-primary shadow-2xl shadow-primary/20'
                  : plan.popular
                  ? 'border-primary/40'
                  : 'border-border'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-full px-4 py-1 text-xs font-bold flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Plano atual
                </div>
              )}
              {plan.popular && !isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white/10 border border-white/20 text-foreground rounded-full px-4 py-1 text-xs font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Mais popular
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                {plan.price === 0 ? (
                  <div>
                    <span className="text-4xl font-bold">Grátis</span>
                    <p className="text-xs text-muted-foreground mt-1">para sempre</p>
                  </div>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm mb-1">/mês</span>
                  </div>
                )}
              </div>

              {isCurrent ? (
                <div className="w-full text-center py-3 px-6 rounded-xl bg-primary/10 text-primary font-semibold text-sm mb-8">
                  Plano ativo
                </div>
              ) : isPast ? (
                <div className="w-full text-center py-3 px-6 rounded-xl bg-white/5 text-muted-foreground/50 font-semibold text-sm mb-8">
                  Incluído no seu plano
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.key, plan.name)}
                  disabled={!!loadingPlan}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm mb-8 transition-all disabled:opacity-60 ${
                    plan.popular
                      ? 'btn-primary'
                      : 'btn-secondary border border-border hover:border-primary'
                  }`}
                >
                  {isLoadingThis ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CreditCard className="w-3.5 h-3.5" />
                  )}
                  {isLoadingThis ? 'Aguarde...' : 'Assinar agora'}
                </button>
              )}

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-2.5 text-sm">
                    {feature.ok ? (
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={feature.ok ? 'text-muted-foreground' : 'text-muted-foreground/40'}>
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground pb-4">
        Pagamento seguro via Mercado Pago — cartão, Pix ou boleto.
        Todos os planos incluem atualizações automáticas e acesso via PWA.
      </p>
    </div>
  );
}

export function SubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SubscriptionPageContent />
    </Suspense>
  );
}
