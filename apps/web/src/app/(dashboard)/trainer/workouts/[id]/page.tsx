'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Dumbbell, ChevronLeft, Clock, Layers, Zap, Users, UserCheck,
  Calendar, CheckSquare, Square, Plus, Trash2, Search, Save, CheckCircle, Video,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const LEVEL_LABELS = ['', 'Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Elite'];
const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
];

interface WorkoutExerciseRow {
  exerciseId: string;
  name: string;
  sets: number;
  reps: string;
  weight: number | null;
  restSeconds: number | null;
  videoUrl: string;
}

export default function WorkoutDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();

  // Assign state
  const [selectedStudent, setSelectedStudent] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);

  // Exercise editor state
  const [exerciseRows, setExerciseRows] = useState<WorkoutExerciseRow[]>([]);
  const [exercisesLoaded, setExercisesLoaded] = useState(false);
  const [exSearch, setExSearch] = useState('');
  const [saveExSuccess, setSaveExSuccess] = useState(false);
  const [saveExError, setSaveExError] = useState('');

  const { data: workout, isLoading } = useQuery({
    queryKey: ['workout', id],
    queryFn: () =>
      api.get(`/workouts/${id}`).then((r) => {
        const w = r.data.data;
        if (!exercisesLoaded) {
          setExerciseRows(
            (w.exercises || []).map((e: any) => ({
              exerciseId: e.exercise?.id || e.exerciseId,
              name: e.exercise?.name || '',
              sets: e.sets || 3,
              reps: String(e.reps || '10'),
              weight: e.weight ?? null,
              restSeconds: e.restSeconds ?? 60,
              videoUrl: e.exercise?.videoUrl || '',
            })),
          );
          setExercisesLoaded(true);
        }
        return w;
      }),
  });

  const { data: students } = useQuery({
    queryKey: ['trainer-students'],
    queryFn: () => api.get('/trainers/me/students').then((r) => r.data.data || []),
  });

  const { data: allExercises } = useQuery({
    queryKey: ['exercises', exSearch],
    queryFn: () =>
      api.get('/exercises', { params: { search: exSearch || undefined } }).then((r) => r.data.data || []),
  });

  const saveExercisesMutation = useMutation({
    mutationFn: (rows: WorkoutExerciseRow[]) =>
      api.patch(`/workouts/${id}`, {
        exercises: rows.map((r) => ({
          exerciseId: r.exerciseId,
          sets: r.sets,
          reps: r.reps,
          weight: r.weight ?? undefined,
          restSeconds: r.restSeconds ?? undefined,
          videoUrl: r.videoUrl || undefined,
        })),
      }),
    onSuccess: () => {
      setSaveExSuccess(true);
      setSaveExError('');
      qc.invalidateQueries({ queryKey: ['workout', id] });
      setTimeout(() => setSaveExSuccess(false), 3000);
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message;
      setSaveExError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao salvar exercícios'));
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => api.patch(`/workouts/${id}`, { status: 'ACTIVE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout', id] }),
  });

  const assignMutation = useMutation({
    mutationFn: (data: any) => api.post(`/workouts/${id}/assign`, data),
    onSuccess: () => {
      setAssignSuccess(true);
      setSelectedStudent('');
      setDayOfWeek([]);
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setNotes('');
      setAssignError('');
      qc.invalidateQueries({ queryKey: ['workout', id] });
      setTimeout(() => setAssignSuccess(false), 3000);
    },
    onError: (e: any) => {
      const msg = e.message || e.response?.data?.message;
      setAssignError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao atribuir treino'));
    },
  });

  const toggleDay = (v: number) =>
    setDayOfWeek((prev) => (prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v]));

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) { setAssignError('Selecione um aluno'); return; }
    if (dayOfWeek.length === 0) { setAssignError('Selecione ao menos um dia da semana'); return; }
    if (!startDate) { setAssignError('Informe a data de início'); return; }
    setAssignError('');
    assignMutation.mutate({ studentId: selectedStudent, dayOfWeek, startDate, endDate: endDate || undefined, notes: notes || undefined });
  };

  const addExercise = useCallback(
    (ex: any) => {
      if (exerciseRows.find((r) => r.exerciseId === ex.id)) return;
      setExerciseRows((prev) => [
        ...prev,
        { exerciseId: ex.id, name: ex.name, sets: 3, reps: '10', weight: null, restSeconds: 60, videoUrl: ex.videoUrl || '' },
      ]);
    },
    [exerciseRows],
  );

  const removeExercise = (idx: number) =>
    setExerciseRows((prev) => prev.filter((_, i) => i !== idx));

  const updateRow = (idx: number, field: keyof WorkoutExerciseRow, value: any) =>
    setExerciseRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card animate-pulse h-20" />
        ))}
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="max-w-2xl mx-auto glass-card flex flex-col items-center justify-center py-16 text-center">
        <Dumbbell className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="font-semibold mb-2">Treino não encontrado</h2>
        <Link href="/trainer/workouts" className="btn-secondary text-sm">Voltar</Link>
      </div>
    );
  }

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Rascunho', color: 'bg-yellow-500/10 text-yellow-400' },
    ACTIVE: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400' },
    ARCHIVED: { label: 'Arquivado', color: 'bg-muted text-muted-foreground' },
  };
  const status = STATUS_LABELS[workout.status] || STATUS_LABELS.DRAFT;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/trainer/workouts" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{workout.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
            {workout.isTemplate && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">Template</span>
            )}
            {workout.status === 'DRAFT' && (
              <button
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
                className="text-xs px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition-all disabled:opacity-50"
              >
                {activateMutation.isPending ? 'Ativando...' : 'Ativar treino'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-4">
        {[
          { label: 'Duração', value: `${workout.duration ?? 45} min`, icon: Clock, color: 'text-cyan-400' },
          { label: 'Nível', value: LEVEL_LABELS[workout.level] || 'Iniciante', icon: Zap, color: 'text-yellow-400' },
          { label: 'Alunos', value: workout._count?.plans ?? 0, icon: Users, color: 'text-purple-400' },
        ].map((s) => (
          <div key={s.label} className="glass-card flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
            <div>
              <div className="font-semibold text-sm">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Description */}
      {workout.description && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
          <h2 className="font-semibold mb-2">Descrição</h2>
          <p className="text-sm text-muted-foreground">{workout.description}</p>
        </motion.div>
      )}

      {/* Exercise editor */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            Exercícios ({exerciseRows.length})
          </h2>
          <button
            onClick={() => saveExercisesMutation.mutate(exerciseRows)}
            disabled={saveExercisesMutation.isPending}
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
          >
            {saveExSuccess ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saveExercisesMutation.isPending ? 'Salvando...' : saveExSuccess ? 'Salvo!' : 'Salvar exercícios'}
          </button>
        </div>

        {/* Search to add exercises */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={exSearch}
            onChange={(e) => setExSearch(e.target.value)}
            placeholder="Buscar exercício para adicionar..."
            className="input-field pl-9"
          />
        </div>

        {exSearch && (
          <div className="glass rounded-xl divide-y divide-border max-h-48 overflow-y-auto">
            {(allExercises || [])
              .filter((e: any) => !exerciseRows.find((r) => r.exerciseId === e.id))
              .slice(0, 8)
              .map((ex: any) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => { addExercise(ex); setExSearch(''); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent transition-all text-left"
                >
                  <span className="text-sm">{ex.name}</span>
                  <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                </button>
              ))}
            {(allExercises || []).filter((e: any) => !exerciseRows.find((r) => r.exerciseId === e.id)).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">Nenhum resultado</p>
            )}
          </div>
        )}

        {/* Exercise rows */}
        {exerciseRows.length > 0 ? (
          <div className="space-y-3">
            {exerciseRows.map((row, i) => (
              <div key={row.exerciseId} className="glass rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-600/10 flex items-center justify-center text-xs font-bold text-purple-400">
                      {i + 1}
                    </span>
                    {row.name}
                  </span>
                  <button type="button" onClick={() => removeExercise(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Séries</label>
                    <input
                      type="number"
                      min={1}
                      value={row.sets}
                      onChange={(e) => updateRow(i, 'sets', Number(e.target.value))}
                      className="input-field py-1.5 text-sm text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Reps</label>
                    <input
                      type="text"
                      value={row.reps}
                      onChange={(e) => updateRow(i, 'reps', e.target.value)}
                      placeholder="10"
                      className="input-field py-1.5 text-sm text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Carga (kg)</label>
                    <input
                      type="number"
                      min={0}
                      value={row.weight ?? ''}
                      onChange={(e) => updateRow(i, 'weight', e.target.value ? Number(e.target.value) : null)}
                      placeholder="—"
                      className="input-field py-1.5 text-sm text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Descanso (s)</label>
                    <input
                      type="number"
                      min={0}
                      value={row.restSeconds ?? ''}
                      onChange={(e) => updateRow(i, 'restSeconds', e.target.value ? Number(e.target.value) : null)}
                      placeholder="60"
                      className="input-field py-1.5 text-sm text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    URL do vídeo (YouTube, Vimeo ou .mp4)
                  </label>
                  <input
                    type="url"
                    value={row.videoUrl}
                    onChange={(e) => updateRow(i, 'videoUrl', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="input-field py-1.5 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Busque exercícios acima para adicionar ao treino
          </p>
        )}

        {saveExError && (
          <div className="glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">{saveExError}</div>
        )}
      </motion.div>

      {/* Assign to student */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onSubmit={handleAssign}
        className="glass-card space-y-5"
      >
        <h2 className="font-semibold flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-cyan-400" />
          Atribuir a aluno
        </h2>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Aluno *</label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="input-field"
          >
            <option value="">Selecione um aluno...</option>
            {(students || []).map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.user?.profile?.firstName} {s.user?.profile?.lastName}
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
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Data de término</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
              min={startDate}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Observações</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Foco em progressão de carga"
            className="input-field"
          />
        </div>

        {assignError && (
          <div className="glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">{assignError}</div>
        )}
        {assignSuccess && (
          <div className="glass rounded-xl p-3 border border-emerald-500/20 text-emerald-400 text-sm">
            Treino atribuído com sucesso!
          </div>
        )}

        <button
          type="submit"
          disabled={assignMutation.isPending}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <UserCheck className="w-4 h-4" />
          {assignMutation.isPending ? 'Atribuindo...' : 'Atribuir treino'}
        </button>
      </motion.form>
    </div>
  );
}
