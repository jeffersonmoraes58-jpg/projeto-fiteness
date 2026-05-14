'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Dumbbell, Video,
  ChevronDown, ChevronUp, Zap, Filter, Save,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'ALL', label: 'Todos' },
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
const DIFFICULTY_COLORS = ['', 'text-emerald-400', 'text-cyan-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'];

function getEmbedUrl(url: string): { src: string; type: 'iframe' | 'video' } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1` };
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return { type: 'iframe', src: `https://player.vimeo.com/video/${vim[1]}?title=0&byline=0` };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { type: 'video', src: url };
  return null;
}

export default function TrainerExercises() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', instructions: '',
    category: 'CHEST', difficulty: '1', equipment: '', videoUrl: '',
  });
  const queryClient = useQueryClient();

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['trainer-exercises', category, search],
    queryFn: () => api.get(`/exercises?category=${category === 'ALL' ? '' : category}&search=${search}`).then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/exercises', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-exercises'] });
      setShowForm(false);
      setForm({ name: '', description: '', instructions: '', category: 'CHEST', difficulty: '1', equipment: '', videoUrl: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, videoUrl }: { id: string; videoUrl: string }) =>
      api.patch(`/exercises/${id}`, { videoUrl: videoUrl || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainer-exercises'] }),
  });

  const filtered = (exercises || []).filter((e: any) =>
    e.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exercícios</h1>
          <p className="text-muted-foreground text-sm mt-1">{exercises?.length ?? 0} exercícios disponíveis</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm py-2">
          <Plus className="w-4 h-4" />
          Novo exercício
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card border border-primary/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Novo Exercício</h2>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Nome do exercício *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field col-span-2" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field bg-background">
                {CATEGORIES.filter(c => c.value !== 'ALL').map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="input-field bg-background">
                {DIFFICULTY_LABELS.slice(1).map((l, i) => (
                  <option key={i + 1} value={i + 1}>{l}</option>
                ))}
              </select>
              <input placeholder="Equipamento (opcional)" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} className="input-field col-span-2" />
              <textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field resize-none col-span-2" rows={2} />
              <textarea placeholder="Instruções de execução" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className="input-field resize-none col-span-2" rows={3} />
              <input placeholder="URL do vídeo (opcional)" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} className="input-field col-span-2" />
            </div>
            <div className="flex gap-3 mt-4">
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

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar exercício..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                'px-3 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all border',
                category === cat.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'glass border-transparent hover:bg-accent',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-2 bg-white/5 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((exercise: any, i: number) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={i}
              isExpanded={expanded === exercise.id}
              onToggle={() => setExpanded(expanded === exercise.id ? null : exercise.id)}
              onSaveVideo={(videoUrl) => updateMutation.mutate({ id: exercise.id, videoUrl })}
              savingId={updateMutation.isPending ? (updateMutation.variables as any)?.id : null}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-12 text-center">
          <Filter className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum exercício encontrado</p>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ exercise, index, isExpanded, onToggle, onSaveVideo, savingId }: {
  exercise: any;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSaveVideo: (videoUrl: string) => void;
  savingId: string | null;
}) {
  const [videoUrl, setVideoUrl] = useState(exercise.videoUrl || '');
  const catLabel = CATEGORIES.find((c) => c.value === exercise.category)?.label || exercise.category;
  const diff = exercise.difficulty || 1;
  const isSaving = savingId === exercise.id;
  const hasChanged = videoUrl !== (exercise.videoUrl || '');
  const embed = getEmbedUrl(videoUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="glass-card !p-0 overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-all text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-purple-600/10 flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{exercise.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full glass text-muted-foreground">{catLabel}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className={cn('flex items-center gap-1 font-medium', DIFFICULTY_COLORS[diff])}>
              <Zap className="w-3 h-3" />{DIFFICULTY_LABELS[diff]}
            </span>
            {exercise.equipment?.length > 0 && (
              <span>{exercise.equipment.slice(0, 2).join(', ')}</span>
            )}
          </div>
        </div>
        {exercise.videoUrl && <Video className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {exercise.description && (
                <p className="text-sm text-muted-foreground">{exercise.description}</p>
              )}
              {exercise.instructions && (
                <div>
                  <p className="text-xs font-medium mb-1">Execução:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{exercise.instructions}</p>
                </div>
              )}
              {exercise.muscleGroups?.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Músculos trabalhados:</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {exercise.muscleGroups.map((m: string) => (
                      <span key={m} className="text-xs px-2 py-0.5 rounded-full glass text-muted-foreground">{m.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Video URL edit */}
              <div className="space-y-2 pt-1 border-t border-border/30">
                <p className="text-xs font-medium flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-cyan-400" />
                  URL do vídeo demonstrativo
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Cole o link do YouTube, Vimeo ou MP4..."
                    className="input-field flex-1 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); onSaveVideo(videoUrl); }}
                    disabled={!hasChanged || isSaving}
                    className={cn(
                      'flex items-center gap-1.5 px-3 rounded-xl text-sm font-medium transition-all flex-shrink-0',
                      hasChanged && !isSaving
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-white/5 text-muted-foreground cursor-not-allowed',
                    )}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>

                {/* Preview */}
                {embed && (
                  <div className="rounded-xl overflow-hidden mt-2" style={{ aspectRatio: '16/9' }}>
                    {embed.type === 'video' ? (
                      <video src={embed.src} controls className="w-full h-full" />
                    ) : (
                      <iframe
                        src={embed.src}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={exercise.name}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
