'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Trophy, Plus, Pencil, Trash2, X, RefreshCw,
  Users, Star, Calendar, Clock, Dumbbell, Flame,
  Target, Zap, DollarSign, ToggleLeft, ToggleRight, BookOpen,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const TYPES = [
  { value: 'workout', label: 'Treino', icon: Dumbbell },
  { value: 'streak',  label: 'Sequência', icon: Flame },
  { value: 'nutrition', label: 'Nutrição', icon: Target },
  { value: 'steps',   label: 'Passos', icon: Zap },
];

const TYPE_COLORS: Record<string, string> = {
  workout:   'from-purple-600 to-indigo-600',
  streak:    'from-orange-500 to-red-500',
  nutrition: 'from-emerald-600 to-teal-600',
  steps:     'from-cyan-500 to-blue-500',
};

const TYPE_ICONS: Record<string, any> = {
  workout: Dumbbell, streak: Flame, nutrition: Target, steps: Zap,
};

function today() { return new Date().toISOString().slice(0, 10); }
function inDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  title: '', description: '', type: 'workout',
  duration: 30, targetValue: '', points: 100, price: 0,
  coverUrl: '', startDate: today(), endDate: inDays(30),
};

export default function TrainerChallenges() {
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const qc = useQueryClient();

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['trainer-challenges'],
    queryFn: () => api.get('/challenges/trainer/mine').then((r) => r.data?.data ?? r.data),
  });

  const arr = Array.isArray(challenges) ? challenges : [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ['trainer-challenges'] });

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/challenges', body),
    onSuccess: () => { invalidate(); setModal(null); setForm({ ...EMPTY_FORM }); },
  });

  const editMut = useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/challenges/${id}`, body),
    onSuccess: () => { invalidate(); setModal(null); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/challenges/${id}`),
    onSuccess: () => { invalidate(); setDeleteId(null); },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: any) => api.patch(`/challenges/${id}`, { isActive }),
    onSuccess: invalidate,
  });

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setEditing(null);
    setModal('create');
  }

  function openEdit(c: any) {
    setEditing(c);
    setForm({
      title: c.title ?? '',
      description: c.description ?? '',
      type: c.type ?? 'workout',
      duration: c.duration ?? 30,
      targetValue: c.targetValue ?? '',
      points: c.points ?? 100,
      price: c.price ?? 0,
      coverUrl: c.coverUrl ?? '',
      startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0, 10) : today(),
      endDate: c.endDate ? new Date(c.endDate).toISOString().slice(0, 10) : inDays(30),
    });
    setModal('edit');
  }

  function submitForm() {
    const body: any = {
      ...form,
      duration: Number(form.duration),
      targetValue: form.targetValue ? Number(form.targetValue) : undefined,
      points: Number(form.points),
      price: Number(form.price),
    };
    if (modal === 'create') {
      createMut.mutate(body);
    } else if (editing) {
      editMut.mutate({ id: editing.id, ...body });
    }
  }

  const isSaving = createMut.isPending || editMut.isPending;
  const saveError = (createMut.error || editMut.error) as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Desafios</h1>
          <p className="text-muted-foreground text-sm mt-1">Crie desafios que seus alunos podem comprar e participar</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm py-2">
          <Plus className="w-4 h-4" /> Criar desafio
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total', value: arr.length, icon: Trophy, color: 'from-purple-600 to-indigo-600' },
          { label: 'Ativos', value: arr.filter((c: any) => c.isActive).length, icon: Zap, color: 'from-emerald-600 to-teal-600' },
          { label: 'Participantes', value: arr.reduce((s: number, c: any) => s + (c._count?.participants ?? 0), 0), icon: Users, color: 'from-cyan-600 to-blue-600' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="stat-card">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-2`}>
              <card.icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-xl font-bold">{card.value}</div>
            <div className="text-xs text-muted-foreground">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse h-48" />
          ))}
        </div>
      ) : arr.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhum desafio criado</h3>
          <p className="text-sm text-muted-foreground mb-5">Crie desafios para engajar seus alunos e gerar receita extra.</p>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Criar primeiro desafio
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {arr.map((c: any, i: number) => {
            const Icon = TYPE_ICONS[c.type] ?? Trophy;
            const color = TYPE_COLORS[c.type] ?? 'from-purple-600 to-indigo-600';
            const daysLeft = c.endDate
              ? Math.max(Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000), 0)
              : null;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={cn('glass-card flex flex-col gap-3', !c.isActive && 'opacity-60')}>
                {/* Cover / icon */}
                <div className={cn('w-full h-24 rounded-xl flex items-center justify-center bg-gradient-to-br', color, 'relative overflow-hidden')}>
                  {c.coverUrl ? (
                    <img src={c.coverUrl} alt="" className="w-full h-full object-cover absolute inset-0" />
                  ) : (
                    <Icon className="w-10 h-10 text-white/80" />
                  )}
                  {!c.isActive && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-xs text-white/70 font-medium">Inativo</span>
                    </div>
                  )}
                  {c.price > 0 && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-semibold">
                      R$ {Number(c.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  {c.price === 0 && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-600/80 text-white text-xs font-semibold">
                      Grátis
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold leading-tight mb-1 line-clamp-1">{c.title}</h3>
                  {c.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{c.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{c.points} pts</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.duration} dias</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c._count?.participants ?? 0} alunos</span>
                    {daysLeft !== null && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{daysLeft === 0 ? 'Encerrado' : `${daysLeft}d restantes`}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                  <button onClick={() => toggleMut.mutate({ id: c.id, isActive: !c.isActive })}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {c.isActive
                      ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                      : <ToggleLeft className="w-4 h-4" />}
                    {c.isActive ? 'Ativo' : 'Inativo'}
                  </button>
                  <div className="ml-auto flex gap-1 items-center">
                    <Link href={`/trainer/challenges/${c.id}`}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition-all flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" /> Aulas
                    </Link>
                    <button onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(c.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT ── */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && setModal(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-lg my-4">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold">{modal === 'create' ? 'Criar desafio' : 'Editar desafio'}</h3>
                <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-white/10 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Título *</label>
                  <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Ex: Desafio 30 dias de agachamento" className="input-field w-full" />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Descrição</label>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Descreva o desafio..." rows={2} className="input-field w-full resize-none" />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Tipo</label>
                  <div className="grid grid-cols-4 gap-2">
                    {TYPES.map((t) => (
                      <button key={t.value} onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                        className={cn('flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all',
                          form.type === t.value ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-muted-foreground hover:bg-accent')}>
                        <t.icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price + Points */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Preço (R$) — 0 = grátis</label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <input type="number" min="0" step="0.01" value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                        className="input-field flex-1" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Pontos</label>
                    <input type="number" min="0" value={form.points}
                      onChange={(e) => setForm((f) => ({ ...f, points: Number(e.target.value) }))}
                      className="input-field w-full" />
                  </div>
                </div>

                {/* Duration + Target */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Duração (dias)</label>
                    <input type="number" min="1" value={form.duration}
                      onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                      className="input-field w-full" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Meta (ex: 100 treinos)</label>
                    <input type="number" min="0" value={form.targetValue}
                      onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
                      placeholder="Opcional"
                      className="input-field w-full" />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Início</label>
                    <input type="date" value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                      className="input-field w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Encerramento</label>
                    <input type="date" value={form.endDate}
                      onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                      className="input-field w-full text-sm" />
                  </div>
                </div>

                {/* Cover URL */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">URL da imagem de capa (opcional)</label>
                  <input type="text" value={form.coverUrl}
                    onChange={(e) => setForm((f) => ({ ...f, coverUrl: e.target.value }))}
                    placeholder="https://..."
                    className="input-field w-full text-sm font-mono" />
                </div>

                {saveError && (
                  <p className="text-xs text-red-400">{saveError?.message ?? 'Erro ao salvar'}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancelar</button>
                  <button onClick={submitForm} disabled={isSaving || !form.title}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    {modal === 'create' ? 'Criar desafio' : 'Salvar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: DELETE ── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setDeleteId(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-xs text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-semibold mb-1">Excluir desafio?</h3>
              <p className="text-sm text-muted-foreground mb-5">Todos os participantes serão removidos. Ação irreversível.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={() => deleteMut.mutate(deleteId)} disabled={deleteMut.isPending}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm font-medium transition-all flex items-center justify-center gap-2">
                  {deleteMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
