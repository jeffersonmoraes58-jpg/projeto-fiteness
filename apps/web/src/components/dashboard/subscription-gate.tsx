'use client';

import { useState } from 'react';
import { Lock, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

type Cycle = 'MONTHLY' | 'ANNUAL';

const PLAN_OPTIONS = [
  { value: 'BASIC', label: 'Starter', monthly: 35, annual: 350, badge: null as string | null },
  { value: 'PRO', label: 'Pro', monthly: 55, annual: 550, badge: 'Mais popular' },
  { value: 'ENTERPRISE', label: 'Elite', monthly: 95, annual: 950, badge: null },
];

const STATUS_LABEL: Record<string, string> = {
  EXPIRED: 'Plano expirado',
  CANCELED: 'Plano cancelado',
  PAST_DUE: 'Pagamento em atraso',
  TRIAL: 'Pagamento pendente',
};

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { isBlocked, status, isLoading, plan } = useSubscription();

  // ADMIN e STUDENT não são donos de plano — não bloqueamos.
  // STUDENT acessa via tenant do trainer e paga mensalidade direto pro trainer.
  const exempt = !user || user.role === 'ADMIN' || user.role === 'STUDENT';

  // Plano FREE nunca é bloqueado
  if (plan === 'FREE') {
    return <>{children}</>;
  }

  const isTrial = status === 'TRIAL';

  if (exempt || isLoading || (!isBlocked && !isTrial)) {
    return <>{children}</>;
  }

  // TRIAL/EXPIRED/CANCELED/PAST_DUE: bloqueia completamente
  return <ExpiredOverlay statusKey={status ?? 'EXPIRED'} currentPlan={plan} />;
}

function ExpiredOverlay({ statusKey, currentPlan }: { statusKey: string; currentPlan: string }) {
  const [cycle, setCycle] = useState<Cycle>('MONTHLY');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { logout } = useAuthStore();
  const isTrial = statusKey === 'TRIAL';

  const handleCheckout = async (planValue: string) => {
    setLoadingPlan(planValue);
    try {
      const returnUrl = `${window.location.origin}/dashboard`;
      const res = await api.post('/subscriptions/checkout', {
        plan: planValue,
        cycle,
        returnUrl,
      });
      const checkoutUrl = res.data?.data?.checkoutUrl ?? res.data?.checkoutUrl;
      if (!checkoutUrl) throw new Error('Sem URL de checkout');
      window.location.href = checkoutUrl;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao iniciar checkout');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${isTrial ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
            <Lock className={`w-8 h-8 ${isTrial ? 'text-amber-400' : 'text-red-400'}`} />
          </div>
          <h1 className="text-3xl font-bold mb-2">{STATUS_LABEL[statusKey] ?? 'Acesso bloqueado'}</h1>
          <p className="text-muted-foreground">
            {isTrial
              ? 'Complete seu pagamento para liberar o acesso ao Fitlynutri.'
              : `Seu plano atual (${currentPlan}) não está mais ativo. Renove para continuar usando o Fitlynutri.`}
          </p>
        </div>

        <div className="glass-card mb-6">
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {isTrial
              ? 'Seus dados estão seguros. O acesso será liberado imediatamente após a confirmação do pagamento.'
              : 'Seus dados continuam salvos. Após renovar, você volta de onde parou.'}
          </div>

          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center bg-card border border-border rounded-full p-1">
              <button
                onClick={() => setCycle('MONTHLY')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  cycle === 'MONTHLY' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setCycle('ANNUAL')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                  cycle === 'ANNUAL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                Anual
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                  2 meses grátis
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLAN_OPTIONS.map((p) => {
              const price = cycle === 'ANNUAL' ? p.annual : p.monthly;
              const loading = loadingPlan === p.value;
              return (
                <div
                  key={p.value}
                  className={`relative rounded-2xl border-2 p-5 flex flex-col ${
                    p.badge ? 'border-primary' : 'border-border'
                  }`}
                >
                  {p.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {p.badge}
                    </div>
                  )}
                  <div className="text-lg font-bold mb-1">{p.label}</div>
                  <div className="text-2xl font-bold">
                    R$ {price}
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      {cycle === 'ANNUAL' ? '/ano' : '/mês'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCheckout(p.value)}
                    disabled={!!loadingPlan}
                    className={`mt-4 py-2 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      p.badge ? 'btn-primary' : 'btn-secondary border border-border hover:border-primary'
                    } disabled:opacity-50`}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isTrial ? 'Assinar' : 'Renovar'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => logout()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sair e voltar mais tarde
          </button>
        </div>
      </div>
    </div>
  );
}
