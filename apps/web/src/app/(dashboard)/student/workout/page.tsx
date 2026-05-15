'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Play, CheckCircle2, Clock, ChevronDown,
  ChevronUp, Flame, RotateCcw, Timer, ChevronRight,
  Calendar, Filter, X, Maximize2, PlayCircle, Trophy, Share2, Download,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TODAY = new Date().getDay();

// ─── Video helpers ──────────────────────────────────────────────────────────

function getEmbedInfo(url: string): { embedUrl: string; type: 'youtube' | 'vimeo' | 'direct' } | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  if (ytMatch) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1` };
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0` };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { type: 'direct', embedUrl: url };
  return null;
}

// ─── Video Modal ─────────────────────────────────────────────────────────────

function VideoModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const info = getEmbedInfo(url);

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
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-all flex-shrink-0 ml-3"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative aspect-video">
            {info?.type === 'direct' ? (
              <video src={info.embedUrl} controls autoPlay className="w-full h-full" />
            ) : info ? (
              <iframe
                src={info.embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Formato de vídeo não suportado
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentWorkout() {
  const [selectedDay, setSelectedDay] = useState(TODAY);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [activeWorkout, setActiveWorkout] = useState(false);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({});
  const [videoModal, setVideoModal] = useState<{ url: string; title: string } | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showSummary, setShowSummary] = useState(false);
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

  const dayPlan = workoutPlans?.find((p: any) => p.dayOfWeek?.includes(selectedDay));

  const toggleSet = (exerciseId: string, setIndex: number) => {
    setCompletedSets((prev) => {
      const sets = prev[exerciseId] || [];
      const updated = [...sets];
      updated[setIndex] = !updated[setIndex];
      return { ...prev, [exerciseId]: updated };
    });
  };

  const allCompleted = dayPlan?.workout?.exercises?.every((ex: any) => {
    const sets = completedSets[ex.id] || [];
    return sets.filter(Boolean).length >= ex.sets;
  });

  const openVideo = useCallback((url: string, title: string) => {
    setVideoModal({ url, title });
  }, []);

  const closeVideo = useCallback(() => setVideoModal(null), []);

  return (
    <>
      {videoModal && (
        <VideoModal url={videoModal.url} title={videoModal.title} onClose={closeVideo} />
      )}
      {showSummary && startTime && dayPlan && (
        <WorkoutSummaryModal
          workoutName={dayPlan.workout?.name || 'Treino'}
          startTime={startTime}
          isPending={logMutation.isPending}
          onConfirm={(intensity, comment) =>
            logMutation.mutate({ workoutPlanId: dayPlan.id, intensity, comment })
          }
          onClose={() => {
            setShowSummary(false);
            setActiveWorkout(false);
            setCompletedSets({});
            setStartTime(null);
          }}
        />
      )}

      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meu Treino</h1>
            <p className="text-muted-foreground text-sm mt-1">Selecione o dia e execute</p>
          </div>
          <button className="glass rounded-xl p-2 hover:bg-accent transition-all">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Day selector */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {DAYS.map((day, i) => {
            const hasPlan = workoutPlans?.some((p: any) => p.dayOfWeek?.includes(i));
            const isToday = i === TODAY;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(i)}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-3 rounded-xl flex-shrink-0 transition-all border',
                  selectedDay === i
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'glass border-transparent hover:bg-accent',
                )}
              >
                <span className="text-xs font-medium">{day}</span>
                {hasPlan && (
                  <div className={cn('w-1.5 h-1.5 rounded-full', selectedDay === i ? 'bg-white/60' : 'bg-primary')} />
                )}
                {isToday && selectedDay !== i && (
                  <span className="text-[9px] text-primary font-semibold">hoje</span>
                )}
              </button>
            );
          })}
        </div>

        {dayPlan ? (
          <>
            {/* Workout info */}
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{dayPlan.division || 'Treino'}</div>
                  <h2 className="font-bold text-lg">{dayPlan.workout?.name}</h2>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{dayPlan.workout?.duration || 45} min</span>
                    <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{dayPlan.workout?.exercises?.length || 0} exercícios</span>
                    <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" />~{(dayPlan.workout?.duration || 45) * 7} kcal</span>
                  </div>
                </div>
                {!activeWorkout ? (
                  <button
                    onClick={() => { setActiveWorkout(true); setStartTime(new Date()); }}
                    className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
                  >
                    <Play className="w-4 h-4" />
                    Iniciar
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <Timer className="w-4 h-4" />
                    Em andamento
                  </div>
                )}
              </div>
            </motion.div>

            {/* Exercise list */}
            <div className="space-y-3">
              {(dayPlan.workout?.exercises || []).map((ex: any, i: number) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  index={i}
                  isExpanded={expandedExercise === ex.id}
                  onToggle={() => setExpandedExercise(expandedExercise === ex.id ? null : ex.id)}
                  completedSets={completedSets[ex.id] || []}
                  onToggleSet={(setIdx) => toggleSet(ex.id, setIdx)}
                  isActive={activeWorkout}
                  onOpenVideo={openVideo}
                />
              ))}
            </div>

            {/* Finish workout */}
            {activeWorkout && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-600/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      {allCompleted ? 'Treino concluído!' : 'Progresso do treino'}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {allCompleted
                        ? 'Parabéns! Registre seu treino.'
                        : 'Conclua todos os exercícios para finalizar.'}
                    </div>
                  </div>
                  <button
                    disabled={!allCompleted}
                    onClick={() => setShowSummary(true)}
                    className={cn(
                      'btn-primary text-sm py-2 px-4 flex items-center gap-2',
                      !allCompleted && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Finalizar
                  </button>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            key={`empty-${selectedDay}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Dia de descanso</h3>
            <p className="text-sm text-muted-foreground">Nenhum treino planejado para este dia.</p>
          </motion.div>
        )}

        {/* Recent logs */}
        {workoutLogs?.length > 0 && (
          <div className="glass-card">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
              Histórico Recente
            </h2>
            <div className="space-y-2">
              {workoutLogs.map((log: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{log.workoutPlan?.workout?.name || 'Treino'}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.startedAt || log.completedAt).toLocaleDateString('pt-BR')} • {log.duration} min
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────

function ExerciseCard({
  exercise, index, isExpanded, onToggle, completedSets, onToggleSet, isActive, onOpenVideo,
}: {
  exercise: any;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  completedSets: boolean[];
  onToggleSet: (i: number) => void;
  isActive: boolean;
  onOpenVideo: (url: string, title: string) => void;
}) {
  const doneCount = completedSets.filter(Boolean).length;
  const allDone = doneCount >= exercise.sets;
  const videoUrl: string | undefined = exercise.exercise?.videoUrl;
  const exerciseName: string = exercise.exercise?.name || '';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'glass-card !p-0 overflow-hidden transition-all',
        allDone && 'border border-emerald-600/20',
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-all text-left"
      >
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0',
          allDone ? 'bg-emerald-600/20 text-emerald-400' : 'bg-purple-600/10 text-purple-400',
        )}>
          {allDone ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-2">
            {exerciseName}
            {videoUrl && (
              <PlayCircle className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {exercise.sets} séries × {exercise.reps}
            {exercise.weight ? ` • ${exercise.weight}kg` : ''}
            {exercise.restSeconds ? ` • ${exercise.restSeconds}s descanso` : ''}
          </div>
        </div>
        {isActive && (
          <div className="text-xs text-muted-foreground mr-2">
            {doneCount}/{exercise.sets}
          </div>
        )}
        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50"
          >
            <div className="p-4 space-y-4">
              {/* Video preview */}
              {videoUrl && (
                <VideoPreview
                  url={videoUrl}
                  title={exerciseName}
                  onExpand={() => onOpenVideo(videoUrl, exerciseName)}
                />
              )}

              {exercise.exercise?.description && (
                <p className="text-xs text-muted-foreground">{exercise.exercise.description}</p>
              )}

              {isActive && (
                <div>
                  <div className="text-xs font-medium mb-2">Marcar séries concluídas:</div>
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

              {exercise.notes && (
                <div className="glass rounded-xl p-3">
                  <div className="text-xs text-muted-foreground">{exercise.notes}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Inline video preview (inside expanded card) ──────────────────────────────

function VideoPreview({ url, title, onExpand }: { url: string; title: string; onExpand: () => void }) {
  const info = getEmbedInfo(url);
  if (!info) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <PlayCircle className="w-3.5 h-3.5 text-purple-400" />
          Demonstração
        </span>
        <button
          onClick={onExpand}
          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
        >
          <Maximize2 className="w-3 h-3" />
          Ampliar
        </button>
      </div>
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer group bg-black"
        style={{ paddingTop: '56.25%' }}
        onClick={onExpand}
      >
        {info.type === 'direct' ? (
          <video
            src={info.embedUrl}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            playsInline
          />
        ) : (
          <iframe
            src={info.embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0 pointer-events-none"
            tabIndex={-1}
          />
        )}
        {/* Overlay to intercept clicks and open modal */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-all">
          <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-all group-hover:scale-110 scale-100">
            <Maximize2 className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
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
  onConfirm: (intensity: string, comment: string) => void;
  onClose: () => void;
}) {
  const [endTime] = useState(() => new Date());
  const [intensity, setIntensity] = useState('');
  const [comment, setComment] = useState('');
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const durationMs = endTime.getTime() - startTime.getTime();
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);
  const durationStr = `${mins}:${String(secs).padStart(2, '0')}`;
  const dateStr = endTime.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const startStr = startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const endStr = endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleConcluir = () => {
    onConfirm(intensity, comment);
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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="glass-card w-full max-w-md" style={{ position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-all">
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6 pt-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold">Parabéns!</h2>
          <p className="text-muted-foreground text-sm mt-1">Treino concluído com sucesso</p>
          <p className="text-primary font-medium mt-1">{workoutName}</p>
        </div>

        {/* Stats */}
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
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
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
            <button onClick={onClose} className="btn-secondary w-full mt-2">Fechar</button>
          </>
        )}
      </div>
    </div>
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

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d0d1a'); bg.addColorStop(1, '#160d2e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Top accent bar
  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, '#7c3aed'); bar.addColorStop(1, '#4f46e5');
  ctx.fillStyle = bar; ctx.fillRect(0, 0, W, 10);

  // Glow
  const glow = ctx.createRadialGradient(W / 2, 300, 0, W / 2, 300, 420);
  glow.addColorStop(0, 'rgba(124,58,237,0.18)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // App name
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '500 36px system-ui,sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('FitSaaS', W / 2, 85);

  // Green circle with checkmark
  ctx.fillStyle = '#059669';
  ctx.beginPath(); ctx.arc(W / 2, 235, 85, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 33, 235); ctx.lineTo(W / 2 - 5, 268); ctx.lineTo(W / 2 + 43, 198);
  ctx.stroke();

  // Title
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 76px system-ui,sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('Treino Concluído!', W / 2, 385);

  // Workout name
  ctx.fillStyle = '#a78bfa'; ctx.font = '50px system-ui,sans-serif';
  const nameShort = workoutName.length > 28 ? workoutName.slice(0, 25) + '...' : workoutName;
  ctx.fillText(nameShort, W / 2, 455);

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(100, 495); ctx.lineTo(W - 100, 495); ctx.stroke();

  // Stats boxes
  const stats = [
    { label: 'Data', value: dateStr },
    { label: 'Início', value: startStr },
    { label: 'Fim', value: endStr },
    { label: 'Duração', value: durationStr + ' min' },
  ];
  const bW = 218, bH = 112, bGap = 16;
  const totalBW = stats.length * bW + (stats.length - 1) * bGap;
  const bStartX = (W - totalBW) / 2;
  stats.forEach((s, i) => {
    const x = bStartX + i * (bW + bGap), y = 525;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, x, y, bW, bH, 18); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '26px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(s.label, x + bW / 2, y + 36);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 34px system-ui,sans-serif';
    ctx.fillText(s.value, x + bW / 2, y + 82);
  });

  // Intensity pill
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

  // Comment
  if (comment.trim()) {
    const cY = showIntensity ? 820 : 720;
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = 'italic 32px system-ui,sans-serif';
    ctx.textAlign = 'center';
    const t = comment.length > 55 ? comment.slice(0, 52) + '...' : comment;
    ctx.fillText(`"${t}"`, W / 2, cY);
  }

  // Watermark
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.font = '24px system-ui,sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('Gerado com FitSaaS', W / 2, H - 38);

  return canvas.toDataURL('image/png');
}
