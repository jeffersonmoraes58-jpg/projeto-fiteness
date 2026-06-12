'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ChevronLeft, Flame, Dumbbell, Star, Calendar,
  MessageCircle, UserCheck, CheckSquare, Square, Trash2,
  Clock, Zap, ChevronRight, ClipboardList, TrendingUp,
  Heart, Activity, Moon, Brain, Target, Info,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Perda de peso', GAIN_MUSCLE: 'Ganho muscular',
  MAINTAIN_WEIGHT: 'Manutenção', IMPROVE_ENDURANCE: 'Resistência',
  INCREASE_FLEXIBILITY: 'Flexibilidade', ATHLETIC_PERFORMANCE: 'Performance',
  REHABILITATION: 'Reabilitação',
};

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS = DAY_NAMES.map((label, value) => ({ label, value }));
const LEVEL_LABELS = ['', 'Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Elite'];
const TABS = [
  { id: 'treinos', label: 'Treinos', icon: Dumbbell },
  { id: 'anamnese', label: 'Anamnese', icon: ClipboardList },
  { id: 'evolucao', label: 'Evolução', icon: TrendingUp },
];

function AnamneseField({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) {
  if (value === null || value === undefined || value === '') return null;
  const display = typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : String(value);
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div className="text-sm font-medium">{display}</div>
      </div>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState('treinos');
  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [assignError, setAssignError] = useState('');

  const { data: students, isLoading } = useQuery({
    queryKey: ['trainer-students'],
    queryFn: () => api.get('/trainers/me/students').then((r) => r.data.data),
  });

  const { data: workouts } = useQuery({
    queryKey: ['workouts-list'],
    queryFn: () => api.get('/workouts').then((r) => r.data.data || []),
  });

  const student = students?.find((s: any) => s.id === id);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['student-plans', id],
    queryFn: () => api.get(`/workouts/student/${id}`).then((r) => r.data.data || []),
    enabled: !!id,
  });

  const { data: measurements } = useQuery({
    queryKey: ['student-measurements', id],
    queryFn: () =>
      api.get(`/progress/trainer/student/${student?.userId}/measurements`).then((r) => r.data.data || []).catch(() => []),
    enabled: !!student?.userId,
  });

  const assignMutation = useMutation({
    mutationFn: (data: any) =>
      api.post(`/workouts/${data.workoutId}/assign`, {
        studentId: student?.id,
        dayOfWeek: data.dayOfWeek,
        startDate: data.startDate,
        endDate: data.endDate || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      setSelectedWorkout(''); setDayOfWeek([]); setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(''); setNotes(''); setAssignError('');
      qc.invalidateQueries({ queryKey: ['student-plans', id] });
      toast.success('Treino atribuído com sucesso!');
    },
    onError: (e: any) => {
      const msg = e.message || e.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao atribuir treino');
      setAssignError(text);
      toast.error(text);
    },
  });

  const removePlanMutation = useMutation({
    mutationFn: (planId: string) => api.delete(`/workouts/plans/${planId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-plans', id] });
      toast.success('Plano removido');
    },
    onError: () => toast.error('Erro ao remover plano'),
  });

  const toggleDay = (v: number) =>
    setDayOfWeek((prev) => (prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v]));

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkout) { setAssignError('Selecione um treino'); return; }
    if (dayOfWeek.length === 0) { setAssignError('Selecione ao menos um dia da semana'); return; }
    if (!startDate) { setAssignError('Informe a data de início'); return; }
    setAssignError('');
    assignMutation.mutate({ workoutId: selectedWorkout, dayOfWeek, startDate, endDate, notes });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="glass-card animate-pulse h-32" />)}
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-2xl mx-auto glass-card flex flex-col items-center justify-center py-16 text-center">
        <Users className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="font-semibold mb-2">Aluno não encontrado</h2>
        <Link href="/trainer/students" className="btn-secondary text-sm">Voltar</Link>
      </div>
    );
  }

  const initials = `${student.user?.profile?.firstName?.[0] || ''}${student.user?.profile?.lastName?.[0] || ''}`;
  const dayToPlan: Record<number, any[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  (plans || []).forEach((plan: any) => {
    (plan.dayOfWeek || []).forEach((d: number) => { dayToPlan[d] = [...(dayToPlan[d] || []), plan]; });
  });
  const hasAnyPlan = Object.values(dayToPlan).some((arr) => arr.length > 0);
  const anamnesis = student.anamnesis;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/trainer/students" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold">Perfil do Aluno</h1>
      </div>

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {student.user?.profile?.avatarUrl
              ? <img src={student.user.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              : initials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{student.user?.profile?.firstName} {student.user?.profile?.lastName}</h2>
            <p className="text-sm text-muted-foreground">{student.user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${student.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                {student.isActive ? 'Ativo' : 'Inativo'}
              </span>
              {anamnesis && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                  Anamnese preenchida
                </span>
              )}
            </div>
          </div>
          <Link href="/trainer/chat" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Sequência', value: `${student.streak || 0}d`, icon: Flame, color: 'text-orange-400' },
            { label: 'Nível', value: student.level || 1, icon: Star, color: 'text-yellow-400' },
            { label: 'Pontos', value: student.points || 0, icon: Dumbbell, color: 'text-purple-400' },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-3 text-center">
              <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
              <div className="font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="glass rounded-2xl p-1 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.id === 'anamnese' && anamnesis && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-0.5" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* TAB: TREINOS */}
        {tab === 'treinos' && (
          <motion.div key="treinos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="space-y-6">
            {/* Weekly schedule */}
            <div className="glass-card space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Grade semanal de treinos
              </h2>
              {plansLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 glass rounded-xl animate-pulse" />)}</div>
              ) : !hasAnyPlan ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum treino atribuído ainda.</p>
                  <p className="text-xs mt-1">Use o formulário abaixo para montar a grade.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {DAYS.map(({ label, value }) => {
                    const dayPlans = dayToPlan[value];
                    const isToday = new Date().getDay() === value;
                    return (
                      <div key={value} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all ${isToday ? 'bg-primary/10 border border-primary/20' : 'glass'}`}>
                        <div className={`w-8 text-center flex-shrink-0 pt-0.5 ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                          <div className="text-xs font-semibold">{label}</div>
                          {isToday && <div className="text-[9px] text-primary">hoje</div>}
                        </div>
                        {dayPlans.length === 0 ? (
                          <div className="flex-1 text-xs text-muted-foreground italic pt-0.5">Descanso</div>
                        ) : (
                          <div className="flex-1 flex flex-col gap-1.5">
                            {dayPlans.map((plan: any) => (
                              <div key={plan.id} className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                  <Dumbbell className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                  <div>
                                    <span className="text-sm font-medium">{plan.workout?.name}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {plan.workout?.duration && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{plan.workout.duration}min</span>}
                                      {plan.workout?.level && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />{LEVEL_LABELS[plan.workout.level] || ''}</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Link href={`/trainer/workouts/${plan.workout?.id}`} className="w-6 h-6 rounded-lg hover:bg-accent flex items-center justify-center">
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                  </Link>
                                  <button onClick={() => { if (confirm('Remover este plano?')) removePlanMutation.mutate(plan.id); }} className="w-6 h-6 rounded-lg hover:bg-red-500/10 flex items-center justify-center">
                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {(plans || []).length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Planos ativos ({plans.length})</p>
                  <div className="space-y-2">
                    {plans.map((plan: any) => (
                      <div key={plan.id} className="glass rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{plan.workout?.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {(plan.dayOfWeek || []).map((d: number) => DAY_NAMES[d]).join(', ')}
                            {plan.notes && ` • ${plan.notes}`}
                          </div>
                        </div>
                        <button onClick={() => { if (confirm('Remover este plano?')) removePlanMutation.mutate(plan.id); }} className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center flex-shrink-0 ml-3">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Assign form */}
            <form onSubmit={handleAssign} className="glass-card space-y-5">
              <h2 className="font-semibold flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" />
                Adicionar treino à grade
              </h2>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Treino *</label>
                <select value={selectedWorkout} onChange={(e) => setSelectedWorkout(e.target.value)} className="input-field">
                  <option value="">Selecione um treino...</option>
                  {(workouts || []).map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}{w.duration ? ` — ${w.duration} min` : ''}{w.exercises?.length ? ` (${w.exercises.length} ex)` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Dias da semana *</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((d) => {
                    const active = dayOfWeek.includes(d.value);
                    return (
                      <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                        className={`w-11 h-11 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${active ? 'bg-primary text-primary-foreground' : 'glass hover:bg-accent text-muted-foreground'}`}>
                        {active ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Data de início *</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Data de término</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" min={startDate} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Observações</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Foco em progressão de carga" className="input-field" />
              </div>
              {assignError && <div className="glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">{assignError}</div>}
              <button type="submit" disabled={assignMutation.isPending} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                <UserCheck className="w-4 h-4" />
                {assignMutation.isPending ? 'Atribuindo...' : 'Adicionar à grade'}
              </button>
            </form>
          </motion.div>
        )}

        {/* TAB: ANAMNESE */}
        {tab === 'anamnese' && (
          <motion.div key="anamnese" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="glass-card">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <ClipboardList className="w-4 h-4 text-blue-400" />
              Anamnese do aluno
            </h2>
            {!anamnesis ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Anamnese não preenchida</p>
                <p className="text-xs mt-1 max-w-xs mx-auto">O aluno ainda não respondeu a anamnese. Envie o link novamente pelo cadastro.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {anamnesis.completedAt && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Preenchida em {new Date(anamnesis.completedAt).toLocaleDateString('pt-BR')}
                  </p>
                )}
                <AnamneseField label="Pratica atividade física" value={anamnesis.practicesExercise} icon={Activity} />
                <AnamneseField label="Frequência de exercício" value={anamnesis.exerciseFrequency} icon={Calendar} />
                <AnamneseField label="Lesões anteriores" value={anamnesis.previousInjuries} icon={Info} />
                <AnamneseField label="Cirurgias" value={anamnesis.surgeries} icon={Info} />
                <AnamneseField label="Problemas cardiovasculares" value={anamnesis.cardiovascularIssues} icon={Heart} />
                <AnamneseField label="Pressão arterial" value={anamnesis.bloodPressure} icon={Activity} />
                <AnamneseField label="Colesterol" value={anamnesis.cholesterol} icon={Activity} />
                <AnamneseField label="Diabetes" value={anamnesis.diabetes} icon={Info} />
                <AnamneseField label="Fumante" value={anamnesis.smoking} icon={Info} />
                <AnamneseField label="Consumo de álcool" value={anamnesis.alcohol} icon={Info} />
                <AnamneseField label="Horas de sono" value={anamnesis.sleepHours ? `${anamnesis.sleepHours}h por noite` : null} icon={Moon} />
                <AnamneseField label="Nível de estresse" value={anamnesis.stressLevel ? `${anamnesis.stressLevel}/10` : null} icon={Brain} />
                <AnamneseField label="Objetivo principal" value={anamnesis.mainGoal} icon={Target} />
                <AnamneseField label="Observações" value={anamnesis.observations} icon={Info} />
              </div>
            )}
          </motion.div>
        )}

        {/* TAB: EVOLUÇÃO */}
        {tab === 'evolucao' && (
          <motion.div key="evolucao" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="space-y-4">
            <div className="glass-card">
              <h2 className="font-semibold flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Evolução e medidas
              </h2>
              {!measurements || (measurements as any[]).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Sem registros de evolução</p>
                  <p className="text-xs mt-1 max-w-xs mx-auto">As medidas corporais e fotos de progresso aparecerão aqui conforme o aluno for registrando.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(measurements as any[]).slice(0, 10).map((m: any) => (
                    <div key={m.id} className="glass rounded-xl p-3">
                      <div className="text-xs text-muted-foreground mb-2">{new Date(m.measuredAt).toLocaleDateString('pt-BR')}</div>
                      <div className="grid grid-cols-3 gap-2">
                        {m.weight && <div className="text-center"><div className="text-sm font-bold">{m.weight}kg</div><div className="text-xs text-muted-foreground">Peso</div></div>}
                        {m.bodyFat && <div className="text-center"><div className="text-sm font-bold">{m.bodyFat}%</div><div className="text-xs text-muted-foreground">Gordura</div></div>}
                        {m.muscleMass && <div className="text-center"><div className="text-sm font-bold">{m.muscleMass}kg</div><div className="text-xs text-muted-foreground">Massa muscular</div></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
