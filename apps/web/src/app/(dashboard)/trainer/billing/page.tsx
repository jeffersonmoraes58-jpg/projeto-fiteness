'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, DollarSign, Users, CheckCircle, Clock,
  AlertCircle, Save, ChevronLeft, Key, Calendar,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { PlanGate } from '@/components/ui/plan-gate';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ACTIVE:    { label: 'Ativo',     color: 'text-green-400 bg-green-400/10' },
  PENDING:   { label: 'Pendente',  color: 'text-yellow-400 bg-yellow-400/10' },
  OVERDUE:   { label: 'Vencido',   color: 'text-red-400 bg-red-400/10' },
  CANCELLED: { label: 'Cancelado', color: 'text-gray-400 bg-gray-400/10' },
  PAID:      { label: 'Pago',      color: 'text-green-400 bg-green-400/10' },
};

function fmt(val?: number) {
  if (!val && val !== 0) return '—';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d?: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

export default function TrainerBillingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: pricing } = useQuery({
    queryKey: ['trainer-pricing'],
    queryFn: () => api.get('/billing/trainer/pricing').then((r) => r.data.data),
  });

  const { data: billings = [], isLoading } = useQuery({
    queryKey: ['trainer-billings'],
    queryFn: () => api.get('/billing/trainer/billings').then((r) => r.data.data ?? []),
  });

  const [priceForm, setPriceForm] = useState({ monthly: '', annual: '', token: '' });
  const [editingPrice, setEditingPrice] = useState(false);

  const openPriceEdit = () => {
    setPriceForm({
      monthly: pricing?.monthlyPrice?.toString() ?? '',
      annual: pricing?.annualPrice?.toString() ?? '',
      token: '',
    });
    setEditingPrice(true);
  };

  const pricingMutation = useMutation({
    mutationFn: (data: any) => api.post('/billing/trainer/pricing', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-pricing'] });
      setEditingPrice(false);
      toast.success('Preços salvos!');
    },
    onError: () => toast.error('Erro ao salvar preços'),
  });

  const markPaidMutation = useMutation({
    mutationFn: (invoiceId: string) => api.patch(`/billing/trainer/invoices/${invoiceId}/mark-paid`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-billings'] });
      toast.success('Fatura marcada como paga!');
    },
    onError: () => toast.error('Erro ao atualizar fatura'),
  });

  const cancelBillingMutation = useMutation({
    mutationFn: (billingId: string) => api.delete(`/billing/trainer/billings/${billingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-billings'] });
      toast.success('Cobrança cancelada');
    },
    onError: () => toast.error('Erro ao cancelar cobrança'),
  });

  const handleSavePricing = () => {
    const body: any = {};
    if (priceForm.monthly) body.monthlyPrice = Number(priceForm.monthly);
    if (priceForm.annual) body.annualPrice = Number(priceForm.annual);
    if (priceForm.token) body.mpAccessToken = priceForm.token;
    pricingMutation.mutate(body);
  };

  const active = (billings as any[]).filter((b) => b.status === 'ACTIVE');
  const mrr = active.reduce((s: number, b: any) => s + (b.amount ?? 0), 0);

  return (
    <PlanGate feature="billing">
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold">Plano e Cobrança</h1>
        </div>
      </div>

      {/* MRR cards */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-sm text-muted-foreground">Receita mensal</span>
          </div>
          <div className="text-2xl font-bold">{fmt(mrr)}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-sm text-muted-foreground">Alunos ativos</span>
          </div>
          <div className="text-2xl font-bold">{active.length}</div>
        </motion.div>
      </div>

      {/* Pricing config */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Configuração de Preços</h2>
          {!editingPrice && (
            <button onClick={openPriceEdit} className="btn-secondary text-sm py-1.5 px-3">Editar</button>
          )}
        </div>

        {editingPrice ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Mensalidade (R$)</label>
                <input type="number" min="0" step="0.01" value={priceForm.monthly} onChange={(e) => setPriceForm({ ...priceForm, monthly: e.target.value })} className="input-field" placeholder="Ex: 150.00" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Plano anual (R$)</label>
                <input type="number" min="0" step="0.01" value={priceForm.annual} onChange={(e) => setPriceForm({ ...priceForm, annual: e.target.value })} className="input-field" placeholder="Ex: 1500.00" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                <Key className="w-3 h-3" /> Token Mercado Pago (deixe vazio para manter o atual)
              </label>
              <input type="password" value={priceForm.token} onChange={(e) => setPriceForm({ ...priceForm, token: e.target.value })} className="input-field" placeholder="APP_USR-..." />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditingPrice(false)} className="btn-secondary flex-1 py-2">Cancelar</button>
              <button onClick={handleSavePricing} disabled={pricingMutation.isPending} className="btn-primary flex-1 py-2 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {pricingMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-xs text-muted-foreground mb-1">Mensalidade</div>
              <div className="font-semibold">{fmt(pricing?.monthlyPrice)}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-xs text-muted-foreground mb-1">Plano anual</div>
              <div className="font-semibold">{fmt(pricing?.annualPrice)}</div>
            </div>
            <div className="col-span-2 p-3 rounded-xl bg-white/5 flex items-center gap-2">
              <Key className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Token Mercado Pago</div>
                <div className="text-sm font-medium">{pricing?.mpAccessToken ? '••••••••••••' : 'Não configurado'}</div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Billings list */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card">
        <h2 className="font-semibold mb-4">Cobranças dos Alunos</h2>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
        ) : (billings as any[]).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Nenhuma cobrança cadastrada ainda
          </div>
        ) : (
          <div className="space-y-3">
            {(billings as any[]).map((b) => {
              const st = STATUS_LABEL[b.status] ?? { label: b.status, color: 'text-gray-400 bg-gray-400/10' };
              const inv = b.latestInvoice;
              const invSt = inv ? (STATUS_LABEL[inv.status] ?? { label: inv.status, color: 'text-gray-400 bg-gray-400/10' }) : null;
              return (
                <div key={b.id} className="p-4 rounded-xl bg-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{b.studentName}</div>
                      <div className="text-xs text-muted-foreground">{b.studentEmail}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${st.color}`}>{st.label}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground mb-0.5">Valor</div>
                      <div className="font-medium">{fmt(b.amount)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-0.5">Intervalo</div>
                      <div className="font-medium">{b.interval === 'ANNUAL' ? 'Anual' : 'Mensal'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Vencimento</div>
                      <div className="font-medium">{fmtDate(b.nextDueDate)}</div>
                    </div>
                  </div>

                  {inv && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <div className="text-xs text-muted-foreground">
                        Última fatura: {fmt(inv.amount)} • <span className={`px-1.5 py-0.5 rounded ${invSt?.color}`}>{invSt?.label}</span>
                      </div>
                      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                        <button
                          onClick={() => markPaidMutation.mutate(inv.id)}
                          disabled={markPaidMutation.isPending}
                          className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Marcar pago
                        </button>
                      )}
                    </div>
                  )}

                  {b.status !== 'CANCELLED' && (
                    <button
                      onClick={() => { if (confirm('Cancelar cobrança deste aluno?')) cancelBillingMutation.mutate(b.id); }}
                      className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                    >
                      Cancelar cobrança
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
    </PlanGate>
  );
}
