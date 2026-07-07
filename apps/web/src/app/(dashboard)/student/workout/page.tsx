'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Play, CheckCircle2, Clock, ChevronLeft,
  Flame, RotateCcw, Timer, ChevronRight,
  X, PlayCircle, Trophy, Share2, Download, Camera, SwitchCamera,
  Music, ChevronUp, ChevronDown, ExternalLink, Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { resolveVideoUrl, resolveImageUrl } from '@/lib/video-url';
import toast from 'react-hot-toast';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TODAY = new Date().getDay();

type Technique = 'NORMAL' | 'BI_SET' | 'SUPER_SET' | 'TRI_SET' | 'DROP_SET' | 'GIANT_SET' | 'CIRCUIT';
const TECHNIQUE_CONFIG: Record<Technique, { label: string; color: string; bg: string; border: string }> = {
  NORMAL:    { label: '',          color: '',                   bg: '',                  border: '' },
  BI_SET:    { label: 'Bi Set',    color: 'text-orange-400',    bg: 'bg-orange-500/10',  border: 'border-l-4 border-orange-500/60' },
  SUPER_SET: { label: 'Super Set', color: 'text-blue-400',      bg: 'bg-blue-500/10',    border: 'border-l-4 border-blue-500/60' },
  TRI_SET:   { label: 'Tri Set',   color: 'text-purple-400',    bg: 'bg-purple-500/10',  border: 'border-l-4 border-purple-500/60' },
  DROP_SET:  { label: 'Drop Set',  color: 'text-red-400',       bg: 'bg-red-500/10',     border: 'border-l-4 border-red-500/60' },
  GIANT_SET: { label: 'Giant Set', color: 'text-pink-400',      bg: 'bg-pink-500/10',    border: 'border-l-4 border-pink-500/60' },
  CIRCUIT:   { label: 'Circuito',  color: 'text-emerald-400',   bg: 'bg-emerald-500/10', border: 'border-l-4 border-emerald-500/60' },
};

function deriveTechnique(exercises: any[]): Technique {
  if (!exercises.length) return 'NORMAL';
  if (exercises.some((e) => e.isDropSet)) return 'DROP_SET';
  const size = exercises.length;
  if (size === 2) return 'BI_SET';
  if (size === 3) return 'TRI_SET';
  return 'GIANT_SET';
}

function groupExercises(exercises: any[]): { technique: Technique; items: any[] }[] {
  const groups: { technique: Technique; items: any[] }[] = [];
  const used = new Set<string>();
  for (const ex of exercises) {
    if (used.has(ex.id)) continue;
    if (ex.superSetGroupId) {
      const members = exercises.filter((e) => e.superSetGroupId === ex.superSetGroupId);
      members.forEach((e) => used.add(e.id));
      groups.push({ technique: deriveTechnique(members), items: members });
    } else {
      used.add(ex.id);
      groups.push({ technique: 'NORMAL', items: [ex] });
    }
  }
  return groups;
}

function getYouTubeId(rawUrl: string): string | null {
  const m = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

function getEmbedInfo(rawUrl: string): { embedUrl: string; type: 'youtube' | 'vimeo' | 'direct' } | null {
  if (!rawUrl) return null;
  const url = resolveVideoUrl(rawUrl);
  const ytId = getYouTubeId(url);
  if (ytId) return { type: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&autoplay=1` };
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&autoplay=1` };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { type: 'direct', embedUrl: url };
  if (url.includes('/musclewiki/stream/')) return { type: 'direct', embedUrl: url };
  return null;
}

function getVideoThumbnail(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
  return null;
}

// ─── Video Modal ─────────────────────────────────────────────────────────────

function VideoModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const info = getEmbedInfo(url);
  const [videoError, setVideoError] = useState(false);

  // Extract raw YouTube URL for fallback link
  const rawYtUrl = useMemo(() => {
    const ytId = getYouTubeId(url);
    return ytId ? `https://www.youtube.com/watch?v=${ytId}` : null;
  }, [url]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative w-full max-w-3xl rounded-2xl overflow-hidden bg-black shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-white/5">
            <span className="font-medium text-sm truncate">{title}</span>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              {rawYtUrl && (
                <a
                  href={rawYtUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-all"
                  title="Abrir no YouTube"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="relative aspect-video">
            {info?.type === 'direct' ? (
              <>
                {videoError ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-3">
                    <PlayCircle className="w-10 h-10 opacity-50" />
                    <span>Não foi possível carregar o vídeo</span>
                    {rawYtUrl && (
                      <a
                        href={rawYtUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Abrir no YouTube
                      </a>
                    )}
                  </div>
                ) : (
                  <video
                    src={info.embedUrl}
                    controls
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full"
                    onError={() => setVideoError(true)}
                  />
                )}
              </>
            ) : info ? (
              <iframe
                src={info.embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-3">
                <PlayCircle className="w-10 h-10 opacity-50" />
                <span>Formato de vídeo não suportado</span>
                {rawYtUrl && (
                  <a
                    href={rawYtUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir no YouTube
                  </a>
                )}
              </div>
            )}
          </div>
          {/* Fallback footer */}
          {rawYtUrl && !videoError && (
            <div className="px-4 py-2 bg-white/5 border-t border-white/10">
              <a
                href={rawYtUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Se o vídeo não reproduzir, abra no YouTube
              </a>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentWorkout() {
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activeWorkout, setActiveWorkout] = useState(false);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({});
  const [videoModal, setVideoModal] = useState<{ url: string; title: string } | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const queryClient = useQueryClient();

  const { data: workoutPlans } = useQuery({
    queryKey: ['student-workout-plans'],
    queryFn: () => api.get('/students/me/workout-plan').then((r) => r.data.data || []),
  });

  const { data: workoutLogs } = useQuery({
    queryKey: ['student-workout-logs'],
    queryFn: () => api.get('/students/me/workout-logs').then((r) => r.data.data),
  });

  const logMutation = useMutation({
    mutationFn: (data: any) => api.post('/students/me/workout-logs', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student-workout-logs'] }),
    onError: () => toast.error('Erro ao registrar treino'),
  });

  const trainers = useMemo(() => {
    if (!workoutPlans) return [];
    const map = new Map<string, any>();
    for (const plan of workoutPlans) {
      const t = plan.workout?.trainer;
      if (!t) continue;
      if (!map.has(t.id)) map.set(t.id, { ...t, planCount: 0 });
      map.get(t.id).planCount++;
    }
    return Array.from(map.values());
  }, [workoutPlans]);

  // Auto-select when only 1 trainer; respect manual selection for 2+
  const effectiveTrainerId = selectedTrainerId ?? (trainers.length === 1 ? trainers[0]?.id : null);

  const filteredPlans = useMemo(() => {
    const today = new Date().getDay();
    return (workoutPlans || []).filter((p: any) => {
      // Filtra por trainer
      if (effectiveTrainerId && p.workout?.trainer?.id !== effectiveTrainerId) return false;
      // Filtra por dia da semana: se dayOfWeek estiver definido, só mostra se inclui hoje
      if (p.dayOfWeek && Array.isArray(p.dayOfWeek) && p.dayOfWeek.length > 0) {
        return p.dayOfWeek.includes(today);
      }
      // Se não tem dayOfWeek definido, mostra (compatibilidade com planos antigos)
      return true;
    });
  }, [workoutPlans, effectiveTrainerId]);

  const selectedPlan = (workoutPlans || []).find((p: any) => p.id === selectedPlanId);
  const activePlan = (workoutPlans || []).find((p: any) => p.id === activePlanId);
  const isSelectedPlanActive = selectedPlanId === activePlanId && activeWorkout;

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const completedDaysThisWeek = new Set<number>(
    (workoutLogs || [])
      .filter((log: any) => new Date(log.completedAt || log.startedAt) >= weekStart)
      .map((log: any) => new Date(log.completedAt || log.startedAt).getDay()),
  );

  const planExercises: any[] = selectedPlan?.workout?.exercises ?? [];
  const planAllCompleted = isSelectedPlanActive && planExercises.length > 0 &&
    planExercises.every((ex: any) => {
      const sets = completedSets[ex.id] || [];
      return sets.filter(Boolean).length >= ex.sets;
    });

  const toggleSet = (exerciseId: string, setIndex: number) => {
    setCompletedSets((prev) => {
      const sets = prev[exerciseId] || [];
      const updated = [...sets];
      updated[setIndex] = !updated[setIndex];
      return { ...prev, [exerciseId]: updated };
    });
  };

  const openVideo = useCallback((url: string, title: string) => setVideoModal({ url, title }), []);
  const closeVideo = useCallback(() => setVideoModal(null), []);

  function downloadWorkoutPDF() {
    if (!filteredPlans?.length) { toast.error('Nenhum plano de treino carregado'); return; }
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const dayBlocks = filteredPlans.map((plan: any) => {
      const exercises = (plan.workout?.exercises ?? []).map((ex: any, i: number) => `
        <tr>
          <td style="padding:8px 12px;font-size:13px;color:#111827;">${i + 1}. ${ex.name ?? '—'}</td>
          <td style="padding:8px 8px;text-align:center;font-size:13px;color:#374151;">${ex.sets}</td>
          <td style="padding:8px 8px;text-align:center;font-size:13px;color:#374151;">${ex.reps ?? '—'}</td>
          <td style="padding:8px 8px;text-align:center;font-size:13px;color:#374151;">${ex.weight ? ex.weight + ' kg' : '—'}</td>
          <td style="padding:8px 8px;text-align:center;font-size:13px;color:#374151;">${ex.restSeconds ? ex.restSeconds + 's' : '—'}</td>
        </tr>
        ${ex.notes ? `<tr><td colspan="5" style="padding:0 12px 8px 28px;font-size:11px;color:#9ca3af;font-style:italic;">Obs: ${ex.notes}</td></tr>` : ''}
      `).join('');
      return `
        <div class="plan-block">
          <div class="plan-header">
            <span class="plan-title">${plan.workout?.name ?? 'Treino'}</span>
            <span class="plan-meta">${plan.workout?.duration ?? 45} min • ${plan.workout?.exercises?.length ?? 0} exercícios</span>
          </div>
          ${plan.division ? `<div class="division">${plan.division}</div>` : ''}
          <table>
            <thead><tr>
              <th style="text-align:left;">Exercício</th>
              <th>Séries</th><th>Reps</th><th>Carga</th><th>Descanso</th>
            </tr></thead>
            <tbody>${exercises || '<tr><td colspan="5" style="padding:8px 12px;color:#9ca3af;font-size:12px;">Nenhum exercício cadastrado</td></tr>'}</tbody>
          </table>
        </div>`;
    }).join('');
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Plano de Treino — Fitlynutri</title>
    <style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; background: #fff; padding: 32px; }
    @media print { body { padding: 16px; } button { display: none !important; } .plan-block { page-break-inside: avoid; } @page { margin: 16mm 12mm; } }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #7c3aed; padding-bottom: 16px; }
    .logo { font-size: 22px; font-weight: 700; color: #7c3aed; } .subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .date { font-size: 12px; color: #6b7280; margin-top: 4px; text-align: right; }
    .plan-block { margin-bottom: 28px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    .plan-header { background: #7c3aed; color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
    .plan-title { font-size: 15px; font-weight: 600; } .plan-meta { font-size: 12px; opacity: .8; }
    .division { padding: 6px 16px; background: #f5f3ff; font-size: 12px; color: #7c3aed; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #f9fafb; color: #6b7280; padding: 8px 12px; font-size: 11px; font-weight: 600; text-align: center; border-bottom: 1px solid #e5e7eb; }
    thead th:first-child { text-align: left; } tbody tr:nth-child(odd) { background: #fafafa; }
    .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    .print-btn { position: fixed; bottom: 24px; right: 24px; background: #7c3aed; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
    </style></head><body>
    <div class="header"><div><div class="logo">Fitlynutri</div><div class="subtitle">Plano de Treino</div></div><div class="date">Emitido em ${date}</div></div>
    ${dayBlocks}
    <div class="footer">Gerado pelo Fitlynutri · Siga sempre as orientações do seu personal trainer</div>
    <button class="print-btn" onclick="window.print()">⬇ Salvar PDF</button>
    </body></html>`;
    const w = window.open('', '_blank', 'width=960,height=720');
    if (!w) { toast.error('Permita pop-ups para gerar o PDF'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
  }

  return (
    <>
      {videoModal && <VideoModal url={videoModal.url} title={videoModal.title} onClose={closeVideo} />}
      {showSummary && startTime && activePlan && (
        <WorkoutSummaryModal
          workoutName={activePlan.workout?.name || 'Treino'}
          startTime={startTime}
          isPending={logMutation.isPending}
          onConfirm={(intensity, comment, duration) => logMutation.mutate({ workoutPlanId: activePlan.id, intensity, comment, duration })}
          onClose={() => {
            setShowSummary(false);
            setActiveWorkout(false);
            setCompletedSets({});
            setStartTime(null);
            setActivePlanId(null);
            setSelectedPlanId(null);
          }}
        />
      )}

      <div className="space-y-6 max-w-2xl mx-auto">
        {selectedPlan ? (
          // ── DETAIL VIEW ──────────────────────────────────────────────────
          <>
            {/* Music player — sticky at top */}
            <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-2 bg-background/95 backdrop-blur-sm border-b border-border/40">
              <WorkoutMusicPlayer />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPlanId(null)}
                className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                {selectedPlan.division && <div className="text-xs text-muted-foreground">{selectedPlan.division}</div>}
                <h1 className="text-xl font-bold truncate">{selectedPlan.workout?.name}</h1>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{selectedPlan.workout?.duration || 45} min</span>
                  <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{planExercises.length} exercícios</span>
                  <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" />~{(selectedPlan.workout?.duration || 45) * 7} kcal</span>
                </div>
                {selectedPlan.dayOfWeek && Array.isArray(selectedPlan.dayOfWeek) && selectedPlan.dayOfWeek.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    {DAYS.map((day, i) => (
                      <span key={day} className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full',
                        selectedPlan.dayOfWeek.includes(i)
                          ? 'bg-primary/20 text-primary font-medium'
                          : 'text-muted-foreground/30',
                      )}>
                        {day}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {(() => {
                  const rawPhone = selectedPlan?.workout?.trainer?.user?.profile?.phone?.replace(/\D/g, '');
                  if (!rawPhone) return null;
                  const phone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
                  return (
                    <a
                      href={`https://wa.me/${phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp do personal"
                      className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/30 transition-all"
                    >
                      <WhatsAppIcon className="w-4 h-4 text-emerald-400" />
                    </a>
                  );
                })()}
                {filteredPlans.length > 0 && (
                  <button onClick={downloadWorkoutPDF} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-2.5">
                    <Download className="w-3.5 h-3.5" />PDF
                  </button>
                )}
              </div>
            </div>

            {/* Iniciar / Em andamento */}
            {!isSelectedPlanActive ? (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setActivePlanId(selectedPlanId!);
                    setActiveWorkout(true);
                    setStartTime(new Date());
                    setCompletedSets({});
                    if (selectedPlanId) {
                      api.post('/students/me/workout-start', { workoutPlanId: selectedPlanId }).catch(() => {});
                    }
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-base py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Play className="w-5 h-5" />
                  INICIAR
                </button>
                <p className="text-center text-xs text-muted-foreground px-4">
                  Você está no "modo visualização". Aperte INICIAR para começar seu treino.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 text-emerald-400 font-semibold text-sm">
                <Timer className="w-4 h-4" />Em andamento
              </div>
            )}

            {/* Exercise list */}
            <div className="space-y-3">
              {groupExercises(planExercises).map((group, gi) => {
                const cfg = TECHNIQUE_CONFIG[group.technique];
                const rows = group.items.map((ex: any) => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    isActive={isSelectedPlanActive}
                    completedSets={completedSets[ex.id] || []}
                    onToggleSet={(i) => toggleSet(ex.id, i)}
                    onOpenVideo={openVideo}
                  />
                ));

                if (group.technique === 'NORMAL') return rows;

                return (
                  <div key={gi} className={cn('rounded-2xl overflow-hidden', cfg.bg, cfg.border)}>
                    <div className={cn('px-4 pt-3 pb-1 text-xs font-semibold flex items-center gap-1.5', cfg.color)}>
                      {cfg.label}
                      <span className="text-muted-foreground font-normal">· {group.items.length} exercícios em sequência</span>
                    </div>
                    <div className="space-y-2 p-2">{rows}</div>
                  </div>
                );
              })}
            </div>

            {/* Finalizar */}
            {isSelectedPlanActive && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-600/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{planAllCompleted ? 'Treino concluído!' : 'Progresso do treino'}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {planAllCompleted ? 'Parabéns! Registre seu treino.' : 'Conclua todos os exercícios para finalizar.'}
                    </div>
                  </div>
                  <button
                    disabled={!planAllCompleted}
                    onClick={() => setShowSummary(true)}
                    className={cn('btn-primary text-sm py-2 px-4 flex items-center gap-2', !planAllCompleted && 'opacity-50 cursor-not-allowed')}
                  >
                    <CheckCircle2 className="w-4 h-4" />Finalizar
                  </button>
                </div>
              </motion.div>
            )}
          </>
        ) : !effectiveTrainerId && trainers.length > 1 ? (
          // ── TRAINER PICKER ───────────────────────────────────────────────
          <>
            <div className="page-header">
              <div>
                <h1 className="text-2xl font-bold">Meu Treino</h1>
                <p className="text-muted-foreground text-sm mt-1">Selecione seu personal trainer</p>
              </div>
            </div>
            <div className="space-y-3">
              {trainers.map((trainer) => {
                const profile = trainer.user?.profile;
                const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Personal';
                const avatar = profile?.avatarUrl;
                return (
                  <motion.button
                    key={trainer.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedTrainerId(trainer.id)}
                    className="glass-card w-full text-left hover:bg-accent/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {avatar ? (
                          <img src={avatar} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-violet-400">{name[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{name}</p>
                        <p className="text-sm text-muted-foreground">
                          {trainer.planCount} treino{trainer.planCount !== 1 ? 's' : ''} atribuído{trainer.planCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </>
        ) : (
          // ── LIST VIEW ──────────────────────────────────────────────────────
          <>
            {/* Header */}
            <div className="page-header">
              <div>
                {trainers.length > 1 && (
                  <button
                    onClick={() => setSelectedTrainerId(null)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    {(() => {
                      const t = trainers.find((tr) => tr.id === effectiveTrainerId);
                      const p = t?.user?.profile;
                      return p ? `${p.firstName} ${p.lastName}`.trim() : 'Personal';
                    })()}
                  </button>
                )}
                <h1 className="text-2xl font-bold">Meu Treino</h1>
                <p className="text-muted-foreground text-sm mt-1">Escolha o treino do dia e execute</p>
              </div>
              {filteredPlans?.length > 0 && (
                <button onClick={downloadWorkoutPDF} className="btn-secondary flex items-center gap-2 text-sm py-2 px-3" title="Baixar treino em PDF">
                  <Download className="w-4 h-4" />PDF
                </button>
              )}
            </div>

            {/* Week frequency strip */}
            <div className="glass-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Frequência semanal</span>
                <span className="text-xs text-muted-foreground">
                  {completedDaysThisWeek.size} treino{completedDaysThisWeek.size !== 1 ? 's' : ''} essa semana
                </span>
              </div>
              <div className="flex gap-1">
                {DAYS.map((day, i) => {
                  const done = completedDaysThisWeek.has(i);
                  const isToday = i === TODAY;
                  return (
                    <div key={day} className={cn('flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl text-xs', isToday && 'bg-primary/10')}>
                      <span className={cn('font-medium', isToday ? 'text-primary' : 'text-muted-foreground')}>{day}</span>
                      <div className={cn('w-2 h-2 rounded-full', done ? 'bg-emerald-400' : isToday ? 'bg-primary/40' : 'bg-white/10')} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plan list */}
            {filteredPlans.length > 0 ? (
              <div className="space-y-3">
                {filteredPlans.map((plan: any) => {
                  const isActive = plan.id === activePlanId && activeWorkout;
                  return (
                    <motion.button
                      key={plan.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className="glass-card w-full text-left hover:bg-accent/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          {plan.division && <div className="text-xs text-muted-foreground mb-0.5">{plan.division}</div>}
                          <div className="font-bold text-base truncate">{plan.workout?.name}</div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{plan.workout?.duration || 45} min</span>
                            <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{plan.workout?.exercises?.length || 0} exercícios</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isActive && (
                            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                              <Timer className="w-3 h-3" />Em andamento
                            </span>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : workoutPlans && workoutPlans.length > 0 ? (
              // Has plans but none for today — show all with day labels
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="glass-card flex flex-col items-center py-6 text-center gap-2 border border-amber-500/20">
                  <Dumbbell className="w-7 h-7 text-amber-400/70" />
                  <p className="text-sm font-semibold">Nenhum treino para hoje</p>
                  <p className="text-xs text-muted-foreground">Confira seus treinos agendados abaixo</p>
                </div>
                {(workoutPlans as any[]).map((plan: any) => (
                  <motion.button
                    key={plan.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className="glass-card w-full text-left hover:bg-accent/50 transition-all cursor-pointer opacity-70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        {plan.division && <div className="text-xs text-muted-foreground mb-0.5">{plan.division}</div>}
                        <div className="font-bold text-base truncate">{plan.workout?.name}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{plan.workout?.duration || 45} min</span>
                          <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{plan.workout?.exercises?.length || 0} exercícios</span>
                          {plan.dayOfWeek?.length > 0 && (
                            <span>{plan.dayOfWeek.map((d: number) => DAYS[d]).join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <Dumbbell className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Nenhum treino atribuído</h3>
                <p className="text-sm text-muted-foreground">Seu personal ainda não atribuiu treinos para você.</p>
              </motion.div>
            )}

            {/* Trainer WhatsApp contact */}
            {(() => {
              const trainer = trainers.find((t) => t.id === effectiveTrainerId);
              const rawPhone = trainer?.user?.profile?.phone?.replace(/\D/g, '');
              if (!rawPhone) return null;
              const phone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
              const profile = trainer?.user?.profile;
              const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Personal';
              return (
                <a
                  href={`https://wa.me/${phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card flex items-center gap-3 hover:bg-accent/50 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <WhatsAppIcon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">Falar com {name}</div>
                    <div className="text-xs text-muted-foreground">WhatsApp do personal</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </a>
              );
            })()}

            {/* Recent logs */}
            {workoutLogs?.length > 0 && (
              <div className="glass-card">
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="font-semibold flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-muted-foreground" />Histórico Recente
                  </h2>
                  {showHistory
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showHistory && (
                  <div className="space-y-2 mt-4">
                    {workoutLogs.map((log: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600/10 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{log.workoutPlan?.workout?.name || 'Treino'}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            {new Date(log.startedAt || log.completedAt).toLocaleDateString('pt-BR')}
                            {log.duration != null && (
                              <><span className="mx-0.5">•</span><Clock className="w-3 h-3" />{log.duration} min</>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Workout Music Player ────────────────────────────────────────────────────

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface MusicResult {
  trackId: string;
  title: string;
  thumbnail: string;
  author: string;
  audioUrl: string;
}

async function searchMusic(query: string): Promise<MusicResult[]> {
  try {
    const res = await api.get(`/music/search?q=${encodeURIComponent(query)}`);
    const data = res.data.data ?? res.data;
    if (!Array.isArray(data)) return [];
    return data.filter((v: any) => v.trackId && v.audioUrl);
  } catch {
    return [];
  }
}

const MUSIC_GENRES = [
  { label: '🔥 Treino', q: 'workout' },
  { label: '⚡ HIIT', q: 'energetic hiit' },
  { label: '🎧 EDM', q: 'electronic edm' },
  { label: '🎸 Rock', q: 'rock energetic' },
  { label: '🎵 Hip-Hop', q: 'hiphop' },
];

function WorkoutMusicPlayer() {
  const [open, setOpen] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<MusicResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentThumbnail, setCurrentThumbnail] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Audio Element (background-friendly) ───────────────────────────────
  // Usa o elemento <audio> do HTML5 que o navegador consegue manter tocando
  // mesmo com a tela bloqueada ou app minimizado (diferente do YouTube IFrame)

  useEffect(() => {
    // Cria o elemento de áudio uma vez
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = true;
    audioRef.current = audio;

    // Eventos do áudio
    const onPlay = () => {
      setIsPlaying(true);
      startKeepAlive();
    };
    const onPause = () => {
      setIsPlaying(false);
      stopKeepAlive();
    };
    const onEnded = () => {
      setIsPlaying(false);
      stopKeepAlive();
    };
    const onError = () => {
      setAudioError('Não foi possível carregar o áudio. Tente outra música.');
      setIsPlaying(false);
      stopKeepAlive();
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  // Atualiza Media Session quando a música muda
  useEffect(() => {
    if (currentTrackId && currentTitle && isPlaying) {
      updateMediaSession(currentTrackId, currentTitle, currentThumbnail);
    }
  }, [currentTrackId, currentTitle, currentThumbnail, isPlaying]);

  // ─── Media Session API ─────────────────────────────────────────────────

  function updateMediaSession(trackId: string, title: string, thumbnail: string) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || 'Música de treino',
      artist: 'FitlyNutri',
      album: 'Música para Treino',
      artwork: thumbnail ? [{ src: thumbnail, sizes: '200x200', type: 'image/jpeg' }] : [],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play().catch(() => {});
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
    });
  }

  // ─── Service Worker Keep-Alive ─────────────────────────────────────────

  function startKeepAlive() {
    if (keepAliveRef.current) return;
    navigator.serviceWorker.controller?.postMessage({ type: 'AUDIO_PLAYING' });
    keepAliveRef.current = setInterval(() => {
      navigator.serviceWorker.controller?.postMessage({ type: 'AUDIO_KEEPALIVE' });
    }, 15000);
  }

  function stopKeepAlive() {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    navigator.serviceWorker.controller?.postMessage({ type: 'AUDIO_PAUSED' });
  }

  // ─── Busca e Reprodução ────────────────────────────────────────────────

  async function handleSearch(q: string) {
    if (!q.trim()) return;
    setSearching(true);
    setSearchErr(false);
    setResults([]);
    setAudioError('');
    const found = await searchMusic(q.trim());
    setResults(found);
    setSearchErr(found.length === 0);
    setSearching(false);
    if (found.length > 0) playAudio(found[0]);
  }

  function playAudio(v: MusicResult) {
    setCurrentTrackId(v.trackId);
    setCurrentTitle(v.title);
    setCurrentThumbnail(v.thumbnail);
    setAudioError('');

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.src = '';
    audio.src = v.audioUrl;
    audio.play().catch((err) => {
      console.error('Erro ao reproduzir áudio:', err);
      setAudioError('Não foi possível reproduzir. Tente outra música.');
    });
  }

  function togglePlayPause() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else if (currentTrackId) {
      audio.play().catch(() => {
        // Se falhou, tenta recarregar
        audio.load();
        audio.play().catch((err) => {
          console.error('Erro ao retomar:', err);
          setAudioError('Erro ao reproduzir. Selecione a música novamente.');
        });
      });
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Audio element — sempre presente no DOM para background playback */}
      <audio ref={audioRef as any} className="hidden" />

      {/* Header toggle */}
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Music className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <span className="text-sm font-semibold truncate">
            {isPlaying && currentTitle ? `🎵 ${currentTitle}` : 'Música de Treino'}
          </span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      <div className={cn('mt-4 space-y-3', !open && 'hidden')}>
        {/* Search input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Pesquisar músicas ou artistas..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchInput); }}
            className="input-field flex-1 text-sm"
          />
          <button
            onClick={() => handleSearch(searchInput)}
            disabled={searching}
            className="btn-primary text-sm px-3 flex-shrink-0 disabled:opacity-50 flex items-center gap-1.5"
          >
            {searching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Buscar
          </button>
        </div>

        {/* Genre chips */}
        <div className="flex flex-wrap gap-1.5">
          {MUSIC_GENRES.map((g) => (
            <button
              key={g.label}
              disabled={searching}
              onClick={() => { setSearchInput(g.q); handleSearch(g.q); }}
              className="text-xs px-3 py-1.5 rounded-full glass hover:bg-accent transition-all disabled:opacity-40"
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Search status */}
        {searching && (
          <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
          </div>
        )}
        {searchErr && !searching && (
          <p className="text-xs text-center text-muted-foreground py-2">Nenhum resultado. Tente outro termo.</p>
        )}

        {/* Audio error */}
        {audioError && (
          <p className="text-xs text-center text-destructive py-1">{audioError}</p>
        )}

        {/* Result thumbnails — horizontal scroll */}
        {results.length > 0 && !searching && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
            {results.map((v) => (
              <button
                key={v.trackId}
                onClick={() => playAudio(v)}
                className={cn(
                  'flex-shrink-0 w-32 rounded-xl overflow-hidden text-left transition-all border',
                  currentTrackId === v.trackId
                    ? 'border-primary/60 ring-1 ring-primary/40'
                    : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                <img src={v.thumbnail} alt={v.title} className="w-full aspect-video object-cover" loading="lazy" />
                <div className="px-1.5 py-1 bg-white/5">
                  <p className="text-[10px] font-medium line-clamp-2 leading-tight">{v.title}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{v.author}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Now playing bar */}
        {currentTrackId && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
            {currentThumbnail
              ? <img src={currentThumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              : <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0"><Music className="w-4 h-4 text-violet-400" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{currentTitle}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                {isPlaying
                  ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" /> Tocando em background</>
                  : 'Pausado'}
              </p>
            </div>
            <button
              onClick={togglePlayPause}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all flex-shrink-0"
              title={isPlaying ? 'Pausar' : 'Continuar'}
            >
              {isPlaying
                ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                : <Play className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Background mode info */}
        {isPlaying && (
          <div className="text-[10px] text-center text-emerald-400/70 flex items-center justify-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Áudio continuará tocando mesmo com a tela bloqueada
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────

function ExerciseRow({
  exercise, isActive, completedSets, onToggleSet, onOpenVideo,
}: {
  exercise: any;
  isActive: boolean;
  completedSets: boolean[];
  onToggleSet: (i: number) => void;
  onOpenVideo: (url: string, title: string) => void;
}) {
  const videoUrl: string | undefined = exercise.videoUrl;
  const name: string = exercise.name || '';
  const thumbnailUrl: string | undefined = exercise.gifUrl;
  const thumbnail = thumbnailUrl ? resolveImageUrl(thumbnailUrl) : getVideoThumbnail(videoUrl || '');
  const doneCount = completedSets.filter(Boolean).length;
  const allDone = isActive && doneCount >= exercise.sets;

  return (
    <div className={cn('glass-card transition-all', allDone && 'border border-emerald-600/20 bg-emerald-600/5')}>
      <div className="flex gap-3">
        {/* Left: exercise info */}
        <div className="flex-1 min-w-0">
          <div className={cn('font-bold text-base mb-2', allDone && 'text-emerald-400 line-through opacity-70')}>{name}</div>
          <div className="text-sm space-y-0.5">
            <div>
              <span className="font-semibold">Séries:</span>{' '}
              <span className="text-muted-foreground">{exercise.sets}x{exercise.reps}</span>
            </div>
            {exercise.weight != null && exercise.weight > 0 && (
              <div>
                <span className="font-semibold">Carga:</span>{' '}
                <span className="text-muted-foreground">{exercise.weight}kg</span>
              </div>
            )}
            {exercise.restSeconds != null && (
              <div>
                <span className="font-semibold">Intervalo:</span>{' '}
                <span className="text-muted-foreground">{exercise.restSeconds}s</span>
              </div>
            )}
          </div>
          {exercise.notes && (
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/70">Instruções:</span>{' '}{exercise.notes}
            </div>
          )}
        </div>

        {/* Right: video thumbnail */}
        {videoUrl && (
          <button
            onClick={() => onOpenVideo(videoUrl, name)}
            className="flex-shrink-0 w-32 h-24 rounded-xl overflow-hidden relative group"
          >
            {thumbnail ? (
              <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/30">
                <PlayCircle className="w-8 h-8 text-white/50" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
              <div className="w-11 h-11 rounded-full bg-black/60 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Play className="w-4 h-4 text-white ml-0.5" />
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Set checkboxes — only when workout is active */}
      {isActive && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex gap-2 flex-wrap">
            {[...Array(exercise.sets)].map((_, i) => (
              <button
                key={i}
                onClick={() => onToggleSet(i)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  completedSets[i]
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30'
                    : 'glass border-transparent hover:bg-accent',
                )}
              >
                {completedSets[i] ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                Série {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Circle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

// ─── Workout Summary Modal ────────────────────────────────────────────────────

function WorkoutSummaryModal({ workoutName, startTime, isPending, onConfirm, onClose }: {
  workoutName: string;
  startTime: Date;
  isPending: boolean;
  onConfirm: (intensity: string, comment: string, duration: number) => void;
  onClose: () => void;
}) {
  const [endTime] = useState(() => new Date());
  const [intensity, setIntensity] = useState('');
  const [comment, setComment] = useState('');
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Selfie state — inlined to keep video.play() in the same gesture chain
  const [showSelfie, setShowSelfie] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [selfieErr, setSelfieErr] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const durationMs = endTime.getTime() - startTime.getTime();
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);
  const durationStr = `${mins}:${String(secs).padStart(2, '0')}`;
  const dateStr = endTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const startStr = startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const endStr = endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleConcluir = () => {
    onConfirm(intensity, comment, mins);
    setConfirmed(true);
    setCardUrl(generateWorkoutCard({ workoutName, dateStr, startStr, endStr, durationStr, intensity, comment }));
  };

  const handleDownload = () => {
    if (!cardUrl) return;
    const a = document.createElement('a');
    a.href = cardUrl;
    a.download = `treino-${endTime.toISOString().split('T')[0]}.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!cardUrl) return;
    try {
      const res = await fetch(cardUrl);
      const blob = await res.blob();
      const file = new File([blob], 'treino.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Treino concluído!', text: `Finalizei: ${workoutName}` });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  async function startCamera(facing: 'user' | 'environment') {
    setCapturedUrl(null);
    setIsVideoReady(false);
    setCameraError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = s;
      const video = videoRef.current!;
      video.srcObject = s;
      video.play().catch(() => {}); // fire-and-forget; onPlaying event sets isVideoReady
    } catch (err: any) {
      const name: string = err?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('Câmera bloqueada. Verifique as permissões do navegador.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError('Nenhuma câmera encontrada neste dispositivo.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setCameraError('A câmera está em uso por outro app. Feche-o e tente novamente.');
      } else {
        setCameraError(`Erro ao acessar câmera: ${name || 'desconhecido'}`);
      }
    }
  }

  function handleSelfieClick() {
    setSelfieErr('');
    setCameraError('');
    setCapturedUrl(null);
    setIsVideoReady(false);

    // Try native camera via input[type=file] first — works in TWA/Brave/Chrome
    // without needing getUserMedia (which Brave Shields may block)
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'user'; // front camera
      input.style.display = 'none';
      document.body.appendChild(input);

      input.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        document.body.removeChild(input);
        if (!file) return;

        // Read the captured photo as data URL
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (!dataUrl) return;

          // Draw the photo onto canvas with overlay
          const img = new Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const vw = img.naturalWidth;
            const vh = img.naturalHeight;
            canvas.width = vw;
            canvas.height = vh;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, vw, vh);
            const now = new Date();

            // Pre-load the app logo icon onto the canvas for drawSelfieOverlay
            const logoImg = new Image();
            logoImg.crossOrigin = 'anonymous';
            logoImg.onload = () => {
              (ctx.canvas as any).__logoImage = logoImg;
              drawSelfieOverlay(ctx, vw, vh, {
                workoutName,
                durationStr,
                intensity,
                dayName: DAY_NAMES[now.getDay()],
                dateStr: now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                timeStr: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              });
              setCapturedUrl(canvas.toDataURL('image/jpeg', 0.93));
              setShowSelfie(true);
            };
            logoImg.onerror = () => {
              // Fallback: draw overlay without logo image
              drawSelfieOverlay(ctx, vw, vh, {
                workoutName,
                durationStr,
                intensity,
                dayName: DAY_NAMES[now.getDay()],
                dateStr: now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                timeStr: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              });
              setCapturedUrl(canvas.toDataURL('image/jpeg', 0.93));
              setShowSelfie(true);
            };
            logoImg.src = '/logo.png';
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });

      input.click();
    } catch (err: any) {
      // Fallback: try getUserMedia (WebRTC) if input[type=file] fails
      tryFallbackGetUserMedia();
    }
  }

  async function tryFallbackGetUserMedia() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setSelfieErr('Câmera não disponível. Verifique as permissões do app.');
      return;
    }
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      let s: MediaStream;
      try {
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      } catch {
        s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = s;
      const video = videoRef.current;
      if (!video) { setSelfieErr('Erro interno.'); return; }
      video.srcObject = s;
      await video.play();
      setIsVideoReady(true);
      setShowSelfie(true);
    } catch (err: any) {
      const name: string = err?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setSelfieErr('Câmera bloqueada. Vá em Configurações → Apps → FitlyNutri → Permissões → Câmera → Permitir');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setSelfieErr('Nenhuma câmera encontrada neste dispositivo.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setSelfieErr('A câmera está em uso por outro app. Feche-o e tente novamente.');
      } else {
        setSelfieErr(`Erro ao acessar câmera: ${name || 'desconhecido'}`);
      }
    }
  }

  function flipCamera() {
    const next: 'user' | 'environment' = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isVideoReady) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d')!;
    if (facingMode === 'user') { ctx.translate(vw, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, vw, vh);
    if (facingMode === 'user') ctx.setTransform(1, 0, 0, 1, 0, 0);
    const now = new Date();
    drawSelfieOverlay(ctx, vw, vh, {
      workoutName,
      durationStr,
      intensity,
      dayName: DAY_NAMES[now.getDay()],
      dateStr: now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      timeStr: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCapturedUrl(canvas.toDataURL('image/jpeg', 0.93));
  }

  function closeSelfie() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowSelfie(false);
    setCapturedUrl(null);
    setIsVideoReady(false);
    setCameraError('');
  }

  async function handleSelfieDownload() {
    if (!capturedUrl) return;
    const a = document.createElement('a');
    a.href = capturedUrl;
    a.download = `fitlynutri-self-${new Date().toISOString().split('T')[0]}.jpg`;
    a.click();
  }

  async function handleSelfieShare() {
    if (!capturedUrl) return;
    try {
      const blob = await fetch(capturedUrl).then((r) => r.blob());
      const file = new File([blob], 'fitlynutri-self.jpg', { type: 'image/jpeg' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Hora da Self! 💪', text: `Finalizei: ${workoutName} — Fitlynutri` });
        return;
      }
    } catch {}
    handleSelfieDownload();
  }

  return (
    <>
      {/*
        Selfie overlay — ALWAYS in the DOM (never conditionally unmounted).
        Hiding via CSS (visibility + z-index) keeps videoRef.current alive so
        video.play() can be called within the gesture chain in handleSelfieClick,
        before setShowSelfie(true) makes it visible.
      */}
      <div
        className="fixed inset-0 flex flex-col select-none bg-black"
        style={{ zIndex: showSelfie ? 99999 : -1, visibility: showSelfie ? 'visible' : 'hidden' }}
      >
        {/* Header */}
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)' }}
        >
          <h2 className="font-bold text-lg flex items-center gap-2 text-white">
            <Camera className="w-5 h-5 text-violet-400" />
            Hora da Self!
          </h2>
          <button
            onClick={closeSelfie}
            className="w-9 h-9 rounded-full bg-black/40 border border-white/20 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Camera view — video is always inside here, never removed from DOM */}
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onPlaying={() => setIsVideoReady(true)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              visibility: capturedUrl || cameraError ? 'hidden' : 'visible',
            }}
          />
          {cameraError ? (
            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-center p-8">
              <Camera className="w-14 h-14 text-white/25 mb-5" />
              <p className="font-bold text-white text-base mb-3">Câmera não disponível</p>
              <p className="text-sm text-white/60 whitespace-pre-line leading-relaxed">{cameraError}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="mt-6 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
              >
                Tentar novamente
              </button>
            </div>
          ) : capturedUrl ? (
            <img src={capturedUrl} alt="Sua self" className="absolute inset-0 w-full h-full object-contain" />
          ) : !isVideoReady ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/60 text-sm">Iniciando câmera...</p>
            </div>
          ) : null}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div
          className="px-6 pb-10 pt-4 relative z-10"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 70%, transparent 100%)' }}
        >
          {!capturedUrl ? (
            <div className="flex items-center justify-between">
              <div className="w-12" />
              <button
                onClick={capture}
                disabled={!isVideoReady || !!cameraError}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
              >
                <div className="w-14 h-14 rounded-full bg-white" />
              </button>
              <button
                onClick={flipCamera}
                disabled={!!cameraError}
                className="w-12 h-12 rounded-full bg-white/15 border border-white/20 flex items-center justify-center disabled:opacity-30"
              >
                <SwitchCamera className="w-5 h-5 text-white" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm text-white/70 mb-2">Sua self está pronta! 💪</p>
              <div className="flex gap-3">
                <button
                  onClick={handleSelfieDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/20 text-white text-sm font-medium active:bg-white/10 transition-colors"
                >
                  <Download className="w-4 h-4" /> Salvar
                </button>
                <button
                  onClick={handleSelfieShare}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Compartilhar
                </button>
              </div>
              <button
                onClick={() => { setCapturedUrl(null); startCamera(facingMode); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 text-white text-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Tirar novamente
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div className="glass-card w-full max-w-md" style={{ position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>

          <div className="text-center mb-6 pt-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold">Parabéns!</h2>
            <p className="text-muted-foreground text-sm mt-1">Treino concluído com sucesso</p>
            <p className="text-primary font-medium mt-1">{workoutName}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {[{ label: 'Data', value: dateStr }, { label: 'Início', value: startStr }, { label: 'Fim', value: endStr }].map((s) => (
              <div key={s.label} className="glass rounded-xl p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                <div className="font-semibold text-sm">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="glass rounded-xl p-3 text-center mb-6">
            <div className="text-xs text-muted-foreground mb-1">Duração total</div>
            <div className="text-2xl font-bold text-primary">{durationStr} min</div>
          </div>

          {!confirmed ? (
            <>
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-2 block">Como foi a intensidade do treino?</label>
                <div className="relative">
                  <select value={intensity} onChange={(e) => setIntensity(e.target.value)} className="input-field w-full appearance-none pr-10">
                    <option value="">Selecione...</option>
                    <option>Muito leve</option>
                    <option>Leve</option>
                    <option>Moderado</option>
                    <option>Pesado</option>
                    <option>Muito pesado</option>
                  </select>
                </div>
              </div>
              <div className="mb-6">
                <label className="text-xs text-muted-foreground mb-2 block">Deixe um comentário (opcional)</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Como foi seu treino? Algo a destacar?" className="input-field resize-none w-full" rows={3} />
              </div>
              <button onClick={handleConcluir} disabled={isPending} className="btn-primary w-full flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {isPending ? 'Salvando...' : 'Concluir Treino'}
              </button>
            </>
          ) : (
            <>
              {cardUrl && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground text-center mb-3">Seu card foi gerado! Baixe ou compartilhe.</p>
                  <img src={cardUrl} alt="Card do treino" className="w-full rounded-xl shadow-lg" />
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleDownload} className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm py-2">
                      <Download className="w-4 h-4" /> Baixar
                    </button>
                    <button onClick={handleShare} className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-2">
                      <Share2 className="w-4 h-4" /> Compartilhar
                    </button>
                  </div>
                </div>
              )}
              <button
                onClick={handleSelfieClick}
                className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-semibold transition-all"
              >
                <Camera className="w-4 h-4" /> Hora da Self! 📸
              </button>
              {selfieErr && (
                <p className="text-xs text-center text-destructive mt-2 whitespace-pre-line leading-relaxed">{selfieErr}</p>
              )}
              <button onClick={onClose} className="btn-secondary w-full mt-2">Fechar</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Canvas card generator ────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function generateWorkoutCard({ workoutName, dateStr, startStr, endStr, durationStr, intensity, comment }: {
  workoutName: string; dateStr: string; startStr: string; endStr: string;
  durationStr: string; intensity: string; comment: string;
}): string {
  const W = 1080, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d0d1a'); bg.addColorStop(1, '#160d2e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, '#7c3aed'); bar.addColorStop(1, '#4f46e5');
  ctx.fillStyle = bar; ctx.fillRect(0, 0, W, 10);

  const glow = ctx.createRadialGradient(W / 2, 300, 0, W / 2, 300, 420);
  glow.addColorStop(0, 'rgba(124,58,237,0.18)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '500 36px system-ui,sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('Fitlynutri', W / 2, 85);

  ctx.fillStyle = '#059669';
  ctx.beginPath(); ctx.arc(W / 2, 235, 85, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 33, 235); ctx.lineTo(W / 2 - 5, 268); ctx.lineTo(W / 2 + 43, 198);
  ctx.stroke();

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 76px system-ui,sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('Treino Concluído!', W / 2, 385);

  ctx.fillStyle = '#a78bfa'; ctx.font = '50px system-ui,sans-serif';
  const nameShort = workoutName.length > 28 ? workoutName.slice(0, 25) + '...' : workoutName;
  ctx.fillText(nameShort, W / 2, 455);

  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(100, 495); ctx.lineTo(W - 100, 495); ctx.stroke();

  const stats = [{ label: 'Data', value: dateStr }, { label: 'Início', value: startStr }, { label: 'Fim', value: endStr }, { label: 'Duração', value: durationStr + ' min' }];
  const bW = 218, bH = 112, bGap = 16;
  const totalBW = stats.length * bW + (stats.length - 1) * bGap;
  const bStartX = (W - totalBW) / 2;
  stats.forEach((s, i) => {
    const x = bStartX + i * (bW + bGap), y = 525;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, x, y, bW, bH, 18); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '26px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(s.label, x + bW / 2, y + 36);
    ctx.fillStyle = '#ffffff';
    let fSize = 34;
    ctx.font = `bold ${fSize}px system-ui,sans-serif`;
    while (ctx.measureText(s.value).width > bW - 16 && fSize > 18) { fSize -= 2; ctx.font = `bold ${fSize}px system-ui,sans-serif`; }
    ctx.fillText(s.value, x + bW / 2, y + 82);
  });

  const showIntensity = !!intensity;
  if (showIntensity) {
    const pW = 360, pH = 76, pX = (W - pW) / 2, pY = 685;
    ctx.fillStyle = 'rgba(124,58,237,0.22)';
    roundRect(ctx, pX, pY, pW, pH, 38); ctx.fill();
    ctx.strokeStyle = 'rgba(167,139,250,0.35)'; ctx.lineWidth = 2;
    roundRect(ctx, pX, pY, pW, pH, 38); ctx.stroke();
    ctx.fillStyle = 'rgba(167,139,250,0.65)'; ctx.font = '26px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('Intensidade', W / 2, pY + 28);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 34px system-ui,sans-serif';
    ctx.fillText(intensity, W / 2, pY + 65);
  }

  if (comment.trim()) {
    const cY = showIntensity ? 820 : 720;
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = 'italic 32px system-ui,sans-serif';
    ctx.textAlign = 'center';
    const t = comment.length > 55 ? comment.slice(0, 52) + '...' : comment;
    ctx.fillText(`"${t}"`, W / 2, cY);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.font = '24px system-ui,sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('Gerado com Fitlynutri', W / 2, H - 38);

  return canvas.toDataURL('image/png');
}

// ─── Selfie overlay renderer ──────────────────────────────────────────────────

const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function drawSelfieOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, info: {
  workoutName: string; durationStr: string; intensity: string;
  dayName: string; dateStr: string; timeStr: string;
}) {
  const scale = w / 1080;
  const pad = scale * 52;

  // ── TOP: Logo FitlyNutri ──────────────────────────────────────────────────
  // Semi-transparent dark bar at the top — does NOT cover the photo content
  const topBarH = scale * 100;
  const topGrad = ctx.createLinearGradient(0, 0, 0, topBarH);
  topGrad.addColorStop(0, 'rgba(0,0,0,0.75)');
  topGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, w, topBarH);

  // Logo: try to use the app icon image (loaded via Image in handleSelfieClick)
  // If logoImage is available on the canvas, draw it; otherwise fallback to text
  const logoSize = scale * 52;
  const logoX = pad;
  const logoY = scale * 18;

  // Draw the app icon (loaded from /icons/icon-512.png)
  const logoImg = (ctx.canvas as any).__logoImage as HTMLImageElement | undefined;
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    // Draw the icon as a rounded square
    const r = scale * 10;
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, logoX, logoY, logoSize, logoSize, r);
    ctx.clip();
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();
  } else {
    // Fallback: purple circle with "F"
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(scale * 32)}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F', logoX + logoSize / 2, logoY + logoSize / 2 + 1);
  }

  // "FitlyNutri" text next to logo
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(scale * 28)}px system-ui,sans-serif`;
  ctx.fillText('FitlyNutri', logoX + logoSize + scale * 14, logoY + logoSize / 2);

  // ── TOP RIGHT: Day-of-week checklist ──────────────────────────────────────
  const today = new Date().getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  const daySize = scale * 32;
  const dayGap = scale * 6;
  const dayTotalW = 7 * daySize + 6 * dayGap;
  const dayStartX = w - pad - dayTotalW;
  const dayCenterY = logoY + logoSize / 2;

  for (let i = 0; i < 7; i++) {
    const dx = dayStartX + i * (daySize + dayGap);
    const isToday = i === today;

    // Circle background
    ctx.beginPath();
    ctx.arc(dx + daySize / 2, dayCenterY, daySize / 2, 0, Math.PI * 2);
    if (isToday) {
      ctx.fillStyle = 'rgba(5, 150, 105, 0.85)'; // green for today
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; // subtle for other days
    }
    ctx.fill();

    // Day label
    ctx.fillStyle = isToday ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.font = `600 ${Math.round(scale * 16)}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(DAY_SHORT[i], dx + daySize / 2, dayCenterY);
  }

  // ── BOTTOM: Info bar with dark background for readability ─────────────────
  const bottomBarH = scale * 200;
  const bottomY = h - bottomBarH;

  // Dark background for bottom info — fully opaque at bottom, fading up
  const bottomGrad = ctx.createLinearGradient(0, bottomY, 0, h);
  bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
  bottomGrad.addColorStop(0.25, 'rgba(0,0,0,0.70)');
  bottomGrad.addColorStop(0.6, 'rgba(0,0,0,0.88)');
  bottomGrad.addColorStop(1, 'rgba(0,0,0,0.95)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, bottomY, w, bottomBarH);

  // Purple accent line at top of bottom bar
  const lineY = bottomY + scale * 6;
  const lg = ctx.createLinearGradient(0, 0, w, 0);
  lg.addColorStop(0, 'rgba(124,58,237,0)');
  lg.addColorStop(0.15, '#7c3aed');
  lg.addColorStop(0.85, '#a78bfa');
  lg.addColorStop(1, 'rgba(167,139,250,0)');
  ctx.strokeStyle = lg;
  ctx.lineWidth = scale * 3.5;
  ctx.beginPath(); ctx.moveTo(0, lineY); ctx.lineTo(w, lineY); ctx.stroke();

  // Reset text baseline for the rest
  ctx.textBaseline = 'alphabetic';

  const y1 = bottomY + scale * 60;
  const y2 = y1 + scale * 54;
  const y3 = y2 + scale * 46;

  // Row 1: Workout name (left) | Duration (right)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(scale * 42)}px system-ui,sans-serif`;
  const nameShort = info.workoutName.length > 22 ? info.workoutName.slice(0, 19) + '...' : info.workoutName;
  ctx.fillText(nameShort, pad, y1);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#a78bfa';
  ctx.font = `bold ${Math.round(scale * 36)}px system-ui,sans-serif`;
  ctx.fillText(`${info.durationStr} min`, w - pad, y1);

  // Row 2: Day + Date + Time (left) | Intensity (right)
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  ctx.font = `${Math.round(scale * 28)}px system-ui,sans-serif`;
  ctx.fillText(`${info.dayName}, ${info.dateStr} • ${info.timeStr}`, pad, y2);

  if (info.intensity) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.70)';
    ctx.font = `${Math.round(scale * 26)}px system-ui,sans-serif`;
    ctx.fillText(info.intensity, w - pad, y2);
  }

  // Row 3: "FitlyNutri" watermark
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.font = `${Math.round(scale * 22)}px system-ui,sans-serif`;
  ctx.fillText('fitlynutri.com.br', w / 2, y3);
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
