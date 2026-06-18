'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ChevronLeft, Flame, Dumbbell, Star, Calendar,
  MessageCircle, UserCheck, Trash2,
  Clock, Zap, ChevronRight, ClipboardList, TrendingUp,
  Heart, Activity, Moon, Brain, Target, Info,
  Plus, X, Search, Pencil, Scale, Save,
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
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [assignError, setAssignError] = useState('');
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [showAssessForm, setShowAssessForm] = useState(false);
  const EMPTY_ASSESS = { weight: '', height: '', bodyFatPercent: '', muscleMassKg: '', waistCm: '', hipCm: '', chestCm: '', rightArmCm: '', rightThighCm: '' };
  const [assessForm, setAssessForm] = useState({ ...EMPTY_ASSESS });

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

  const { data: studentProgress, refetch: refetchProgress } = useQuery({
    queryKey: ['student-progress-trainer', student?.userId],
    queryFn: () =>
      api.get(`/progress/trainer/student/${student?.userId}/measurements`).then((r) => r.data.data ?? { measurements: [], assessments: [], photos: [] }),
    enabled: !!student?.userId,
  });

  const measurements = studentProgress?.measurements ?? [];
  const physicalAssessments = studentProgress?.assessments ?? [];
  const progressPhotos = studentProgress?.photos ?? [];

  const assessMutation = useMutation({
    mutationFn: (data: any) => api.post('/progress/assessments', data),
    onSuccess: () => {
      refetchProgress();
      setShowAssessForm(false);
      setAssessForm({ ...EMPTY_ASSESS });
      toast.success('Avaliação registrada!');
    },
    onError: () => toast.error('Erro ao salvar avaliação'),
  });

  function handleAssessSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assessForm.weight || !assessForm.height) {
      toast.error('Peso e altura são obrigatórios');
      return;
    }
    const w = Number(assessForm.weight);
    const h = Number(assessForm.height);
    const bmi = Number((w / ((h / 100) ** 2)).toFixed(1));
    const num = (v: string) => (v !== '' ? Number(v) : undefined);
    assessMutation.mutate({
      studentUserId: student!.userId,
      weight: w,
      height: h,
      bmi,
      bodyFatPercent: num(assessForm.bodyFatPercent),
      muscleMassKg: num(assessForm.muscleMassKg),
      waistCm: num(assessForm.waistCm),
      hipCm: num(assessForm.hipCm),
      chestCm: num(assessForm.chestCm),
      rightArmCm: num(assessForm.rightArmCm),
      rightThighCm: num(assessForm.rightThighCm),
    });
  }

  const assignMutation = useMutation({
    mutationFn: (data: any) =>
      api.post(`/workouts/${data.workoutId}/assign`, {
        studentId: student?.id,
        startDate: data.startDate,
        endDate: data.endDate || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      setSelectedWorkout(''); setStartDate(new Date().toISOString().split('T')[0]);
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

  const updatePlanMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: any }) =>
      api.patch(`/workouts/plans/${planId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-plans', id] });
      setEditingPlan(null);
      toast.success('Plano atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar plano'),
  });

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkout) { setAssignError('Selecione um treino'); return; }
    if (!startDate) { setAssignError('Informe a data de início'); return; }
    setAssignError('');
    assignMutation.mutate({ workoutId: selectedWorkout, startDate, endDate, notes });
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
          <div className="flex items-center gap-2">
            {(() => {
              const rawPhone = student.user?.profile?.phone?.replace(/\D/g, '');
              if (!rawPhone) return null;
              const phone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
              return (
                <a
                  href={`https://wa.me/${phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="WhatsApp do aluno"
                  className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/20 transition-all"
                >
                  <WhatsAppIcon className="w-4 h-4 text-emerald-400" />
                </a>
              );
            })()}
            <Link href="/trainer/chat" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
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
            {/* Plans list */}
            <div className="glass-card space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-purple-400" />
                Treinos atribuídos
                {(plans || []).length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground font-normal">{plans.length} plano{plans.length !== 1 ? 's' : ''}</span>
                )}
              </h2>
              {plansLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 glass rounded-xl animate-pulse" />)}</div>
              ) : (plans || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum treino atribuído ainda.</p>
                  <p className="text-xs mt-1">Use o formulário abaixo para atribuir treinos.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(plans || []).map((plan: any) => (
                    <div key={plan.id} className="glass rounded-xl overflow-hidden">
                      <div className="p-3 flex items-center gap-3">
                        <Dumbbell className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{plan.workout?.name}</div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            {plan.workout?.duration && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{plan.workout.duration}min</span>}
                            {plan.workout?.level && <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />{LEVEL_LABELS[plan.workout.level] || ''}</span>}
                            {plan.notes && <span>• {plan.notes}</span>}
                            {plan.division && <span>• {plan.division}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => setEditingPlan(editingPlan?.id === plan.id ? null : plan)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${editingPlan?.id === plan.id ? 'bg-primary/20 text-primary' : 'hover:bg-accent text-muted-foreground'}`}
                          title="Editar atribuição"
                        >
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${editingPlan?.id === plan.id ? 'rotate-90' : ''}`} />
                        </button>
                        <button onClick={() => { if (confirm('Remover este plano?')) removePlanMutation.mutate(plan.id); }} className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>

                      {editingPlan?.id === plan.id && (
                        <PlanEditForm
                          plan={plan}
                          isPending={updatePlanMutation.isPending}
                          onSave={(data) => updatePlanMutation.mutate({ planId: plan.id, data })}
                          onCancel={() => setEditingPlan(null)}
                          onPlansChange={() => qc.invalidateQueries({ queryKey: ['student-plans', id] })}
                        />
                      )}
                    </div>
                  ))}
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

            {/* Assessment form */}
            {showAssessForm && (
              <form onSubmit={handleAssessSubmit} className="glass-card border border-primary/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    Nova Avaliação Física
                  </h2>
                  <button type="button" onClick={() => setShowAssessForm(false)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Peso (kg) *</label>
                    <input type="number" step="0.1" min="1" value={assessForm.weight} onChange={(e) => setAssessForm({ ...assessForm, weight: e.target.value })} className="input-field text-sm py-1.5" placeholder="Ex: 75.5" required />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Altura (cm) *</label>
                    <input type="number" step="0.1" min="100" value={assessForm.height} onChange={(e) => setAssessForm({ ...assessForm, height: e.target.value })} className="input-field text-sm py-1.5" placeholder="Ex: 175" required />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Gordura (%)</label>
                    <input type="number" step="0.1" min="0" value={assessForm.bodyFatPercent} onChange={(e) => setAssessForm({ ...assessForm, bodyFatPercent: e.target.value })} className="input-field text-sm py-1.5" placeholder="Ex: 18.5" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Massa muscular (kg)</label>
                    <input type="number" step="0.1" min="0" value={assessForm.muscleMassKg} onChange={(e) => setAssessForm({ ...assessForm, muscleMassKg: e.target.value })} className="input-field text-sm py-1.5" placeholder="Ex: 35" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Cintura (cm)</label>
                    <input type="number" step="0.1" min="0" value={assessForm.waistCm} onChange={(e) => setAssessForm({ ...assessForm, waistCm: e.target.value })} className="input-field text-sm py-1.5" placeholder="Ex: 82" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Quadril (cm)</label>
                    <input type="number" step="0.1" min="0" value={assessForm.hipCm} onChange={(e) => setAssessForm({ ...assessForm, hipCm: e.target.value })} className="input-field text-sm py-1.5" placeholder="Ex: 95" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Peito (cm)</label>
                    <input type="number" step="0.1" min="0" value={assessForm.chestCm} onChange={(e) => setAssessForm({ ...assessForm, chestCm: e.target.value })} className="input-field text-sm py-1.5" placeholder="Ex: 100" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Braço D. (cm)</label>
                    <input type="number" step="0.1" min="0" value={assessForm.rightArmCm} onChange={(e) => setAssessForm({ ...assessForm, rightArmCm: e.target.value })} className="input-field text-sm py-1.5" placeholder="Ex: 35" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Coxa D. (cm)</label>
                    <input type="number" step="0.1" min="0" value={assessForm.rightThighCm} onChange={(e) => setAssessForm({ ...assessForm, rightThighCm: e.target.value })} className="input-field text-sm py-1.5" placeholder="Ex: 55" />
                  </div>
                  {assessForm.weight && assessForm.height && (
                    <div className="col-span-2 glass rounded-xl p-3 text-sm">
                      <span className="text-muted-foreground">IMC calculado: </span>
                      <span className="font-bold text-primary">
                        {(Number(assessForm.weight) / ((Number(assessForm.height) / 100) ** 2)).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAssessForm(false)} className="btn-secondary flex-1 text-sm py-2">Cancelar</button>
                  <button type="submit" disabled={assessMutation.isPending} className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-2 disabled:opacity-50">
                    <Save className="w-4 h-4" />
                    {assessMutation.isPending ? 'Salvando...' : 'Salvar avaliação'}
                  </button>
                </div>
              </form>
            )}

            {/* Physical assessments */}
            <div className="glass-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  Avaliações físicas
                </h2>
                {!showAssessForm && (
                  <button
                    onClick={() => setShowAssessForm(true)}
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Nova avaliação
                  </button>
                )}
              </div>
              {physicalAssessments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Scale className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma avaliação registrada ainda.</p>
                  <button onClick={() => setShowAssessForm(true)} className="text-xs text-primary hover:underline mt-1">
                    + Adicionar primeira avaliação
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {physicalAssessments.map((a: any, i: number) => (
                    <div key={a.id} className="glass rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{new Date(a.assessedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        {i === 0 && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">Atual</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center"><div className="text-sm font-bold">{a.weight}kg</div><div className="text-xs text-muted-foreground">Peso</div></div>
                        <div className="text-center"><div className="text-sm font-bold">{a.bmi}</div><div className="text-xs text-muted-foreground">IMC</div></div>
                        {a.bodyFatPercent && <div className="text-center"><div className="text-sm font-bold">{a.bodyFatPercent}%</div><div className="text-xs text-muted-foreground">Gordura</div></div>}
                        {a.muscleMassKg && <div className="text-center"><div className="text-sm font-bold">{a.muscleMassKg}kg</div><div className="text-xs text-muted-foreground">Músculo</div></div>}
                        {a.waistCm && <div className="text-center"><div className="text-sm font-bold">{a.waistCm}cm</div><div className="text-xs text-muted-foreground">Cintura</div></div>}
                        {a.hipCm && <div className="text-center"><div className="text-sm font-bold">{a.hipCm}cm</div><div className="text-xs text-muted-foreground">Quadril</div></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Body measurements (student self-logged) */}
            <div className="glass-card">
              <h2 className="font-semibold flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Medidas registradas pelo aluno
              </h2>
              {measurements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">O aluno ainda não registrou medidas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {measurements.slice(0, 10).map((m: any) => (
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

function PlanEditForm({ plan, isPending, onSave, onCancel, onPlansChange }: {
  plan: any;
  isPending: boolean;
  onSave: (data: any) => void;
  onCancel: () => void;
  onPlansChange: () => void;
}) {
  const [notes, setNotes] = useState(plan.notes || '');
  const [division, setDivision] = useState(plan.division || '');
  const [startDate, setStartDate] = useState(
    plan.startDate ? new Date(plan.startDate).toISOString().split('T')[0] : '',
  );
  const [endDate, setEndDate] = useState(
    plan.endDate ? new Date(plan.endDate).toISOString().split('T')[0] : '',
  );

  // Exercise editor state
  const [exMode, setExMode] = useState(false);
  const [workoutId, setWorkoutId] = useState<string>(plan.workoutId);
  const [exercises, setExercises] = useState<any[]>([]);
  const [exSearch, setExSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingEx, setSavingEx] = useState(false);
  const [forking, setForking] = useState(false);

  async function openExercises() {
    if (exMode) { setExMode(false); return; }
    if (exercises.length > 0) { setExMode(true); return; }
    setForking(true);
    try {
      const res = await api.post(`/workouts/plans/${plan.id}/fork`);
      const data = res.data?.data ?? res.data;
      setWorkoutId(data.workoutId);
      setExercises((data.workout?.exercises || []).map(toExRow));
      setExMode(true);
      if (data.forked) onPlansChange();
    } catch {
      toast.error('Erro ao carregar exercícios');
    } finally {
      setForking(false);
    }
  }

  async function searchExercises(q: string) {
    setExSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/exercises?search=${encodeURIComponent(q)}`);
      setSearchResults((res.data?.data ?? res.data ?? []).slice(0, 6));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }

  function addExercise(ex: any) {
    setExercises((prev) => [
      ...prev,
      { _key: ex.id + Date.now(), exerciseId: ex.id, name: ex.name, sets: 3, reps: '10', weight: '', restSeconds: 60, notes: '' },
    ]);
    setExSearch('');
    setSearchResults([]);
  }

  function removeExercise(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateExField(idx: number, field: string, value: any) {
    setExercises((prev) => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  }

  async function saveExercises() {
    setSavingEx(true);
    try {
      await api.patch(`/workouts/${workoutId}`, {
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: Number(ex.sets) || 1,
          reps: ex.reps || null,
          weight: ex.weight !== '' && ex.weight != null ? Number(ex.weight) : null,
          restSeconds: ex.restSeconds !== '' && ex.restSeconds != null ? Number(ex.restSeconds) : null,
          tempo: ex.tempo || null,
          notes: ex.notes || null,
          isDropSet: false,
          isSuperSet: false,
        })),
      });
      toast.success('Exercícios salvos!');
      onPlansChange();
    } catch {
      toast.error('Erro ao salvar exercícios');
    } finally {
      setSavingEx(false);
    }
  }

  return (
    <div className="border-t border-border/50 p-3 space-y-3 bg-white/3">
      <p className="text-xs text-muted-foreground font-medium">Editar atribuição — {plan.workout?.name}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Início</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field text-sm py-1.5" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Término</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className="input-field text-sm py-1.5" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Divisão</label>
        <input type="text" value={division} onChange={(e) => setDivision(e.target.value)} placeholder="Ex: Treino A, Segunda/Quarta..." className="input-field text-sm py-1.5" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Foco em progressão de carga" className="input-field text-sm py-1.5" />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ notes, division, startDate, endDate: endDate || null })}
          disabled={isPending}
          className="btn-primary flex-1 text-sm py-1.5 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Salvar'}
        </button>
        <button onClick={onCancel} className="btn-secondary text-sm py-1.5 px-4">
          Cancelar
        </button>
      </div>

      {/* Exercise editor */}
      <div className="border-t border-border/40 pt-3">
        <button
          onClick={openExercises}
          disabled={forking}
          className="flex items-center gap-2 text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          <Pencil className="w-3 h-3" />
          {forking ? 'Carregando...' : exMode ? 'Fechar editor de exercícios' : 'Editar exercícios deste aluno'}
        </button>
        <p className="text-xs text-muted-foreground mt-0.5">Alterações aqui afetam apenas este aluno.</p>

        {exMode && (
          <div className="mt-3 space-y-2">
            {exercises.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum exercício. Adicione abaixo.</p>
            )}
            {exercises.map((ex, idx) => (
              <div key={ex._key ?? idx} className="glass rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate flex-1 mr-2">{idx + 1}. {ex.name}</span>
                  <button onClick={() => removeExercise(idx)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/10 flex-shrink-0">
                    <X className="w-3 h-3 text-red-400" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Séries</label>
                    <input
                      type="number"
                      value={ex.sets}
                      onChange={(e) => updateExField(idx, 'sets', e.target.value)}
                      className="input-field text-xs py-1 px-2 text-center"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Reps</label>
                    <input
                      type="text"
                      value={ex.reps ?? ''}
                      onChange={(e) => updateExField(idx, 'reps', e.target.value)}
                      placeholder="8-12"
                      className="input-field text-xs py-1 px-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Carga (kg)</label>
                    <input
                      type="number"
                      value={ex.weight ?? ''}
                      onChange={(e) => updateExField(idx, 'weight', e.target.value)}
                      placeholder="0"
                      className="input-field text-xs py-1 px-2 text-center"
                      min={0}
                      step={0.5}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Desc. (s)</label>
                    <input
                      type="number"
                      value={ex.restSeconds ?? ''}
                      onChange={(e) => updateExField(idx, 'restSeconds', e.target.value)}
                      placeholder="60"
                      className="input-field text-xs py-1 px-2 text-center"
                      min={0}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-0.5">Obs</label>
                  <input
                    type="text"
                    value={ex.notes ?? ''}
                    onChange={(e) => updateExField(idx, 'notes', e.target.value)}
                    placeholder="Técnica, variação..."
                    className="input-field text-xs py-1 px-2"
                  />
                </div>
              </div>
            ))}

            {/* Add exercise */}
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input
                  type="text"
                  value={exSearch}
                  onChange={(e) => searchExercises(e.target.value)}
                  placeholder="Buscar exercício para adicionar..."
                  className="input-field text-xs py-1.5 pl-7"
                />
              </div>
              {searching && <p className="text-xs text-muted-foreground text-center py-1">Buscando...</p>}
              {searchResults.length > 0 && (
                <div className="glass rounded-xl overflow-hidden divide-y divide-border/30">
                  {searchResults.map((ex: any) => (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left transition-all"
                    >
                      <Plus className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="text-xs truncate">{ex.name}</span>
                      {ex.category && <span className="text-[10px] text-muted-foreground ml-auto">{ex.category}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={saveExercises}
              disabled={savingEx}
              className="btn-primary w-full text-sm py-1.5 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              {savingEx ? 'Salvando...' : 'Salvar exercícios'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function toExRow(ex: any) {
  return {
    _key: ex.id,
    exerciseId: ex.exerciseId,
    name: ex.exercise?.name || '',
    sets: ex.sets ?? 3,
    reps: ex.reps ?? '',
    weight: ex.weight ?? '',
    restSeconds: ex.restSeconds ?? '',
    tempo: ex.tempo ?? '',
    notes: ex.notes ?? '',
  };
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
