'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Dumbbell, Play, ChevronRight,
  Zap, Filter, Video, ChevronDown, Trash2, Pencil, Save,
  Lock, BookOpen, User,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const MUSCLE_GROUPS = [
  { value: '', label: 'Grupos musculares' },
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
];

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

const DIFFICULTY_LABELS = ['', 'Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Elite'];

const EMPTY_FORM = {
  name: '', description: '', instructions: '',
  category: 'CHEST', difficulty: '1', equipment: '', videoUrl: '',
};

function getYoutubeThumbnail(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  return null;
}

function getEmbedUrl(url: string): { src: string; type: 'iframe' | 'video' } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1&autoplay=1` };
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return { type: 'iframe', src: `https://player.vimeo.com/video/${vim[1]}?autoplay=1` };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { type: 'video', src: url };
  return null;
}

export default function TrainerExercises() {
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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['trainer-exercises', categoryFilter, search],
    queryFn: () =>
      api.get(`/exercises?category=${categoryFilter}&search=${search}`).then((r) => r.data.data),
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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/exercises/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-exercises'] });
      setDeleteConfirm(null);
    },
  });

  const filtered = (exercises || []).filter((e: any) => {
    const matchSearch = e.name?.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = !muscleFilter || e.category === muscleFilter || e.muscleGroups?.includes(muscleFilter);
    const matchSource = sourceFilter === 'all' || (sourceFilter === 'mine' && !e.isPublic) || (sourceFilter === 'app' && e.isPublic);
    return matchSearch && matchMuscle && matchSource;
  });

  const systemExercises = filtered.filter((e: any) => e.isPublic && !e.trainerId);
  const myExercises = filtered.filter((e: any) => !e.isPublic || e.trainerId);

  const isAdded = (id: string) => added.some((a) => a.id === id);
  const toggleAdded = (exercise: any) => {
    setAdded((prev) =>
      prev.some((a) => a.id === exercise.id)
        ? prev.filter((a) => a.id !== exercise.id)
        : [...prev, exercise],
    );
  };

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

  const saveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      data: {
        name: editForm.name,
        description: editForm.description || undefined,
        instructions: editForm.instructions || undefined,
        category: editForm.category,
        difficulty: Number(editForm.difficulty),
        equipment: editForm.equipment ? editForm.equipment.split(',').map((e) => e.trim()).filter(Boolean) : [],
        videoUrl: editForm.videoUrl || undefined,
      },
    });
  };

  const clearFilters = () => {
    setMuscleFilter('');
    setCategoryFilter('');
    setSearch('');
    setSourceFilter('all');
  };

  const hasActiveFilters = muscleFilter || categoryFilter || sourceFilter !== 'all';

  const renderExerciseList = (list: any[], startIndex = 0) =>
    list.map((exercise: any, i: number) => (
      <ExerciseRow
        key={exercise.id}
        exercise={exercise}
        index={startIndex + i}
        isAdded={isAdded(exercise.id)}
        onToggleAdd={() => toggleAdded(exercise)}
        onPlayVideo={() => exercise.videoUrl && setVideoModal(exercise)}
        isSystem={exercise.isPublic && !exercise.trainerId}
        isEditing={editingId === exercise.id}
        editForm={editForm}
        onEditFormChange={(field, value) => setEditForm((f) => ({ ...f, [field]: value }))}
        onEdit={() => startEdit(exercise)}
        onEditSave={saveEdit}
        onEditCancel={() => setEditingId(null)}
        isSaving={updateMutation.isPending && editingId === exercise.id}
        onDelete={() => setDeleteConfirm(exercise.id)}
      />
    ));

  return (
    <div className="space-y-0 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Page header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Biblioteca de exercícios</h1>
        </div>

        {/* Create button */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <Plus className="w-4 h-4" />
          Criar exercício
        </button>

        {/* Create form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="glass-card border border-primary/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Novo Exercício</h2>
                <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field col-span-2" />
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field bg-background">
                  {CATEGORIES.filter(c => c.value).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="input-field bg-background">
                  {DIFFICULTY_LABELS.slice(1).map((l, i) => <option key={i + 1} value={i + 1}>{l}</option>)}
                </select>
                <input placeholder="Equipamento (ex: Barra, Halteres)" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} className="input-field col-span-2" />
                <textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field resize-none col-span-2" rows={2} />
                <textarea placeholder="Instruções de execução" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className="input-field resize-none col-span-2" rows={2} />
                <input placeholder="URL do vídeo (YouTube, Vimeo...)" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} className="input-field col-span-2" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1 text-sm py-2">Cancelar</button>
                <button
                  disabled={!form.name || createMutation.isPending}
                  onClick={() => createMutation.mutate({
                    name: form.name,
                    description: form.description || undefined,
                    instructions: form.instructions || undefined,
                    category: form.category,
                    difficulty: Number(form.difficulty),
                    equipment: form.equipment ? form.equipment.split(',').map((e) => e.trim()).filter(Boolean) : [],
                    videoUrl: form.videoUrl || undefined,
                    isPublic: false,
                  })}
                  className="btn-primary flex-1 text-sm py-2"
                >
                  {createMutation.isPending ? 'Salvando...' : 'Criar exercício'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar por nome"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>

        {/* Source filter pills */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'app', label: 'Exercícios do app' },
            { key: 'mine', label: 'Seus exercícios' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setSourceFilter(f.key as any)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex-shrink-0',
                sourceFilter === f.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'glass border-transparent hover:bg-accent text-muted-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Muscle / category dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select
              value={muscleFilter}
              onChange={(e) => setMuscleFilter(e.target.value)}
              className={cn(
                'appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-medium border transition-all bg-transparent cursor-pointer',
                muscleFilter ? 'border-primary text-primary' : 'border-border text-muted-foreground',
              )}
            >
              {MUSCLE_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={cn(
                'appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-medium border transition-all bg-transparent cursor-pointer',
                categoryFilter ? 'border-primary text-primary' : 'border-border text-muted-foreground',
              )}
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-primary hover:underline">
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Exercise list */}
      <div className="px-4 sm:px-6 lg:px-8 pb-32">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl glass animate-pulse">
                <div className="w-16 h-16 rounded-xl bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                  <div className="h-2 bg-white/5 rounded w-1/4" />
                  <div className="h-2 bg-white/5 rounded w-1/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          sourceFilter === 'all' ? (
            <div className="space-y-6">
              {/* System exercises */}
              {systemExercises.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 pb-1 border-b border-border">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Exercícios do App</span>
                    <span className="ml-auto text-xs text-muted-foreground">{systemExercises.length}</span>
                  </div>
                  {renderExerciseList(systemExercises, 0)}
                </div>
              )}

              {/* Trainer exercises */}
              {myExercises.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 pb-1 border-b border-border">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-foreground">Seus Exercícios</span>
                    <span className="ml-auto text-xs text-muted-foreground">{myExercises.length}</span>
                  </div>
                  {renderExerciseList(myExercises, systemExercises.length)}
                </div>
              )}

              {systemExercises.length === 0 && myExercises.length === 0 && (
                <EmptyState onClear={hasActiveFilters ? clearFilters : undefined} />
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {renderExerciseList(filtered)}
            </div>
          )
        ) : (
          <EmptyState onClear={hasActiveFilters ? clearFilters : undefined} />
        )}
      </div>

      {/* Bottom bar */}
      <AnimatePresence>
        {added.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-30 p-4 lg:pl-72"
          >
            <div className="max-w-2xl mx-auto glass-card border border-primary/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {added.length}
              </div>
              <span className="text-sm font-medium flex-1">
                {added.length} exercício{added.length > 1 ? 's' : ''} adicionado{added.length > 1 ? 's' : ''}
              </span>
              <button onClick={() => setAdded([])} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Limpar
              </button>
              <button className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                Usar no treino
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirm(null)}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold">Excluir exercício</p>
                  <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 text-sm py-2">Cancelar</button>
                <button
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteConfirm)}
                  className="flex-1 text-sm py-2 bg-destructive text-destructive-foreground rounded-xl font-semibold hover:bg-destructive/90 transition-all disabled:opacity-50"
                >
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setVideoModal(null)}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-card rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold">{videoModal.name}</span>
                <button onClick={() => setVideoModal(null)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
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

function EmptyState({ onClear }: { onClear?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Filter className="w-8 h-8 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">Nenhum exercício encontrado</p>
      {onClear && (
        <button onClick={onClear} className="text-xs text-primary mt-2 hover:underline">Limpar filtros</button>
      )}
    </div>
  );
}

function ExerciseRow({
  exercise, index, isAdded, onToggleAdd, onPlayVideo,
  isSystem, isEditing, editForm, onEditFormChange,
  onEdit, onEditSave, onEditCancel, isSaving, onDelete,
}: {
  exercise: any;
  index: number;
  isAdded: boolean;
  onToggleAdd: () => void;
  onPlayVideo: () => void;
  isSystem: boolean;
  isEditing: boolean;
  editForm: any;
  onEditFormChange: (field: string, value: string) => void;
  onEdit: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  isSaving: boolean;
  onDelete: () => void;
}) {
  const thumbnail = exercise.videoUrl ? getYoutubeThumbnail(exercise.videoUrl) : null;
  const catLabel = CATEGORIES.find((c) => c.value === exercise.category)?.label || exercise.category;
  const hasVideo = !!exercise.videoUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {isEditing ? (
        /* Inline edit form */
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-primary">Editar exercício</span>
            <button onClick={onEditCancel} className="w-6 h-6 rounded-md hover:bg-accent flex items-center justify-center">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Nome *"
              value={editForm.name}
              onChange={(e) => onEditFormChange('name', e.target.value)}
              className="input-field col-span-2 text-sm py-2"
            />
            <select
              value={editForm.category}
              onChange={(e) => onEditFormChange('category', e.target.value)}
              className="input-field bg-background text-sm py-2"
            >
              {CATEGORIES.filter(c => c.value).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select
              value={editForm.difficulty}
              onChange={(e) => onEditFormChange('difficulty', e.target.value)}
              className="input-field bg-background text-sm py-2"
            >
              {DIFFICULTY_LABELS.slice(1).map((l, i) => <option key={i + 1} value={i + 1}>{l}</option>)}
            </select>
            <input
              placeholder="Equipamento"
              value={editForm.equipment}
              onChange={(e) => onEditFormChange('equipment', e.target.value)}
              className="input-field col-span-2 text-sm py-2"
            />
            <input
              placeholder="URL do vídeo"
              value={editForm.videoUrl}
              onChange={(e) => onEditFormChange('videoUrl', e.target.value)}
              className="input-field col-span-2 text-sm py-2"
            />
            <textarea
              placeholder="Descrição"
              value={editForm.description}
              onChange={(e) => onEditFormChange('description', e.target.value)}
              className="input-field resize-none col-span-2 text-sm py-2"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onEditCancel} className="btn-secondary flex-1 text-xs py-1.5">Cancelar</button>
            <button
              disabled={!editForm.name || isSaving}
              onClick={onEditSave}
              className="btn-primary flex-1 text-xs py-1.5 flex items-center justify-center gap-1.5"
            >
              <Save className="w-3 h-3" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3">
          {/* Thumbnail */}
          <div
            className={cn(
              'w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden relative',
              !thumbnail && 'bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center',
            )}
          >
            {thumbnail ? (
              <>
                <img src={thumbnail} alt={exercise.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30" />
              </>
            ) : (
              <Dumbbell className="w-6 h-6 text-purple-400" />
            )}
            {hasVideo && (
              <button
                onClick={onPlayVideo}
                className="absolute inset-0 flex items-center justify-center hover:bg-black/20 transition-all group"
              >
                <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-all">
                  <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                </div>
              </button>
            )}
          </div>

          {/* Info */}
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
              {exercise.equipment?.slice(0, 1).map((eq: string) => (
                <span key={eq} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground">{eq}</span>
              ))}
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground">{catLabel}</span>
            </div>
            <button
              onClick={onToggleAdd}
              className={cn(
                'mt-1.5 text-[11px] font-medium transition-colors flex items-center gap-1',
                isAdded ? 'text-emerald-400' : 'text-primary hover:text-primary/80',
              )}
            >
              {isAdded ? (
                <><Zap className="w-3 h-3 fill-emerald-400" />Adicionado ao treino</>
              ) : (
                <><Plus className="w-3 h-3" />Adicionar ao treino</>
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {hasVideo && (
              <button
                onClick={onPlayVideo}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-all"
              >
                <Play className="w-3 h-3 text-muted-foreground fill-muted-foreground ml-0.5" />
              </button>
            )}
            {!isSystem && (
              <>
                <button
                  onClick={onEdit}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent hover:border-primary/30 transition-all"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={onDelete}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-destructive/10 hover:border-destructive/30 transition-all"
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
