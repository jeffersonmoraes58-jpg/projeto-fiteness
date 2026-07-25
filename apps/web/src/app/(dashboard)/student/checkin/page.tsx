'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, Moon, Brain, Salad, Dumbbell,
  Zap, Battery, Send, CheckCircle2, TrendingUp, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckinData {
  rating?: number;
  sleepHours?: number;
  sleepQuality?: number;
  stressLevel?: number;
  nutrition?: number;
  training?: number;
  recovery?: number;
  energy?: number;
  notes?: string;
}

const SLIDERS: { key: keyof CheckinData; label: string; icon: any; min: number; max: number; step: number; unit: string; color: string }[] = [
  { key: 'rating', label: 'Como foi sua semana?', icon: TrendingUp, min: 1, max: 5, step: 1, unit: '', color: 'from-purple-500 to-indigo-500' },
  { key: 'sleepQuality', label: 'Qualidade do sono', icon: Moon, min: 1, max: 5, step: 1, unit: '', color: 'from-indigo-500 to-blue-500' },
  { key: 'stressLevel', label: 'Nível de estresse', icon: Brain, min: 1, max: 5, step: 1, unit: '', color: 'from-amber-500 to-orange-500' },
  { key: 'nutrition', label: 'Alimentação', icon: Salad, min: 1, max: 5, step: 1, unit: '', color: 'from-emerald-500 to-teal-500' },
  { key: 'training', label: 'Treinos', icon: Dumbbell, min: 1, max: 5, step: 1, unit: '', color: 'from-blue-500 to-cyan-500' },
  { key: 'recovery', label: 'Recuperação', icon: Zap, min: 1, max: 5, step: 1, unit: '', color: 'from-teal-500 to-green-500' },
  { key: 'energy', label: 'Energia do dia', icon: Battery, min: 1, max: 5, step: 1, unit: '', color: 'from-yellow-500 to-amber-500' },
];

const LABELS = ['Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente'];

function SliderInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min: number; max: number }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative w-full h-8 flex items-center">
      <div className="absolute w-full h-2 rounded-full bg-white/10" />
      <div
        className="absolute h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
        style={{ width: `${pct}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute w-full h-8 opacity-0 cursor-pointer z-10"
      />
      <div
        className="absolute w-5 h-5 rounded-full bg-white shadow-lg border-2 border-indigo-500 transition-all"
        style={{ left: `calc(${pct}% - 10px)` }}
      />
    </div>
  );
}

export default function StudentCheckinPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CheckinData>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: current, isLoading } = useQuery({
    queryKey: ['student-checkin-current'],
    queryFn: () => api.get('/students/me/weekly-checkins/current').then((r) => r.data.data ?? r.data),
  });

  const { data: history } = useQuery({
    queryKey: ['student-checkin-history'],
    queryFn: () => api.get('/students/me/weekly-checkins?limit=8').then((r) => r.data.data ?? r.data),
  });

  const submitMutation = useMutation({
    mutationFn: (data: CheckinData) => api.post('/students/me/weekly-checkins', data),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['student-checkin-current'] });
      queryClient.invalidateQueries({ queryKey: ['student-checkin-history'] });
    },
  });

  const handleSubmit = () => {
    submitMutation.mutate(form);
  };

  const existingCheckin = current?.status === 'completed' ? current : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Check-in Semanal</h1>
            <p className="text-xs text-gray-400">Como foi sua semana?</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {submitted || existingCheckin ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-emerald-300">Check-in enviado!</h2>
              <p className="text-sm text-emerald-400/80 mt-1">
                Seu personal já pode acompanhar sua semana.
              </p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {SLIDERS.map((s) => {
                    const Icon = s.icon;
                    const val = (form[s.key] as number) ?? 3;
                    return (
                      <motion.div
                        key={s.key}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center', s.color)}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-white">{s.label}</span>
                          <span className="ml-auto text-xs text-gray-400 font-medium">
                            {s.key === 'sleepHours' ? `${val}h` : LABELS[val - 1]}
                          </span>
                        </div>
                        <SliderInput
                          value={val}
                          onChange={(v) => setForm((f) => ({ ...f, [s.key]: v }))}
                          min={s.min}
                          max={s.max}
                        />
                      </motion.div>
                    );
                  })}

                  {/* Sleep hours (separate, range 4-12) */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <Moon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-white">Horas de sono por noite</span>
                      <span className="ml-auto text-xs text-gray-400 font-medium">
                        {form.sleepHours ?? 7}h
                      </span>
                    </div>
                    <SliderInput
                      value={form.sleepHours ?? 7}
                      onChange={(v) => setForm((f) => ({ ...f, sleepHours: v }))}
                      min={4}
                      max={12}
                    />
                  </div>

                  {/* Notes */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-white">Observações (opcional)</span>
                    </div>
                    <textarea
                      value={form.notes ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Como se sentiu esta semana..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 resize-none h-20 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className={cn(
                      'w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all',
                      submitMutation.isPending
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500',
                    )}
                  >
                    <Send className="w-4 h-4" />
                    {submitMutation.isPending ? 'Enviando...' : 'Enviar check-in'}
                  </motion.button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* History */}
        {history && history.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Check-ins anteriores</h3>
            <div className="space-y-2">
              {history.map((c: any) => (
                <div
                  key={c.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                    c.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400',
                  )}>
                    {c.rating ?? '-'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white">
                      Semana de {new Date(c.weekStart).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      Sono: {c.sleepQuality}/5 · Treino: {c.training}/5 · Energia: {c.energy}/5
                    </p>
                  </div>
                  {c.trainerNotes && (
                    <div className="text-[10px] text-indigo-400 italic max-w-[120px] truncate">
                      "{c.trainerNotes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
