'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Scale, Ruler, Camera,
  Plus, ArrowUpRight, ArrowDownRight, Minus,
  Activity, Dumbbell, Calendar,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const PERIODS = ['1 semana', '1 mês', '3 meses', '6 meses', 'Todo período'];

export default function StudentProgress() {
  const [period, setPeriod] = useState('1 mês');

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Minha Evolução</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe seu progresso ao longo do tempo</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm py-2">
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
          <BodyMeasurements assessment={latest} />
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
            Histórico de Avaliações
          </h2>
        </div>
        {assessments?.length > 0 ? (
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
                    {a.weight}kg • IMC {a.bmi} {a.bodyFatPercent ? `• ${a.bodyFatPercent}% gordura` : ''}
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Scale} message="Nenhuma avaliação registrada ainda." />
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
  );
}

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
    return <EmptyState icon={TrendingUp} message="Sem dados para exibir." />;
  }

  const values = measurements.map((m: any) => m.weight).filter(Boolean);
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const w = 300;
  const h = 100;

  const points = values.slice(-8).map((v: number, i: number, arr: number[]) => ({
    x: (i / (arr.length - 1)) * w,
    y: h - ((v - min) / (max - min)) * h,
  }));

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

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
        {points.map((p, i) => (
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

function BodyMeasurements({ assessment }: { assessment: any }) {
  if (!assessment) return <EmptyState icon={Ruler} message="Sem avaliação física disponível." />;

  const items = [
    { label: 'Cintura', value: assessment.waistCm, unit: 'cm' },
    { label: 'Quadril', value: assessment.hipCm, unit: 'cm' },
    { label: 'Peito', value: assessment.chestCm, unit: 'cm' },
    { label: 'Braço D', value: assessment.rightArmCm, unit: 'cm' },
    { label: 'Coxa D', value: assessment.rightThighCm, unit: 'cm' },
    { label: 'Panturrilha', value: assessment.rightCalfCm, unit: 'cm' },
  ].filter((i) => i.value != null);

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

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
