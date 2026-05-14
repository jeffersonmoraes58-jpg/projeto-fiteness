'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, Users, CreditCard,
  ArrowUpRight, ArrowDownRight, Download, Filter,
  CheckCircle2, Clock, XCircle, AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const PERIODS = ['Este mês', 'Mês passado', '3 meses', '6 meses', 'Este ano'];
const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  PAID: { label: 'Pago', color: 'text-emerald-400', icon: CheckCircle2 },
  PENDING: { label: 'Pendente', color: 'text-yellow-400', icon: Clock },
  FAILED: { label: 'Falhou', color: 'text-red-400', icon: XCircle },
  REFUNDED: { label: 'Estornado', color: 'text-blue-400', icon: ArrowDownRight },
  CANCELED: { label: 'Cancelado', color: 'text-muted-foreground', icon: AlertCircle },
};

export default function TrainerPayments() {
  const [period, setPeriod] = useState('Este mês');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const { data: payments } = useQuery({
    queryKey: ['trainer-payments'],
    queryFn: () => api.get('/trainers/me/payments').then((r) => r.data.data),
  });

  const { data: students } = useQuery({
    queryKey: ['trainer-students-list'],
    queryFn: () => api.get('/trainers/me/students').then((r) => r.data.data),
  });

  const paidPayments = (payments || []).filter((p: any) => p.status === 'PAID');
  const pendingPayments = (payments || []).filter((p: any) => p.status === 'PENDING');
  const totalRevenue = paidPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const pendingAmount = pendingPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const avgMonthly = students?.length
    ? (students.reduce((sum: number, s: any) => sum + (s.monthlyFee || 0), 0) / students.length).toFixed(0)
    : 0;

  const filteredPayments = statusFilter === 'Todos'
    ? (payments || [])
    : (payments || []).filter((p: any) => p.status === statusFilter.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pagamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Receitas e cobranças</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm py-2">
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* Period */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all border',
              period === p ? 'bg-primary text-primary-foreground border-primary' : 'glass border-transparent hover:bg-accent',
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Receita total', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'from-emerald-600 to-teal-600', delta: '+12%', positive: true },
          { label: 'Pendente', value: `R$ ${pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Clock, color: 'from-yellow-600 to-orange-600', delta: `${pendingPayments.length} alunos`, positive: null },
          { label: 'Alunos ativos', value: students?.filter((s: any) => s.isActive).length ?? 0, icon: Users, color: 'from-purple-600 to-indigo-600', delta: `+${Math.floor(Math.random() * 3)}`, positive: true },
          { label: 'Ticket médio', value: `R$ ${Number(avgMonthly).toLocaleString('pt-BR')}`, icon: TrendingUp, color: 'from-cyan-600 to-blue-600', delta: '+5%', positive: true },
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
              <span className={cn(
                'text-xs flex items-center gap-0.5',
                card.positive === true ? 'text-emerald-400' : card.positive === false ? 'text-red-400' : 'text-muted-foreground',
              )}>
                {card.positive === true && <ArrowUpRight className="w-3 h-3" />}
                {card.delta}
              </span>
            </div>
            <div className="text-xl font-bold leading-tight">{card.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold">Receita Mensal</h2>
            <span className="text-xs text-muted-foreground">Último ano</span>
          </div>
          <RevenueChart />
        </motion.div>

        {/* Student fees */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card"
        >
          <h2 className="font-semibold mb-4">Mensalidades</h2>
          <div className="space-y-2">
            {(students || []).slice(0, 6).map((s: any, i: number) => (
              <div key={s.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent transition-all">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {s.user?.profile?.firstName?.[0]}{s.user?.profile?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.user?.profile?.firstName} {s.user?.profile?.lastName}</div>
                </div>
                <div className={cn('text-xs font-semibold', s.isActive ? 'text-emerald-400' : 'text-muted-foreground')}>
                  {s.monthlyFee ? `R$ ${s.monthlyFee}` : '—'}
                </div>
              </div>
            ))}
            {!students?.length && <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>}
          </div>
        </motion.div>
      </div>

      {/* Payment history */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">Histórico de Pagamentos</h2>
          <div className="flex gap-2">
            {['Todos', 'Pago', 'Pendente', 'Falhou'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'glass border-transparent hover:bg-accent',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {filteredPayments.length > 0 ? (
          <div className="space-y-2">
            {filteredPayments.map((payment: any, i: number) => {
              const status = STATUS_LABELS[payment.status] || STATUS_LABELS.PENDING;
              const StatusIcon = status.icon;
              return (
                <div key={payment.id || i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent transition-all">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{payment.description || 'Mensalidade'}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">
                      R$ {payment.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className={cn('text-xs flex items-center gap-1 justify-end', status.color)}>
                      <StatusIcon className="w-3 h-3" />{status.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Filter className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum pagamento encontrado</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function RevenueChart() {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const values = [3200, 3800, 4100, 3900, 4500, 4800, 4600, 5200, 5000, 5400, 5100, 5800];
  const max = Math.max(...values);
  const currentMonth = new Date().getMonth();

  return (
    <div>
      <div className="flex items-end gap-2 h-36">
        {months.map((m, i) => (
          <div key={m} className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(values[i] / max) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.04 }}
              className={cn(
                'w-full rounded-t-md',
                i === currentMonth
                  ? 'bg-gradient-to-t from-emerald-600 to-teal-500'
                  : 'bg-gradient-to-t from-purple-600/50 to-indigo-600/50',
              )}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        {months.map((m, i) => (
          <div key={m} className="flex-1 text-center text-[9px] text-muted-foreground">{m}</div>
        ))}
      </div>
    </div>
  );
}
