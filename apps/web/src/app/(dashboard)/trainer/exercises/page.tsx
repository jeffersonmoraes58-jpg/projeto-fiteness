'use client';

import { useState, useRef, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Dumbbell, Play, ChevronRight,
  Zap, Filter, ChevronDown, Trash2, Pencil, Save,
  Lock, BookOpen, User, Video, CheckCircle, Link2, Upload,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { resolveVideoUrl } from '@/lib/video-url';

const CATEGORIES = [
  { value: '', label: 'Categorias' },
  { value: 'CHEST', label: 'Peito' },
  { value: 'BACK', label: 'Costas' },
  { value: 'SHOULDERS', label: 'Ombros' },
  { value: 'BICEPS', label: 'Bíceps' },
  { value: 'TRICEPS', label: 'Tríceps' },
  { value: 'LEGS', label: 'Pernas' },
  { value: 'GLUTES', label: 'Glúteos' },
  { value: 'CORE', label: 'Core' },
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'FULL_BODY', label: 'Corpo todo' },
  { value: 'MOBILITY', label: 'Mobilidade' },
];

const MUSCLE_GROUPS = [
  { value: '', label: 'Grupos musculares' },
  ...CATEGORIES.slice(1),
];

const DIFFICULTY_LABELS = ['', 'Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Elite'];
const EMPTY_FORM = { name: '', description: '', instructions: '', category: 'CHEST', difficulty: '1', equipment: '', videoUrl: '' };

function getYoutubeThumbnail(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
}

function getCloudinaryThumbnail(url: string): string | null {
  if (!url?.includes('cloudinary.com')) return null;
  return url
    .replace('/upload/', '/upload/so_0,w_320,h_240,c_fill/')
    .replace(/\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i, '.jpg');
}

function getVideoThumbnail(url: string): string | null {
  return getYoutubeThumbnail(url) || getCloudinaryThumbnail(url);
}

function getEmbedUrl(rawUrl: string): { src: string; type: 'iframe' | 'video' } | null {
  if (!rawUrl) return null;
  const url = resolveVideoUrl(rawUrl);
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1&autoplay=1` };
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return { type: 'iframe', src: `https://player.vimeo.com/video/${vim[1]}?autoplay=1` };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { type: 'video', src: url };
  // Cloudinary video URL
  if (url.includes('cloudinary.com')) return { type: 'video', src: url };
  // MuscleWiki proxy stream
  if (url.includes('/musclewiki/stream/')) return { type: 'video', src: url };
  return null;
}

function VideoInput({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (url: string) => void;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<'link' | 'upload'>('link');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Apenas arquivos de vídeo são permitidos');
      return;
    }
    setError('');
    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const r = await api.post('/uploads/exercise-video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e: any) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      const url = r.data?.data?.url || r.data?.url;
      onChange(url);
      setProgress(100);
    } catch {
      setError('Erro ao enviar vídeo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const inputCls = compact ? 'text-xs py-1.5' : 'text-sm';

  return (
    <div className="col-span-2 space-y-2">
      <div className="flex gap-0.5 p-0.5 bg-white/5 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode('link')}
          className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all', mode === 'link' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
        >
          <Link2 className="w-3 h-3" />Link
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all', mode === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
        >
          <Upload className="w-3 h-3" />Minha galeria
        </button>
      </div>

      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {mode === 'link' ? (
        <input
          type="url"
          placeholder="https://youtube.com/watch?v=..."
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn('input-field w-full', inputCls)}
        />
      ) : uploading ? (
        <div className="p-3 rounded-xl border border-border space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Enviando vídeo...</span>
            <span className="text-primary font-medium">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : value && value.includes('cloudinary.com') ? (
        <div className="space-y-2">
          <video
            src={value}
            className="w-full rounded-xl bg-black object-cover"
            style={{ maxHeight: compact ? '120px' : '160px' }}
            controls
            preload="metadata"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle className="w-3 h-3" />Vídeo pronto para uso
            </span>
            <button
              type="button"
              onClick={() => { onChange(''); fileRef.current?.click(); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Trocar vídeo
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          <Upload className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Clique para escolher um vídeo</span>
          <span className="text-[10px] text-muted-foreground/50">MP4, WebM, MOV — máx 500 MB</span>
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function TrainerExercises() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'app' | 'mine'>('all');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [videoModal, setVideoModal] = useState<any>(null);
  const [added, setAdded] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [videoEditId, setVideoEditId] = useState<string | null>(null);
  const [videoEditUrl, setVideoEditUrl] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [workoutModal, setWorkoutModal] = useState(false);
  const [addingToWorkout, setAddingToWorkout] = useState(false);
  const queryClient = useQueryClient();

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['trainer-exercises', categoryFilter, search],
    queryFn: () => api.get(`/exercises?category=${categoryFilter}&search=${search}`).then(r => r.data.data),
  });

  const { data: workouts } = useQuery({
    queryKey: ['workouts-picker'],
    queryFn: () => api.get('/workouts').then(r => r.data.data || []),
    enabled: workoutModal,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/exercises', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-exercises'] });
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/exercises/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-exercises'] });
      setEditingId(null);
      setVideoEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/exercises/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-exercises'] });
      setDeleteConfirm(null);
    },
  });

  const addToWorkoutMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      const { data } = await api.get(`/workouts/${workoutId}`);
      const current = (data.data.exercises || []).map((e: any) => ({
        exerciseId: e.exercise?.id || e.exerciseId,
        sets: e.sets || 3,
        reps: String(e.reps || '10'),
        weight: e.weight ?? undefined,
        restSeconds: e.restSeconds ?? 60,
        videoUrl: e.exercise?.videoUrl || '',
      }));
      const toAdd = added
        .filter(ex => !current.find((c: any) => c.exerciseId === ex.id))
        .map(ex => ({ exerciseId: ex.id, sets: 3, reps: '10', restSeconds: 60, videoUrl: ex.videoUrl || '' }));
      await api.patch(`/workouts/${workoutId}`, { exercises: [...current, ...toAdd] });
      return workoutId;
    },
    onSuccess: (workoutId) => {
      setWorkoutModal(false);
      setAdded([]);
      router.push(`/trainer/workouts/${workoutId}`);
    },
  });

  const filtered = (exercises || []).filter((e: any) => {
    const matchSearch = e.name?.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = !muscleFilter || e.category === muscleFilter || e.muscleGroups?.includes(muscleFilter);
    const matchSource = sourceFilter === 'all' || (sourceFilter === 'mine' && (!e.isPublic || e.trainerId)) || (sourceFilter === 'app' && e.isPublic && !e.trainerId);
    return matchSearch && matchMuscle && matchSource;
  });

  const systemExercises = filtered.filter((e: any) => e.isPublic && !e.trainerId);
  const myExercises = filtered.filter((e: any) => !e.isPublic || e.trainerId);

  const isAdded = (id: string) => added.some(a => a.id === id);
  const toggleAdded = (exercise: any) =>
    setAdded(prev => prev.some(a => a.id === exercise.id) ? prev.filter(a => a.id !== exercise.id) : [...prev, exercise]);

  const startEdit = (exercise: any) => {
    setEditingId(exercise.id);
    setEditForm({
      name: exercise.name || '',
      description: exercise.description || '',
      instructions: exercise.instructions || '',
      category: exercise.category || 'CHEST',
      difficulty: String(exercise.difficulty || 1),
      equipment: (exercise.equipment || []).join(', '),
      videoUrl: exercise.videoUrl || '',
    });
  };

  const clearFilters = () => { setMuscleFilter(''); setCategoryFilter(''); setSearch(''); setSourceFilter('all'); };
  const hasActiveFilters = !!(muscleFilter || categoryFilter || sourceFilter !== 'all');

  const renderList = (list: any[], offset = 0) =>
    list.map((exercise: any, i: number) => (
      <ExerciseRow
        key={exercise.id}
        exercise={exercise}
        index={offset + i}
        isAdded={isAdded(exercise.id)}
        onToggleAdd={() => toggleAdded(exercise)}
        onPlayVideo={() => exercise.videoUrl && setVideoModal(exercise)}
        isSystem={exercise.isPublic && !exercise.trainerId}
        isEditing={editingId === exercise.id}
        editForm={editForm}
        onEditFormChange={(f, v) => setEditForm(ef => ({ ...ef, [f]: v }))}
        onEdit={() => startEdit(exercise)}
        onEditSave={() => updateMutation.mutate({ id: editingId!, data: { name: editForm.name, description: editForm.description || undefined, instructions: editForm.instructions || undefined, category: editForm.category, difficulty: Number(editForm.difficulty), equipment: editForm.equipment ? editForm.equipment.split(',').map(e => e.trim()).filter(Boolean) : [], videoUrl: editForm.videoUrl || undefined } })}
        onEditCancel={() => setEditingId(null)}
        isSaving={updateMutation.isPending && editingId === exercise.id}
        onDelete={() => setDeleteConfirm(exercise.id)}
        isVideoEditing={videoEditId === exercise.id}
        videoEditUrl={videoEditUrl}
        onVideoEdit={() => { setVideoEditId(exercise.id); setVideoEditUrl(exercise.videoUrl || ''); }}
        onVideoEditChange={setVideoEditUrl}
        onVideoEditSave={() => updateMutation.mutate({ id: exercise.id, data: { videoUrl: videoEditUrl || undefined } })}
        onVideoEditCancel={() => setVideoEditId(null)}
        isVideoSaving={updateMutation.isPending && videoEditId === exercise.id}
      />
    ));

  return (
    <div className="space-y-0 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <h1 className="text-2xl font-bold">Biblioteca de exercícios</h1>

        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <Plus className="w-4 h-4" />Criar exercício
        </button>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="glass-card border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Novo Exercício</h2>
                <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Nome *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field col-span-2" />
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field bg-background">
                  {CATEGORIES.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className="input-field bg-background">
                  {DIFFICULTY_LABELS.slice(1).map((l, i) => <option key={i + 1} value={i + 1}>{l}</option>)}
                </select>
                <input placeholder="Equipamento (ex: Barra, Halteres)" value={form.equipment} onChange={e => setForm({ ...form, equipment: e.target.value })} className="input-field col-span-2" />
                <textarea placeholder="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field resize-none col-span-2" rows={2} />
                <VideoInput value={form.videoUrl} onChange={url => setForm({ ...form, videoUrl: url })} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1 text-sm py-2">Cancelar</button>
                <button
                  disabled={!form.name || createMutation.isPending}
                  onClick={() => createMutation.mutate({ name: form.name, description: form.description || undefined, instructions: form.instructions || undefined, category: form.category, difficulty: Number(form.difficulty), equipment: form.equipment ? form.equipment.split(',').map(e => e.trim()).filter(Boolean) : [], videoUrl: form.videoUrl || undefined, isPublic: false })}
                  className="btn-primary flex-1 text-sm py-2"
                >
                  {createMutation.isPending ? 'Salvando...' : 'Criar exercício'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Pesquisar por nome" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" />
        </div>

        <div className="flex gap-2">
          {[{ key: 'all', label: 'Todos' }, { key: 'app', label: 'Exercícios do app' }, { key: 'mine', label: 'Seus exercícios' }].map(f => (
            <button key={f.key} onClick={() => setSourceFilter(f.key as any)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex-shrink-0', sourceFilter === f.key ? 'bg-primary text-primary-foreground border-primary' : 'glass border-transparent hover:bg-accent text-muted-foreground')}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select value={muscleFilter} onChange={e => setMuscleFilter(e.target.value)} className={cn('appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-medium border transition-all bg-transparent cursor-pointer', muscleFilter ? 'border-primary text-primary' : 'border-border text-muted-foreground')}>
              {MUSCLE_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={cn('appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-medium border transition-all bg-transparent cursor-pointer', categoryFilter ? 'border-primary text-primary' : 'border-border text-muted-foreground')}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          {hasActiveFilters && <button onClick={clearFilters} className="text-xs text-primary hover:underline">Limpar</button>}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pb-32">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="flex items-center gap-3 p-3 rounded-2xl glass animate-pulse"><div className="w-16 h-16 rounded-xl bg-white/10 flex-shrink-0" /><div className="flex-1 space-y-2"><div className="h-3 bg-white/10 rounded w-1/3" /><div className="h-2 bg-white/5 rounded w-1/4" /></div></div>)}
          </div>
        ) : filtered.length > 0 ? (
          sourceFilter === 'all' ? (
            <div className="space-y-6">
              {systemExercises.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 pb-1 border-b border-border">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">Exercícios do App</span>
                    <span className="ml-auto text-xs text-muted-foreground">{systemExercises.length}</span>
                  </div>
                  {renderList(systemExercises, 0)}
                </div>
              )}
              {myExercises.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 pb-1 border-b border-border">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold">Seus Exercícios</span>
                    <span className="ml-auto text-xs text-muted-foreground">{myExercises.length}</span>
                  </div>
                  {renderList(myExercises, systemExercises.length)}
                </div>
              )}
            </div>
          ) : <div className="space-y-2">{renderList(filtered)}</div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Filter className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum exercício encontrado</p>
            {hasActiveFilters && <button onClick={clearFilters} className="text-xs text-primary mt-2 hover:underline">Limpar filtros</button>}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <AnimatePresence>
        {added.length > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed bottom-0 left-0 right-0 z-30 p-4 lg:pl-72">
            <div className="max-w-2xl mx-auto glass-card border border-primary/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{added.length}</div>
              <span className="text-sm font-medium flex-1">{added.length} exercício{added.length > 1 ? 's' : ''} selecionado{added.length > 1 ? 's' : ''}</span>
              <button onClick={() => setAdded([])} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Limpar</button>
              <button onClick={() => setWorkoutModal(true)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                Usar no treino <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workout picker modal */}
      <AnimatePresence>
        {workoutModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setWorkoutModal(false)} className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-card rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold">Adicionar a qual treino?</span>
                <button onClick={() => setWorkoutModal(false)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {!workouts ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
                ) : workouts.filter((w: any) => w.status !== 'ARCHIVED').length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Nenhum treino encontrado</div>
                ) : workouts.filter((w: any) => w.status !== 'ARCHIVED').map((w: any) => (
                  <button
                    key={w.id}
                    disabled={addToWorkoutMutation.isPending}
                    onClick={() => { setAddingToWorkout(true); addToWorkoutMutation.mutate(w.id); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-all text-left disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w._count?.exercises ?? 0} exercícios</p>
                    </div>
                    {addToWorkoutMutation.isPending && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)} className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-card rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-destructive" /></div>
                <div><p className="font-semibold">Excluir exercício</p><p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 text-sm py-2">Cancelar</button>
                <button disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteConfirm)} className="flex-1 text-sm py-2 bg-destructive text-destructive-foreground rounded-xl font-semibold hover:bg-destructive/90 transition-all disabled:opacity-50">
                  {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video modal */}
      <AnimatePresence>
        {videoModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setVideoModal(null)} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="w-full max-w-2xl bg-card rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold">{videoModal.name}</span>
                <button onClick={() => setVideoModal(null)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div style={{ aspectRatio: '16/9' }}>
                {(() => {
                  const embed = getEmbedUrl(videoModal.videoUrl);
                  if (!embed) return null;
                  return embed.type === 'video'
                    ? <video src={embed.src} controls autoPlay className="w-full h-full" />
                    : <iframe src={embed.src} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen title={videoModal.name} />;
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExerciseRow({
  exercise, index, isAdded, onToggleAdd, onPlayVideo,
  isSystem, isEditing, editForm, onEditFormChange, onEdit, onEditSave, onEditCancel, isSaving, onDelete,
  isVideoEditing, videoEditUrl, onVideoEdit, onVideoEditChange, onVideoEditSave, onVideoEditCancel, isVideoSaving,
}: any) {
  const thumbnail = exercise.videoUrl ? getVideoThumbnail(exercise.videoUrl) : null;
  const catLabel = CATEGORIES.find(c => c.value === exercise.category)?.label || exercise.category;
  const hasVideo = !!exercise.videoUrl;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }} className="glass rounded-2xl overflow-hidden">
      {isEditing ? (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-primary">Editar exercício</span>
            <button onClick={onEditCancel} className="w-6 h-6 rounded-md hover:bg-accent flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Nome *" value={editForm.name} onChange={e => onEditFormChange('name', e.target.value)} className="input-field col-span-2 text-sm py-2" />
            <select value={editForm.category} onChange={e => onEditFormChange('category', e.target.value)} className="input-field bg-background text-sm py-2">
              {CATEGORIES.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={editForm.difficulty} onChange={e => onEditFormChange('difficulty', e.target.value)} className="input-field bg-background text-sm py-2">
              {DIFFICULTY_LABELS.slice(1).map((l, i) => <option key={i + 1} value={i + 1}>{l}</option>)}
            </select>
            <input placeholder="Equipamento" value={editForm.equipment} onChange={e => onEditFormChange('equipment', e.target.value)} className="input-field col-span-2 text-sm py-2" />
            <VideoInput value={editForm.videoUrl} onChange={url => onEditFormChange('videoUrl', url)} compact />
            <textarea placeholder="Descrição" value={editForm.description} onChange={e => onEditFormChange('description', e.target.value)} className="input-field resize-none col-span-2 text-sm py-2" rows={2} />
          </div>
          <div className="flex gap-2">
            <button onClick={onEditCancel} className="btn-secondary flex-1 text-xs py-1.5">Cancelar</button>
            <button disabled={!editForm.name || isSaving} onClick={onEditSave} className="btn-primary flex-1 text-xs py-1.5 flex items-center justify-center gap-1.5">
              <Save className="w-3 h-3" />{isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 p-3">
            <div className={cn('w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden relative', !thumbnail && 'bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center')}>
              {thumbnail ? (<><img src={thumbnail} alt={exercise.name} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/30" /></>) : (<Dumbbell className="w-6 h-6 text-purple-400" />)}
              {hasVideo && (
                <button onClick={onPlayVideo} className="absolute inset-0 flex items-center justify-center hover:bg-black/20 transition-all group">
                  <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-all">
                    <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                  </div>
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-sm leading-tight">{exercise.name}</span>
                {isSystem && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    <Lock className="w-2.5 h-2.5" />App
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {exercise.equipment?.slice(0, 1).map((eq: string) => <span key={eq} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground">{eq}</span>)}
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground">{catLabel}</span>
              </div>
              <button onClick={onToggleAdd} className={cn('mt-1.5 text-[11px] font-medium transition-colors flex items-center gap-1', isAdded ? 'text-emerald-400' : 'text-primary hover:text-primary/80')}>
                {isAdded ? <><Zap className="w-3 h-3 fill-emerald-400" />Adicionado</> : <><Plus className="w-3 h-3" />Adicionar ao treino</>}
              </button>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {hasVideo && <button onClick={onPlayVideo} className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-all"><Play className="w-3 h-3 text-muted-foreground fill-muted-foreground ml-0.5" /></button>}
              {isSystem ? (
                <button onClick={onVideoEdit} className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent hover:border-primary/30 transition-all" title="Adicionar/editar vídeo">
                  <Video className="w-3 h-3 text-muted-foreground" />
                </button>
              ) : (
                <>
                  <button onClick={onEdit} className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent hover:border-primary/30 transition-all"><Pencil className="w-3 h-3 text-muted-foreground" /></button>
                  <button onClick={onDelete} className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-destructive/10 hover:border-destructive/30 transition-all"><Trash2 className="w-3 h-3 text-muted-foreground" /></button>
                </>
              )}
            </div>
          </div>

          {/* Inline video editor for system exercises */}
          <AnimatePresence>
            {isVideoEditing && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border">
                <div className="p-3 space-y-2 bg-primary/5">
                  <div className="grid grid-cols-2 gap-2">
                    <VideoInput value={videoEditUrl} onChange={onVideoEditChange} compact />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={onVideoEditCancel} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1">Cancelar</button>
                    <button
                      onClick={onVideoEditSave}
                      disabled={isVideoSaving}
                      className="text-xs text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1 disabled:opacity-50"
                    >
                      {isVideoSaving ? <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Salvar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
