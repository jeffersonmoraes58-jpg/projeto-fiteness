'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Plus, Search, Copy, Archive, MoreVertical,
  ChevronRight, Clock, Users, Layers, Zap, FileText,
  ChevronDown, ChevronUp, Sparkles, X, Wand2, CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['Todos', 'Rascunho', 'Ativo', 'Arquivado', 'Templates'];
const STATUS_MAP: Record<string, string> = { Rascunho: 'DRAFT', Ativo: 'ACTIVE', Arquivado: 'ARCHIVED' };
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-yellow-500/10 text-yellow-400' },
  ACTIVE: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400' },
  ARCHIVED: { label: 'Arquivado', color: 'bg-muted text-muted-foreground' },
};
const LEVEL_LABELS = ['', 'Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Elite'];

interface TemplateExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
}

interface WorkoutTemplate {
  id: string;
  emoji: string;
  name: string;
  description: string;
  category: string;
  level: number;
  duration: number;
  tags: string[];
  gradient: string;
  exercises: TemplateExercise[];
}

const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'abc-a',
    emoji: '💪',
    name: 'Treino A – Peito e Bíceps',
    description: 'ABC Hipertrofia — Dia 1. Peito superior, médio e inferior com finalização de bíceps.',
    category: 'Hipertrofia',
    level: 2,
    duration: 60,
    tags: ['hipertrofia', 'abc', 'peito', 'bíceps'],
    gradient: 'from-purple-600 to-indigo-600',
    exercises: [
      { name: 'Supino Reto', sets: 4, reps: '8-10', restSeconds: 90 },
      { name: 'Supino Inclinado', sets: 3, reps: '10-12', restSeconds: 60 },
      { name: 'Crucifixo', sets: 3, reps: '12', restSeconds: 60 },
      { name: 'Crossover', sets: 3, reps: '15', restSeconds: 45 },
      { name: 'Rosca Direta', sets: 4, reps: '10', restSeconds: 60 },
      { name: 'Rosca Alternada', sets: 3, reps: '12', restSeconds: 60 },
    ],
  },
  {
    id: 'abc-b',
    emoji: '🔷',
    name: 'Treino B – Costas e Tríceps',
    description: 'ABC Hipertrofia — Dia 2. Volume para dorsais e romboides com tríceps no final.',
    category: 'Hipertrofia',
    level: 2,
    duration: 60,
    tags: ['hipertrofia', 'abc', 'costas', 'tríceps'],
    gradient: 'from-blue-600 to-cyan-600',
    exercises: [
      { name: 'Puxada Frontal', sets: 4, reps: '10', restSeconds: 90 },
      { name: 'Remada Curvada', sets: 4, reps: '10', restSeconds: 90 },
      { name: 'Remada Unilateral', sets: 3, reps: '12', restSeconds: 60 },
      { name: 'Barra Fixa', sets: 3, reps: 'máx', restSeconds: 90 },
      { name: 'Tríceps Corda', sets: 4, reps: '12', restSeconds: 60 },
      { name: 'Tríceps Testa', sets: 3, reps: '10', restSeconds: 60 },
    ],
  },
  {
    id: 'abc-c',
    emoji: '🦵',
    name: 'Treino C – Pernas Completo',
    description: 'ABC Hipertrofia — Dia 3. Quadríceps, posteriores, glúteos e panturrilha.',
    category: 'Hipertrofia',
    level: 2,
    duration: 70,
    tags: ['hipertrofia', 'abc', 'pernas', 'glúteos'],
    gradient: 'from-emerald-600 to-teal-600',
    exercises: [
      { name: 'Agachamento Livre', sets: 4, reps: '10', restSeconds: 120 },
      { name: 'Leg Press 45°', sets: 4, reps: '12', restSeconds: 90 },
      { name: 'Cadeira Extensora', sets: 3, reps: '15', restSeconds: 60 },
      { name: 'Cadeira Flexora', sets: 3, reps: '15', restSeconds: 60 },
      { name: 'Stiff', sets: 3, reps: '12', restSeconds: 90 },
      { name: 'Panturrilha em Pé', sets: 4, reps: '20', restSeconds: 45 },
    ],
  },
  {
    id: 'ombros-core',
    emoji: '🏋️',
    name: 'Ombros e Core',
    description: 'Treino complementar para deltoides, trapézio e abdômen.',
    category: 'Hipertrofia',
    level: 2,
    duration: 50,
    tags: ['hipertrofia', 'ombros', 'core'],
    gradient: 'from-yellow-600 to-orange-600',
    exercises: [
      { name: 'Desenvolvimento com Barra', sets: 4, reps: '10', restSeconds: 90 },
      { name: 'Elevação Lateral', sets: 4, reps: '12', restSeconds: 60 },
      { name: 'Elevação Frontal', sets: 3, reps: '12', restSeconds: 60 },
      { name: 'Rosca Martelo', sets: 3, reps: '12', restSeconds: 60 },
      { name: 'Abdômen Crunch', sets: 4, reps: '20', restSeconds: 45 },
      { name: 'Prancha', sets: 4, reps: '45s', restSeconds: 60 },
    ],
  },
  {
    id: 'full-body',
    emoji: '🔥',
    name: 'Full Body Emagrecimento',
    description: 'Treino completo 3x/semana com compostos e cardio para queima calórica.',
    category: 'Emagrecimento',
    level: 1,
    duration: 45,
    tags: ['emagrecimento', 'full body', 'iniciante'],
    gradient: 'from-rose-600 to-pink-600',
    exercises: [
      { name: 'Agachamento Livre', sets: 3, reps: '15', restSeconds: 45 },
      { name: 'Supino Reto', sets: 3, reps: '12', restSeconds: 45 },
      { name: 'Remada Curvada', sets: 3, reps: '12', restSeconds: 45 },
      { name: 'Desenvolvimento com Barra', sets: 3, reps: '12', restSeconds: 45 },
      { name: 'Abdômen Crunch', sets: 3, reps: '20', restSeconds: 30 },
      { name: 'Esteira', sets: 1, reps: '20min', restSeconds: 0 },
    ],
  },
  {
    id: 'hiit',
    emoji: '⚡',
    name: 'HIIT Força e Cardio',
    description: 'Alta intensidade com intervalos curtos. Queima acelerada de gordura.',
    category: 'Emagrecimento',
    level: 3,
    duration: 40,
    tags: ['hiit', 'cardio', 'emagrecimento', 'avançado'],
    gradient: 'from-orange-600 to-red-600',
    exercises: [
      { name: 'Flexão de Braço', sets: 4, reps: '15', restSeconds: 30 },
      { name: 'Agachamento Livre', sets: 4, reps: '20', restSeconds: 30 },
      { name: 'Bicicleta Ergométrica', sets: 3, reps: '5min', restSeconds: 60 },
      { name: 'Abdômen Crunch', sets: 4, reps: '20', restSeconds: 20 },
      { name: 'Prancha', sets: 3, reps: '45s', restSeconds: 30 },
      { name: 'Esteira', sets: 1, reps: '10min', restSeconds: 0 },
    ],
  },
  {
    id: 'gluteos',
    emoji: '🍑',
    name: 'Glúteos e Pernas',
    description: 'Foco em glúteos e posterior de coxa. Ideal para hipertrofia feminina.',
    category: 'Hipertrofia',
    level: 2,
    duration: 60,
    tags: ['glúteos', 'pernas', 'feminino', 'hipertrofia'],
    gradient: 'from-pink-600 to-rose-600',
    exercises: [
      { name: 'Agachamento Livre', sets: 4, reps: '12', restSeconds: 90 },
      { name: 'Leg Press 45°', sets: 4, reps: '15', restSeconds: 75 },
      { name: 'Stiff', sets: 4, reps: '12', restSeconds: 75 },
      { name: 'Cadeira Flexora', sets: 3, reps: '15', restSeconds: 60 },
      { name: 'Panturrilha em Pé', sets: 4, reps: '20', restSeconds: 45 },
    ],
  },
];

const CATEGORIES = ['Todos', 'Hipertrofia', 'Emagrecimento'];

const AI_SUGGESTIONS = [
  'Treino ABC hipertrofia para intermediário, 60 min',
  'Full body para iniciante 3x por semana, 45 min',
  'HIIT emagrecimento avançado, 40 min',
  'Treino de pernas glúteos feminino, 60 min',
  'Upper/Lower força para avançado',
  'Treino funcional para idosos, baixo impacto',
];

export default function TrainerWorkouts() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);
  const [aiModal, setAiModal] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: workouts, isLoading } = useQuery({
    queryKey: ['trainer-workouts'],
    queryFn: () => api.get('/workouts').then((r) => r.data.data),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/workouts/${id}/duplicate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainer-workouts'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/workouts/${id}`, { status: 'ARCHIVED' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainer-workouts'] }),
  });

  const generateAiMutation = useMutation({
    mutationFn: (description: string) =>
      api.post('/ai/generate-workout', { description }).then((r) => r.data?.data ?? r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trainer-workouts'] });
      setAiResult(data);
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      if (status === 429) toast.error('Limite de requisições da IA atingido. Aguarde 1 minuto e tente novamente.');
      else if (status === 401 || status === 403) toast.error('Chave da API de IA inválida. Verifique a configuração.');
      else toast.error('Erro ao gerar treino. Tente novamente.');
    },
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (template: WorkoutTemplate) => {
      const exercisesRes = await api.get('/exercises');
      const allExercises: any[] = exercisesRes.data.data || [];

      const createRes = await api.post('/workouts', {
        name: template.name,
        description: template.description,
        level: template.level,
        duration: template.duration,
        tags: template.tags,
        status: 'ACTIVE',
      });
      const workoutId = createRes.data.data?.id;
      if (!workoutId) throw new Error('Falha ao criar treino');

      const exercises = template.exercises.flatMap((te) => {
        const ex = allExercises.find((e: any) =>
          e.name.toLowerCase() === te.name.toLowerCase()
        );
        if (!ex) return [];
        return [{ exerciseId: ex.id, sets: te.sets, reps: te.reps, restSeconds: te.restSeconds }];
      });

      if (exercises.length > 0) {
        await api.patch(`/workouts/${workoutId}`, { exercises });
      }

      return workoutId;
    },
    onSuccess: (workoutId) => {
      queryClient.invalidateQueries({ queryKey: ['trainer-workouts'] });
      toast.success('Treino criado a partir do template!');
      setUsingTemplateId(null);
      router.push(`/trainer/workouts/${workoutId}`);
    },
    onError: () => {
      toast.error('Erro ao criar treino. Tente novamente.');
      setUsingTemplateId(null);
    },
  });

  const handleUseTemplate = (template: WorkoutTemplate) => {
    setUsingTemplateId(template.id);
    useTemplateMutation.mutate(template);
  };

  const visibleTemplates = categoryFilter === 'Todos'
    ? WORKOUT_TEMPLATES
    : WORKOUT_TEMPLATES.filter((t) => t.category === categoryFilter);

  const filtered = (workouts || []).filter((w: any) => {
    const matchSearch = w.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'Todos' ||
      (filter === 'Templates' && w.isTemplate) ||
      w.status === STATUS_MAP[filter];
    return matchSearch && matchFilter;
  });

  const counts = {
    active: workouts?.filter((w: any) => w.status === 'ACTIVE').length ?? 0,
    draft: workouts?.filter((w: any) => w.status === 'DRAFT').length ?? 0,
    templates: workouts?.filter((w: any) => w.isTemplate).length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Treinos</h1>
          <p className="text-muted-foreground text-sm mt-1">Crie e gerencie planos de treino</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => { setAiModal(true); setAiResult(null); setAiDescription(''); }}
            className="flex items-center gap-2 text-sm py-2 px-4 rounded-xl border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 font-medium transition-all"
          >
            <Wand2 className="w-4 h-4" />
            Gerar com IA
          </button>
          <Link href="/trainer/workouts/new" className="btn-primary flex items-center gap-2 text-sm py-2">
            <Plus className="w-4 h-4" />
            Novo treino
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Treinos ativos', value: counts.active, color: 'from-purple-600 to-indigo-600', icon: Dumbbell },
          { label: 'Rascunhos', value: counts.draft, color: 'from-yellow-600 to-orange-600', icon: FileText },
          { label: 'Templates', value: counts.templates, color: 'from-cyan-600 to-blue-600', icon: Copy },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Templates Section */}
      <div className="glass-card !p-0 overflow-hidden">
        <button
          onClick={() => setTemplatesOpen(!templatesOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-accent/30 transition-all"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold">Treinos Prontos</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">— use como base e personalize para seus alunos</span>
          </div>
          {templatesOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {templatesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border"
            >
              {/* Category filter */}
              <div className="flex gap-2 px-6 pt-4">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-medium transition-all border',
                      categoryFilter === cat
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'glass border-transparent hover:bg-accent text-muted-foreground',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Template cards — horizontal scroll */}
              <div className="overflow-x-auto px-6 pb-5 pt-3 scrollbar-hide">
                <div className="flex gap-4" style={{ width: 'max-content' }}>
                  {visibleTemplates.map((template, i) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      index={i}
                      isExpanded={selectedTemplateId === template.id}
                      isLoading={usingTemplateId === template.id}
                      onToggle={() => setSelectedTemplateId(
                        selectedTemplateId === template.id ? null : template.id
                      )}
                      onUse={() => handleUseTemplate(template)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar treino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium flex-shrink-0 transition-all border',
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'glass border-transparent hover:bg-accent',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* AI Generate Modal */}
      <AnimatePresence>
        {aiModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !generateAiMutation.isPending && setAiModal(false)}
            className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Wand2 className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Gerar treino com IA</p>
                  <p className="text-xs text-muted-foreground">Descreva o treino e a IA monta tudo para você</p>
                </div>
                {!generateAiMutation.isPending && (
                  <button onClick={() => setAiModal(false)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="p-5 space-y-4">
                {!aiResult ? (
                  <>
                    <textarea
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      placeholder="Descreva o treino: objetivo, grupos musculares, nível do aluno, tempo disponível, equipamentos..."
                      rows={4}
                      disabled={generateAiMutation.isPending}
                      className="input-field resize-none w-full text-sm"
                    />

                    {/* Quick suggestions */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Sugestões rápidas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {AI_SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => setAiDescription(s)}
                            disabled={generateAiMutation.isPending}
                            className="text-xs px-2.5 py-1 rounded-full glass border border-border hover:border-violet-500/40 hover:text-violet-400 transition-all text-muted-foreground"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {generateAiMutation.isPending && (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <div className="relative w-12 h-12">
                          <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                          <div className="absolute inset-2 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                          <Wand2 className="absolute inset-0 m-auto w-4 h-4 text-violet-400" />
                        </div>
                        <p className="text-sm text-muted-foreground animate-pulse">Gerando treino personalizado...</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setAiModal(false)}
                        disabled={generateAiMutation.isPending}
                        className="btn-secondary flex-1 text-sm py-2.5"
                      >
                        Cancelar
                      </button>
                      <button
                        disabled={!aiDescription.trim() || generateAiMutation.isPending}
                        onClick={() => generateAiMutation.mutate(aiDescription.trim())}
                        className="flex-1 text-sm py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Wand2 className="w-4 h-4" />
                        Gerar treino
                      </button>
                    </div>
                  </>
                ) : (
                  /* Success state */
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-emerald-400">{aiResult.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {aiResult.exercisesAdded} exercício{aiResult.exercisesAdded !== 1 ? 's' : ''} adicionado{aiResult.exercisesAdded !== 1 ? 's' : ''} · Salvo como rascunho
                        </p>
                      </div>
                    </div>

                    {aiResult.tips?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Dicas da IA:</p>
                        <ul className="space-y-1">
                          {aiResult.tips.map((tip: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="text-violet-400 mt-0.5">•</span>{tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => { setAiResult(null); setAiDescription(''); }}
                        className="btn-secondary flex-1 text-sm py-2.5"
                      >
                        Gerar outro
                      </button>
                      <button
                        onClick={() => { setAiModal(false); router.push(`/trainer/workouts/${aiResult.workoutId}`); }}
                        className="flex-1 text-sm py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        Ver treino <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workout list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-2 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((workout: any, i: number) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              index={i}
              onDuplicate={() => duplicateMutation.mutate(workout.id)}
              onArchive={() => archiveMutation.mutate(workout.id)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Dumbbell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhum treino encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">Use um template acima ou crie um treino personalizado.</p>
          <Link href="/trainer/workouts/new" className="btn-primary text-sm py-2">Criar treino</Link>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template, index, isExpanded, isLoading, onToggle, onUse,
}: {
  template: WorkoutTemplate;
  index: number;
  isExpanded: boolean;
  isLoading: boolean;
  onToggle: () => void;
  onUse: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'w-52 rounded-2xl flex-shrink-0 overflow-hidden border transition-all cursor-pointer',
        isExpanded ? 'border-primary/40 bg-primary/5' : 'glass border-border/40 hover:border-border',
      )}
      onClick={onToggle}
    >
      <div className={`h-1.5 bg-gradient-to-r ${template.gradient}`} />
      <div className="p-4">
        <div className="text-2xl mb-2">{template.emoji}</div>
        <div className="font-semibold text-sm leading-snug mb-1">{template.name}</div>
        <div className="text-[11px] text-muted-foreground mb-3 line-clamp-2">{template.description}</div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{template.exercises.length} ex.</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{template.duration}min</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" />{LEVEL_LABELS[template.level]}</span>
        </div>

        <div className="flex gap-1 flex-wrap mb-3">
          {template.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full glass text-muted-foreground">{tag}</span>
          ))}
        </div>

        {/* Exercise list (expanded) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="border-t border-border pt-3 space-y-1.5">
                {template.exercises.map((ex) => (
                  <div key={ex.name} className="flex items-center justify-between text-[11px]">
                    <span className="text-foreground truncate pr-2">{ex.name}</span>
                    <span className="text-muted-foreground flex-shrink-0">{ex.sets}×{ex.reps}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={(e) => { e.stopPropagation(); onUse(); }}
          disabled={isLoading}
          className={cn(
            'w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
            isLoading
              ? 'bg-primary/50 text-primary-foreground cursor-not-allowed'
              : `bg-gradient-to-r ${template.gradient} text-white hover:opacity-90 active:scale-95`,
          )}
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              Usar Template
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

function WorkoutCard({ workout, index, onDuplicate, onArchive }: {
  workout: any; index: number; onDuplicate: () => void; onArchive: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = STATUS_LABELS[workout.status] || STATUS_LABELS.DRAFT;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card hover:bg-accent/30 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold">{workout.name}</span>
            {workout.isTemplate && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-medium">Template</span>
            )}
            <span className={cn('text-xs px-2 py-0.5 rounded-full', status.color)}>{status.label}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{workout._count?.exercises ?? workout.exercises?.length ?? 0} exercícios</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{workout.duration ?? 45} min</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" />{LEVEL_LABELS[workout.level] || 'Iniciante'}</span>
            <span className="flex items-center gap-1 hidden sm:flex"><Users className="w-3 h-3" />{workout._count?.plans ?? 0} alunos</span>
          </div>
          {workout.tags?.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {workout.tags.slice(0, 3).map((tag: string) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full glass text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link href={`/trainer/workouts/${workout.id}`} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-all">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 bg-card border border-border rounded-xl shadow-xl z-10 py-1 w-40">
                <button onClick={() => { onDuplicate(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all">
                  <Copy className="w-3.5 h-3.5" /> Duplicar
                </button>
                <button onClick={() => { onArchive(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all text-muted-foreground">
                  <Archive className="w-3.5 h-3.5" /> Arquivar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
