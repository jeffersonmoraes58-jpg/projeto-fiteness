'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, Lock, Video, FileText,
  Link2, Headphones, AlignLeft, Paperclip, ExternalLink,
  ChevronLeft, ChevronRight, Menu, X, RefreshCw,
  Play, BookOpen, Image as ImageIcon,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── types ───────────────────────────────────────────────────────────────────

type LessonType = 'video' | 'pdf' | 'link' | 'audio' | 'text';

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface Lesson {
  id: string;
  order: number;
  title: string;
  description?: string;
  type: LessonType;
  contentUrl?: string;
  duration?: number;
  thumbnailUrl?: string;
  isFree: boolean;
  isLocked: boolean;
  isCompleted: boolean;
  progress: number;
  attachments?: Attachment[];
}

interface ChallengeContent {
  challenge: { id: string; title: string; description?: string };
  hasPaidAccess: boolean;
  lessons: Lesson[];
  totalLessons: number;
  completedLessons: number;
  overallProgress: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getYouTubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return m ? m[1] : null;
}

function getVimeoId(url: string) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ATTACH_ICONS: Record<string, any> = {
  pdf: FileText,
  image: ImageIcon,
  link: Link2,
  audio: Headphones,
  video: Video,
};

function AttachIcon({ type }: { type: string }) {
  const lower = (type ?? '').toLowerCase();
  const Icon =
    lower.includes('pdf') ? FileText :
    lower.includes('image') || lower.includes('img') ? ImageIcon :
    lower.includes('audio') ? Headphones :
    lower.includes('video') ? Video :
    Link2;
  return <Icon className="w-4 h-4" />;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function StudentChallengeContent({ params }: { params: { id: string } }) {
  const challengeId = params.id;
  const qc = useQueryClient();

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedProgress = useRef<number>(-1);

  const { data, isLoading, error } = useQuery<ChallengeContent>({
    queryKey: ['challenge-content', challengeId],
    queryFn: () =>
      api.get(`/challenges/${challengeId}/content`).then((r) => r.data?.data ?? r.data),
  });

  // Set initial lesson (first unlocked)
  useEffect(() => {
    if (data?.lessons && !activeLesson) {
      const first = data.lessons
        .slice()
        .sort((a, b) => a.order - b.order)
        .find((l) => !l.isLocked) ?? data.lessons[0];
      setActiveLesson(first ?? null);
    }
  }, [data?.lessons]);

  const progressMut = useMutation({
    mutationFn: ({ lessonId, progress }: { lessonId: string; progress: number }) =>
      api.post(`/challenges/lessons/${lessonId}/progress`, { progress }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenge-content', challengeId] });
      qc.invalidateQueries({ queryKey: ['challenges-active'] });
      qc.invalidateQueries({ queryKey: ['challenges-completed'] });
    },
  });

  // Save progress helper
  const saveProgress = useCallback(
    (lessonId: string, pct: number) => {
      const rounded = Math.round(pct);
      if (rounded === lastSavedProgress.current) return;
      lastSavedProgress.current = rounded;
      progressMut.mutate({ lessonId, progress: rounded });
    },
    [progressMut],
  );

  // HTML5 video time update
  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video || !activeLesson) return;
    const pct = (video.currentTime / video.duration) * 100;
    if (Math.floor(pct) % 10 === 0) {
      saveProgress(activeLesson.id, pct);
    }
  }

  function handleVideoEnded() {
    if (!activeLesson) return;
    saveProgress(activeLesson.id, 100);
  }

  // Reset saved progress tracker on lesson change
  useEffect(() => {
    lastSavedProgress.current = activeLesson?.progress ?? -1;
  }, [activeLesson?.id]);

  // ── sorted lessons ──
  const lessons = (data?.lessons ?? []).slice().sort((a, b) => a.order - b.order);

  function selectLesson(lesson: Lesson) {
    setActiveLesson(lesson);
    // On mobile, close sidebar after selection
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/student/challenges" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>
        <div className="glass-card animate-pulse h-96" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/student/challenges" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="glass-card text-center py-16">
          <p className="text-red-400 text-sm">Erro ao carregar conteúdo do desafio.</p>
        </div>
      </div>
    );
  }

  const { challenge, overallProgress, totalLessons, completedLessons } = data;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/student/challenges"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="h-5 w-px bg-white/10" />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{challenge.title}</h1>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {completedLessons}/{totalLessons} aulas
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progresso geral</span>
          <span className="font-medium text-foreground">{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(overallProgress, 100)}%` }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-500"
          />
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex gap-4 relative">
        {/* Sidebar toggle for mobile */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="md:hidden absolute -top-2 right-0 z-20 p-1.5 rounded-lg bg-white/10 text-muted-foreground hover:text-foreground transition-all"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* ── Sidebar: lesson list ── */}
        <div
          className={cn(
            'flex-shrink-0 w-64 space-y-1 transition-all',
            sidebarOpen ? 'block' : 'hidden md:block',
          )}
        >
          {lessons.map((lesson, index) => {
            const isActive = activeLesson?.id === lesson.id;
            const hasProgress = !lesson.isCompleted && lesson.progress > 0;

            return (
              <button
                key={lesson.id}
                onClick={() => selectLesson(lesson)}
                disabled={lesson.isLocked && !data.hasPaidAccess}
                className={cn(
                  'w-full text-left p-3 rounded-xl transition-all group',
                  isActive
                    ? 'bg-primary/20 border border-primary/30'
                    : lesson.isLocked && !data.hasPaidAccess
                    ? 'opacity-50 cursor-not-allowed bg-white/5'
                    : 'hover:bg-white/5',
                )}
              >
                <div className="flex items-center gap-2">
                  {/* Status icon */}
                  {lesson.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : lesson.isLocked && !data.hasPaidAccess ? (
                    <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : isActive ? (
                    <Play className="w-4 h-4 text-primary flex-shrink-0" />
                  ) : (
                    <div className={cn(
                      'w-4 h-4 rounded-full border flex-shrink-0',
                      hasProgress ? 'border-blue-400' : 'border-white/20',
                    )} />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground font-mono">
                        {String(lesson.order).padStart(2, '0')}.
                      </span>
                      <span className={cn(
                        'text-xs font-medium truncate',
                        isActive ? 'text-primary' : lesson.isCompleted ? 'text-emerald-400' : 'text-foreground',
                      )}>
                        {lesson.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {lesson.type === 'video' && <Video className="w-2.5 h-2.5 text-muted-foreground" />}
                      {lesson.type === 'pdf' && <FileText className="w-2.5 h-2.5 text-muted-foreground" />}
                      {lesson.type === 'link' && <Link2 className="w-2.5 h-2.5 text-muted-foreground" />}
                      {lesson.type === 'audio' && <Headphones className="w-2.5 h-2.5 text-muted-foreground" />}
                      {lesson.type === 'text' && <AlignLeft className="w-2.5 h-2.5 text-muted-foreground" />}
                      {lesson.duration && (
                        <span className="text-xs text-muted-foreground">{formatDuration(lesson.duration)}</span>
                      )}
                    </div>
                    {/* Per-lesson progress bar */}
                    {hasProgress && (
                      <div className="mt-1 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${lesson.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Main content area ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {!activeLesson ? (
            <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Selecione uma aula para começar</p>
            </div>
          ) : activeLesson.isLocked && !data.hasPaidAccess ? (
            /* Locked overlay */
            <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Conteúdo bloqueado</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                Compre este desafio para ter acesso a todas as aulas.
              </p>
              <Link
                href="/student/challenges"
                className="btn-primary flex items-center gap-2 text-sm"
              >
                Comprar desafio
              </Link>
            </div>
          ) : (
            <>
              {/* ── Player / Viewer ── */}
              <LessonViewer
                lesson={activeLesson}
                videoRef={videoRef}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                onMarkComplete={() => saveProgress(activeLesson.id, 100)}
                isSaving={progressMut.isPending}
              />

              {/* ── Lesson info ── */}
              <div className="glass-card space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold">{activeLesson.title}</h2>
                  {activeLesson.isCompleted && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Concluída
                    </span>
                  )}
                  {activeLesson.isFree && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                      Prévia grátis
                    </span>
                  )}
                </div>
                {activeLesson.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {activeLesson.description}
                  </p>
                )}
              </div>

              {/* ── Navigation: prev/next ── */}
              <LessonNav
                lessons={lessons}
                activeLesson={activeLesson}
                hasPaidAccess={data.hasPaidAccess}
                onSelect={setActiveLesson}
              />

              {/* ── Attachments ── */}
              {activeLesson.attachments && activeLesson.attachments.length > 0 && (
                <div className="glass-card space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    Anexos ({activeLesson.attachments.length})
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {activeLesson.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-all">
                          <AttachIcon type={att.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{att.name}</p>
                          <p className="text-xs text-muted-foreground">{att.type}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LessonViewer ─────────────────────────────────────────────────────────────

function LessonViewer({
  lesson,
  videoRef,
  onTimeUpdate,
  onEnded,
  onMarkComplete,
  isSaving,
}: {
  lesson: Lesson;
  videoRef: React.RefObject<HTMLVideoElement>;
  onTimeUpdate: () => void;
  onEnded: () => void;
  onMarkComplete: () => void;
  isSaving: boolean;
}) {
  const url = lesson.contentUrl ?? '';

  if (lesson.type === 'video') {
    const ytId = getYouTubeId(url);
    const vmId = getVimeoId(url);

    if (ytId) {
      return (
        <div className="space-y-3">
          <div className="aspect-video rounded-2xl overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
          <MarkCompleteButton onMark={onMarkComplete} isSaving={isSaving} isCompleted={lesson.isCompleted} />
        </div>
      );
    }

    if (vmId) {
      return (
        <div className="space-y-3">
          <div className="aspect-video rounded-2xl overflow-hidden bg-black">
            <iframe
              src={`https://player.vimeo.com/video/${vmId}`}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
          <MarkCompleteButton onMark={onMarkComplete} isSaving={isSaving} isCompleted={lesson.isCompleted} />
        </div>
      );
    }

    // Direct video file
    if (url) {
      return (
        <div className="aspect-video rounded-2xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            src={url}
            controls
            className="w-full h-full"
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
          />
        </div>
      );
    }

    return <EmptyContent type="video" />;
  }

  if (lesson.type === 'pdf') {
    const viewerUrl = url
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
      : '';
    return (
      <div className="space-y-3">
        {url ? (
          <div className="w-full rounded-2xl overflow-hidden bg-black" style={{ height: '60vh' }}>
            <iframe src={viewerUrl} className="w-full h-full" title="PDF viewer" />
          </div>
        ) : (
          <EmptyContent type="pdf" />
        )}
        <div className="flex items-center gap-3">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" /> Abrir em nova aba
            </a>
          )}
          <MarkCompleteButton onMark={onMarkComplete} isSaving={isSaving} isCompleted={lesson.isCompleted} />
        </div>
      </div>
    );
  }

  if (lesson.type === 'link') {
    return (
      <div className="glass-card flex flex-col items-center text-center py-10 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-cyan-600/20 flex items-center justify-center">
          <Link2 className="w-7 h-7 text-cyan-400" />
        </div>
        <div>
          <p className="font-semibold mb-1">{lesson.title}</p>
          {lesson.description && (
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">{lesson.description}</p>
          )}
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <ExternalLink className="w-4 h-4" /> Abrir link
          </a>
        )}
        <MarkCompleteButton onMark={onMarkComplete} isSaving={isSaving} isCompleted={lesson.isCompleted} />
      </div>
    );
  }

  if (lesson.type === 'audio') {
    return (
      <div className="glass-card space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 flex items-center justify-center flex-shrink-0">
            <Headphones className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="font-medium">{lesson.title}</p>
            {lesson.duration && (
              <p className="text-xs text-muted-foreground">{formatDuration(lesson.duration)}</p>
            )}
          </div>
        </div>
        {url ? (
          <audio controls src={url} className="w-full" />
        ) : (
          <EmptyContent type="audio" />
        )}
        <MarkCompleteButton onMark={onMarkComplete} isSaving={isSaving} isCompleted={lesson.isCompleted} />
      </div>
    );
  }

  // text
  return (
    <div className="glass-card space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlignLeft className="w-4 h-4 text-muted-foreground" />
        Conteúdo em texto
      </div>
      {lesson.description ? (
        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {lesson.description}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sem conteúdo textual.</p>
      )}
      <MarkCompleteButton onMark={onMarkComplete} isSaving={isSaving} isCompleted={lesson.isCompleted} />
    </div>
  );
}

function MarkCompleteButton({
  onMark,
  isSaving,
  isCompleted,
}: {
  onMark: () => void;
  isSaving: boolean;
  isCompleted: boolean;
}) {
  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <CheckCircle2 className="w-4 h-4" /> Aula concluída
      </div>
    );
  }
  return (
    <button
      onClick={onMark}
      disabled={isSaving}
      className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
    >
      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
      Marcar como concluído
    </button>
  );
}

function EmptyContent({ type }: { type: string }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center py-12 text-center">
      <BookOpen className="w-8 h-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">
        Conteúdo do tipo <span className="font-medium text-foreground">{type}</span> não disponível.
      </p>
    </div>
  );
}

function LessonNav({
  lessons,
  activeLesson,
  hasPaidAccess,
  onSelect,
}: {
  lessons: Lesson[];
  activeLesson: Lesson;
  hasPaidAccess: boolean;
  onSelect: (l: Lesson) => void;
}) {
  const idx = lessons.findIndex((l) => l.id === activeLesson.id);
  const prev = idx > 0 ? lessons[idx - 1] : null;
  const next = idx < lessons.length - 1 ? lessons[idx + 1] : null;

  if (!prev && !next) return null;

  return (
    <div className="flex items-center gap-3">
      {prev ? (
        <button
          onClick={() => onSelect(prev)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="truncate max-w-[140px]">{prev.title}</span>
        </button>
      ) : (
        <div />
      )}
      <div className="flex-1" />
      {next ? (
        <button
          onClick={() => onSelect(next)}
          disabled={next.isLocked && !hasPaidAccess}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          <span className="truncate max-w-[140px]">{next.title}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );
}
