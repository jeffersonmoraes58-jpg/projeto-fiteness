'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Plus, Clock, User,
  Video, MapPin, CheckCircle2, X, Calendar, Dumbbell,
  Pencil, Trash2, Ban, AlertCircle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PlanGate } from '@/components/ui/plan-gate';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const SESSION_TYPES = ['WORKOUT_SESSION', 'ASSESSMENT', 'CONSULTATION', 'ONLINE'];
const SESSION_LABELS: Record<string, string> = {
  WORKOUT_SESSION: 'Treino presencial',
  ASSESSMENT: 'Avaliação física',
  CONSULTATION: 'Consultoria',
  ONLINE: 'Treino online',
};
const STATUS_FILTERS = [
  { key: 'upcoming', label: 'Próximos' },
  { key: 'completed', label: 'Concluídos' },
  { key: 'cancelled', label: 'Cancelados' },
  { key: 'all', label: 'Todos' },
] as const;

const EMPTY_FORM = { studentId: '', scheduledAt: '', type: 'WORKOUT_SESSION', duration: '60', location: '', notes: '' };

type StatusFilter = typeof STATUS_FILTERS[number]['key'];

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TrainerSchedule() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [showForm, setShowForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState<any | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming');
  const qc = useQueryClient();

  const { data: appointments } = useQuery({
    queryKey: ['trainer-appointments'],
    queryFn: () => api.get('/trainers/me/appointments').then((r) => r.data.data ?? []),
  });

  const { data: students } = useQuery({
    queryKey: ['trainer-students-list'],
    queryFn: () => api.get('/trainers/me/students').then((r) => r.data.data ?? []),
  });

  function openCreate(prefillDate?: Date) {
    setEditingAppt(null);
    const d = prefillDate ?? selectedDay;
    const pad = (n: number) => String(n).padStart(2, '0');
    const localDt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T08:00`;
    setForm({ ...EMPTY_FORM, scheduledAt: localDt });
    setShowForm(true);
  }

  function openEdit(appt: any) {
    setEditingAppt(appt);
    setForm({
      studentId: appt.studentId ?? '',
      scheduledAt: toLocalDatetimeValue(appt.scheduledAt),
      type: appt.type ?? 'WORKOUT_SESSION',
      duration: String(appt.duration ?? 60),
      location: appt.location ?? '',
      notes: appt.notes ?? '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingAppt(null);
    setForm({ ...EMPTY_FORM });
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/trainers/me/appointments', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-appointments'] });
      toast.success('Agendamento criado!');
      closeForm();
    },
    onError: () => toast.error('Erro ao criar agendamento'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/trainers/me/appointments/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-appointments'] });
      toast.success('Agendamento atualizado!');
      closeForm();
    },
    onError: () => toast.error('Erro ao atualizar agendamento'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/trainers/me/appointments/${id}`, { status: 'COMPLETED' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-appointments'] });
      toast.success('Sessão concluída!');
    },
    onError: () => toast.error('Erro ao concluir'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/trainers/me/appointments/${id}`, { status: 'CANCELLED' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-appointments'] });
      toast.success('Agendamento cancelado');
    },
    onError: () => toast.error('Erro ao cancelar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/trainers/me/appointments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-appointments'] });
      toast.success('Agendamento excluído');
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  function handleSubmit() {
    const payload = {
      studentId: form.studentId,
      scheduledAt: new Date(form.scheduledAt),
      type: form.type,
      duration: Number(form.duration) || 60,
      location: form.location || undefined,
      notes: form.notes || undefined,
    };
    if (editingAppt) {
      updateMutation.mutate({ id: editingAppt.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

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

  const filteredList = (appointments || [])
    .filter((a: any) => {
      if (statusFilter === 'upcoming') return a.status === 'SCHEDULED' && new Date(a.scheduledAt) >= today;
      if (statusFilter === 'completed') return a.status === 'COMPLETED';
      if (statusFilter === 'cancelled') return a.status === 'CANCELLED';
      return true;
    })
    .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <PlanGate feature="scheduleCalendar">
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie seus agendamentos</p>
        </div>
        <button onClick={() => openCreate()} className="btn-primary flex items-center gap-2 text-sm py-2">
          <Plus className="w-4 h-4" />
          Novo agendamento
        </button>
      </div>

      {/* Create / Edit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card border border-primary/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{editingAppt ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
              <button onClick={closeForm} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <select
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                className="input-field bg-background"
              >
                <option value="">Selecionar aluno *</option>
                {(students || []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.user?.profile?.firstName} {s.user?.profile?.lastName}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="input-field"
                />
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="input-field bg-background"
                >
                  {SESSION_TYPES.map((t) => <option key={t} value={t}>{SESSION_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="input-field pr-12"
                    placeholder="Duração"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
                </div>
                <input
                  placeholder="Local (opcional)"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="input-field"
                />
              </div>
              <textarea
                placeholder="Observações"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field resize-none"
                rows={2}
              />
              <div className="flex gap-3">
                <button onClick={closeForm} className="btn-secondary flex-1 text-sm py-2">Cancelar</button>
                <button
                  disabled={!form.studentId || !form.scheduledAt || isPending}
                  onClick={handleSubmit}
                  className="btn-primary flex-1 text-sm py-2 disabled:opacity-50"
                >
                  {isPending ? 'Salvando...' : editingAppt ? 'Salvar alterações' : 'Agendar'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 glass-card">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold">{MONTHS[month]} {year}</h2>
            <button
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all"
            >
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
              const hasActive = dayAppts.some((a: any) => a.status === 'SCHEDULED');
              const hasCompleted = dayAppts.some((a: any) => a.status === 'COMPLETED');
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
                      {hasActive && <div className={cn('w-1 h-1 rounded-full', isSelected(day) ? 'bg-white/80' : 'bg-primary')} />}
                      {hasCompleted && <div className={cn('w-1 h-1 rounded-full', isSelected(day) ? 'bg-white/50' : 'bg-emerald-400')} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day panel */}
        <div className="glass-card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">
              {selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <button
              onClick={() => openCreate(selectedDay)}
              className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
              title="Agendar neste dia"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
            </button>
          </div>
          {selectedAppointments.length > 0 ? (
            <div className="space-y-2 overflow-y-auto">
              {selectedAppointments
                .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                .map((a: any) => (
                  <AppointmentItem
                    key={a.id}
                    appointment={a}
                    onComplete={() => completeMutation.mutate(a.id)}
                    onCancel={() => { if (confirm('Cancelar este agendamento?')) cancelMutation.mutate(a.id); }}
                    onEdit={() => openEdit(a)}
                    onDelete={() => { if (confirm('Excluir permanentemente este agendamento?')) deleteMutation.mutate(a.id); }}
                  />
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center flex-1">
              <Calendar className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">Sem agendamentos</p>
              <button onClick={() => openCreate(selectedDay)} className="text-xs text-primary hover:underline mt-2">
                + Agendar para este dia
              </button>
            </div>
          )}
        </div>
      </div>

      {/* List section */}
      <div className="glass-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-semibold">Agendamentos</h2>
          <div className="flex gap-1 glass rounded-xl p-0.5 overflow-x-auto scrollbar-hide min-w-0">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0',
                  statusFilter === f.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {filteredList.length > 0 ? (
          <div className="space-y-2">
            {filteredList.map((a: any) => (
              <AppointmentItem
                key={a.id}
                appointment={a}
                showDate
                onComplete={() => completeMutation.mutate(a.id)}
                onCancel={() => { if (confirm('Cancelar este agendamento?')) cancelMutation.mutate(a.id); }}
                onEdit={() => openEdit(a)}
                onDelete={() => { if (confirm('Excluir permanentemente este agendamento?')) deleteMutation.mutate(a.id); }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            {statusFilter === 'upcoming' ? 'Nenhum agendamento futuro' : 'Nenhum registro'}
          </p>
        )}
      </div>
    </div>
    </PlanGate>
  );
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: 'Agendado', className: 'bg-blue-500/10 text-blue-400' },
  COMPLETED: { label: 'Concluído', className: 'bg-emerald-500/10 text-emerald-400' },
  CANCELLED: { label: 'Cancelado', className: 'bg-red-500/10 text-red-400' },
};

function AppointmentItem({
  appointment, onComplete, onCancel, onEdit, onDelete, showDate,
}: {
  appointment: any;
  onComplete: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showDate?: boolean;
}) {
  const status = appointment.status ?? 'SCHEDULED';
  const isCompleted = status === 'COMPLETED';
  const isCancelled = status === 'CANCELLED';
  const isScheduled = status === 'SCHEDULED';
  const date = new Date(appointment.scheduledAt);
  const typeLabel = SESSION_LABELS[appointment.type] || appointment.type;
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.SCHEDULED;
  const studentName = appointment.student
    ? `${appointment.student.user?.profile?.firstName ?? ''} ${appointment.student.user?.profile?.lastName ?? ''}`.trim() || 'Aluno'
    : 'Aluno';

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl transition-all group',
      isCancelled ? 'opacity-50' : 'hover:bg-accent',
    )}>
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        isCompleted ? 'bg-emerald-600/10' :
        isCancelled ? 'bg-red-600/10' :
        appointment.type === 'ONLINE' ? 'bg-cyan-600/10' :
        appointment.type === 'ASSESSMENT' ? 'bg-blue-600/10' : 'bg-purple-600/10',
      )}>
        {isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
         isCancelled ? <Ban className="w-5 h-5 text-red-400" /> :
         appointment.type === 'ONLINE' ? <Video className="w-5 h-5 text-cyan-400" /> :
         appointment.type === 'ASSESSMENT' ? <User className="w-5 h-5 text-blue-400" /> :
         <Dumbbell className="w-5 h-5 text-purple-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{studentName}</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', badge.className)}>
            {badge.label}
          </span>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {showDate && date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' • '}
            {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {appointment.duration && ` (${appointment.duration}min)`}
          </span>
          <span>{typeLabel}</span>
          {appointment.location && (
            <span className="hidden sm:flex items-center gap-1">
              <MapPin className="w-3 h-3" />{appointment.location}
            </span>
          )}
        </div>
        {appointment.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate italic">{appointment.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {isScheduled && (
          <>
            <button
              onClick={onEdit}
              title="Editar"
              className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={onComplete}
              title="Concluir"
              className="w-7 h-7 rounded-lg hover:bg-emerald-500/10 flex items-center justify-center transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </button>
            <button
              onClick={onCancel}
              title="Cancelar sessão"
              className="w-7 h-7 rounded-lg hover:bg-orange-500/10 flex items-center justify-center transition-all"
            >
              <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
            </button>
          </>
        )}
        {(isCompleted || isCancelled) && (
          <button
            onClick={onEdit}
            title="Editar"
            className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
        <button
          onClick={onDelete}
          title="Excluir"
          className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition-all"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
    </div>
  );
}
