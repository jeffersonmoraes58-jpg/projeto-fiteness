'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Plus, Clock, User,
  Video, MapPin, CheckCircle2, X, Calendar,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function NutritionistSchedule() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ studentId: '', scheduledAt: '', notes: '' });
  const queryClient = useQueryClient();

  const { data: consultations } = useQuery({
    queryKey: ['nutritionist-consultations'],
    queryFn: () => api.get('/nutritionists/me/consultations').then((r) => r.data.data),
  });

  const { data: patients } = useQuery({
    queryKey: ['nutritionist-patients-list'],
    queryFn: () => api.get('/nutritionists/me/patients').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/nutritionists/me/consultations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutritionist-consultations'] });
      setShowNew(false);
      setForm({ studentId: '', scheduledAt: '', notes: '' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/nutritionists/me/consultations/${id}`, { completedAt: new Date() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nutritionist-consultations'] }),
  });

  // Calendar logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const consultationsOnDay = (day: Date) =>
    (consultations || []).filter((c: any) => {
      const d = new Date(c.scheduledAt);
      return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
    });

  const selectedConsultations = consultationsOnDay(selectedDay);

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isSelected = (d: Date) => d.toDateString() === selectedDay.toDateString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas consultas</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 text-sm py-2">
          <Plus className="w-4 h-4" />
          Nova consulta
        </button>
      </div>

      {/* New consultation form */}
      {showNew && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border border-primary/20"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Nova Consulta</h2>
            <button onClick={() => setShowNew(false)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <select
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className="input-field bg-background"
            >
              <option value="">Selecionar paciente *</option>
              {(patients || []).map((p: any) => (
                <option key={p.id} value={p.studentId || p.id}>
                  {p.user?.profile?.firstName} {p.user?.profile?.lastName}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              className="input-field"
            />
            <textarea
              placeholder="Observações (opcional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-field resize-none"
              rows={2}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowNew(false)} className="btn-secondary flex-1 text-sm py-2">Cancelar</button>
              <button
                disabled={!form.studentId || !form.scheduledAt || createMutation.isPending}
                onClick={() => createMutation.mutate({ ...form, scheduledAt: new Date(form.scheduledAt) })}
                className="btn-primary flex-1 text-sm py-2"
              >
                {createMutation.isPending ? 'Agendando...' : 'Agendar consulta'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 glass-card">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-2">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {[...Array(firstDay)].map((_, i) => <div key={`empty-${i}`} />)}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = new Date(year, month, i + 1);
              const dayConsultations = consultationsOnDay(day);
              const hasConsultation = dayConsultations.length > 0;

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
                  {hasConsultation && (
                    <div className={cn(
                      'absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5',
                    )}>
                      {dayConsultations.slice(0, 3).map((_, di) => (
                        <div key={di} className={cn('w-1 h-1 rounded-full', isSelected(day) ? 'bg-white/60' : 'bg-primary')} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">
              {selectedDay.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
            </h2>
            <span className="text-xs text-muted-foreground">
              {selectedConsultations.length} consultas
            </span>
          </div>

          {selectedConsultations.length > 0 ? (
            <div className="space-y-3">
              {selectedConsultations.map((c: any, i: number) => (
                <ConsultationItem
                  key={c.id}
                  consultation={c}
                  onComplete={() => completeMutation.mutate(c.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Sem consultas neste dia</p>
              <button
                onClick={() => setShowNew(true)}
                className="text-xs text-primary hover:underline mt-2"
              >
                + Agendar consulta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming */}
      <div className="glass-card">
        <h2 className="font-semibold mb-4">Próximas Consultas</h2>
        <div className="space-y-2">
          {(consultations || [])
            .filter((c: any) => !c.completedAt && new Date(c.scheduledAt) >= today)
            .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            .slice(0, 5)
            .map((c: any, i: number) => (
              <ConsultationItem key={c.id} consultation={c} onComplete={() => completeMutation.mutate(c.id)} showDate />
            ))}
          {(!consultations || consultations.filter((c: any) => !c.completedAt).length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma consulta agendada</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ConsultationItem({ consultation, onComplete, showDate }: {
  consultation: any;
  onComplete: () => void;
  showDate?: boolean;
}) {
  const isCompleted = !!consultation.completedAt;
  const date = new Date(consultation.scheduledAt);

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all',
      isCompleted && 'opacity-60',
    )}>
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        isCompleted ? 'bg-emerald-600/10' : 'bg-cyan-600/10',
      )}>
        {isCompleted
          ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          : <User className="w-5 h-5 text-cyan-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {consultation.nutritionist
            ? `${consultation.student?.user?.profile?.firstName || ''} ${consultation.student?.user?.profile?.lastName || ''}`.trim() || 'Paciente'
            : 'Paciente'
          }
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Clock className="w-3 h-3" />
          {showDate && date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' • '}
          {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {!isCompleted && (
        <button
          onClick={onComplete}
          className="text-xs text-emerald-400 hover:underline flex-shrink-0"
        >
          Concluir
        </button>
      )}
    </div>
  );
}
