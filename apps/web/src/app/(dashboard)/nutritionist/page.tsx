'use client';

import { motion } from 'framer-motion';
import {
  Users, Apple, Calendar, TrendingUp, ArrowUpRight,
  ChevronRight, Plus, Star, Clock, CheckCircle2,
  Utensils, Brain, MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const statCards = [
  { key: 'patients', label: 'Pacientes Ativos', icon: Users, color: 'from-emerald-600 to-teal-600' },
  { key: 'diets', label: 'Dietas Ativas', icon: Apple, color: 'from-green-600 to-emerald-600' },
  { key: 'consultationsToday', label: 'Consultas Hoje', icon: Calendar, color: 'from-cyan-600 to-blue-600' },
  { key: 'avgCompliance', label: 'Adesão Média', icon: TrendingUp, color: 'from-purple-600 to-indigo-600', suffix: '%' },
];

export default function NutritionistDashboard() {
  const { user } = useAuthStore();

  const { data: stats } = useQuery({
    queryKey: ['nutritionist-stats'],
    queryFn: () => api.get('/nutritionists/me/dashboard').then((r) => r.data.data),
  });

  const { data: patients } = useQuery({
    queryKey: ['nutritionist-patients'],
    queryFn: () => api.get('/nutritionists/me/patients').then((r) => r.data.data),
  });

  const { data: consultations } = useQuery({
    queryKey: ['nutritionist-consultations-today'],
    queryFn: () => api.get('/nutritionists/me/consultations').then((r) => r.data.data),
  });

  const firstName = user?.profile?.firstName || 'Nutricionista';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Olá, {firstName}!</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/nutritionist/patients/new" className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Plus className="w-4 h-4" />
            Novo paciente
          </Link>
          <Link href="/nutritionist/diets/new" className="btn-primary flex items-center gap-2 text-sm py-2">
            <Apple className="w-4 h-4" />
            Nova dieta
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-emerald-500 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />+8%
              </span>
            </div>
            <div className="text-2xl font-bold">
              {stats?.[card.key] ?? '—'}{card.suffix || ''}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patients list */}
        <div className="lg:col-span-2">
          <div className="glass-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold">Pacientes Recentes</h2>
              <Link href="/nutritionist/patients" className="text-xs text-primary flex items-center gap-1 hover:underline">
                Ver todos <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {(patients?.slice(0, 6) || [...Array(5)]).map((p: any, i: number) => (
                <PatientRow key={i} patient={p} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Today's schedule */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Agenda de Hoje</h2>
              <Link href="/nutritionist/schedule" className="text-xs text-primary hover:underline">
                Ver agenda
              </Link>
            </div>
            <div className="space-y-2">
              {consultations?.length > 0 ? (
                consultations.slice(0, 4).map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all">
                    <div className="w-9 h-9 rounded-xl bg-cyan-600/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {c.student?.user?.profile?.firstName} {c.student?.user?.profile?.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(c.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground/30" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sem consultas hoje</p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="glass-card">
            <h2 className="font-semibold mb-3">Ações Rápidas</h2>
            <div className="space-y-1.5">
              {[
                { label: 'Criar dieta', icon: Apple, href: '/nutritionist/diets/new', color: 'text-emerald-400' },
                { label: 'Adicionar paciente', icon: Users, href: '/nutritionist/patients/new', color: 'text-cyan-400' },
                { label: 'Banco de alimentos', icon: Utensils, href: '/nutritionist/foods', color: 'text-orange-400' },
                { label: 'IA Nutrição', icon: Brain, href: '/nutritionist/ai', color: 'text-purple-400' },
                { label: 'Mensagens', icon: MessageCircle, href: '/nutritionist/chat', color: 'text-pink-400' },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all group"
                >
                  <a.icon className={`w-4 h-4 ${a.color}`} />
                  <span className="text-sm">{a.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

          {/* AI tip */}
          <div className="glass-card bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-600/20">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold">Sugestão da IA</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              2 pacientes com objetivo de perda de peso estão acima da meta calórica nos últimos 3 dias.
            </p>
            <Link href="/nutritionist/patients" className="text-xs text-primary hover:underline">
              Ver pacientes →
            </Link>
          </div>
        </div>
      </div>

      {/* Compliance chart */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">Adesão às Dietas — Últimos 7 dias</h2>
          <Link href="/nutritionist/reports" className="text-xs text-primary flex items-center gap-1 hover:underline">
            Relatórios <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <ComplianceChart stats={stats} />
      </div>
    </div>
  );
}

function PatientRow({ patient, index }: { patient: any; index: number }) {
  if (!patient?.user) {
    return (
      <div className="flex items-center gap-4 p-3 rounded-xl">
        <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/10 rounded animate-pulse w-1/3" />
          <div className="h-2 bg-white/5 rounded animate-pulse w-1/4" />
        </div>
        <div className="h-5 w-16 bg-white/10 rounded-full animate-pulse" />
      </div>
    );
  }

  const initials = `${patient.user.profile?.firstName?.[0] || ''}${patient.user.profile?.lastName?.[0] || ''}`;
  const colors = ['from-emerald-600 to-teal-600', 'from-cyan-600 to-blue-600', 'from-purple-600 to-indigo-600', 'from-orange-600 to-amber-600', 'from-pink-600 to-rose-600'];
  const goalLabels: Record<string, string> = {
    LOSE_WEIGHT: 'Perda de peso',
    GAIN_MUSCLE: 'Ganho muscular',
    MAINTAIN_WEIGHT: 'Manutenção',
    IMPROVE_ENDURANCE: 'Resistência',
  };

  return (
    <Link
      href={`/nutritionist/patients/${patient.id}`}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent transition-all"
    >
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
        {patient.user.profile?.avatarUrl
          ? <img src={patient.user.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          : initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {patient.user.profile?.firstName} {patient.user.profile?.lastName}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {goalLabels[patient.goalType] || patient.goalType || 'Sem objetivo definido'}
        </div>
      </div>
      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">Ativo</span>
    </Link>
  );
}

function ComplianceChart({ stats }: { stats: any }) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const values = stats?.weeklyCompliance || [72, 85, 68, 90, 78, 88, 65];
  const max = 100;

  return (
    <div className="flex items-end gap-3 h-32">
      {days.map((day, i) => (
        <div key={day} className="flex-1 flex flex-col items-center gap-2">
          <div className="flex-1 w-full flex items-end">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(values[i] / max) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`w-full rounded-t-md ${
                values[i] >= 80 ? 'bg-gradient-to-t from-emerald-600 to-teal-500' : 'bg-gradient-to-t from-orange-600 to-amber-500'
              } opacity-80 hover:opacity-100 transition-opacity`}
            />
          </div>
          <div className="text-xs text-muted-foreground">{day}</div>
          <div className="text-xs font-medium">{values[i]}%</div>
        </div>
      ))}
    </div>
  );
}
