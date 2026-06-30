'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plus, Users, Dumbbell,
  ChevronRight, MoreVertical, MessageCircle, Flame,
  Activity, Link2, X, Copy, Check, UserMinus, Eye,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useSubscription } from '@/hooks/useSubscription';

const FILTERS = ['Todos', 'Ativos', 'Inativos'];
const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Perda de peso',
  GAIN_MUSCLE: 'Ganho muscular',
  MAINTAIN_WEIGHT: 'Manutenção',
  IMPROVE_ENDURANCE: 'Resistência',
  INCREASE_FLEXIBILITY: 'Flexibilidade',
  ATHLETIC_PERFORMANCE: 'Performance',
  REHABILITATION: 'Reabilitação',
};

export default function TrainerStudents() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleOpenInvite() {
    setInviteModal(true);
    if (inviteLink) return;
    setInviteLoading(true);
    try {
      const res = await api.post('/auth/invite-link');
      setInviteLink(res.data.data?.link ?? res.data.link);
    } catch {
      toast.error('Erro ao gerar link de convite');
      setInviteModal(false);
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2500);
  }

  function handleWhatsApp() {
    const text = encodeURIComponent(`Olá! Clique no link abaixo para se cadastrar e começar seus treinos:\n\n${inviteLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  const { limits, isAtStudentLimit, displayName, upgradePrice, upgradePlan } = useSubscription();

  const { data: students, isLoading } = useQuery({
    queryKey: ['trainer-students-list'],
    queryFn: () => api.get('/trainers/me/students').then((r) => r.data.data),
  });

  const filtered = (students || []).filter((s: any) => {
    const name = `${s.user?.profile?.firstName || ''} ${s.user?.profile?.lastName || ''}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchFilter =
      filter === 'Todos' ||
      (filter === 'Ativos' && s.isActive) ||
      (filter === 'Inativos' && !s.isActive);
    return matchSearch && matchFilter;
  });

  const totalStudents = students?.length ?? 0;
  const activeStudents = students?.filter((s: any) => s.isActive).length ?? 0;
  const atLimit = isAtStudentLimit(activeStudents);
  const maxStudents = limits?.maxStudents ?? 1;
  const avgStreak = students?.length
    ? Math.round(students.reduce((sum: number, s: any) => sum + (s.streak || 0), 0) / students.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* ── Invite Modal ──────────────────────────────────────── */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md relative">
            <button onClick={() => setInviteModal(false)} className="absolute top-4 right-4 w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Link2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-base">Link de convite</h2>
                <p className="text-xs text-muted-foreground">Envie para o aluno se cadastrar automaticamente</p>
              </div>
            </div>

            {inviteLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="glass rounded-xl p-3 mb-4 flex items-center gap-2">
                  <p className="text-xs text-muted-foreground flex-1 truncate">{inviteLink}</p>
                  <button
                    onClick={handleCopy}
                    className={cn('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all', copied ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/10')}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="space-y-2">
                  <button onClick={handleCopy} className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5">
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copiado!' : 'Copiar link'}
                  </button>
                  <button
                    onClick={handleWhatsApp}
                    className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar pelo WhatsApp
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground text-center mt-3">
                  O link expira em 7 dias. Gere um novo quando precisar.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {atLimit && upgradePlan && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm">
          <span className="text-orange-400 font-medium">
            Limite de {maxStudents} aluno(s) do plano {displayName} atingido.
          </span>
          <Link
            href="/trainer/subscription"
            className="ml-auto flex-shrink-0 text-xs font-semibold bg-orange-500 text-white rounded-lg px-3 py-1.5 hover:bg-orange-600 transition-colors"
          >
            Upgrade {upgradePrice}
          </Link>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Alunos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeStudents}{maxStudents !== -1 ? `/${maxStudents}` : ''} alunos ativos
            {maxStudents !== -1 && <span className="ml-1 text-xs">· plano {displayName}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={atLimit ? undefined : handleOpenInvite}
            disabled={atLimit}
            className={cn('btn-secondary flex items-center gap-1.5 text-sm py-2 px-3', atLimit && 'opacity-40 cursor-not-allowed')}
          >
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Enviar </span>Link
          </button>
          {atLimit ? (
            <span className="btn-primary flex items-center gap-2 text-sm py-2 opacity-40 cursor-not-allowed">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo </span>aluno
            </span>
          ) : (
            <Link href="/trainer/students/new" className="btn-primary flex items-center gap-2 text-sm py-2 self-start sm:self-auto">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo </span>aluno
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total', value: totalStudents, icon: Users, color: 'from-purple-600 to-indigo-600' },
          { label: 'Ativos', value: activeStudents, icon: Activity, color: 'from-emerald-600 to-teal-600' },
          { label: 'Sequência média', value: `${avgStreak}d`, icon: Flame, color: 'from-orange-600 to-red-600' },
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

      {/* Search & filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar aluno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
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

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-2/3" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((student: any, i: number) => (
            <StudentCard key={student.id} student={student} index={i} />
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhum aluno encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? 'Tente outro nome.' : 'Adicione seu primeiro aluno para começar.'}
          </p>
          {!search && (
            <Link href="/trainer/students/new" className="btn-primary text-sm py-2">
              Adicionar aluno
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const COLORS = ['from-purple-600 to-indigo-600', 'from-cyan-600 to-blue-600', 'from-emerald-600 to-teal-600', 'from-orange-600 to-amber-600', 'from-pink-600 to-rose-600'];

function StudentCard({ student, index }: { student: any; index: number }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = `${student.user?.profile?.firstName?.[0] || ''}${student.user?.profile?.lastName?.[0] || ''}`;
  const color = COLORS[index % COLORS.length];
  const lastCheckin = student.lastCheckinAt
    ? new Date(student.lastCheckinAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : 'Nunca';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  async function handleStartChat() {
    try {
      const res = await api.post(`/chat/direct/${student.userId}`);
      const chatId = res.data.data?.id ?? res.data.id;
      router.push(`/trainer/chat?chatId=${chatId}`);
    } catch {
      toast.error('Erro ao abrir chat');
    }
  }

  async function handleRemove() {
    setMenuOpen(false);
    if (!confirm(`Remover ${student.user?.profile?.firstName} da sua lista de alunos?`)) return;
    try {
      await api.delete(`/trainers/me/students/${student.id}`);
      toast.success('Aluno removido');
      qc.invalidateQueries({ queryKey: ['trainer-students-list'] });
    } catch {
      toast.error('Erro ao remover aluno');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card card-hover"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
            {student.user?.profile?.avatarUrl
              ? <img src={student.user.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              : initials}
          </div>
          <div>
            <div className="font-semibold">{student.user?.profile?.firstName} {student.user?.profile?.lastName}</div>
            <div className="text-xs text-muted-foreground">
              {GOAL_LABELS[student.goalType] || (student.anamnesis?.mainGoal ? student.anamnesis.mainGoal.slice(0, 30) : 'Sem objetivo definido')}
            </div>
          </div>
        </div>

        {/* Three dots menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-44 glass-card p-1 shadow-xl border border-border/50 rounded-xl space-y-0.5">
              <Link
                href={`/trainer/students/${student.id}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                Ver perfil
              </Link>
              <button
                onClick={() => { setMenuOpen(false); handleStartChat(); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                Enviar mensagem
              </button>
              <Link
                href={`/trainer/students/${student.id}#treinos`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm transition-all"
              >
                <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" />
                Ver treinos
              </Link>
              <div className="border-t border-border/40 my-0.5" />
              <button
                onClick={handleRemove}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-red-400 transition-all"
              >
                <UserMinus className="w-3.5 h-3.5" />
                Remover aluno
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-sm font-bold flex items-center justify-center gap-1">
            {student.streak || 0}<Flame className="w-3 h-3 text-orange-400" />
          </div>
          <div className="text-[10px] text-muted-foreground">Sequência</div>
        </div>
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-sm font-bold">{student.level || 1}</div>
          <div className="text-[10px] text-muted-foreground">Nível</div>
        </div>
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-sm font-bold">{lastCheckin}</div>
          <div className="text-[10px] text-muted-foreground">Último treino</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full',
          student.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground',
        )}>
          {student.isActive ? 'Ativo' : 'Inativo'}
        </span>
        <div className="flex items-center gap-1">
          {(() => {
            const rawPhone = student.user?.profile?.phone?.replace(/\D/g, '');
            if (!rawPhone) return null;
            const phone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
            return (
              <a
                href={`https://wa.me/${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp do aluno"
                className="w-7 h-7 rounded-lg hover:bg-emerald-500/20 flex items-center justify-center transition-all"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-400" />
              </a>
            );
          })()}
          <button onClick={handleStartChat} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all">
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <Link href={`/trainer/students/${student.id}`} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
