'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, ChevronLeft, Apple, Calendar, MessageCircle, UserCheck, Dumbbell,
  CheckSquare, Square, ClipboardList, ChevronDown, ChevronUp, Save,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Perda de peso',
  GAIN_MUSCLE: 'Ganho muscular',
  MAINTAIN_WEIGHT: 'Manutenção',
  IMPROVE_ENDURANCE: 'Resistência',
  INCREASE_FLEXIBILITY: 'Flexibilidade',
  ATHLETIC_PERFORMANCE: 'Performance',
  REHABILITATION: 'Reabilitação',
};

const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
];

const EMPTY_ANAMNESIS = {
  practicesExercise: false,
  exerciseFrequency: '',
  previousInjuries: '',
  surgeries: '',
  cardiovascularIssues: false,
  bloodPressure: '',
  cholesterol: '',
  diabetes: false,
  smoking: false,
  alcohol: '',
  sleepHours: '',
  stressLevel: '',
  mainGoal: '',
  observations: '',
};

function BoolField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'w-12 h-6 rounded-full transition-colors relative',
          value ? 'bg-emerald-500' : 'bg-white/10',
        )}
      >
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', value ? 'translate-x-6' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();

  const [selectedDiet, setSelectedDiet] = useState('');
  const [dietError, setDietError] = useState('');
  const [dietSuccess, setDietSuccess] = useState(false);

  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [workoutError, setWorkoutError] = useState('');
  const [workoutSuccess, setWorkoutSuccess] = useState(false);

  const [anamnesisOpen, setAnamnesisOpen] = useState(false);
  const [anamnesisForm, setAnamnesisForm] = useState(EMPTY_ANAMNESIS);
  const [anamnesisLoaded, setAnamnesisLoaded] = useState(false);

  const { data: patients, isLoading } = useQuery({
    queryKey: ['nutritionist-patients'],
    queryFn: () => api.get('/nutritionists/me/patients').then((r) => r.data.data),
  });

  const { data: diets } = useQuery({
    queryKey: ['diets-list'],
    queryFn: () => api.get('/diets').then((r) => r.data.data || []),
  });

  const { data: workouts } = useQuery({
    queryKey: ['workouts-list'],
    queryFn: () => api.get('/workouts').then((r) => r.data.data || []),
  });

  const patient = patients?.find((p: any) => p.id === id);

  const { data: anamnesis, isLoading: anamnesisLoading } = useQuery({
    queryKey: ['anamnesis', id],
    queryFn: () => api.get(`/nutritionists/me/patients/${id}/anamnesis`).then((r) => r.data),
    enabled: !!patient && anamnesisOpen,
  });

  useEffect(() => {
    if (anamnesis && !anamnesisLoaded) {
      setAnamnesisForm({
        practicesExercise: anamnesis.practicesExercise ?? false,
        exerciseFrequency: anamnesis.exerciseFrequency ?? '',
        previousInjuries: anamnesis.previousInjuries ?? '',
        surgeries: anamnesis.surgeries ?? '',
        cardiovascularIssues: anamnesis.cardiovascularIssues ?? false,
        bloodPressure: anamnesis.bloodPressure ?? '',
        cholesterol: anamnesis.cholesterol ?? '',
        diabetes: anamnesis.diabetes ?? false,
        smoking: anamnesis.smoking ?? false,
        alcohol: anamnesis.alcohol ?? '',
        sleepHours: anamnesis.sleepHours != null ? String(anamnesis.sleepHours) : '',
        stressLevel: anamnesis.stressLevel != null ? String(anamnesis.stressLevel) : '',
        mainGoal: anamnesis.mainGoal ?? '',
        observations: anamnesis.observations ?? '',
      });
      setAnamnesisLoaded(true);
    }
  }, [anamnesis, anamnesisLoaded]);

  const handleAnamnesisOpen = () => {
    setAnamnesisOpen((o) => !o);
  };

  const anamnesisMutation = useMutation({
    mutationFn: (data: any) => api.put(`/nutritionists/me/patients/${id}/anamnesis`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anamnesis', id] });
      toast.success('Anamnese salva com sucesso!');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || e.message || 'Erro ao salvar anamnese';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const handleAnamnesisSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    anamnesisMutation.mutate({
      ...anamnesisForm,
      sleepHours: anamnesisForm.sleepHours ? parseFloat(anamnesisForm.sleepHours) : null,
      stressLevel: anamnesisForm.stressLevel ? parseInt(anamnesisForm.stressLevel) : null,
      exerciseFrequency: anamnesisForm.exerciseFrequency || null,
      previousInjuries: anamnesisForm.previousInjuries || null,
      surgeries: anamnesisForm.surgeries || null,
      bloodPressure: anamnesisForm.bloodPressure || null,
      cholesterol: anamnesisForm.cholesterol || null,
      alcohol: anamnesisForm.alcohol || null,
      mainGoal: anamnesisForm.mainGoal || null,
      observations: anamnesisForm.observations || null,
    });
  };

  const setField = (field: string, value: any) =>
    setAnamnesisForm((prev) => ({ ...prev, [field]: value }));

  const dietMutation = useMutation({
    mutationFn: (dietId: string) =>
      api.post(`/diets/${dietId}/assign`, { studentUserId: patient?.userId }),
    onSuccess: () => {
      setDietSuccess(true);
      setSelectedDiet('');
      setDietError('');
      qc.invalidateQueries({ queryKey: ['nutritionist-patients'] });
      setTimeout(() => setDietSuccess(false), 3000);
      toast.success('Dieta atribuída com sucesso!');
    },
    onError: (e: any) => {
      const msg = e.message || e.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao atribuir dieta');
      setDietError(text);
      toast.error(text);
    },
  });

  const workoutMutation = useMutation({
    mutationFn: (data: any) => api.post(`/workouts/${data.workoutId}/assign`, {
      studentId: patient?.id,
      dayOfWeek: data.dayOfWeek,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      notes: data.notes || undefined,
    }),
    onSuccess: () => {
      setWorkoutSuccess(true);
      setSelectedWorkout('');
      setDayOfWeek([]);
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setWorkoutNotes('');
      setWorkoutError('');
      setTimeout(() => setWorkoutSuccess(false), 3000);
      toast.success('Treino atribuído com sucesso!');
    },
    onError: (e: any) => {
      const msg = e.message || e.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao atribuir treino');
      setWorkoutError(text);
      toast.error(text);
    },
  });

  const toggleDay = (v: number) =>
    setDayOfWeek((prev) => prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v]);

  const handleDietAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiet) { setDietError('Selecione uma dieta'); return; }
    setDietError('');
    dietMutation.mutate(selectedDiet);
  };

  const handleWorkoutAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkout) { setWorkoutError('Selecione um treino'); return; }
    if (dayOfWeek.length === 0) { setWorkoutError('Selecione ao menos um dia da semana'); return; }
    if (!startDate) { setWorkoutError('Informe a data de início'); return; }
    setWorkoutError('');
    workoutMutation.mutate({ workoutId: selectedWorkout, dayOfWeek, startDate, endDate, notes: workoutNotes });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card animate-pulse h-32" />
        ))}
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-2xl mx-auto glass-card flex flex-col items-center justify-center py-16 text-center">
        <Users className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="font-semibold mb-2">Paciente não encontrado</h2>
        <Link href="/nutritionist/patients" className="btn-secondary text-sm">Voltar</Link>
      </div>
    );
  }

  const initials = `${patient.user?.profile?.firstName?.[0] || ''}${patient.user?.profile?.lastName?.[0] || ''}`;
  const compliance = patient.dietCompliance ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/nutritionist/patients" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold">Perfil do Paciente</h1>
      </div>

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {patient.user?.profile?.avatarUrl
              ? <img src={patient.user.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              : initials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">
              {patient.user?.profile?.firstName} {patient.user?.profile?.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">{patient.user?.email}</p>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full mt-1 inline-block',
              patient.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground',
            )}>
              {patient.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <Link href="/nutritionist/chat" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Adesão à dieta</span>
            <span className={compliance >= 70 ? 'text-emerald-400' : 'text-orange-400'}>{compliance}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                compliance >= 70 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-orange-500 to-red-500',
              )}
              style={{ width: `${compliance}%` }}
            />
          </div>
        </div>
      </motion.div>

      {/* Objective */}
      {patient.goalType && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
          <h2 className="font-semibold mb-2">Objetivo</h2>
          <p className="text-muted-foreground">{GOAL_LABELS[patient.goalType] || patient.goalType}</p>
        </motion.div>
      )}

      {/* Anamnese nutricional */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card">
        <button
          type="button"
          onClick={handleAnamnesisOpen}
          className="w-full flex items-center justify-between"
        >
          <h2 className="font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-cyan-400" />
            Ficha de Anamnese Nutricional
            {anamnesis && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ml-1">Preenchida</span>}
          </h2>
          {anamnesisOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {anamnesisOpen && (
          <form onSubmit={handleAnamnesisSubmit} className="mt-5 space-y-6">
            {anamnesisLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* Atividade física */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Atividade Física</h3>
                  <BoolField
                    label="Pratica exercícios físicos?"
                    value={anamnesisForm.practicesExercise}
                    onChange={(v) => setField('practicesExercise', v)}
                  />
                  {anamnesisForm.practicesExercise && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Frequência / modalidade</label>
                      <input
                        type="text"
                        value={anamnesisForm.exerciseFrequency}
                        onChange={(e) => setField('exerciseFrequency', e.target.value)}
                        placeholder="Ex: musculação 3x semana"
                        className="input-field"
                      />
                    </div>
                  )}
                </div>

                {/* Histórico clínico */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Histórico Clínico</h3>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Lesões anteriores</label>
                    <textarea
                      value={anamnesisForm.previousInjuries}
                      onChange={(e) => setField('previousInjuries', e.target.value)}
                      placeholder="Descreva lesões relevantes..."
                      rows={2}
                      className="input-field resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Cirurgias</label>
                    <textarea
                      value={anamnesisForm.surgeries}
                      onChange={(e) => setField('surgeries', e.target.value)}
                      placeholder="Descreva cirurgias realizadas..."
                      rows={2}
                      className="input-field resize-none"
                    />
                  </div>
                </div>

                {/* Saúde cardiovascular e metabólica */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Saúde Cardiovascular e Metabólica</h3>
                  <BoolField
                    label="Problemas cardiovasculares?"
                    value={anamnesisForm.cardiovascularIssues}
                    onChange={(v) => setField('cardiovascularIssues', v)}
                  />
                  <BoolField
                    label="Diabetes?"
                    value={anamnesisForm.diabetes}
                    onChange={(v) => setField('diabetes', v)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Pressão arterial</label>
                      <input
                        type="text"
                        value={anamnesisForm.bloodPressure}
                        onChange={(e) => setField('bloodPressure', e.target.value)}
                        placeholder="Ex: 120/80"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Colesterol</label>
                      <input
                        type="text"
                        value={anamnesisForm.cholesterol}
                        onChange={(e) => setField('cholesterol', e.target.value)}
                        placeholder="Ex: 190 mg/dL"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                {/* Hábitos de vida */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Hábitos de Vida</h3>
                  <BoolField
                    label="Fumante?"
                    value={anamnesisForm.smoking}
                    onChange={(v) => setField('smoking', v)}
                  />
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Consumo de álcool</label>
                    <input
                      type="text"
                      value={anamnesisForm.alcohol}
                      onChange={(e) => setField('alcohol', e.target.value)}
                      placeholder="Ex: socialmente, final de semana"
                      className="input-field"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Horas de sono / dia</label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        step={0.5}
                        value={anamnesisForm.sleepHours}
                        onChange={(e) => setField('sleepHours', e.target.value)}
                        placeholder="Ex: 7.5"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Nível de estresse (1-10)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={anamnesisForm.stressLevel}
                        onChange={(e) => setField('stressLevel', e.target.value)}
                        placeholder="Ex: 6"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                {/* Objetivo e observações */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Objetivo e Observações</h3>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Objetivo principal</label>
                    <input
                      type="text"
                      value={anamnesisForm.mainGoal}
                      onChange={(e) => setField('mainGoal', e.target.value)}
                      placeholder="Ex: emagrecer 8 kg em 4 meses"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Observações adicionais</label>
                    <textarea
                      value={anamnesisForm.observations}
                      onChange={(e) => setField('observations', e.target.value)}
                      placeholder="Informações complementares relevantes..."
                      rows={3}
                      className="input-field resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={anamnesisMutation.isPending}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {anamnesisMutation.isPending ? 'Salvando...' : 'Salvar anamnese'}
                </button>
              </>
            )}
          </form>
        )}
      </motion.div>

      {/* Assign diet */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleDietAssign}
        className="glass-card space-y-4"
      >
        <h2 className="font-semibold flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          Atribuir dieta
        </h2>
        <p className="text-xs text-muted-foreground">A dieta ativa do paciente será substituída pela selecionada.</p>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Dieta *</label>
          <select value={selectedDiet} onChange={(e) => setSelectedDiet(e.target.value)} className="input-field">
            <option value="">Selecione uma dieta...</option>
            {(diets || []).map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.totalCalories ? ` — ${d.totalCalories} kcal` : ''}
              </option>
            ))}
          </select>
        </div>

        {dietError && <div className="glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">{dietError}</div>}
        {dietSuccess && <div className="glass rounded-xl p-3 border border-emerald-500/20 text-emerald-400 text-sm">Dieta atribuída com sucesso!</div>}

        <button type="submit" disabled={dietMutation.isPending} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
          <UserCheck className="w-4 h-4" />
          {dietMutation.isPending ? 'Atribuindo...' : 'Atribuir dieta'}
        </button>
      </motion.form>

      {/* Assign workout */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onSubmit={handleWorkoutAssign}
        className="glass-card space-y-5"
      >
        <h2 className="font-semibold flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-purple-400" />
          Atribuir treino
        </h2>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Treino *</label>
          <select value={selectedWorkout} onChange={(e) => setSelectedWorkout(e.target.value)} className="input-field">
            <option value="">Selecione um treino...</option>
            {(workouts || []).map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.name}{w.duration ? ` — ${w.duration} min` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Dias da semana *
          </label>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((d) => {
              const active = dayOfWeek.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`w-11 h-11 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                    active ? 'bg-primary text-primary-foreground' : 'glass hover:bg-accent text-muted-foreground'
                  }`}
                >
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
          <input type="text" value={workoutNotes} onChange={(e) => setWorkoutNotes(e.target.value)} placeholder="Ex: Foco em progressão de carga" className="input-field" />
        </div>

        {workoutError && <div className="glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">{workoutError}</div>}
        {workoutSuccess && <div className="glass rounded-xl p-3 border border-emerald-500/20 text-emerald-400 text-sm">Treino atribuído com sucesso!</div>}

        <button type="submit" disabled={workoutMutation.isPending} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
          <Dumbbell className="w-4 h-4" />
          {workoutMutation.isPending ? 'Atribuindo...' : 'Atribuir treino'}
        </button>
      </motion.form>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card">
        <h2 className="font-semibold mb-4">Ações rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/nutritionist/diets/new" className="glass rounded-xl p-4 flex items-center gap-3 hover:bg-accent transition-all">
            <Apple className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-medium">Nova dieta</div>
              <div className="text-xs text-muted-foreground">Criar plano alimentar</div>
            </div>
          </Link>
          <Link href="/nutritionist/schedule" className="glass rounded-xl p-4 flex items-center gap-3 hover:bg-accent transition-all">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-sm font-medium">Agendar consulta</div>
              <div className="text-xs text-muted-foreground">Marcar sessão</div>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
