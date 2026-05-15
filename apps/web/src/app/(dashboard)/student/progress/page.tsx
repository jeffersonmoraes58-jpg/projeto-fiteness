'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Scale, Ruler, Camera,
  Plus, ArrowUpRight, ArrowDownRight, Minus,
  Activity, Dumbbell, Calendar, X, Save,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const PERIODS = ['1 semana', '1 mês', '3 meses', '6 meses', 'Todo período'];

// ─── New Measurement Modal ────────────────────────────────────────────────────

function NewMeasurementModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    weight: '', bodyFat: '', muscleMass: '',
    waist: '', hip: '', chest: '', arm: '', thigh: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/progress/measurements', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-progress'] });
      onClose();
    },
    onError: (e: any) => {
      const msg = e?.message || e?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao salvar medição'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.weight) { setError('Peso é obrigatório'); return; }
    const num = (v: string) => (v ? Number(v) : undefined);
    mutation.mutate({
      weight:     Number(form.weight),
      bodyFat:    num(form.bodyFat),
      muscleMass: num(form.muscleMass),
      waist:      num(form.waist),
      hip:        num(form.hip),
      chest:      num(form.chest),
      arm:        num(form.arm),
      thigh:      num(form.thigh),
      notes:      form.notes || undefined,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25 }}
          className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Nova Medição</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Peso (required) */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Peso (kg) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={form.weight}
                onChange={set('weight')}
                placeholder="Ex: 75.5"
                className="input-field"
                autoFocus
                required
              />
            </div>

            {/* Composição corporal */}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Composição Corporal (opcional)
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { field: 'bodyFat',    label: 'Gordura Corporal (%)', placeholder: 'Ex: 18.5' },
                  { field: 'muscleMass', label: 'Massa Muscular (kg)',   placeholder: 'Ex: 35.0' },
                ].map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form[field as keyof typeof form]}
                      onChange={set(field)}
                      placeholder={placeholder}
                      className="input-field py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Medidas */}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Medidas (cm, opcional)
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { field: 'waist', label: 'Cintura',  placeholder: 'Ex: 80' },
                  { field: 'hip',   label: 'Quadril',  placeholder: 'Ex: 95' },
                  { field: 'chest', label: 'Peito',    placeholder: 'Ex: 100' },
                  { field: 'arm',   label: 'Braço',    placeholder: 'Ex: 35' },
                  { field: 'thigh', label: 'Coxa',     placeholder: 'Ex: 55' },
                ].map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form[field as keyof typeof form]}
                      onChange={set(field)}
                      placeholder={placeholder}
                      className="input-field py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Observações</label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                placeholder="Como você está se sentindo? Alguma observação..."
                className="input-field resize-none min-h-[72px]"
                rows={3}
              />
            </div>

            {error && (
              <div className="glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {mutation.isPending ? 'Salvando...' : 'Salvar medição'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentProgress() {
  const [period, setPeriod] = useState('1 mês');
  const [showModal, setShowModal] = useState(false);

  const { data: progress } = useQuery({
    queryKey: ['student-progress'],
    queryFn: () => api.get('/progress').then((r) => r.data.data),
  });

  const measurements = progress?.measurements;
  const assessments = progress?.assessments;
  const photos = progress?.photos;

  const latest = assessments?.[0];
  const previous = assessments?.[1];

  const diff = (field: string) => {
    if (!latest || !previous) return null;
    return Number((latest[field] - previous[field]).toFixed(1));
  };

  const metrics = [
    { label: 'Peso', value: latest?.weight, unit: 'kg', delta: diff('weight'), icon: Scale, invert: true },
    { label: 'IMC', value: latest?.bmi, unit: '', delta: diff('bmi'), icon: Activity, invert: true },
    { label: 'Gordura', value: latest?.bodyFatPercent, unit: '%', delta: diff('bodyFatPercent'), icon: TrendingDown, invert: true },
    { label: 'Massa Muscular', value: latest?.muscleMassKg, unit: 'kg', delta: diff('muscleMassKg'), icon: Dumbbell, invert: false },
  ];

  return (
    <>
      {showModal && <NewMeasurementModal onClose={() => setShowModal(false)} />}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Minha Evolução</h1>
            <p className="text-muted-foreground text-sm mt-1">Acompanhe seu progresso ao longo do tempo</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 text-sm py-2"
          >
            <Plus className="w-4 h-4" />
            Nova medição
          </button>
        </div>

        {/* Period selector */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all border',
                period === p
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'glass border-transparent hover:bg-accent',
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="stat-card"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                  <m.icon className="w-4 h-4 text-primary" />
                </div>
                {m.delta !== null && (
                  <DeltaBadge value={m.delta} unit={m.unit} invert={m.invert} />
                )}
              </div>
              <div className="text-2xl font-bold">
                {m.value != null ? `${m.value}${m.unit}` : '—'}
              </div>
              <div className="text-xs text-muted-foreground">{m.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weight chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold">Evolução do Peso</h2>
              <span className="text-xs text-muted-foreground">{period}</span>
            </div>
            <WeightChart measurements={measurements} />
          </motion.div>

          {/* Body measurements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold">Medidas Corporais</h2>
              <span className="text-xs text-primary cursor-pointer hover:underline">Ver histórico</span>
            </div>
            <BodyMeasurements assessment={latest} measurements={measurements} />
          </motion.div>
        </div>

        {/* Assessment history */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Histórico de Medições
            </h2>
          </div>
          {measurements?.length > 0 ? (
            <div className="space-y-3">
              {measurements.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Scale className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {new Date(m.measuredAt || m.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {m.weight}kg
                      {m.bodyFat ? ` • ${m.bodyFat}% gordura` : ''}
                      {m.muscleMass ? ` • ${m.muscleMass}kg músculo` : ''}
                    </div>
                  </div>
                  {i === 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      Atual
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : assessments?.length > 0 ? (
            <div className="space-y-3">
              {assessments.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Scale className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {new Date(a.assessedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {a.weight}kg • IMC {a.bmi}{a.bodyFatPercent ? ` • ${a.bodyFatPercent}% gordura` : ''}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Scale}
              message="Nenhuma medição registrada ainda."
              action={{ label: 'Registrar primeira medição', onClick: () => setShowModal(true) }}
            />
          )}
        </motion.div>

        {/* Progress photos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4 text-muted-foreground" />
              Fotos de Progresso
            </h2>
            <button className="text-xs text-primary flex items-center gap-1 hover:underline">
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>
          {photos?.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {photos.map((p: any, i: number) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/5 group cursor-pointer">
                  <img src={p.photoUrl} alt={p.angle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1">
                    <div className="text-[10px] text-white/80 truncate">{new Date(p.takenAt).toLocaleDateString('pt-BR')}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Camera} message="Nenhuma foto adicionada ainda." />
          )}
        </motion.div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DeltaBadge({ value, unit, invert }: { value: number; unit: string; invert: boolean }) {
  const isGood = invert ? value < 0 : value > 0;
  const isNeutral = value === 0;

  if (isNeutral) return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="w-3 h-3" />0
    </span>
  );

  return (
    <span className={cn('flex items-center gap-0.5 text-xs', isGood ? 'text-emerald-400' : 'text-red-400')}>
      {value > 0
        ? <ArrowUpRight className="w-3 h-3" />
        : <ArrowDownRight className="w-3 h-3" />
      }
      {Math.abs(value)}{unit}
    </span>
  );
}

function WeightChart({ measurements }: { measurements: any[] }) {
  if (!measurements?.length) {
    return <EmptyState icon={TrendingUp} message="Sem dados para exibir. Adicione sua primeira medição." />;
  }

  const values = measurements.map((m: any) => m.weight).filter(Boolean);
  if (values.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2">
        <div className="text-3xl font-bold">{values[0]}kg</div>
        <div className="text-xs text-muted-foreground">Adicione mais medições para ver o gráfico</div>
      </div>
    );
  }

  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const w = 300;
  const h = 100;

  const pts = values.slice(-8).map((v: number, i: number, arr: number[]) => ({
    x: arr.length === 1 ? w / 2 : (i / (arr.length - 1)) * w,
    y: h - ((v - min) / (max - min)) * h,
  }));

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full">
        <defs>
          <linearGradient id="wGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="url(#wGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="url(#wGrad)" />
        ))}
      </svg>
      <div className="flex justify-between mt-2">
        {values.slice(-8).map((v: number, i: number) => (
          <span key={i} className="text-xs text-muted-foreground">{v}kg</span>
        ))}
      </div>
    </div>
  );
}

function BodyMeasurements({ assessment, measurements }: { assessment: any; measurements: any[] }) {
  const latest = measurements?.[0];

  const items = [
    { label: 'Cintura', value: assessment?.waistCm ?? latest?.waist,     unit: 'cm' },
    { label: 'Quadril', value: assessment?.hipCm   ?? latest?.hip,       unit: 'cm' },
    { label: 'Peito',   value: assessment?.chestCm ?? latest?.chest,     unit: 'cm' },
    { label: 'Braço',   value: assessment?.rightArmCm ?? latest?.arm,    unit: 'cm' },
    { label: 'Coxa',    value: assessment?.rightThighCm ?? latest?.thigh, unit: 'cm' },
    { label: 'Panturrilha', value: assessment?.rightCalfCm,               unit: 'cm' },
  ].filter((i) => i.value != null);

  if (!items.length) return <EmptyState icon={Ruler} message="Sem medidas corporais disponíveis." />;

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 p-3 glass rounded-xl">
          <Ruler className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="font-semibold text-sm">{item.value}{item.unit}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon, message, action,
}: {
  icon: any;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          {action.label}
        </button>
      )}
    </div>
  );
}
