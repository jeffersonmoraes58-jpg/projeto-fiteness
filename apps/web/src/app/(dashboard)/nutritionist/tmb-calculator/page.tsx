'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, Zap, Target, Apple, Crosshair, ChevronRight,
  CheckCircle2, Copy, RefreshCw,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const FORMULAS = [
  { value: 'mifflin', label: 'Mifflin-St Jeor' },
  { value: 'harris', label: 'Harris-Benedict' },
  { value: 'fao', label: 'FAO/WHO' },
];

const ACTIVITY_LEVELS = [
  { value: 'SEDENTARY', label: 'Sedentário', desc: 'Pouco ou nenhum exercício' },
  { value: 'LIGHTLY_ACTIVE', label: 'Leve', desc: 'Exercício leve 1-3x/semana' },
  { value: 'MODERATELY_ACTIVE', label: 'Moderado', desc: 'Exercício moderado 3-5x/semana' },
  { value: 'VERY_ACTIVE', label: 'Intenso', desc: 'Exercício intenso 6-7x/semana' },
  { value: 'EXTRA_ACTIVE', label: 'Atleta', desc: 'Exercício muito intenso / trabalho físico' },
];

const GOALS = [
  { value: 'LOSE_WEIGHT', label: 'Perda de peso', desc: 'Déficit de 20%', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { value: 'GAIN_MUSCLE', label: 'Ganho muscular', desc: 'Superávit de 15%', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'MAINTAIN_WEIGHT', label: 'Manutenção', desc: 'Manter peso atual', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
];

export default function TMBCalculator() {
  const [form, setForm] = useState({
    weight: '',
    height: '',
    age: '',
    gender: 'MALE',
    activityLevel: 'MODERATELY_ACTIVE',
    goal: 'LOSE_WEIGHT',
    formula: 'mifflin',
  });
  const [result, setResult] = useState<any>(null);

  const calcMutation = useMutation({
    mutationFn: (data: any) =>
      api.post('/nutritionists/me/calculate-tmb', data).then((r) => r.data.data ?? r.data),
    onSuccess: (data) => setResult(data),
    onError: () => toast.error('Erro ao calcular. Verifique os dados.'),
  });

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    calcMutation.mutate({
      weight: Number(form.weight),
      height: Number(form.height),
      age: Number(form.age),
      gender: form.gender,
      activityLevel: form.activityLevel,
      goal: form.goal,
      formula: form.formula,
    });
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function copyMacros() {
    if (!result) return;
    const text = `TMB: ${result.tmb} kcal\nGET: ${result.get} kcal\nMeta: ${result.targetCalories} kcal\nProteína: ${result.macros.protein.grams}g (${result.macros.protein.pct}%)\nCarboidratos: ${result.macros.carbs.grams}g (${result.macros.carbs.pct}%)\nGorduras: ${result.macros.fat.grams}g (${result.macros.fat.pct}%)`;
    navigator.clipboard.writeText(text).then(
      () => toast.success('Macros copiados!'),
      () => toast.error('Erro ao copiar'),
    );
  }

  const isCalculating = calcMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Calculadora TMB / GET</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Taxa Metabólica Basal, Gasto Energético Total e Distribuição de Macronutrientes
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleCalculate} className="glass-card space-y-5">
        {/* Formula */}
        <div>
          <label className="text-sm font-semibold mb-2 block">Fórmula</label>
          <div className="flex gap-2">
            {FORMULAS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setForm((p) => ({ ...p, formula: f.value }))}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                  form.formula === f.value
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/30',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Basic data */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Peso (kg)</label>
            <input type="number" step="0.1" min="1" value={form.weight} onChange={set('weight')} placeholder="75" className="input-field text-sm py-2" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Altura (cm)</label>
            <input type="number" step="0.1" min="100" value={form.height} onChange={set('height')} placeholder="175" className="input-field text-sm py-2" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Idade</label>
            <input type="number" min="10" max="120" value={form.age} onChange={set('age')} placeholder="30" className="input-field text-sm py-2" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sexo</label>
            <select value={form.gender} onChange={set('gender')} className="input-field text-sm py-2 bg-background">
              <option value="MALE">Masculino</option>
              <option value="FEMALE">Feminino</option>
            </select>
          </div>
        </div>

        {/* Activity level */}
        <div>
          <label className="text-sm font-semibold mb-2 block">Nível de Atividade</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {ACTIVITY_LEVELS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setForm((p) => ({ ...p, activityLevel: a.value }))}
                className={cn(
                  'text-left p-3 rounded-xl border text-sm transition-all',
                  form.activityLevel === a.value
                    ? 'bg-primary/20 border-primary'
                    : 'bg-white/5 border-white/10 hover:border-white/30',
                )}
              >
                <div className="font-medium text-xs">{a.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{a.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div>
          <label className="text-sm font-semibold mb-2 block">Objetivo</label>
          <div className="flex gap-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setForm((p) => ({ ...p, goal: g.value }))}
                className={cn(
                  'flex-1 text-center p-3 rounded-xl border text-sm transition-all',
                  form.goal === g.value
                    ? g.color + ' border-current'
                    : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/30',
                )}
              >
                <div className="font-medium text-xs">{g.label}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{g.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isCalculating || !form.weight || !form.height || !form.age}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base font-semibold disabled:opacity-50"
        >
          {isCalculating ? (
            <>Calculando...</>
          ) : (
            <>
              <Calculator className="w-5 h-5" />
              Calcular
            </>
          )}
        </button>
      </form>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-600/20 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Resultado ({FORMULAS.find((f) => f.value === result.formula)?.label})
              </h2>
              <button
                onClick={copyMacros}
                className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </button>
            </div>

            {/* TMB / GET */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">TMB</div>
                <div className="text-xl font-bold">{result.tmb}</div>
                <div className="text-xs text-muted-foreground">kcal/dia</div>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">GET</div>
                <div className="text-xl font-bold">{result.get}</div>
                <div className="text-xs text-muted-foreground">kcal/dia</div>
              </div>
              <div className="glass rounded-xl p-4 text-center bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-xs text-emerald-400 mb-1">Meta</div>
                <div className="text-xl font-bold text-emerald-400">{result.targetCalories}</div>
                <div className="text-xs text-emerald-400/70">kcal/dia</div>
              </div>
            </div>

            {/* Macros */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Apple className="w-4 h-4 text-purple-400" />
                Distribuição de Macronutrientes
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Proteína', ...result.macros.protein, color: 'bg-purple-500', textColor: 'text-purple-400' },
                  { label: 'Carboidratos', ...result.macros.carbs, color: 'bg-yellow-500', textColor: 'text-yellow-400' },
                  { label: 'Gorduras', ...result.macros.fat, color: 'bg-orange-500', textColor: 'text-orange-400' },
                ].map((m) => (
                  <div key={m.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn('font-medium', m.textColor)}>{m.label}</span>
                      <span>{m.grams}g ({m.kcal} kcal · {m.pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${m.pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={cn('h-full rounded-full', m.color)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="text-xs text-muted-foreground text-center border-t border-white/5 pt-4">
              Fator de atividade: {result.activityFactor} · Fórmula: {FORMULAS.find((f) => f.value === result.formula)?.label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}