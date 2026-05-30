'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Trophy, Clock, Users, Zap, Dumbbell,
  Flame, Target, CheckCircle2, ArrowRight, Calendar,
  X, RefreshCw, CreditCard, QrCode, ShoppingBag,
  Lock, DollarSign, Play,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const TABS = ['Marketplace', 'Meus desafios', 'Concluídos'];

const CHALLENGE_ICONS: Record<string, any> = {
  workout: Dumbbell, streak: Flame, nutrition: Target, steps: Zap, default: Trophy,
};

const CHALLENGE_COLORS = [
  'from-purple-600 to-indigo-600',
  'from-cyan-600 to-blue-600',
  'from-emerald-600 to-teal-600',
  'from-orange-600 to-red-600',
  'from-pink-600 to-rose-600',
];

export default function StudentChallenges() {
  const [tab, setTab] = useState(0);
  const [payModal, setPayModal] = useState<any | null>(null);
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string; amount: number } | null>(null);
  const qc = useQueryClient();

  const { data: available = [] } = useQuery({
    queryKey: ['challenges-available'],
    queryFn: () => api.get('/challenges/available').then((r) => r.data?.data ?? r.data),
  });

  const { data: active = [] } = useQuery({
    queryKey: ['challenges-active'],
    queryFn: () => api.get('/challenges/active').then((r) => r.data?.data ?? r.data),
  });

  const { data: done = [] } = useQuery({
    queryKey: ['challenges-completed'],
    queryFn: () => api.get('/challenges/completed').then((r) => r.data?.data ?? r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['challenges-available'] });
    qc.invalidateQueries({ queryKey: ['challenges-active'] });
  };

  const joinMut = useMutation({
    mutationFn: (id: string) => api.post(`/challenges/${id}/join`),
    onSuccess: invalidate,
  });

  const pixMut = useMutation({
    mutationFn: (id: string) => api.post(`/challenges/${id}/purchase/pix`).then((r) => r.data?.data ?? r.data),
    onSuccess: (data) => setPixData(data),
  });

  const checkoutMut = useMutation({
    mutationFn: (id: string) => api.post(`/challenges/${id}/purchase/checkout`).then((r) => r.data?.data ?? r.data),
    onSuccess: (data) => { if (data?.checkoutUrl) window.open(data.checkoutUrl, '_blank'); },
  });

  const availableArr = Array.isArray(available) ? available : [];
  const activeArr = Array.isArray(active) ? active : [];
  const doneArr = Array.isArray(done) ? done : [];

  const lists = [availableArr, activeArr, doneArr];
  const totalPts = doneArr.reduce((s: number, c: any) => s + (c.challenge?.points ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Desafios</h1>
        <p className="text-muted-foreground text-sm mt-1">Participe de desafios, evolua e ganhe pontos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ativos', value: activeArr.length, icon: Zap, color: 'from-purple-500 to-indigo-500' },
          { label: 'Concluídos', value: doneArr.length, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
          { label: 'Pts ganhos', value: totalPts, icon: Star, color: 'from-yellow-500 to-orange-500' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-2xl p-1">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={cn('flex-1 py-2 rounded-xl text-sm font-medium transition-all',
              tab === i ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {t}
            {i > 0 && lists[i].length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({lists[i].length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={cn(tab === 0 ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4')}>
        {lists[tab].length > 0 ? (
          lists[tab].map((item: any, i: number) => {
            const challenge = tab === 0 ? item : item.challenge;
            if (!challenge) return null;
            return (
              <ChallengeCard
                key={item.id ?? challenge.id}
                challenge={challenge}
                studentChallenge={tab > 0 ? item : null}
                index={i}
                isGrid={tab === 0}
                onJoin={tab === 0 ? () => {
                  if (challenge.price > 0) {
                    setPayModal(challenge);
                    setPixData(null);
                  } else {
                    joinMut.mutate(challenge.id);
                  }
                } : undefined}
                isJoining={joinMut.isPending && joinMut.variables === challenge.id}
                onPay={tab > 0 && !item.isPaid ? () => { setPayModal(challenge); setPixData(null); } : undefined}
              />
            );
          })
        ) : (
          <div className={cn('glass-card flex flex-col items-center justify-center py-16 text-center', tab === 0 && 'col-span-full')}>
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">
              {tab === 0 ? 'Nenhum desafio disponível' : tab === 1 ? 'Nenhum desafio ativo' : 'Nenhum desafio concluído'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tab === 0 ? 'Novos desafios serão adicionados em breve.' : 'Participe de desafios para vê-los aqui.'}
            </p>
          </div>
        )}
      </div>

      {/* ── MODAL: PAGAMENTO ── */}
      <AnimatePresence>
        {payModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setPayModal(null); setPixData(null); } }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-sm">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold">Comprar desafio</h3>
                <button onClick={() => { setPayModal(null); setPixData(null); }}
                  className="p-1 rounded-lg hover:bg-white/10 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-1">{payModal.title}</p>

              <div className="flex items-center justify-center gap-2 py-3 mb-4 rounded-xl bg-white/5">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span className="text-2xl font-bold">
                  R$ {Number(payModal.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Pix QR shown after request */}
              {pixData ? (
                <div className="space-y-3">
                  <p className="text-xs text-center text-muted-foreground">Escaneie o QR Code ou copie o código Pix</p>
                  {pixData.qrCodeBase64 && (
                    <div className="flex justify-center">
                      <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="QR Code Pix" className="w-48 h-48 rounded-xl" />
                    </div>
                  )}
                  {pixData.qrCode && (
                    <button
                      onClick={() => navigator.clipboard.writeText(pixData.qrCode)}
                      className="w-full text-xs font-mono bg-white/5 rounded-xl p-3 text-left truncate hover:bg-white/10 transition-all">
                      {pixData.qrCode}
                    </button>
                  )}
                  <p className="text-xs text-center text-muted-foreground">
                    Após o pagamento confirmado, o desafio aparece em "Meus desafios".
                  </p>
                  <button onClick={() => { setPayModal(null); setPixData(null); invalidate(); }}
                    className="btn-secondary w-full text-sm">Fechar</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => pixMut.mutate(payModal.id)}
                    disabled={pixMut.isPending}
                    className="w-full py-3 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-all flex items-center justify-center gap-2 font-medium text-sm">
                    {pixMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                    Pagar com Pix
                  </button>
                  <button
                    onClick={() => checkoutMut.mutate(payModal.id)}
                    disabled={checkoutMut.isPending}
                    className="w-full py-3 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-all flex items-center justify-center gap-2 font-medium text-sm">
                    {checkoutMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    Cartão de Crédito
                  </button>
                  {(pixMut.isError || checkoutMut.isError) && (
                    <p className="text-xs text-red-400 text-center">
                      {((pixMut.error || checkoutMut.error) as any)?.message ?? 'Erro ao processar pagamento'}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChallengeCard({
  challenge, studentChallenge, index, isGrid, onJoin, isJoining, onPay,
}: {
  challenge: any;
  studentChallenge: any;
  index: number;
  isGrid?: boolean;
  onJoin?: () => void;
  isJoining?: boolean;
  onPay?: () => void;
}) {
  const Icon = CHALLENGE_ICONS[challenge.type] ?? CHALLENGE_ICONS.default;
  const color = CHALLENGE_COLORS[index % CHALLENGE_COLORS.length];
  const progress = studentChallenge?.progress ?? 0;
  const isCompleted = studentChallenge?.isCompleted;
  const isPaid = studentChallenge?.isPaid ?? (challenge.price === 0);

  const daysLeft = challenge.endDate
    ? Math.max(Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / 86400000), 0)
    : null;

  if (isGrid) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
        className="glass-card flex flex-col gap-3">
        {/* Cover */}
        <div className={cn('w-full h-28 rounded-xl flex items-center justify-center bg-gradient-to-br relative overflow-hidden', color)}>
          {challenge.coverUrl ? (
            <img src={challenge.coverUrl} alt="" className="w-full h-full object-cover absolute inset-0" />
          ) : (
            <Icon className="w-10 h-10 text-white/80" />
          )}
          {challenge.price > 0 ? (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-semibold flex items-center gap-1">
              <ShoppingBag className="w-3 h-3" />
              R$ {Number(challenge.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          ) : (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-600/80 text-white text-xs font-semibold">
              Grátis
            </span>
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-semibold leading-tight mb-1 line-clamp-1">{challenge.title}</h3>
          {challenge.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{challenge.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{challenge.points} pts</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{challenge.duration}d</span>
            {daysLeft !== null && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />
                {daysLeft === 0 ? 'Último dia' : `${daysLeft}d restam`}
              </span>
            )}
          </div>
        </div>

        {onJoin && (
          <button onClick={onJoin} disabled={isJoining}
            className={cn('w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all',
              challenge.price > 0
                ? 'bg-primary/20 text-primary hover:bg-primary/30'
                : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30')}>
            {isJoining ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : (
              challenge.price > 0
                ? <><ShoppingBag className="w-3.5 h-3.5" /> Comprar</>
                : <><ArrowRight className="w-3.5 h-3.5" /> Participar</>
            )}
          </button>
        )}
      </motion.div>
    );
  }

  // List view (Meus desafios / Concluídos)
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className={cn('glass-card', isCompleted && 'border border-emerald-600/20')}>
      <div className="flex items-start gap-4">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
          isCompleted ? 'bg-emerald-600/20' : `bg-gradient-to-br ${color}`)}>
          {isCompleted
            ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            : !isPaid
              ? <Lock className="w-6 h-6 text-white/60" />
              : <Icon className="w-6 h-6 text-white" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold leading-tight">{challenge.title}</h3>
            {isCompleted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 flex-shrink-0">Concluído</span>
            )}
            {!isPaid && !isCompleted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 flex-shrink-0">Aguardando pagamento</span>
            )}
          </div>
          {challenge.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{challenge.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{challenge.points} pts</span>
            {daysLeft !== null && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />
                {daysLeft === 0 ? 'Último dia!' : `${daysLeft} dias restantes`}
              </span>
            )}
          </div>
          {isPaid && challenge.targetValue && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className={cn('h-full rounded-full', isCompleted ? 'bg-emerald-500' : `bg-gradient-to-r ${color}`)}
                />
              </div>
            </div>
          )}
          {!isPaid && !isCompleted && onPay && (
            <div className="mt-3">
              <button
                onClick={onPay}
                className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all flex items-center gap-1.5 w-fit">
                <CreditCard className="w-3.5 h-3.5" />
                Retomar pagamento
              </button>
            </div>
          )}
          {isPaid && (
            <div className="mt-3">
              <Link
                href={`/student/challenges/${challenge.id}`}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 w-fit"
              >
                <Play className="w-3.5 h-3.5" />
                Acessar conteúdo
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
