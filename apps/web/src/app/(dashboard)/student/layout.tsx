'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AlertTriangle, X, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [dismissed, setDismissed] = useState(false);

  const { data: billings } = useQuery({
    queryKey: ['student-billing-status'],
    queryFn: () => api.get('/billing/student/status').then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
    retry: false,
  });

  const overdueItems = Array.isArray(billings)
    ? billings.filter(
        (b: any) =>
          b.status === 'OVERDUE' ||
          b.status === 'SUSPENDED' ||
          b.pendingInvoice?.status === 'OVERDUE',
      )
    : [];

  const showBanner = overdueItems.length > 0 && !dismissed;
  const first = overdueItems[0];

  return (
    <>
      {showBanner && (
        <div className="sticky top-0 z-40 border-b border-amber-500/30 bg-amber-950/90 backdrop-blur-sm">
          <div className="max-w-screen-lg mx-auto px-4 py-2.5 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-200 truncate">
                Fatura em aberto
                {first?.amount != null
                  ? ` — R$ ${Number(first.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : ''}
                {first?.trainerName ? ` · ${first.trainerName}` : ''}
              </p>
              <p className="text-[10px] text-amber-400/80">
                Seus treinos estão bloqueados até o pagamento
                {first?.nextDueDate
                  ? ` · Venc. ${new Date(first.nextDueDate).toLocaleDateString('pt-BR')}`
                  : ''}
              </p>
            </div>
            <Link
              href="/student/billing"
              className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-all flex-shrink-0"
            >
              <CreditCard className="w-3 h-3" />
              Pagar agora
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="w-6 h-6 rounded-lg hover:bg-amber-500/20 flex items-center justify-center flex-shrink-0 transition-all"
            >
              <X className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
