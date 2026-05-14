'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ChevronLeft, Apple, Calendar, MessageCircle, UserCheck, Dumbbell, CheckSquare, Square } from 'lucide-react';
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

export default function PatientDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();

  // Diet assign state
  const [selectedDiet, setSelectedDiet] = useState('');
  const [dietError, setDietError] = useState('');
  const [dietSuccess, setDietSuccess] = useState(false);

  // Workout assign state
  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [workoutError, setWorkoutError] = useState('');
  const [workoutSuccess, setWorkoutSuccess] = useState(false);

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
