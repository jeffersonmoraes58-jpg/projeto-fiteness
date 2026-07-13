'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plus, Filter, Users, Apple, TrendingUp,
  ChevronRight, MoreVertical, MessageCircle, Calendar,
  FileText, ClipboardCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

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

export default function NutritionistPatients() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [menuPatientId, setMenuPatientId] = useState<string | null>(null);

  const { data: patients, isLoading } = useQuery({
    queryKey: ['nutritionist-patients-list'],
    queryFn: () => api.get('/nutritionists/me/patients').then((r) => r.data.data),
    staleTime: 0,
  });

  const filtered = (patients || []).filter((p: any) => {
    const name = `${p.user?.profile?.firstName || ''} ${p.user?.profile?.lastName || ''}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchFilter =
      filter === 'Todos' ||
      (filter === 'Ativos' && p.isActive) ||
      (filter === 'Inativos' && !p.isActive);
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {patients?.length ?? 0} pacientes cadastrados
          </p>
        </div>
        <Link href="/nutritionist/patients/new" className="btn-primary flex items-center gap-2 text-sm py-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Novo paciente
        </Link>
      </div>

      {/* Search & filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar paciente..."
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

      {/* Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total', value: patients?.length ?? 0, icon: Users, color: 'from-emerald-600 to-teal-600' },
          { label: 'Com dieta ativa', value: patients?.filter((p: any) => p.isActive).length ?? 0, icon: Apple, color: 'from-green-600 to-emerald-600' },
          { label: 'Adesão média', value: '78%', icon: TrendingUp, color: 'from-cyan-600 to-blue-600' },
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

      {/* Patients grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                  <div className="h-2 bg-white/5 rounded w-1/3" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-white/10 rounded" />
                <div className="h-2 bg-white/5 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((patient: any, i: number) => (
            <PatientCard key={patient.id} patient={patient} index={i} />
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhum paciente encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? 'Tente outro nome ou filtro.' : 'Adicione seu primeiro paciente.'}
          </p>
          {!search && (
            <Link href="/nutritionist/patients/new" className="btn-primary text-sm py-2">
              Adicionar paciente
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

const COLORS = ['from-emerald-600 to-teal-600', 'from-cyan-600 to-blue-600', 'from-purple-600 to-indigo-600', 'from-orange-600 to-amber-600', 'from-pink-600 to-rose-600'];

function PatientCard({ patient, index }: { patient: any; index: number }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = `${patient.user?.profile?.firstName?.[0] || ''}${patient.user?.profile?.lastName?.[0] || ''}`;
  const color = COLORS[index % COLORS.length];

  async function handleStartChat() {
    try {
      const res = await api.post(`/chat/direct/${patient.userId}`);
      const chatId = res.data.data?.id ?? res.data.id;
      router.push(`/nutritionist/chat?chatId=${chatId}`);
    } catch {
      toast.error('Erro ao abrir chat');
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
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold flex-shrink-0`}>
            {patient.user?.profile?.avatarUrl
              ? <img src={patient.user.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              : initials}
          </div>
          <div>
            <div className="font-semibold">
              {patient.user?.profile?.firstName} {patient.user?.profile?.lastName}
            </div>
            <div className="text-xs text-muted-foreground">
              {GOAL_LABELS[patient.goalType] || 'Sem objetivo'}
            </div>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all">
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 bg-card border border-border rounded-xl shadow-xl z-10 py-1 w-44">
              <Link href={`/nutritionist/patients/${patient.id}`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all">
                <FileText className="w-3.5 h-3.5" /> Ver prontuário
              </Link>
              <Link href={`/nutritionist/patients/${patient.id}?tab=avaliacoes`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all">
                <ClipboardCheck className="w-3.5 h-3.5" /> Avaliações
              </Link>
              <button onClick={handleStartChat} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-all">
                <MessageCircle className="w-3.5 h-3.5" /> Enviar mensagem
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Diet compliance */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Adesão à dieta</span>
          <span className="font-medium">{patient.dietCompliance ?? 0}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full',
              (patient.dietCompliance ?? 0) >= 70
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-orange-500 to-red-500',
            )}
            style={{ width: `${patient.dietCompliance ?? 0}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={cn(
          'text-xs px-2 py-1 rounded-full',
          patient.isActive
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-muted text-muted-foreground',
        )}>
          {patient.isActive ? 'Ativo' : 'Inativo'}
        </span>
        <div className="flex items-center gap-1">
          {(() => {
            const rawPhone = patient.user?.profile?.phone?.replace(/\D/g, '');
            if (!rawPhone) return null;
            const phone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
            return (
              <a
                href={`https://wa.me/${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp do paciente"
                className="w-7 h-7 rounded-lg hover:bg-emerald-500/20 flex items-center justify-center transition-all"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-400" />
              </a>
            );
          })()}
          <button
            onClick={handleStartChat}
            className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <Link
            href={`/nutritionist/patients/${patient.id}?tab=consultas`}
            className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
            title="Consultas do paciente"
          >
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
          <Link
            href={`/nutritionist/patients/${patient.id}`}
            className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
