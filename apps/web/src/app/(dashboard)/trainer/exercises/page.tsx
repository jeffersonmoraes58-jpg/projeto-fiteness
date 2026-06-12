'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Dumbbell, Play, ChevronRight,
  Heart, Zap, Filter, Save, Video, ChevronDown, Trash2,
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
];

const DIFFICULTY_LABELS = ['', 'Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Elite'];

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
  const [form, setForm] = useState({
    name: '', description: '', instructions: '',
    category: 'CHEST', difficulty: '1', equipment: '', videoUrl: '',
  });
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
      setForm({ name: '', description: '', instructions: '', category: 'CHEST', difficulty: '1', equipment: '', videoUrl: '' });
    },
  });

  const filtered = (exercises || []).filter((e: any) => {
    const matchSearch = e.name?.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = !muscleFilter || e.category === muscleFilter || e.muscleGroups?.includes(muscleFilter);
    const matchSource = sourceFilter === 'all' || (sourceFilter === 'mine' && !e.isPublic) || (sourceFilter === 'app' && e.isPublic);
    return matchSearch && matchMuscle && matchSource;
  });

  const isAdded = (id: string) => added.some((a) => a.id === id);

  const toggleAdded = (exercise: any) => {
    setAdded((prev) =>
      prev.some((a) => a.id === exercise.id)
        ? prev.filter((a) => a.id !== exercise.id)
        : [...prev, exercise],
    );
  };

  const clearFilters = () => {
    setMuscleFilter('');
    setCategoryFilter('');
    setSearch('');
    setSourceFilter('all');
  };

  const hasActiveFilters = muscleFilter || categoryFilter || sourceFilter !== 'all';

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
                <input placeholder="Equipamento" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} className="input-field col-span-2" />
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
          <div className="space-y-2">
            {filtered.map((exercise: any, i: number) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                index={i}
                isAdded={isAdded(exercise.id)}
                onToggleAdd={() => toggleAdded(exercise)}
                onPlayVideo={() => exercise.videoUrl && setVideoModal(exercise)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Filter className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum exercício encontrado</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-primary mt-2 hover:underline">Limpar filtros</button>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar — exercícios adicionados */}
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

function ExerciseRow({ exercise, index, isAdded, onToggleAdd, onPlayVideo }: {
  exercise: any;
  index: number;
  isAdded: boolean;
  onToggleAdd: () => void;
  onPlayVideo: () => void;
}) {
  const thumbnail = exercise.videoUrl ? getYoutubeThumbnail(exercise.videoUrl) : null;
  const catLabel = CATEGORIES.find((c) => c.value === exercise.category)?.label || exercise.category;
  const diff = DIFFICULTY_LABELS[exercise.difficulty || 1] || 'Iniciante';
  const hasVideo = !!exercise.videoUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025 }}
      className="glass rounded-2xl overflow-hidden"
    >
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
          <div className="font-medium text-sm leading-tight">{exercise.name}</div>
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

        {/* Play button */}
        {hasVideo && (
          <button
            onClick={onPlayVideo}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-all flex-shrink-0"
          >
            <Play className="w-3.5 h-3.5 text-muted-foreground fill-muted-foreground ml-0.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
