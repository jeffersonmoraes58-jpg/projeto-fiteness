'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Clock, AlertTriangle, Ban,
  Copy, QrCode, RefreshCw, ExternalLink, CreditCard, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_INFO = {
  ACTIVE:    { label: 'Em dia',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  PENDING:   { label: 'Pendente',   color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30',   icon: Clock },
  OVERDUE:   { label: 'Atrasado',   color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',   icon: AlertTriangle },
  SUSPENDED: { label: 'Suspenso',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         icon: Ban },
  CANCELLED: { label: 'Cancelado',  color: 'text-gray-400',    bg: 'bg-gray-500/10 border-gray-500/30',       icon: Ban },
} as const;

export default function StudentBillingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" /></div>}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const searchParams = useSearchParams();
  const paymentReturn = searchParams.get('payment');

  const [activeInvoice, setActiveInvoice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pixData, setPixData] = useState<Record<string, { pixQrCode: string; pixQrCodeBase64: string; expiresAt: string }>>({});
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  const { data: billings = [], isLoading, refetch } = useQuery({
    queryKey: ['student-billing'],
    queryFn: () => api.get('/billing/student/status').then((r) => r.data?.data ?? r.data),
    refetchInterval: 30_000,
  });

  // Refresh after returning from MP checkout
  useEffect(() => {
    if (paymentReturn) refetch();
  }, [paymentReturn, refetch]);

  const pixMut = useMutation({
    mutationFn: (invoiceId: string) =>
      api.post(`/billing/student/invoice/${invoiceId}/pix`).then((r) => r.data?.data ?? r.data),
    onSuccess: (data: any, invoiceId) => {
      setPixData((prev) => ({ ...prev, [invoiceId]: data }));
      setActiveInvoice(invoiceId);
      setExpandedInvoice(invoiceId);
    },
  });

  const checkoutMut = useMutation({
    mutationFn: (invoiceId: string) =>
      api.post(`/billing/student/invoice/${invoiceId}/checkout`).then((r) => r.data?.data ?? r.data),
    onSuccess: (data: any) => {
      window.open(data.checkoutUrl, '_blank');
    },
  });

  function copyPix(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const arr = Array.isArray(billings) ? billings : [];
  const suspended = arr.some((b: any) => b.status === 'SUSPENDED');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pagamentos</h1>
        <p className="text-muted-foreground text-sm mt-1">Suas cobranças e faturas em aberto</p>
      </div>

      {/* Return banners from MP checkout */}
      {paymentReturn === 'success' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-400 font-medium">Pagamento aprovado! Seu acesso foi reativado.</p>
        </motion.div>
      )}
      {paymentReturn === 'pending' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-400 font-medium">Pagamento em processamento. Você será notificado em breve.</p>
        </motion.div>
      )}
      {paymentReturn === 'failure' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 font-medium">Pagamento recusado. Tente novamente ou use outro método.</p>
        </motion.div>
      )}

      {/* Suspended banner */}
      {suspended && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <Ban className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-400">Acesso suspenso por inadimplência</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Regularize o pagamento abaixo para reativar seu acesso.
            </p>
          </div>
        </motion.div>
      )}

      {arr.length === 0 ? (
        <div className="glass-card text-center py-12">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="font-semibold">Nenhuma cobrança ativa</p>
          <p className="text-sm text-muted-foreground mt-1">Seu acesso está liberado.</p>
        </div>
      ) : (
        arr.map((billing: any) => {
          const info = STATUS_INFO[billing.status as keyof typeof STATUS_INFO] ?? STATUS_INFO.PENDING;
          const Icon = info.icon;
          const inv = billing.pendingInvoice;
          const pix = inv ? pixData[inv.id] : null;
          const isExpanded = expandedInvoice === inv?.id;

          return (
            <motion.div key={billing.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className={cn('glass-card border', info.bg)}>
              {/* Billing header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="font-semibold text-lg">{billing.trainerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {billing.interval === 'ANNUAL' ? 'Plano Anual' : 'Plano Mensal'}
                    {' · '}
                    R$ {billing.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    /{billing.interval === 'ANNUAL' ? 'ano' : 'mês'}
                  </p>
                </div>
                <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border', info.bg, info.color)}>
                  <Icon className="w-3.5 h-3.5" />
                  {info.label}
                </div>
              </div>

              {/* No pending invoice */}
              {!inv && billing.status === 'ACTIVE' && (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Pagamento em dia. Próx. vencimento: {new Date(billing.nextDueDate).toLocaleDateString('pt-BR')}
                </div>
              )}

              {/* Pending invoice */}
              {inv && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div>
                      <p className="text-sm font-medium">{inv.description ?? 'Fatura em aberto'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Vencimento: {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className={cn('text-xs', inv.status === 'OVERDUE' ? 'text-orange-400' : 'text-yellow-400')}>
                        {inv.status === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                      </p>
                    </div>
                  </div>

                  {/* Payment buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Credit card button */}
                    <button
                      onClick={() => checkoutMut.mutate(inv.id)}
                      disabled={checkoutMut.isPending}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm
                        bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30
                        disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                      {checkoutMut.isPending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                      Cartão de Crédito
                    </button>

                    {/* Pix button */}
                    <button
                      onClick={() => {
                        if (pix) {
                          setExpandedInvoice(isExpanded ? null : inv.id);
                        } else {
                          pixMut.mutate(inv.id);
                        }
                      }}
                      disabled={pixMut.isPending && pixMut.variables === inv.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm
                        bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30
                        disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                      {pixMut.isPending && pixMut.variables === inv.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <QrCode className="w-4 h-4" />
                      )}
                      Pix
                      {pix && (isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </button>
                  </div>

                  {/* Errors */}
                  {pixMut.isError && pixMut.variables === inv.id && (
                    <p className="text-xs text-red-400 text-center">
                      {(pixMut.error as any)?.message ?? 'Erro ao gerar QR Code'}
                    </p>
                  )}
                  {checkoutMut.isError && (
                    <p className="text-xs text-red-400 text-center">
                      {(checkoutMut.error as any)?.message ?? 'Erro ao gerar link de pagamento'}
                    </p>
                  )}

                  {/* Pix QR Code (expandable) */}
                  <AnimatePresence>
                    {pix && isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden">
                        <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-white/5">
                          {pix.pixQrCodeBase64 ? (
                            <div className="w-52 h-52 rounded-xl overflow-hidden bg-white p-2 flex items-center justify-center">
                              <img
                                src={`data:image/png;base64,${pix.pixQrCodeBase64}`}
                                alt="QR Code Pix"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-52 h-52 rounded-xl bg-white/10 flex items-center justify-center">
                              <QrCode className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          <p className="text-sm font-medium">Escaneie o QR Code no seu banco</p>
                          <p className="text-xs text-muted-foreground text-center">
                            Expira em: {pix.expiresAt ? new Date(pix.expiresAt).toLocaleString('pt-BR') : '24h'}
                          </p>
                        </div>

                        {/* Copy code */}
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Ou copie o código Pix:</p>
                          <div className="flex gap-2">
                            <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground truncate">
                              {pix.pixQrCode ? `${pix.pixQrCode.slice(0, 40)}...` : '—'}
                            </div>
                            <button
                              onClick={() => copyPix(pix.pixQrCode)}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                                copied ? 'bg-emerald-600/20 text-emerald-400' : 'bg-primary/20 text-primary hover:bg-primary/30',
                              )}>
                              <Copy className="w-3.5 h-3.5" />
                              {copied ? 'Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <p className="text-xs text-blue-300">
                            Após o pagamento, seu acesso será reativado automaticamente em alguns minutos.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          );
        })
      )}
    </div>
  );
}
