'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, TrendingUp, Users, AlertTriangle,
  CheckCircle2, XCircle, Clock, Settings,
  CreditCard, Download, Plus, RefreshCw, Ban,
  Eye, EyeOff, KeyRound, Pencil, Trash2, X, Calendar,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'cobrancas' | 'faturas' | 'precos';

const STATUS_LABEL: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVE:    { label: 'Ativo',     color: 'text-emerald-400', icon: CheckCircle2 },
  PENDING:   { label: 'Pendente',  color: 'text-yellow-400',  icon: Clock },
  OVERDUE:   { label: 'Atrasado',  color: 'text-orange-400',  icon: AlertTriangle },
  SUSPENDED: { label: 'Suspenso',  color: 'text-red-400',     icon: Ban },
  CANCELLED: { label: 'Cancelado', color: 'text-gray-400',    icon: XCircle },
};

const INV_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Pendente',  color: 'text-yellow-400' },
  PAID:      { label: 'Pago',      color: 'text-emerald-400' },
  OVERDUE:   { label: 'Atrasado',  color: 'text-orange-400' },
  CANCELLED: { label: 'Cancelado', color: 'text-gray-400' },
};

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default function TrainerPayments() {
  const [tab, setTab] = useState<Tab>('cobrancas');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [annualPrice, setAnnualPrice] = useState('');
  const [mpToken, setMpToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Subscribe modal state
  const [subscribeModal, setSubscribeModal] = useState<{ userId: string; name: string } | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [subscribeDueDate, setSubscribeDueDate] = useState(defaultDueDate());

  // Edit invoice modal state
  const [editInvoiceModal, setEditInvoiceModal] = useState<any | null>(null);
  const [editDueDate, setEditDueDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Delete confirmations
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  const [deleteBillingId, setDeleteBillingId] = useState<string | null>(null);

  const qc = useQueryClient();

  const { data: pricing } = useQuery({
    queryKey: ['trainer-pricing'],
    queryFn: () => api.get('/billing/trainer/pricing').then((r) => r.data?.data ?? r.data),
  });

  useEffect(() => {
    if ((pricing as any)?.monthlyPrice) setMonthlyPrice(String((pricing as any).monthlyPrice));
    if ((pricing as any)?.annualPrice) setAnnualPrice(String((pricing as any).annualPrice));
  }, [pricing]);

  const { data: billings = [], isLoading: billingsLoading } = useQuery({
    queryKey: ['trainer-billings'],
    queryFn: () => api.get('/billing/trainer/billings').then((r) => r.data?.data ?? r.data),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['trainer-students'],
    queryFn: () => api.get('/trainers/me/students').then((r) => r.data?.data ?? r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['trainer-billings'] });

  const setPricingMut = useMutation({
    mutationFn: (body: any) => api.post('/billing/trainer/pricing', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer-pricing'] }),
  });

  const subscribeMut = useMutation({
    mutationFn: ({ userId, interval, dueDate }: any) =>
      api.post(`/billing/trainer/students/${userId}/subscribe`, { interval, dueDate }),
    onSuccess: () => { invalidate(); setSubscribeModal(null); },
  });

  const markPaidMut = useMutation({
    mutationFn: (invoiceId: string) => api.patch(`/billing/trainer/invoices/${invoiceId}/mark-paid`, {}),
    onSuccess: invalidate,
  });

  const editInvoiceMut = useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/billing/trainer/invoices/${id}`, body),
    onSuccess: () => { invalidate(); setEditInvoiceModal(null); },
  });

  const deleteInvoiceMut = useMutation({
    mutationFn: (id: string) => api.delete(`/billing/trainer/invoices/${id}`),
    onSuccess: () => { invalidate(); setDeleteInvoiceId(null); },
  });

  const cancelBillingMut = useMutation({
    mutationFn: (id: string) => api.delete(`/billing/trainer/billings/${id}`),
    onSuccess: () => { invalidate(); setDeleteBillingId(null); },
  });

  function openEditInvoice(inv: any) {
    setEditInvoiceModal(inv);
    setEditDueDate(inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : '');
    setEditAmount(String(inv.amount ?? ''));
    setEditDescription(inv.description ?? '');
  }

  const arr = Array.isArray(billings) ? billings : [];
  const studentsArr = Array.isArray(students) ? students : [];
  const billedUserIds = new Set(
    arr.filter((b: any) => b.status !== 'CANCELLED').map((b: any) => b.studentUserId),
  );
  const unbilledStudents = studentsArr.filter((s: any) => !billedUserIds.has(s.userId));
  const active  = arr.filter((b: any) => b.status === 'ACTIVE');
  const pending = arr.filter((b: any) => b.status === 'PENDING');
  const overdue = arr.filter((b: any) => ['OVERDUE', 'SUSPENDED'].includes(b.status));
  const mrr     = active.reduce((s: number, b: any) => s + (b.interval === 'MONTHLY' ? b.amount : b.amount / 12), 0);

  const allInvoices = arr
    .flatMap((b: any) => (b.invoices ?? []).map((inv: any) => ({ ...inv, studentName: b.studentName, billingId: b.id })))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function exportCSV() {
    const rows = [
      ['Aluno', 'Plano', 'Valor (R$)', 'Status', 'Próx. vencimento'],
      ...arr.map((b: any) => [
        b.studentName,
        b.interval === 'ANNUAL' ? 'Anual' : 'Mensal',
        b.amount.toFixed(2).replace('.', ','),
        STATUS_LABEL[b.status]?.label ?? b.status,
        b.nextDueDate ? new Date(b.nextDueDate).toLocaleDateString('pt-BR') : '—',
      ]),
    ];
    const csv = rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cobrancas-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const summaryCards = [
    { label: 'MRR', value: `R$ ${mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'from-emerald-600 to-teal-600', sub: 'receita mensal recorrente' },
    { label: 'Ativos', value: active.length, icon: Users, color: 'from-purple-600 to-indigo-600', sub: 'alunos em dia' },
    { label: 'Pendentes', value: pending.length, icon: Clock, color: 'from-yellow-600 to-orange-600', sub: 'aguardando pagamento' },
    { label: 'Atrasados', value: overdue.length, icon: AlertTriangle, color: 'from-red-600 to-rose-600', sub: 'vencidos ou suspensos' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cobranças & Pagamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie mensalidades e planos dos seus alunos</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm py-2">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-xl font-bold leading-tight">{card.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
            <div className="text-[11px] text-muted-foreground/60 mt-0.5">{card.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {([['cobrancas', 'Cobranças'], ['faturas', 'Faturas'], ['precos', 'Configurar Preços']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px',
              tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: COBRANÇAS ── */}
      {tab === 'cobrancas' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card">
          <h2 className="font-semibold mb-4">Alunos e Cobranças</h2>
          {billingsLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                  <div className="h-2 bg-white/5 rounded w-1/4" />
                </div>
                <div className="h-6 bg-white/10 rounded w-24" />
              </div>
            ))}</div>
          ) : arr.length === 0 && unbilledStudents.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum aluno cadastrado ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Students WITH billing */}
              {arr.map((b: any, i: number) => {
                const st = STATUS_LABEL[b.status] ?? STATUS_LABEL['PENDING'];
                const Icon = st.icon;
                const canCancel = b.status !== 'CANCELLED';
                return (
                  <motion.div key={b.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-purple-300">
                      {b.studentName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{b.studentName || '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.interval === 'ANNUAL' ? 'Plano Anual' : 'Plano Mensal'}
                        {b.nextDueDate ? ` · vence ${new Date(b.nextDueDate).toLocaleDateString('pt-BR')}` : ''}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <div className="font-semibold text-sm">
                        R$ {b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <span className="text-muted-foreground text-xs font-normal">/{b.interval === 'ANNUAL' ? 'ano' : 'mês'}</span>
                      </div>
                      <div className={cn('text-xs flex items-center gap-1 justify-end mt-0.5', st.color)}>
                        <Icon className="w-3 h-3" />{st.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {b.status === 'CANCELLED' && (
                        <button
                          onClick={() => { setSubscribeModal({ userId: b.studentUserId, name: b.studentName }); setSubscribeDueDate(defaultDueDate()); }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-all flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Nova cobrança
                        </button>
                      )}
                      {(b.latestInvoice?.status === 'PENDING' || b.latestInvoice?.status === 'OVERDUE') && (
                        <button onClick={() => markPaidMut.mutate(b.latestInvoice.id)}
                          disabled={markPaidMut.isPending}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-all">
                          Marcar pago
                        </button>
                      )}
                      {canCancel && (
                        <button onClick={() => setDeleteBillingId(b.id)}
                          title="Cancelar cobrança"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Students WITHOUT billing */}
              {unbilledStudents.map((s: any, i: number) => {
                const name = [s.user?.profile?.firstName, s.user?.profile?.lastName].filter(Boolean).join(' ') || s.user?.email || '—';
                return (
                  <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (arr.length + i) * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all border border-dashed border-white/10">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 text-sm font-bold text-muted-foreground">
                      {name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{name}</div>
                      <div className="text-xs text-muted-foreground">Sem cobrança configurada</div>
                    </div>
                    <button
                      onClick={() => { setSubscribeModal({ userId: s.userId, name }); setSubscribeDueDate(defaultDueDate()); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-all flex items-center gap-1.5 flex-shrink-0">
                      <Plus className="w-3 h-3" /> Criar cobrança
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── TAB: FATURAS ── */}
      {tab === 'faturas' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card">
          <h2 className="font-semibold mb-4">Histórico de Faturas</h2>
          {allInvoices.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma fatura emitida ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b border-white/10">
                    <th className="text-left py-2 pr-3">Aluno</th>
                    <th className="text-left py-2 pr-3 hidden md:table-cell">Descrição</th>
                    <th className="text-right py-2 pr-3">Valor</th>
                    <th className="text-left py-2 pr-3">Vencimento</th>
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-right py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {allInvoices.map((inv: any) => {
                    const invSt = INV_STATUS[inv.status as string] ?? { label: inv.status, color: 'text-muted-foreground' };
                    const canEdit = inv.status === 'PENDING' || inv.status === 'OVERDUE';
                    return (
                      <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 pr-3 font-medium">{inv.studentName}</td>
                        <td className="py-3 pr-3 text-muted-foreground max-w-[180px] truncate hidden md:table-cell">{inv.description ?? '—'}</td>
                        <td className="py-3 pr-3 text-right font-semibold whitespace-nowrap">
                          R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 pr-3 text-muted-foreground whitespace-nowrap">
                          {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className={cn('py-3 pr-3 font-medium whitespace-nowrap', invSt.color)}>{invSt.label}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <>
                                <button onClick={() => markPaidMut.mutate(inv.id)}
                                  disabled={markPaidMut.isPending}
                                  className="text-xs px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-all whitespace-nowrap">
                                  Marcar pago
                                </button>
                                <button onClick={() => openEditInvoice(inv)}
                                  title="Editar fatura"
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setDeleteInvoiceId(inv.id)}
                                  title="Excluir fatura"
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ── TAB: PREÇOS ── */}
      {tab === 'precos' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="glass-card max-w-md">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-semibold">Configurar Preços</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Mensalidade (R$/mês)</label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">R$</span>
                  <input type="number" min="0" step="0.01" value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(e.target.value)}
                    placeholder="ex: 200,00" className="input-field flex-1" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Plano Anual (R$/ano)</label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">R$</span>
                  <input type="number" min="0" step="0.01" value={annualPrice}
                    onChange={(e) => setAnnualPrice(e.target.value)}
                    placeholder="ex: 1900,00" className="input-field flex-1" />
                </div>
                {monthlyPrice && annualPrice && (
                  <p className="text-xs text-emerald-400 mt-1.5">
                    Economia de R$ {(parseFloat(monthlyPrice) * 12 - parseFloat(annualPrice)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no plano anual
                  </p>
                )}
              </div>
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <KeyRound className="w-4 h-4 text-yellow-400" />
                  <label className="text-sm font-medium">Token Mercado Pago</label>
                  {(pricing as any)?.hasMpToken && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Configurado ✓
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input type={showToken ? 'text' : 'password'} value={mpToken}
                    onChange={(e) => setMpToken(e.target.value)}
                    placeholder={(pricing as any)?.hasMpToken ? '••••••••••••••••• (manter atual)' : 'APP_USR-...'}
                    className="input-field w-full pr-10 font-mono text-sm" />
                  <button type="button" onClick={() => setShowToken((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-1.5">
                  Access Token do{' '}
                  <a href="https://www.mercadopago.com.br/developers/panel/app"
                    target="_blank" rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2">
                    painel MP → Credenciais de produção
                  </a>.
                  {(pricing as any)?.hasMpToken && ' Deixe em branco para manter o token atual.'}
                </p>
              </div>
              <button
                onClick={() => setPricingMut.mutate({
                  monthlyPrice: monthlyPrice ? parseFloat(monthlyPrice) : undefined,
                  annualPrice: annualPrice ? parseFloat(annualPrice) : undefined,
                  ...(mpToken ? { mpAccessToken: mpToken } : {}),
                })}
                disabled={setPricingMut.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {setPricingMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                Salvar configurações
              </button>
              {setPricingMut.isSuccess && (
                <p className="text-xs text-emerald-400 text-center">Configurações salvas!</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── MODAL: CRIAR COBRANÇA ── */}
      <AnimatePresence>
        {subscribeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setSubscribeModal(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-sm">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold">Criar cobrança</h3>
                <button onClick={() => setSubscribeModal(null)} className="p-1 rounded-lg hover:bg-white/10 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{subscribeModal.name}</p>

              {!(pricing as any)?.monthlyPrice && !(pricing as any)?.annualPrice && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-4">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-300">
                    Configure seus preços na aba{' '}
                    <button onClick={() => { setTab('precos'); setSubscribeModal(null); }} className="underline font-medium">
                      Configurar Preços
                    </button>{' '}antes de criar cobranças.
                  </p>
                </div>
              )}

              <div className="space-y-2 mb-4">
                {([['MONTHLY', 'Mensal', (pricing as any)?.monthlyPrice], ['ANNUAL', 'Anual', (pricing as any)?.annualPrice]] as const).map(([val, label, price]) => (
                  <button key={val}
                    onClick={() => price && setSelectedInterval(val as 'MONTHLY' | 'ANNUAL')}
                    disabled={!price}
                    className={cn('w-full flex items-center justify-between p-3 rounded-xl border transition-all',
                      !price ? 'opacity-40 cursor-not-allowed border-white/5' :
                      selectedInterval === val ? 'border-primary bg-primary/10' : 'border-white/10 hover:bg-accent')}>
                    <span className="font-medium">{label}</span>
                    <span className="text-sm text-muted-foreground">
                      {price ? `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não configurado'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Due date */}
              <div className="mb-5">
                <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Data de vencimento
                </label>
                <input type="date" value={subscribeDueDate}
                  onChange={(e) => setSubscribeDueDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="input-field w-full text-sm" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSubscribeModal(null)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={() => subscribeMut.mutate({ userId: subscribeModal.userId, interval: selectedInterval, dueDate: subscribeDueDate })}
                  disabled={
                    subscribeMut.isPending ||
                    (selectedInterval === 'MONTHLY' && !(pricing as any)?.monthlyPrice) ||
                    (selectedInterval === 'ANNUAL' && !(pricing as any)?.annualPrice)
                  }
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                  {subscribeMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  Criar cobrança
                </button>
              </div>
              {subscribeMut.isError && (
                <p className="text-xs text-red-400 text-center mt-3">
                  {(subscribeMut.error as any)?.message ?? 'Erro ao criar cobrança'}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: EDITAR FATURA ── */}
      <AnimatePresence>
        {editInvoiceModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setEditInvoiceModal(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Editar fatura</h3>
                <button onClick={() => setEditInvoiceModal(null)} className="p-1 rounded-lg hover:bg-white/10 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Data de vencimento</label>
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                    className="input-field w-full text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Valor (R$)</label>
                  <input type="number" min="0" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                    className="input-field w-full text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Descrição</label>
                  <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Ex: Mensalidade maio/2025"
                    className="input-field w-full text-sm" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditInvoiceModal(null)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={() => editInvoiceMut.mutate({
                    id: editInvoiceModal.id,
                    dueDate: editDueDate || undefined,
                    amount: editAmount ? parseFloat(editAmount) : undefined,
                    description: editDescription || undefined,
                  })}
                  disabled={editInvoiceMut.isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {editInvoiceMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  Salvar
                </button>
              </div>
              {editInvoiceMut.isError && (
                <p className="text-xs text-red-400 text-center mt-3">
                  {(editInvoiceMut.error as any)?.message ?? 'Erro ao editar fatura'}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: CONFIRMAR EXCLUSÃO DE FATURA ── */}
      <AnimatePresence>
        {deleteInvoiceId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setDeleteInvoiceId(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-xs text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-semibold mb-1">Excluir fatura?</h3>
              <p className="text-sm text-muted-foreground mb-5">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteInvoiceId(null)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={() => deleteInvoiceMut.mutate(deleteInvoiceId)}
                  disabled={deleteInvoiceMut.isPending}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm font-medium transition-all flex items-center justify-center gap-2">
                  {deleteInvoiceMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: CONFIRMAR CANCELAMENTO DE COBRANÇA ── */}
      <AnimatePresence>
        {deleteBillingId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setDeleteBillingId(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-xs text-center">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <Ban className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="font-semibold mb-1">Cancelar cobrança?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                A cobrança será cancelada e as faturas pendentes serão removidas.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteBillingId(null)} className="btn-secondary flex-1">Voltar</button>
                <button onClick={() => cancelBillingMut.mutate(deleteBillingId)}
                  disabled={cancelBillingMut.isPending}
                  className="flex-1 px-4 py-2 rounded-xl bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 text-sm font-medium transition-all flex items-center justify-center gap-2">
                  {cancelBillingMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  Cancelar cobrança
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
