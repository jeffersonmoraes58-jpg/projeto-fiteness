'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Plus, Clock, User,
  Video, MapPin, CheckCircle2, X, Calendar, Dumbbell,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const SESSION_TYPES = ['WORKOUT_SESSION', 'ASSESSMENT', 'CONSULTATION', 'ONLINE'];
const SESSION_LABELS: Record<string, string> = {
  WORKOUT_SESSION: 'Treino presencial',
  ASSESSMENT: 'Avaliação física',
  CONSULTATION: 'Consultoria',
  ONLINE: 'Treino online',
};

export default function TrainerSchedule() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ studentId: '', scheduledAt: '', type: 'WORKOUT_SESSION', location: '', notes: '' });
  const queryClient = useQueryClient();

  const { data: appointments } = useQuery({
    queryKey: ['trainer-appointments'],
    queryFn: () => api.get('/trainers/me/appointments').then((r) => r.data.data),
  });

  const { data: students } = useQuery({
    queryKey: ['trainer-students-list'],
    queryFn: () => api.get('/trainers/me/students').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/trainers/me/appointments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-appointments'] });
      setShowNew(false);
      setForm({ studentId: '', scheduledAt: '', type: 'WORKOUT_SESSION', location: '', notes: '' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/trainers/me/appointments/${id}`, { status: 'COMPLETED' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainer-appointments'] }),
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const appointmentsOnDay = (day: Date) =>
    (appointments || []).filter((a: any) => {
      const d = new Date(a.scheduledAt);
      return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
    });

  const selectedAppointments = appointmentsOnDay(selectedDay);
  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isSelected = (d: Date) => d.toDateString() === selectedDay.toDateString();

  const upcoming = (appointments || [])
    .filter((a: any) => a.status !== 'COMPLETED' && new Date(a.scheduledAt) >= today)
    .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie seus agendamentos</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 text-sm py-2">
          <Plus className="w-4 h-4" />
          Novo agendamento
        </button>
      </div>

      {/* New appointment */}
      {showNew && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border border-primary/20"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Novo Agendamento</h2>
            <button onClick={() => setShowNew(false)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="input-field bg-background">
              <option value="">Selecionar aluno *</option>
              {(students || []).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.user?.profile?.firstName} {s.user?.profile?.lastName}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="input-field" />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field bg-background">
                {SESSION_TYPES.map((t) => <option key={t} value={t}>{SESSION_LABELS[t]}</option>)}
              </select>
            </div>
            <input placeholder="Local (opcional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" />
            <textarea placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field resize-none" rows={2} />
            <div className="flex gap-3">
              <button onClick={() => setShowNew(false)} className="btn-secondary flex-1 text-sm py-2">Cancelar</button>
              <button
                disabled={!form.studentId || !form.scheduledAt || createMutation.isPending}
                onClick={() => createMutation.mutate({ ...form, scheduledAt: new Date(form.scheduledAt) })}
                className="btn-primary flex-1 text-sm py-2"
              >
                {createMutation.isPending ? 'Agendando...' : 'Agendar'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 glass-card">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold">{MONTHS[month]} {year}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(firstDay)].map((_, i) => <div key={`e-${i}`} />)}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = new Date(year, month, i + 1);
              const dayAppts = appointmentsOnDay(day);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all hover:bg-accent',
                    isToday(day) && !isSelected(day) && 'ring-1 ring-primary',
                    isSelected(day) && 'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                >
                  {i + 1}
                  {dayAppts.length > 0 && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {dayAppts.slice(0, 3).map((_, di) => (
                        <div key={di} className={cn('w-1 h-1 rounded-full', isSelected(day) ? 'bg-white/60' : 'bg-primary')} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day panel */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">
              {selectedDay.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
            </h2>
            <span className="text-xs text-muted-foreground">{selectedAppointments.length} sessões</span>
          </div>
          {selectedAppointments.length > 0 ? (
            <div className="space-y-3">
              {selectedAppointments.map((a: any) => (
                <AppointmentItem key={a.id} appointment={a} onComplete={() => completeMutation.mutate(a.id)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Sem agendamentos neste dia</p>
              <button onClick={() => setShowNew(true)} className="text-xs text-primary hover:underline mt-2">+ Agendar</button>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming */}
      <div className="glass-card">
        <h2 className="font-semibold mb-4">Próximos Agendamentos</h2>
        {upcoming.length > 0 ? (
          <div className="space-y-2">
            {upcoming.map((a: any) => (
              <AppointmentItem key={a.id} appointment={a} onComplete={() => completeMutation.mutate(a.id)} showDate />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum agendamento futuro</p>
        )}
      </div>
    </div>
  );
}

function AppointmentItem({ appointment, onComplete, showDate }: {
  appointment: any; onComplete: () => void; showDate?: boolean;
}) {
  const isCompleted = appointment.status === 'COMPLETED';
  const date = new Date(appointment.scheduledAt);
  const typeLabel = SESSION_LABELS[appointment.type] || appointment.type;

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all', isCompleted && 'opacity-60')}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        isCompleted ? 'bg-emerald-600/10' : 'bg-purple-600/10',
      )}>
        {isCompleted
          ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          : appointment.type === 'ONLINE' ? <Video className="w-5 h-5 text-cyan-400" />
          : appointment.type === 'ASSESSMENT' ? <User className="w-5 h-5 text-blue-400" />
          : <Dumbbell className="w-5 h-5 text-purple-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {appointment.student?.user?.profile?.firstName} {appointment.student?.user?.profile?.lastName || 'Aluno'}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {showDate && date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' • '}
            {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span>{typeLabel}</span>
          {appointment.location && <span className="flex items-center gap-1 hidden sm:flex"><MapPin className="w-3 h-3" />{appointment.location}</span>}
        </div>
      </div>
      {!isCompleted && (
        <button onClick={onComplete} className="text-xs text-emerald-400 hover:underline flex-shrink-0">Concluir</button>
      )}
    </div>
  );
}
