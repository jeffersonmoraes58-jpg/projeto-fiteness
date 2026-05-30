'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Pencil, Trash2, X, RefreshCw,
  ChevronUp, ChevronDown, ChevronRight, ChevronDown as Expand,
  Video, FileText, Link2, Headphones, AlignLeft,
  Paperclip, Eye, Clock, Users, BookOpen, AlertCircle,
  Upload, ExternalLink,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── types ──────────────────────────────────────────────────────────────────

type LessonType = 'video' | 'pdf' | 'link' | 'audio' | 'text';

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
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
  completionsCount?: number;
  attachments?: Attachment[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const LESSON_TYPES: { value: LessonType; label: string; icon: any }[] = [
  { value: 'video',  label: 'Vídeo',  icon: Video },
  { value: 'pdf',    label: 'PDF',    icon: FileText },
  { value: 'link',   label: 'Link',   icon: Link2 },
  { value: 'audio',  label: 'Áudio',  icon: Headphones },
  { value: 'text',   label: 'Texto',  icon: AlignLeft },
];

const TYPE_ICONS: Record<LessonType, any> = {
  video: Video, pdf: FileText, link: Link2, audio: Headphones, text: AlignLeft,
};

const TYPE_EMOJI: Record<LessonType, string> = {
  video: '🎬', pdf: '📄', link: '🔗', audio: '🎧', text: '📝',
};

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function padOrder(n: number): string {
  return String(n).padStart(2, '0');
}

async function uploadFile(file: File, endpoint: string): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const r = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return r.data?.data ?? r.data;
}

const EMPTY_LESSON_FORM = {
  title: '',
  description: '',
  type: 'video' as LessonType,
  contentUrl: '',
  duration: '',
  thumbnailUrl: '',
  isFree: false,
};

const EMPTY_ATTACH_FORM = {
  name: '',
  url: '',
  type: 'link',
};

// ─── component ───────────────────────────────────────────────────────────────

export default function TrainerChallengeLessons({ params }: { params: { id: string } }) {
  const challengeId = params.id;
  const qc = useQueryClient();

  // ── state ──
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [lessonModal, setLessonModal] = useState<null | 'create' | 'edit'>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [deleteLesson, setDeleteLesson] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({ ...EMPTY_LESSON_FORM });
  const [uploadingContent, setUploadingContent] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [attachModal, setAttachModal] = useState<string | null>(null); // lessonId
  const [attachForm, setAttachForm] = useState({ ...EMPTY_ATTACH_FORM });
  const [deleteAttach, setDeleteAttach] = useState<string | null>(null);
  const [uploadingAttach, setUploadingAttach] = useState(false);

  const contentFileRef = useRef<HTMLInputElement>(null);
  const attachFileRef = useRef<HTMLInputElement>(null);

  // ── queries ──
  const { data: challenges = [] } = useQuery({
    queryKey: ['trainer-challenges'],
    queryFn: () => api.get('/challenges/trainer/mine').then((r) => r.data?.data ?? r.data),
  });

  const challengeInfo = Array.isArray(challenges)
    ? (challenges as any[]).find((c: any) => c.id === challengeId)
    : null;

  const {
    data: lessons = [],
    isLoading,
    error: lessonsError,
  } = useQuery({
    queryKey: ['challenge-lessons', challengeId],
    queryFn: () =>
      api.get(`/challenges/${challengeId}/lessons`).then((r) => r.data?.data ?? r.data),
  });

  const lessonsArr: Lesson[] = Array.isArray(lessons) ? lessons : [];
  const sorted = [...lessonsArr].sort((a, b) => a.order - b.order);

  const invalidateLessons = () =>
    qc.invalidateQueries({ queryKey: ['challenge-lessons', challengeId] });

  // ── mutations ──
  const createLessonMut = useMutation({
    mutationFn: (body: any) => api.post(`/challenges/${challengeId}/lessons`, body),
    onSuccess: () => { invalidateLessons(); setLessonModal(null); resetLessonForm(); },
  });

  const editLessonMut = useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/challenges/lessons/${id}`, body),
    onSuccess: () => { invalidateLessons(); setLessonModal(null); setEditingLesson(null); },
  });

  const deleteLessonMut = useMutation({
    mutationFn: (id: string) => api.delete(`/challenges/lessons/${id}`),
    onSuccess: () => { invalidateLessons(); setDeleteLesson(null); },
  });

  const reorderMut = useMutation({
    mutationFn: (orders: { id: string; order: number }[]) =>
      api.post(`/challenges/${challengeId}/lessons/reorder`, { orders }),
    onSuccess: invalidateLessons,
  });

  const addAttachMut = useMutation({
    mutationFn: ({ lessonId, body }: { lessonId: string; body: any }) =>
      api.post(`/challenges/lessons/${lessonId}/attachments`, body),
    onSuccess: () => { invalidateLessons(); setAttachModal(null); setAttachForm({ ...EMPTY_ATTACH_FORM }); },
  });

  const deleteAttachMut = useMutation({
    mutationFn: (id: string) => api.delete(`/challenges/attachments/${id}`),
    onSuccess: () => { invalidateLessons(); setDeleteAttach(null); },
  });

  // ── form helpers ──
  function resetLessonForm() {
    setLessonForm({ ...EMPTY_LESSON_FORM });
    setUploadError('');
  }

  function openCreate() {
    resetLessonForm();
    setEditingLesson(null);
    setLessonModal('create');
  }

  function openEdit(lesson: Lesson) {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title ?? '',
      description: lesson.description ?? '',
      type: lesson.type ?? 'video',
      contentUrl: lesson.contentUrl ?? '',
      duration: lesson.duration ? String(lesson.duration) : '',
      thumbnailUrl: lesson.thumbnailUrl ?? '',
      isFree: lesson.isFree ?? false,
    });
    setUploadError('');
    setLessonModal('edit');
  }

  function submitLessonForm() {
    const body: any = {
      title: lessonForm.title,
      description: lessonForm.description || undefined,
      type: lessonForm.type,
      contentUrl: lessonForm.contentUrl || undefined,
      duration: lessonForm.duration ? Number(lessonForm.duration) : undefined,
      thumbnailUrl: lessonForm.thumbnailUrl || undefined,
      isFree: lessonForm.isFree,
    };
    if (lessonModal === 'create') {
      createLessonMut.mutate(body);
    } else if (editingLesson) {
      editLessonMut.mutate({ id: editingLesson.id, ...body });
    }
  }

  // ── upload content file ──
  async function handleContentFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingContent(true);
    setUploadError('');
    try {
      const result = await uploadFile(file, '/uploads/lesson-content');
      setLessonForm((f) => ({ ...f, contentUrl: result.url }));
    } catch (err: any) {
      setUploadError(err?.message ?? 'Falha no upload');
    } finally {
      setUploadingContent(false);
    }
  }

  // ── upload attachment file ──
  async function handleAttachFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttach(true);
    try {
      const result = await uploadFile(file, '/uploads/lesson-attachment');
      setAttachForm((f) => ({
        ...f,
        url: result.url,
        name: f.name || file.name,
        type: file.type || 'link',
      }));
    } catch (err: any) {
      // silent — user sees empty url
    } finally {
      setUploadingAttach(false);
    }
  }

  // ── reorder ──
  function moveLesson(index: number, direction: 'up' | 'down') {
    const newArr = [...sorted];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newArr.length) return;
    [newArr[index], newArr[swapIndex]] = [newArr[swapIndex], newArr[index]];
    const orders = newArr.map((l, i) => ({ id: l.id, order: i + 1 }));
    reorderMut.mutate(orders);
  }

  // ── content file accept ──
  const contentAccept: Record<LessonType, string> = {
    video: 'video/*',
    pdf: 'application/pdf',
    audio: 'audio/*',
    link: '',
    text: '',
  };

  const contentMaxMB: Record<LessonType, number> = {
    video: 200, pdf: 50, audio: 100, link: 0, text: 0,
  };

  // ── youtube/vimeo preview ──
  function getYouTubeId(url: string) {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    return m ? m[1] : null;
  }

  function getVimeoId(url: string) {
    const m = url.match(/vimeo\.com\/(\d+)/);
    return m ? m[1] : null;
  }

  const isSaving = createLessonMut.isPending || editLessonMut.isPending;
  const saveError = (createLessonMut.error || editLessonMut.error) as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/trainer/challenges"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div className="h-5 w-px bg-white/10" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">
            {challengeInfo?.title ?? 'Gerenciar aulas'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Adicione, edite e reordene as aulas do desafio
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-purple-600/20 text-purple-400 text-sm font-medium flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          {sorted.length} aula{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse h-20" />
          ))}
        </div>
      )}

      {/* Error */}
      {lessonsError && (
        <div className="glass-card flex items-center gap-3 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">Erro ao carregar aulas. Tente recarregar a página.</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !lessonsError && sorted.length === 0 && (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhuma aula ainda</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Adicione a primeira aula para começar a montar o conteúdo do desafio.
          </p>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Adicionar aula
          </button>
        </div>
      )}

      {/* Lessons list */}
      {!isLoading && sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((lesson, index) => {
            const TypeIcon = TYPE_ICONS[lesson.type] ?? BookOpen;
            const isExpanded = expandedLesson === lesson.id;

            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="glass-card p-0 overflow-hidden"
              >
                {/* Main row */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}
                >
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => moveLesson(index, 'up')}
                      disabled={index === 0 || reorderMut.isPending}
                      className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/10 disabled:opacity-30 transition-all"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveLesson(index, 'down')}
                      disabled={index === sorted.length - 1 || reorderMut.isPending}
                      className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/10 disabled:opacity-30 transition-all"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Type emoji + order */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-lg leading-none">{TYPE_EMOJI[lesson.type]}</span>
                    <span className="text-xs font-mono text-muted-foreground">{padOrder(lesson.order)}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm leading-tight">{lesson.title}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">
                        {LESSON_TYPES.find((t) => t.value === lesson.type)?.label}
                      </span>
                      {lesson.isFree && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                          Prévia grátis
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {lesson.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(lesson.duration)}
                        </span>
                      )}
                      {(lesson.completionsCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {lesson.completionsCount} concluíram
                        </span>
                      )}
                      {lesson.attachments && lesson.attachments.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          {lesson.attachments.length} anexo{lesson.attachments.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEdit(lesson)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteLesson(lesson.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight
                      className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-90')}
                    />
                  </div>
                </div>

                {/* Expanded: description + attachments */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">
                        {lesson.description && (
                          <p className="text-sm text-muted-foreground">{lesson.description}</p>
                        )}
                        {lesson.contentUrl && (
                          <a
                            href={lesson.contentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> Ver conteúdo
                          </a>
                        )}

                        {/* Attachments */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Anexos
                            </span>
                            <button
                              onClick={() => { setAttachModal(lesson.id); setAttachForm({ ...EMPTY_ATTACH_FORM }); }}
                              className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition-all"
                            >
                              <Plus className="w-3 h-3" /> Adicionar anexo
                            </button>
                          </div>
                          {lesson.attachments && lesson.attachments.length > 0 ? (
                            <div className="space-y-1.5">
                              {lesson.attachments.map((att) => (
                                <div key={att.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 text-xs text-foreground hover:text-cyan-400 truncate transition-colors"
                                  >
                                    {att.name}
                                  </a>
                                  <span className="text-xs text-muted-foreground">{att.type}</span>
                                  <button
                                    onClick={() => setDeleteAttach(att.id)}
                                    className="p-0.5 rounded text-muted-foreground hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Nenhum anexo ainda.</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* FAB: Add lesson */}
      {!isLoading && sorted.length > 0 && (
        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Adicionar aula
        </button>
      )}

      {/* ── MODAL: ADD / EDIT LESSON ── */}
      <AnimatePresence>
        {lessonModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && setLessonModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-lg my-4"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold">
                  {lessonModal === 'create' ? 'Adicionar aula' : 'Editar aula'}
                </h3>
                <button
                  onClick={() => setLessonModal(null)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Título *</label>
                  <input
                    type="text"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Ex: Introdução ao treino"
                    className="input-field w-full"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Descrição</label>
                  <textarea
                    value={lessonForm.description}
                    onChange={(e) => setLessonForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Descreva o conteúdo desta aula..."
                    rows={3}
                    className="input-field w-full resize-none"
                  />
                </div>

                {/* Type toggle */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Tipo</label>
                  <div className="flex gap-2 flex-wrap">
                    {LESSON_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setLessonForm((f) => ({ ...f, type: t.value, contentUrl: '' }))}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all',
                          lessonForm.type === t.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-white/10 text-muted-foreground hover:bg-white/5',
                        )}
                      >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content — depends on type */}
                {lessonForm.type !== 'text' && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">
                      {lessonForm.type === 'link' ? 'URL do link *' : 'URL ou arquivo'}
                    </label>
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={lessonForm.contentUrl}
                        onChange={(e) => setLessonForm((f) => ({ ...f, contentUrl: e.target.value }))}
                        placeholder={
                          lessonForm.type === 'video'
                            ? 'https://youtube.com/watch?v=... ou URL direta'
                            : lessonForm.type === 'pdf'
                            ? 'https://... (link para o PDF)'
                            : lessonForm.type === 'audio'
                            ? 'https://... (link para o áudio)'
                            : 'https://...'
                        }
                        className="input-field w-full text-sm font-mono"
                      />

                      {/* File upload for video/pdf/audio */}
                      {(lessonForm.type === 'video' || lessonForm.type === 'pdf' || lessonForm.type === 'audio') && (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-white/10" />
                            <span className="text-xs text-muted-foreground">ou</span>
                            <div className="flex-1 h-px bg-white/10" />
                          </div>
                          <button
                            type="button"
                            onClick={() => contentFileRef.current?.click()}
                            disabled={uploadingContent}
                            className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2"
                          >
                            {uploadingContent ? (
                              <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</>
                            ) : (
                              <><Upload className="w-4 h-4" /> Enviar arquivo (max {contentMaxMB[lessonForm.type]}MB)</>
                            )}
                          </button>
                          <input
                            ref={contentFileRef}
                            type="file"
                            accept={contentAccept[lessonForm.type]}
                            className="hidden"
                            onChange={handleContentFileChange}
                          />
                        </>
                      )}

                      {/* YouTube/Vimeo preview */}
                      {lessonForm.type === 'video' && lessonForm.contentUrl && (
                        (() => {
                          const ytId = getYouTubeId(lessonForm.contentUrl);
                          const vmId = getVimeoId(lessonForm.contentUrl);
                          if (ytId) {
                            return (
                              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                                <iframe
                                  src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                                  className="w-full h-full"
                                  allowFullScreen
                                />
                              </div>
                            );
                          }
                          if (vmId) {
                            return (
                              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                                <iframe
                                  src={`https://player.vimeo.com/video/${vmId}`}
                                  className="w-full h-full"
                                  allowFullScreen
                                />
                              </div>
                            );
                          }
                          return null;
                        })()
                      )}

                      {uploadError && (
                        <p className="text-xs text-red-400">{uploadError}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Duration + Thumbnail */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Duração (segundos)</label>
                    <input
                      type="number"
                      min="0"
                      value={lessonForm.duration}
                      onChange={(e) => setLessonForm((f) => ({ ...f, duration: e.target.value }))}
                      placeholder="Ex: 750"
                      className="input-field w-full"
                    />
                    {lessonForm.duration && !isNaN(Number(lessonForm.duration)) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        = {formatDuration(Number(lessonForm.duration))}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Thumbnail URL</label>
                    <input
                      type="url"
                      value={lessonForm.thumbnailUrl}
                      onChange={(e) => setLessonForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
                      placeholder="https://..."
                      className="input-field w-full text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Free preview toggle */}
                <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/5">
                  <div>
                    <p className="text-sm font-medium">Prévia grátis</p>
                    <p className="text-xs text-muted-foreground">Alunos podem assistir sem comprar o desafio</p>
                  </div>
                  <button
                    onClick={() => setLessonForm((f) => ({ ...f, isFree: !f.isFree }))}
                    className={cn(
                      'w-10 h-6 rounded-full transition-all relative flex-shrink-0',
                      lessonForm.isFree ? 'bg-emerald-500' : 'bg-white/20',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
                        lessonForm.isFree ? 'left-4' : 'left-0.5',
                      )}
                    />
                  </button>
                </div>

                {saveError && (
                  <p className="text-xs text-red-400">{saveError?.message ?? 'Erro ao salvar'}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setLessonModal(null)} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button
                    onClick={submitLessonForm}
                    disabled={isSaving || !lessonForm.title}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    {lessonModal === 'create' ? 'Adicionar' : 'Salvar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: ADD ATTACHMENT ── */}
      <AnimatePresence>
        {attachModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setAttachModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold">Adicionar anexo</h3>
                <button
                  onClick={() => setAttachModal(null)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Nome</label>
                  <input
                    type="text"
                    value={attachForm.name}
                    onChange={(e) => setAttachForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Planilha de treino"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">URL</label>
                  <input
                    type="url"
                    value={attachForm.url}
                    onChange={(e) => setAttachForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://..."
                    className="input-field w-full text-sm font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-muted-foreground">ou</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <button
                  type="button"
                  onClick={() => attachFileRef.current?.click()}
                  disabled={uploadingAttach}
                  className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-sm text-muted-foreground hover:border-cyan-500/50 hover:text-cyan-400 transition-all flex items-center justify-center gap-2"
                >
                  {uploadingAttach ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Enviar arquivo</>
                  )}
                </button>
                <input
                  ref={attachFileRef}
                  type="file"
                  className="hidden"
                  onChange={handleAttachFileChange}
                />
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Tipo</label>
                  <input
                    type="text"
                    value={attachForm.type}
                    onChange={(e) => setAttachForm((f) => ({ ...f, type: e.target.value }))}
                    placeholder="Ex: pdf, link, image..."
                    className="input-field w-full"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setAttachModal(null)} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (!attachForm.name || !attachForm.url) return;
                      addAttachMut.mutate({
                        lessonId: attachModal,
                        body: {
                          name: attachForm.name,
                          url: attachForm.url,
                          type: attachForm.type || 'link',
                        },
                      });
                    }}
                    disabled={addAttachMut.isPending || !attachForm.name || !attachForm.url}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {addAttachMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    Adicionar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: DELETE LESSON ── */}
      <AnimatePresence>
        {deleteLesson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setDeleteLesson(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-xs text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-semibold mb-1">Excluir aula?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Todos os progressos dos alunos nesta aula serão removidos. Ação irreversível.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteLesson(null)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  onClick={() => deleteLessonMut.mutate(deleteLesson)}
                  disabled={deleteLessonMut.isPending}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  {deleteLessonMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: DELETE ATTACHMENT ── */}
      <AnimatePresence>
        {deleteAttach && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setDeleteAttach(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-xs text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-semibold mb-1">Excluir anexo?</h3>
              <p className="text-sm text-muted-foreground mb-5">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteAttach(null)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  onClick={() => deleteAttachMut.mutate(deleteAttach)}
                  disabled={deleteAttachMut.isPending}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  {deleteAttachMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
