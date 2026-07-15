'use client';

import { useState, useCallback, Fragment, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dumbbell, ChevronLeft, Clock, Layers, Zap, Users, UserCheck,
  Plus, Trash2, Search, Save, CheckCircle, Video,
  Link2, Unlink, ExternalLink, ChevronRight, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { resolveImageUrl, resolveVideoUrl } from '@/lib/video-url';

const LEVEL_LABELS = ['', 'Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Elite'];

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  PECTORALIS_MAJOR: 'Peitoral Maior', PECTORALIS_MINOR: 'Peitoral Menor',
  LATISSIMUS_DORSI: 'Dorsal', TRAPEZIUS: 'Trapézio', RHOMBOIDS: 'Romboides',
  DELTOID: 'Deltóide', BICEPS_BRACHII: 'Bíceps', TRICEPS_BRACHII: 'Tríceps',
  FOREARMS: 'Antebraços', QUADRICEPS: 'Quadríceps', HAMSTRINGS: 'Posteriores',
  GLUTES: 'Glúteos', CALVES: 'Panturrilhas', ABS: 'Abdomên', OBLIQUES: 'Oblíquos',
  LOWER_BACK: 'Lombar', HIP_FLEXORS: 'Flexores',
};

const CATEGORY_LABELS: Record<string, string> = {
  CHEST: 'Peito', BACK: 'Costas', SHOULDERS: 'Ombros', BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps', LEGS: 'Pernas', GLUTES: 'Glúteos', CORE: 'Core',
  CARDIO: 'Cardio', FULL_BODY: 'Corpo Inteiro', MOBILITY: 'Mobilidade',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  BARBELL: 'Barra', DUMBBELL: 'Halteres', MACHINE: 'Máquina',
  CABLE: 'Cabo', BODYWEIGHT: 'Peso Corporal', KETTLEBELL: 'Kettlebell',
  BAND: 'Elástico', BENCH: 'Banco', EZ_BAR: 'Barra EZ', SMITH: 'Smith',
  PLATE: 'Anilha', FOAM_ROLLER: 'Rolo', PULL_UP_BAR: 'Barra Fixa',
  MEDICINE_BALL: 'Bola', SWISS_BALL: 'Bola Suíça',
};

type Technique = 'NORMAL' | 'BI_SET' | 'SUPER_SET' | 'TRI_SET' | 'DROP_SET' | 'GIANT_SET' | 'CIRCUIT';

const TECHNIQUE_CONFIG: Record<Technique, { label: string; color: string; bg: string; border: string }> = {
  NORMAL:    { label: '–',          color: 'text-muted-foreground', bg: '',                      border: '' },
  BI_SET:    { label: 'Bi Set',     color: 'text-orange-400',       bg: 'bg-orange-500/10',      border: 'border-l-4 border-orange-500/60' },
  SUPER_SET: { label: 'Super Set',  color: 'text-blue-400',         bg: 'bg-blue-500/10',        border: 'border-l-4 border-blue-500/60' },
  TRI_SET:   { label: 'Tri Set',    color: 'text-purple-400',       bg: 'bg-purple-500/10',      border: 'border-l-4 border-purple-500/60' },
  DROP_SET:  { label: 'Drop Set',   color: 'text-red-400',          bg: 'bg-red-500/10',         border: 'border-l-4 border-red-500/60' },
  GIANT_SET: { label: 'Giant Set',  color: 'text-pink-400',         bg: 'bg-pink-500/10',        border: 'border-l-4 border-pink-500/60' },
  CIRCUIT:   { label: 'Circuito',   color: 'text-emerald-400',      bg: 'bg-emerald-500/10',     border: 'border-l-4 border-emerald-500/60' },
};

interface WorkoutExerciseRow {
  exerciseId: string;
  name: string;
  sets: number;
  reps: string;
  weight: number | null;
  restSeconds: number | null;
  videoUrl: string;
  notes: string;
  technique: Technique;
  groupId: string | null;
}

function deriveTechnique(isSuperSet: boolean, isDropSet: boolean, superSetGroupId: string | null, groupSize: number): Technique {
  if (isDropSet) return 'DROP_SET';
  if (!isSuperSet) return 'NORMAL';
  if (groupSize === 2) return 'BI_SET';
  if (groupSize === 3) return 'TRI_SET';
  if (groupSize >= 4) return 'GIANT_SET';
  return 'SUPER_SET';
}

export default function WorkoutDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();

  const [selectedStudent, setSelectedStudent] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const toggleDay = (day: number) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const [exerciseRows, setExerciseRows] = useState<WorkoutExerciseRow[]>([]);
  const [exercisesLoaded, setExercisesLoaded] = useState(false);
  const [exSearch, setExSearch] = useState('');
  const [exSourceFilter, setExSourceFilter] = useState<'app' | 'mine' | 'gifs'>('app');
  const [gifFolder, setGifFolder] = useState<string | null>(null);
  const [saveExSuccess, setSaveExSuccess] = useState(false);
  const [saveExError, setSaveExError] = useState('');

  const { data: workout, isLoading } = useQuery({
    queryKey: ['workout', id],
    queryFn: () =>
      api.get(`/workouts/${id}`).then(r => {
        const w = r.data.data;
        if (!exercisesLoaded) {
          const rawExercises = w.exercises || [];
          // count group sizes for technique inference
          const groupSizes: Record<string, number> = {};
          rawExercises.forEach((e: any) => { if (e.superSetGroupId) groupSizes[e.superSetGroupId] = (groupSizes[e.superSetGroupId] || 0) + 1; });
          setExerciseRows(rawExercises.map((e: any) => ({
            exerciseId: e.exercise?.id || e.exerciseId,
            name: e.exercise?.name || '',
            sets: e.sets || 3,
            reps: String(e.reps || '10'),
            weight: e.weight ?? null,
            restSeconds: e.restSeconds ?? 60,
            videoUrl: e.exercise?.videoUrl || '',
            notes: e.notes || '',
            technique: deriveTechnique(e.isSuperSet, e.isDropSet, e.superSetGroupId, e.superSetGroupId ? groupSizes[e.superSetGroupId] : 0),
            groupId: e.superSetGroupId || null,
          })));
          setExercisesLoaded(true);
        }
        return w;
      }),
  });

  const { data: students } = useQuery({
    queryKey: ['trainer-students'],
    queryFn: () => api.get('/trainers/me/students').then(r => r.data.data || []),
  });

  const { data: allExercises } = useQuery({
    queryKey: ['exercises', exSearch],
    queryFn: () => api.get('/exercises', { params: { search: exSearch || undefined } }).then(r => r.data.data || []),
    enabled: exSourceFilter !== 'gifs',
  });

  const { data: gifFolders } = useQuery({
    queryKey: ['workout-gifs'],
    queryFn: () => api.get('/cloudinary-gifs').then(r => r.data.data || []),
    enabled: exSourceFilter === 'gifs',
  });

  const { data: gifFiles } = useQuery({
    queryKey: ['workout-gifs', gifFolder],
    queryFn: () => api.get(`/cloudinary-gifs/${gifFolder}`).then(r => r.data.data || []),
    enabled: exSourceFilter === 'gifs' && !!gifFolder,
  });

  const saveExercisesMutation = useMutation({
    mutationFn: (rows: WorkoutExerciseRow[]) =>
      api.patch(`/workouts/${id}`, {
        exercises: rows.map(r => ({
          exerciseId: r.exerciseId,
          sets: r.sets,
          reps: r.reps,
          weight: r.weight ?? undefined,
          restSeconds: r.restSeconds ?? undefined,
          videoUrl: r.videoUrl || undefined,
          notes: r.notes || undefined,
          isSuperSet: r.technique !== 'NORMAL' && r.technique !== 'DROP_SET',
          isDropSet: r.technique === 'DROP_SET',
          superSetGroupId: r.groupId || undefined,
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
      setSelectedStudent(''); setStartDate(new Date().toISOString().split('T')[0]); setEndDate(''); setNotes(''); setAssignError('');
      qc.invalidateQueries({ queryKey: ['workout', id] });
      setTimeout(() => setAssignSuccess(false), 3000);
    },
    onError: (e: any) => {
      const msg = e.message || e.response?.data?.message;
      setAssignError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao atribuir treino'));
    },
  });

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) { setAssignError('Selecione um aluno'); return; }
    if (!startDate) { setAssignError('Informe a data de início'); return; }
    setAssignError('');
    assignMutation.mutate({
      studentId: selectedStudent,
      startDate,
      endDate: endDate || undefined,
      notes: notes || undefined,
      dayOfWeek: selectedDays.length > 0 ? selectedDays : undefined,
    });
  };

  const [addingGifId, setAddingGifId] = useState<string | null>(null);
  const [autoLinking, setAutoLinking] = useState(false);

  const handleAutoLink = useCallback(async () => {
    setAutoLinking(true);
    try {
      const res = await api.get('/exercises');
      const allEx: any[] = res.data.data || [];
      const isCloudinary = (url?: string) => !!url && url.includes('cloudinary.com');
      const scoreEx = (e: any) => (isCloudinary(e.gifUrl) ? 3 : isCloudinary(e.videoUrl) ? 2 : 0);
      const findBestWithMedia = (exerciseId: string, name: string) => {
        const byId = allEx.find(e => e.id === exerciseId);
        if (byId && (isCloudinary(byId.gifUrl) || isCloudinary(byId.videoUrl))) return byId;
        const nl = name.toLowerCase();
        const pool = allEx.filter(e =>
          e.name.toLowerCase() === nl ||
          e.name.toLowerCase().includes(nl) ||
          nl.includes(e.name.toLowerCase()),
        );
        return pool.sort((a, b) => scoreEx(b) - scoreEx(a))[0] ?? null;
      };
      let linked = 0;
      setExerciseRows(prev => prev.map(row => {
        const match = findBestWithMedia(row.exerciseId, row.name);
        if (!match) return row;
        const bestUrl = match.gifUrl && isCloudinary(match.gifUrl)
          ? match.gifUrl
          : match.videoUrl && isCloudinary(match.videoUrl)
            ? match.videoUrl
            : null;
        if (bestUrl && bestUrl !== row.videoUrl) {
          linked++;
          return { ...row, videoUrl: bestUrl };
        }
        return row;
      }));
      if (linked > 0) {
        toast.success(`${linked} exercício${linked > 1 ? 's' : ''} vinculado${linked > 1 ? 's' : ''} com mídia da galeria!`);
      } else {
        toast('Nenhuma mídia interna nova encontrada para os exercícios atuais.', { icon: 'ℹ️' });
      }
    } catch {
      toast.error('Erro ao buscar exercícios da galeria.');
    } finally {
      setAutoLinking(false);
    }
  }, []);

  const addExercise = useCallback(
    (ex: any) => {
      if (exerciseRows.find(r => r.exerciseId === ex.id)) return;
      setExerciseRows(prev => [...prev, { exerciseId: ex.id, name: ex.name, sets: 3, reps: '10', weight: null, restSeconds: 60, videoUrl: ex.videoUrl || '', notes: '', technique: 'NORMAL', groupId: null }]);
    },
    [exerciseRows],
  );

  const addGifToWorkout = useCallback(async (file: any) => {
    if (exerciseRows.find(r => r.name === file.name && r.videoUrl === file.url)) return;
    setAddingGifId(file.publicId);
    try {
      const res = await api.post('/exercises', {
        name: file.name,
        category: 'FULL_BODY',
        difficulty: 1,
        equipment: [],
        gifUrl: file.url,
        videoUrl: file.url,
        isPublic: false,
      });
      const created = res.data?.data;
      if (created?.id) {
        addExercise({ id: created.id, name: file.name, videoUrl: file.url });
      }
    } catch (err) {
      // silently fail — exercise may already exist
    } finally {
      setAddingGifId(null);
    }
  }, [exerciseRows, addExercise]);

  const removeExercise = (idx: number) => {
    const row = exerciseRows[idx];
    // if in a group, check if group becomes orphaned
    const remaining = exerciseRows.filter((_, i) => i !== idx);
    const groupStillUsed = remaining.filter(r => r.groupId === row.groupId).length;
    setExerciseRows(
      groupStillUsed < 1
        ? remaining.map(r => r.groupId === row.groupId ? { ...r, groupId: null, technique: 'NORMAL' } : r)
        : remaining,
    );
  };

  const updateRow = (idx: number, field: keyof WorkoutExerciseRow, value: any) =>
    setExerciseRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const updateTechnique = (idx: number, technique: Technique) => {
    if (technique === 'NORMAL') {
      const row = exerciseRows[idx];
      const sameGroup = exerciseRows.filter(r => r.groupId === row.groupId && r.groupId !== null);
      if (sameGroup.length <= 2) {
        // unlink all in this pair
        setExerciseRows(prev => prev.map((r, i) =>
          r.groupId === row.groupId ? { ...r, groupId: null, technique: 'NORMAL' } : r,
        ));
      } else {
        setExerciseRows(prev => prev.map((r, i) => i === idx ? { ...r, groupId: null, technique: 'NORMAL' } : r));
      }
    } else {
      const row = exerciseRows[idx];
      if (row.groupId) {
        // update all in group
        setExerciseRows(prev => prev.map(r => r.groupId === row.groupId ? { ...r, technique } : r));
      } else {
        setExerciseRows(prev => prev.map((r, i) => i === idx ? { ...r, technique } : r));
      }
    }
  };

  const linkExercises = (i: number, j: number) => {
    const rowI = exerciseRows[i];
    const rowJ = exerciseRows[j];
    const groupId = rowI.groupId || rowJ.groupId || `grp_${Date.now()}`;
    const technique: Technique = (rowI.technique !== 'NORMAL' ? rowI.technique : rowJ.technique !== 'NORMAL' ? rowJ.technique : 'BI_SET');
    setExerciseRows(prev => prev.map((r, idx) => {
      if (idx === i || idx === j) return { ...r, groupId, technique };
      if (r.groupId === rowI.groupId && rowI.groupId) return { ...r, groupId, technique }; // carry existing group
      return r;
    }));
  };

  const unlinkBetween = (i: number, j: number) => {
    const groupId = exerciseRows[i].groupId;
    if (!groupId) return;
    const members = exerciseRows.map((r, idx) => ({ idx, r })).filter(({ r }) => r.groupId === groupId);
    if (members.length <= 2) {
      setExerciseRows(prev => prev.map(r => r.groupId === groupId ? { ...r, groupId: null, technique: 'NORMAL' } : r));
    } else {
      // split at the boundary: rows before j keep group, rows from j onwards get new group or become normal
      setExerciseRows(prev => prev.map((r, idx) => idx === j ? { ...r, groupId: null, technique: 'NORMAL' } : r));
    }
  };

  if (isLoading) {
    return <div className="max-w-2xl mx-auto space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="glass-card animate-pulse h-20" />)}</div>;
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
    DRAFT:    { label: 'Rascunho', color: 'bg-yellow-500/10 text-yellow-400' },
    ACTIVE:   { label: 'Ativo',    color: 'bg-emerald-500/10 text-emerald-400' },
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
            {workout.isTemplate && <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">Template</span>}
            {workout.status === 'DRAFT' && (
              <button onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending} className="text-xs px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition-all disabled:opacity-50">
                {activateMutation.isPending ? 'Ativando...' : 'Ativar treino'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Duração', value: `${workout.duration ?? 45} min`, icon: Clock, color: 'text-cyan-400' },
          { label: 'Nível', value: LEVEL_LABELS[workout.level] || 'Iniciante', icon: Zap, color: 'text-yellow-400' },
          { label: 'Alunos', value: workout._count?.plans ?? 0, icon: Users, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="glass-card flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
            <div><div className="font-semibold text-sm">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
          </div>
        ))}
      </motion.div>

      {workout.description && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
          <h2 className="font-semibold mb-2">Descrição</h2>
          <p className="text-sm text-muted-foreground">{workout.description}</p>
        </motion.div>
      )}

      {/* Exercise editor */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            Exercícios ({exerciseRows.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoLink}
              disabled={autoLinking || exerciseRows.length === 0}
              title="Vincular GIFs e vídeos internos do app nos exercícios deste treino"
              className="text-xs px-3 py-1.5 flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 font-medium transition-all disabled:opacity-40"
            >
              {autoLinking
                ? <span className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />}
              {autoLinking ? 'Vinculando...' : 'Vincular GIFs'}
            </button>
            <button onClick={() => saveExercisesMutation.mutate(exerciseRows)} disabled={saveExercisesMutation.isPending} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50">
              {saveExSuccess ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saveExercisesMutation.isPending ? 'Salvando...' : saveExSuccess ? 'Salvo!' : 'Salvar exercícios'}
            </button>
          </div>
        </div>

        {/* Source filter buttons */}
        <div className="flex flex-wrap gap-1.5">
          {[{ key: 'app', label: 'Exercícios do app' }, { key: 'mine', label: 'Meus exercícios' }, { key: 'gifs', label: 'GIFs' }].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => { setExSourceFilter(f.key as any); setExSearch(''); setGifFolder(null); }}
              className={cn('px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border', exSourceFilter === f.key ? 'bg-primary text-primary-foreground border-primary' : 'glass border-transparent hover:bg-accent text-muted-foreground')}
            >
              {f.label}
            </button>
          ))}
        </div>

        {exSourceFilter === 'gifs' ? (
          // ── GIFs view ──────────────────────────────────────────────────
          <div className="space-y-3">
            {gifFolder ? (
              <>
                <button
                  type="button"
                  onClick={() => setGifFolder(null)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-3 h-3 rotate-180" />
                  Voltar
                </button>
                <h3 className="text-sm font-bold capitalize">{gifFolder}</h3>
                {!gifFiles ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <div key={i} className="glass rounded-xl animate-pulse h-16" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {gifFiles.map((file: any) => (
                      <GifCard
                        key={file.publicId}
                        file={file}
                        onAdd={() => addGifToWorkout(file)}
                        isAdding={addingGifId === file.publicId}
                        isAlreadyAdded={exerciseRows.some(r => r.name === file.name && r.videoUrl === file.url)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {!gifFolders ? (
                  [...Array(4)].map((_, i) => <div key={i} className="glass rounded-xl animate-pulse h-12" />)
                ) : gifFolders.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhuma pasta encontrada</p>
                ) : (
                  gifFolders.map((folder: any) => (
                    <button
                      key={folder.name}
                      type="button"
                      onClick={() => setGifFolder(folder.name)}
                      className="w-full glass rounded-xl px-3 py-2.5 flex items-center gap-3 hover:bg-accent/50 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 overflow-hidden flex-shrink-0">
                        {folder.thumbnailUrl ? (
                          <img src={folder.thumbnailUrl} alt={folder.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Dumbbell className="w-4 h-4 text-purple-400/40" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{folder.name}</p>
                        <p className="text-[10px] text-muted-foreground">{folder.count} exercício{folder.count !== 1 ? 's' : ''}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Search to add exercises */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={exSearch} onChange={e => setExSearch(e.target.value)} placeholder="Buscar exercício para adicionar..." className="input-field pl-9" />
            </div>

            {exSearch && (
              <div className="glass rounded-xl divide-y divide-border max-h-72 overflow-y-auto">
                {(allExercises || []).filter((e: any) => !exerciseRows.find(r => r.exerciseId === e.id)).slice(0, 10).map((ex: any) => (
                  <ExerciseSearchItem key={ex.id} exercise={ex} onAdd={() => { addExercise(ex); setExSearch(''); }} />
                ))}
                {(allExercises || []).filter((e: any) => !exerciseRows.find(r => r.exerciseId === e.id)).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3">Nenhum resultado</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Legend */}
        {exerciseRows.some(r => r.technique !== 'NORMAL') && (
          <div className="flex items-center gap-2 flex-wrap text-[10px]">
            <span className="text-muted-foreground">Técnicas:</span>
            {(Object.entries(TECHNIQUE_CONFIG) as [Technique, typeof TECHNIQUE_CONFIG.NORMAL][])
              .filter(([k]) => k !== 'NORMAL' && exerciseRows.some(r => r.technique === k))
              .map(([k, v]) => (
                <span key={k} className={cn('px-2 py-0.5 rounded-full font-semibold', v.bg, v.color)}>{v.label}</span>
              ))}
          </div>
        )}

        {/* Exercise rows */}
        {exerciseRows.length > 0 ? (
          <div className="space-y-1">
            {exerciseRows.map((row, i) => {
              const cfg = TECHNIQUE_CONFIG[row.technique];
              const nextRow = exerciseRows[i + 1];
              const isInGroup = !!row.groupId;
              const nextInSameGroup = !!nextRow && nextRow.groupId === row.groupId && !!row.groupId;
              const isFirstInGroup = isInGroup && (i === 0 || exerciseRows[i - 1].groupId !== row.groupId);

              return (
                <Fragment key={row.exerciseId}>
                  <div className={cn('glass rounded-xl p-3 space-y-2 transition-all', isInGroup && cfg.border, isInGroup && cfg.bg)}>
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-purple-600/10 flex items-center justify-center text-xs font-bold text-purple-400">{i + 1}</span>
                        {row.name}
                        {isInGroup && isFirstInGroup && (
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold', cfg.bg, cfg.color)}>{cfg.label}</span>
                        )}
                      </span>
                      <button type="button" onClick={() => removeExercise(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Séries</label>
                        <input type="number" min={1} value={row.sets} onChange={e => updateRow(i, 'sets', Number(e.target.value))} className="input-field py-1.5 text-sm text-center" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Reps</label>
                        <input type="text" value={row.reps} onChange={e => updateRow(i, 'reps', e.target.value)} placeholder="10" className="input-field py-1.5 text-sm text-center" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Carga (kg)</label>
                        <input type="number" min={0} value={row.weight ?? ''} onChange={e => updateRow(i, 'weight', e.target.value ? Number(e.target.value) : null)} placeholder="—" className="input-field py-1.5 text-sm text-center" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Descanso (s)</label>
                        <input type="number" min={0} value={row.restSeconds ?? ''} onChange={e => updateRow(i, 'restSeconds', e.target.value ? Number(e.target.value) : null)} placeholder="60" className="input-field py-1.5 text-sm text-center" />
                      </div>
                    </div>

                    {/* Video URL */}
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                        <Video className="w-3 h-3" />URL do vídeo
                      </label>
                      <input type="url" value={row.videoUrl} onChange={e => updateRow(i, 'videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=..." className="input-field py-1.5 text-sm" />
                    </div>

                    {/* Notes */}
                    <div>
                      <input type="text" value={row.notes} onChange={e => updateRow(i, 'notes', e.target.value)} placeholder="Observações (ex: foco na contração, ritmo lento...)" className="input-field py-1.5 text-xs text-muted-foreground" />
                    </div>

                    {/* Technique selector */}
                    <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground mr-0.5">Técnica:</span>
                      {(Object.entries(TECHNIQUE_CONFIG) as [Technique, typeof TECHNIQUE_CONFIG.NORMAL][]).map(([key, c]) => (
                        <button
                          key={key}
                          onClick={() => updateTechnique(i, key)}
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-medium transition-all',
                            row.technique === key
                              ? cn('font-semibold', c.bg, c.color, 'ring-1 ring-current/30')
                              : 'text-muted-foreground/40 hover:text-muted-foreground',
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Connector between rows */}
                  {i < exerciseRows.length - 1 && (
                    <div className="flex items-center justify-center h-5 relative">
                      {nextInSameGroup ? (
                        <button
                          onClick={() => unlinkBetween(i, i + 1)}
                          className={cn('flex items-center gap-1 text-[10px] font-medium transition-all hover:opacity-70', cfg.color)}
                          title="Desvincular exercícios"
                        >
                          <div className={cn('w-0.5 h-3', cfg.bg.replace('bg-', 'bg-').replace('/10', '/60'))} style={{ background: 'currentColor' }} />
                          <Unlink className="w-2.5 h-2.5" />
                          <div className={cn('w-0.5 h-3')} style={{ background: 'currentColor' }} />
                        </button>
                      ) : (
                        <button
                          onClick={() => linkExercises(i, i + 1)}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground/30 hover:text-primary transition-colors"
                          title="Vincular como treino conjugado"
                        >
                          <Link2 className="w-2.5 h-2.5" />
                          <span>vincular</span>
                        </button>
                      )}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Busque exercícios acima para adicionar ao treino</p>
        )}

        {saveExError && <div className="glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">{saveExError}</div>}
      </motion.div>

      {/* Assign to student */}
      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} onSubmit={handleAssign} className="glass-card space-y-5">
        <h2 className="font-semibold flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-cyan-400" />Atribuir a aluno
        </h2>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Aluno *</label>
          <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="input-field">
            <option value="">Selecione um aluno...</option>
            {(students || []).map((s: any) => (
              <option key={s.id} value={s.id}>{s.user?.profile?.firstName} {s.user?.profile?.lastName}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Data de início *</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Data de término</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" min={startDate} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Dias da semana</label>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS_SHORT.map((dayLabel, dayIndex) => (
              <button
                key={dayIndex}
                type="button"
                onClick={() => toggleDay(dayIndex)}
                className={cn(
                  'w-10 h-10 rounded-xl text-xs font-medium transition-all border',
                  selectedDays.includes(dayIndex)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'glass border-transparent hover:bg-accent text-muted-foreground',
                )}
              >
                {dayLabel}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Selecione os dias em que este treino será realizado</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Observações</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Foco em progressão de carga" className="input-field" />
        </div>

        {assignError && <div className="glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">{assignError}</div>}
        {assignSuccess && <div className="glass rounded-xl p-3 border border-emerald-500/20 text-emerald-400 text-sm">Treino atribuído com sucesso!</div>}

        <button type="submit" disabled={assignMutation.isPending} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
          <UserCheck className="w-4 h-4" />{assignMutation.isPending ? 'Atribuindo...' : 'Atribuir treino'}
        </button>
      </motion.form>
    </div>
  );
}

// ─── Exercise Search Item (thumbnail + hover preview) ───────────────────────

function getPreviewUrl(exercise: any): string | null {
  // GIF has highest priority (animated, lightweight for hover preview)
  if (exercise.gifUrl) return resolveImageUrl(exercise.gifUrl);
  // Video URL as fallback for MP4 preview
  if (exercise.videoUrl) return resolveVideoUrl(exercise.videoUrl);
  // Static thumbnail
  if (exercise.thumbnailUrl) return resolveImageUrl(exercise.thumbnailUrl);
  return null;
}

function ExerciseSearchItem({ exercise, onAdd }: { exercise: any; onAdd: () => void }) {
  const [showPreview, setShowPreview] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const rowRef = useRef<HTMLDivElement>(null);
  const previewUrl = getPreviewUrl(exercise);
  const isGif = exercise.gifUrl != null;
  const isVideo = !exercise.gifUrl && exercise.videoUrl != null;

  const muscleLabel = (exercise.muscleGroups?.[0] && MUSCLE_GROUP_LABELS[exercise.muscleGroups[0]]) || null;
  const categoryLabel = (exercise.category && CATEGORY_LABELS[exercise.category]) || null;
  const equipmentLabel = (exercise.equipment?.[0] && EQUIPMENT_LABELS[exercise.equipment[0]]) || null;

  const handleMouseEnter = () => {
    if (!rowRef.current) { setShowPreview(true); return; }
    const rect = rowRef.current.getBoundingClientRect();
    // Tooltip dimensions: roughly 224px wide, 196px tall (160 video + 36 label)
    const tooltipW = 224;
    const tooltipH = 196;
    const margin = 8;
    let left = rect.left;
    let top = rect.top - tooltipH - margin;
    // If it would go above viewport, show below instead
    if (top < 0) top = rect.bottom + margin;
    // Clamp left so tooltip doesn't go off-screen
    if (left + tooltipW > window.innerWidth - 16) left = window.innerWidth - tooltipW - 16;
    if (left < 16) left = 16;
    setTooltipPos({ top, left });
    setShowPreview(true);
  };

  return (
    <div
      ref={rowRef}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/60 transition-all text-left group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowPreview(false)}
    >
      {/* Thumbnail */}
      <div className="w-16 h-12 rounded-lg bg-white/5 overflow-hidden flex-shrink-0 relative">
        {previewUrl ? (
          isVideo ? (
            <video
              src={previewUrl}
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
              onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
              onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
            />
          ) : (
            <img src={previewUrl} alt={exercise.name} className="w-full h-full object-cover" loading="lazy" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-muted-foreground/40" />
          </div>
        )}
        {/* Play overlay */}
        {previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
            <Video className="w-4 h-4 text-white/70" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{exercise.name}</div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
          {categoryLabel && <span>{categoryLabel}</span>}
          {muscleLabel && <span className="text-purple-400/60">{muscleLabel}</span>}
          {equipmentLabel && <span>{equipmentLabel}</span>}
        </div>
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={onAdd}
        className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center flex-shrink-0 transition-all"
        title="Adicionar exercício"
      >
        <Plus className="w-4 h-4 text-primary" />
      </button>

      {/* Hover preview tooltip — fixed positioning to avoid overflow clipping */}
      {showPreview && previewUrl && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          <div className="rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10 w-56">
            {isVideo ? (
              <video
                src={previewUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-40 object-cover"
              />
            ) : (
              <img src={previewUrl} alt={exercise.name} className="w-full h-40 object-cover" />
            )}
            <div className="px-2.5 py-1.5 bg-white/5">
              <p className="text-xs font-medium truncate">{exercise.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {[categoryLabel, muscleLabel].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GifCard (compact version for workout detail) ──────────────────────────

function GifCard({ file, onAdd, isAdding, isAlreadyAdded }: { file: any; onAdd: () => void; isAdding: boolean; isAlreadyAdded: boolean }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="aspect-square bg-black/40 relative">
        <img src={file.url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-1.5 left-1.5 right-1.5">
          <p className="text-[10px] font-medium text-white line-clamp-2 leading-tight">{file.name}</p>
        </div>
      </div>
      <button
        type="button"
        disabled={isAdding || isAlreadyAdded}
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        className={cn(
          'w-full py-1.5 text-[10px] font-medium transition-colors flex items-center justify-center gap-1',
          isAlreadyAdded ? 'bg-emerald-500/10 text-emerald-400 cursor-default' : 'hover:bg-accent text-primary hover:text-primary/80',
          isAdding && 'opacity-50',
        )}
      >
        {isAlreadyAdded ? (
          <><CheckCircle className="w-3 h-3" />Adicionado</>
        ) : isAdding ? (
          <><div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />Adicionando...</>
        ) : (
          <><Plus className="w-3 h-3" />Adicionar</>
        )}
      </button>
    </div>
  );
}
