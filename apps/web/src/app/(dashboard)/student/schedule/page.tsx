'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, CheckCircle2, Ban, Video,
  Dumbbell, User, MapPin,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const SESSION_LABELS: Record<string, string> = {
  WORKOUT_SESSION: 'Treino presencial',
  ASSESSMENT: 'Avaliação física',
  CONSULTATION: 'Consultoria',
  ONLINE: 'Treino online',
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: 'Agendado', className: 'bg-blue-500/10 text-blue-400' },
  COMPLETED: { label: 'Concluído', className: 'bg-emerald-500/10 text-emerald-400' },
  CANCELLED: { label: 'Cancelado', className: 'bg-red-500/10 text-red-400' },
};

export default function StudentSchedule() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const now = new Date();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['student-appointments'],
    queryFn: () => api.get('/students/me/appointments').then((r) => r.data.data ?? []),
  });

  const upcoming = (appointments as any[])
    .filter((a) => a.status === 'SCHEDULED' && new Date(a.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const past = (appointments as any[])
    .filter((a) => a.status !== 'SCHEDULED' || new Date(a.scheduledAt) < now)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Minha Agenda</h1>
          <p className="text-muted-foreground text-sm mt-1">Sessões agendadas com seu personal trainer</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="glass rounded-2xl p-1 flex gap-1 w-fit">
        {[
          { key: 'upcoming', label: `Próximas (${upcoming.length})` },
          { key: 'past', label: 'Histórico' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={cn(
              'px-4 py-1.5 rounded-xl text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse h-28" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">
            {tab === 'upcoming' ? 'Nenhum agendamento próximo' : 'Sem histórico de sessões'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {tab === 'upcoming'
              ? 'Seu personal trainer irá agendar as sessões e elas aparecerão aqui.'
              : 'Sessões concluídas ou canceladas aparecerão aqui.'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {list.map((appt: any, i: number) => {
            const date = new Date(appt.scheduledAt);
            const status = appt.status ?? 'SCHEDULED';
            const badge = STATUS_BADGE[status] ?? STATUS_BADGE.SCHEDULED;
            const isUpcoming = status === 'SCHEDULED' && date >= now;
            const daysUntil = Math.ceil((date.getTime() - now.getTime()) / 86400000);
            const trainerName = appt.trainer?.user?.profile
              ? `${appt.trainer.user.profile.firstName ?? ''} ${appt.trainer.user.profile.lastName ?? ''}`.trim()
              : 'Personal Trainer';

            return (
              <motion.div
                key={appt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn('glass-card', status === 'CANCELLED' && 'opacity-60')}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
                    status === 'COMPLETED' ? 'bg-emerald-600/10' :
                    status === 'CANCELLED' ? 'bg-red-600/10' :
                    appt.type === 'ONLINE' ? 'bg-cyan-600/10' :
                    appt.type === 'ASSESSMENT' ? 'bg-blue-600/10' : 'bg-purple-600/10',
                  )}>
                    {status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
                     status === 'CANCELLED' ? <Ban className="w-5 h-5 text-red-400" /> :
                     appt.type === 'ONLINE' ? <Video className="w-5 h-5 text-cyan-400" /> :
                     appt.type === 'ASSESSMENT' ? <User className="w-5 h-5 text-blue-400" /> :
                     <Dumbbell className="w-5 h-5 text-purple-400" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium">{SESSION_LABELS[appt.type] || appt.type}</span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', badge.className)}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      {trainerName}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {date.toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {appt.duration && ` • ${appt.duration}min`}
                      </span>
                      {appt.location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {appt.location}
                        </span>
                      )}
                    </div>

                    {appt.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic">{appt.notes}</p>
                    )}
                  </div>

                  {/* Countdown */}
                  {isUpcoming && (
                    <div className="flex-shrink-0 text-right">
                      <div className={cn(
                        'text-sm font-bold',
                        daysUntil === 0 ? 'text-orange-400' : 'text-primary',
                      )}>
                        {daysUntil === 0 ? 'Hoje!' : daysUntil === 1 ? 'Amanhã' : `em ${daysUntil}d`}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
