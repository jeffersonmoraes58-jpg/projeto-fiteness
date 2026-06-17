'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Apple, Droplets, Plus, ChevronDown, ChevronUp,
  Coffee, Sun, UtensilsCrossed, Moon, Zap, CheckCircle2,
  Camera, Loader2, X, BookOpen, Download, ExternalLink,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const MEAL_ICONS: Record<string, any> = {
  BREAKFAST: Coffee, MORNING_SNACK: Apple, LUNCH: Sun, AFTERNOON_SNACK: Apple,
  DINNER: Moon, EVENING_SNACK: Moon, PRE_WORKOUT: Zap, POST_WORKOUT: Zap,
};

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: 'Café da manhã', MORNING_SNACK: 'Lanche da manhã', LUNCH: 'Almoço',
  AFTERNOON_SNACK: 'Lanche da tarde', DINNER: 'Jantar', EVENING_SNACK: 'Ceia',
  PRE_WORKOUT: 'Pré-treino', POST_WORKOUT: 'Pós-treino',
};

const MOODS = [
  { value: 'great', emoji: '😊', label: 'Ótimo' },
  { value: 'ok', emoji: '😐', label: 'Normal' },
  { value: 'bad', emoji: '😞', label: 'Difícil' },
];

const WATER_AMOUNTS = [150, 200, 300, 500];

type MealStep = 'emoji' | 'diary' | 'done';
interface MealState { step: MealStep; mood?: string; photoUrl?: string; notes?: string }

export default function StudentDiet() {
  const [expandedMeal, setExpandedMeal] = useState<string | null>('BREAKFAST');
  const [showWaterPicker, setShowWaterPicker] = useState(false);
  const [mealStates, setMealStates] = useState<Record<string, MealState>>({});
  const queryClient = useQueryClient();

  const { data: dietPlan } = useQuery({
    queryKey: ['student-diet-plan'],
    queryFn: () => api.get('/students/me/diet').then((r) => r.data?.data ?? r.data),
  });

  const { data: waterData } = useQuery({
    queryKey: ['student-water-today'],
    queryFn: () => api.get('/students/me/water/today').then((r) => r.data?.data ?? r.data),
  });

  const { data: mealLogs = [] } = useQuery<any[]>({
    queryKey: ['student-meal-logs-today'],
    queryFn: () => api.get('/students/me/meal-logs/today').then((r) => r.data?.data ?? r.data ?? []),
  });

  const waterMutation = useMutation({
    mutationFn: (amount: number) => api.post('/students/me/water', { amount }),
    onSuccess: (_, amount) => {
      queryClient.invalidateQueries({ queryKey: ['student-water-today'] });
      toast.success(`+${amount}ml registrado!`);
      setShowWaterPicker(false);
    },
    onError: () => toast.error('Erro ao registrar água'),
  });

  const logMealMutation = useMutation({
    mutationFn: (data: any) => api.post('/students/me/meal-logs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-meal-logs-today'] });
    },
    onError: () => toast.error('Erro ao salvar registro'),
  });

  function downloadDietPDF() {
    const diet = dietPlan?.diet;
    if (!diet) { toast.error('Nenhuma dieta carregada'); return; }

    const meals: any[] = diet.meals ?? [];
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    const mealRows = meals.map((m: any) => {
      const foodRows = (m.foods ?? []).map((mf: any) => `
        <tr>
          <td style="padding:6px 12px 6px 28px;color:#6b7280;font-size:13px;">${mf.food?.name ?? mf.name ?? '—'}</td>
          <td style="padding:6px 8px;text-align:center;color:#6b7280;font-size:13px;">${mf.quantity}${mf.unit ?? 'g'}</td>
          <td style="padding:6px 8px;text-align:center;color:#374151;font-size:13px;">${mf.calories ?? '—'}</td>
          <td style="padding:6px 8px;text-align:center;color:#374151;font-size:13px;">${mf.protein ?? '—'}g</td>
          <td style="padding:6px 8px;text-align:center;color:#374151;font-size:13px;">${mf.carbs ?? '—'}g</td>
          <td style="padding:6px 8px;text-align:center;color:#374151;font-size:13px;">${mf.fat ?? '—'}g</td>
        </tr>`).join('');

      return `
        <tr style="background:#f9fafb;">
          <td colspan="6" style="padding:10px 12px;font-weight:600;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">
            ${MEAL_LABELS[m.type] ?? m.type}${m.time ? `<span style="font-weight:400;color:#6b7280;font-size:12px;margin-left:8px;">${m.time}</span>` : ''}
            <span style="float:right;font-weight:400;font-size:12px;color:#6b7280;">${m.calories ?? 0} kcal · P:${m.protein ?? 0}g C:${m.carbs ?? 0}g G:${m.fat ?? 0}g</span>
          </td>
        </tr>
        ${foodRows || `<tr><td colspan="6" style="padding:6px 28px;color:#9ca3af;font-size:12px;">Nenhum alimento cadastrado</td></tr>`}
        ${m.notes ? `<tr><td colspan="6" style="padding:4px 28px 10px;color:#9ca3af;font-size:12px;font-style:italic;">Obs: ${m.notes}</td></tr>` : ''}`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Dieta — ${diet.name}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; background: #fff; padding: 32px; }
      @media print {
        body { padding: 16px; }
        button { display: none !important; }
        @page { margin: 16mm 12mm; }
      }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #10b981; padding-bottom: 16px; }
      .logo { font-size: 22px; font-weight: 700; color: #10b981; }
      .subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
      .plan-name { font-size: 18px; font-weight: 600; color: #111827; }
      .date { font-size: 12px; color: #6b7280; margin-top: 2px; text-align: right; }
      .macros-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
      .macro-box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; text-align: center; }
      .macro-val { font-size: 20px; font-weight: 700; color: #10b981; }
      .macro-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; }
      thead th { background: #10b981; color: white; padding: 10px 12px; font-size: 12px; font-weight: 600; text-align: center; }
      thead th:first-child { text-align: left; }
      tr:nth-child(even):not([style]) { background: #f9fafb; }
      .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
      .print-btn { position: fixed; bottom: 24px; right: 24px; background: #10b981; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,.4); }
      .print-btn:hover { background: #059669; }
    </style></head><body>
    <div class="header">
      <div>
        <div class="logo">Fitlynutri</div>
        <div class="subtitle">Plano Alimentar</div>
      </div>
      <div>
        <div class="plan-name">${diet.name}</div>
        <div class="date">Emitido em ${date}</div>
      </div>
    </div>
    <div class="macros-grid">
      <div class="macro-box"><div class="macro-val">${diet.totalCalories ?? 0}</div><div class="macro-label">Calorias (kcal)</div></div>
      <div class="macro-box"><div class="macro-val">${diet.totalProtein ?? 0}g</div><div class="macro-label">Proteína</div></div>
      <div class="macro-box"><div class="macro-val">${diet.totalCarbs ?? 0}g</div><div class="macro-label">Carboidratos</div></div>
      <div class="macro-box"><div class="macro-val">${diet.totalFat ?? 0}g</div><div class="macro-label">Gorduras</div></div>
    </div>
    <table>
      <thead><tr>
        <th style="text-align:left;">Alimento</th>
        <th>Porção</th><th>Kcal</th><th>Prot</th><th>Carb</th><th>Gord</th>
      </tr></thead>
      <tbody>${mealRows}</tbody>
    </table>
    <div class="footer">Gerado pelo Fitlynutri · Consulte sempre seu nutricionista</div>
    <button class="print-btn" onclick="window.print()">⬇ Salvar PDF</button>
    </body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { toast.error('Permita pop-ups para gerar o PDF'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
  }

  const todayLog = (mealLogs as any[]).length > 0 ? {
    calories: (mealLogs as any[]).reduce((s, l) => s + (l.calories ?? 0), 0),
    protein:  (mealLogs as any[]).reduce((s, l) => s + (l.protein ?? 0), 0),
    carbs:    (mealLogs as any[]).reduce((s, l) => s + (l.carbs ?? 0), 0),
    fat:      (mealLogs as any[]).reduce((s, l) => s + (l.fat ?? 0), 0),
    fiber:    0,
  } : null;
  const waterTotal = waterData?.total ?? 0;
  const waterGoal = 2000;
  const totalCalories = dietPlan?.diet?.totalCalories ?? 0;
  const consumedCalories = todayLog?.calories ?? 0;
  const remaining = Math.max(totalCalories - consumedCalories, 0);

  const macros = [
    { label: 'Proteína', target: dietPlan?.diet?.totalProtein ?? 0, current: todayLog?.protein ?? 0, color: 'from-purple-500 to-indigo-500', unit: 'g' },
    { label: 'Carboidratos', target: dietPlan?.diet?.totalCarbs ?? 0, current: todayLog?.carbs ?? 0, color: 'from-yellow-500 to-orange-500', unit: 'g' },
    { label: 'Gorduras', target: dietPlan?.diet?.totalFat ?? 0, current: todayLog?.fat ?? 0, color: 'from-red-500 to-pink-500', unit: 'g' },
    { label: 'Fibras', target: dietPlan?.diet?.totalFiber ?? 0, current: todayLog?.fiber ?? 0, color: 'from-emerald-500 to-teal-500', unit: 'g' },
  ];

  const loggedTypes = new Set((mealLogs as any[]).map((l: any) => l.mealType));

  function startMeal(mealType: string) {
    setMealStates((prev) => ({ ...prev, [mealType]: { step: 'emoji' } }));
  }

  function selectMood(mealType: string, mood: string) {
    setMealStates((prev) => ({ ...prev, [mealType]: { ...prev[mealType], mood, step: 'diary' } }));
  }

  function finishMeal(mealType: string, meal: any, photoUrl?: string, notes?: string) {
    const ms = mealStates[mealType];
    logMealMutation.mutate({
      mealType,
      calories: meal?.calories ?? 0,
      protein: meal?.protein ?? 0,
      carbs: meal?.carbs ?? 0,
      fat: meal?.fat ?? 0,
      mood: ms?.mood,
      photoUrl: photoUrl ?? ms?.photoUrl ?? null,
      notes: notes ?? null,
    }, {
      onSuccess: () => {
        setMealStates((prev) => ({ ...prev, [mealType]: { ...prev[mealType], step: 'done' } }));
        toast.success('Refeição registrada!');
      },
    });
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Minha Dieta</h1>
          <p className="text-muted-foreground text-sm mt-1">{dietPlan?.diet?.name || 'Plano alimentar do dia'}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {(() => {
            const rawPhone = dietPlan?.diet?.nutritionist?.user?.profile?.phone?.replace(/\D/g, '');
            if (!rawPhone) return null;
            const phone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
            const profile = dietPlan?.diet?.nutritionist?.user?.profile;
            const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Nutricionista';
            return (
              <a
                href={`https://wa.me/${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`WhatsApp de ${name}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            );
          })()}
          {dietPlan?.diet && (
            <button
              onClick={downloadDietPDF}
              className="btn-secondary flex items-center gap-2 text-sm py-2 px-3"
              title="Baixar dieta em PDF"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          )}
        </div>
      </div>

      {/* Calorie summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">Calorias do Dia</h2>
          <span className="text-xs text-muted-foreground">Meta: {totalCalories} kcal</span>
        </div>
        <div className="flex items-center justify-around mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{consumedCalories}</div>
            <div className="text-xs text-muted-foreground mt-1">Consumido</div>
          </div>
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
              <motion.circle
                cx="50" cy="50" r="40" fill="none" stroke="url(#dietGrad)" strokeWidth="8"
                strokeLinecap="round" strokeDasharray={251.2}
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 - (Math.min(consumedCalories / (totalCalories || 1), 1) * 251.2) }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="dietGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-sm font-bold">
                {totalCalories > 0 ? Math.round((consumedCalories / totalCalories) * 100) : 0}%
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">{remaining}</div>
            <div className="text-xs text-muted-foreground mt-1">Restante</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {macros.map((m) => {
            const pct = m.target > 0 ? Math.min((m.current / m.target) * 100, 100) : 0;
            return (
              <div key={m.label} className="glass rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                  <span className="text-xs font-medium">{m.current}/{m.target}{m.unit}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                    className={`h-full bg-gradient-to-r ${m.color} rounded-full`} />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Water */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Hidratação</div>
            <div className="text-xs text-muted-foreground mt-0.5">{waterTotal} ml de {waterGoal} ml</div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
              <motion.div key={waterTotal} initial={{ width: 0 }}
                animate={{ width: `${Math.min((waterTotal / waterGoal) * 100, 100)}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
            </div>
          </div>
          <button onClick={() => setShowWaterPicker((v) => !v)}
            className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center hover:bg-cyan-500/20 transition-all">
            <Plus className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
        <AnimatePresence>
          {showWaterPicker && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="pt-4 mt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-3">Quanto você bebeu?</p>
                <div className="grid grid-cols-4 gap-2">
                  {WATER_AMOUNTS.map((ml) => (
                    <button key={ml} onClick={() => waterMutation.mutate(ml)} disabled={waterMutation.isPending}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 transition-all disabled:opacity-60">
                      <Droplets className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-medium text-cyan-400">{ml}ml</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Meals */}
      <div className="space-y-3">
        <h2 className="font-semibold">Refeições do Dia</h2>
        {(dietPlan?.diet?.meals || [...Array(4)]).map((meal: any, i: number) => {
          const mealType = meal?.type || String(i);
          const ms = mealStates[mealType];
          const isLogged = loggedTypes.has(mealType) || ms?.step === 'done';
          return (
            <div key={meal?.id || i} className="space-y-2">
              <MealCard
                meal={meal}
                index={i}
                isExpanded={expandedMeal === mealType}
                onToggle={() => setExpandedMeal(expandedMeal === mealType ? null : mealType)}
                isLogged={isLogged}
                onComplete={() => startMeal(mealType)}
              />
              <AnimatePresence>
                {ms?.step === 'emoji' && (
                  <EmojiCard
                    key="emoji"
                    onSelect={(mood) => selectMood(mealType, mood)}
                    onDismiss={() => setMealStates((p) => { const n = { ...p }; delete n[mealType]; return n; })}
                  />
                )}
                {ms?.step === 'diary' && (
                  <DiaryCard
                    key="diary"
                    mood={ms.mood!}
                    meal={meal}
                    isPending={logMealMutation.isPending}
                    onSave={(photoUrl, notes) => finishMeal(mealType, meal, photoUrl, notes)}
                    onSkip={() => finishMeal(mealType, meal)}
                  />
                )}
                {ms?.step === 'done' && (
                  <motion.div key="done"
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-400">Refeição registrada!</p>
                      <p className="text-xs text-muted-foreground">
                        {MOODS.find((m) => m.value === ms.mood)?.emoji} {MOODS.find((m) => m.value === ms.mood)?.label}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Meal card ─────────────────────────────────────────────────────────────────

function MealCard({ meal, index, isExpanded, onToggle, isLogged, onComplete }: {
  meal: any; index: number; isExpanded: boolean; onToggle: () => void;
  isLogged: boolean; onComplete: () => void;
}) {
  if (!meal?.type) {
    return (
      <div className="glass-card animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-white/10 rounded w-1/3" />
            <div className="h-2 bg-white/5 rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  const Icon = MEAL_ICONS[meal.type] || UtensilsCrossed;
  const label = MEAL_LABELS[meal.type] || meal.type;
  const iconColors = [
    'from-yellow-500 to-orange-500', 'from-emerald-500 to-teal-500',
    'from-blue-500 to-indigo-500', 'from-purple-500 to-pink-500',
    'from-red-500 to-rose-500', 'from-cyan-500 to-blue-500',
    'from-orange-500 to-red-500', 'from-green-500 to-emerald-500',
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }} className="glass-card !p-0 overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-all text-left">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconColors[index % iconColors.length]} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{label}</span>
            {meal.time && <span className="text-xs text-muted-foreground">{meal.time}</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {meal.calories ? `${meal.calories} kcal` : '—'} •
            P: {meal.protein ?? 0}g C: {meal.carbs ?? 0}g G: {meal.fat ?? 0}g
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (!isLogged) onComplete(); }}
          className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center transition-all mr-1 flex-shrink-0',
            isLogged
              ? 'text-emerald-400 bg-emerald-500/10 cursor-default'
              : 'text-muted-foreground/40 hover:text-emerald-400 hover:bg-emerald-500/10',
          )}
          title={isLogged ? 'Concluído' : 'Marcar como concluído'}
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="border-t border-border/50">
            <div className="p-4">
              {meal.foods?.length > 0 ? (
                <div className="space-y-2">
                  {meal.foods.map((mf: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent transition-all">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <Apple className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">{mf.food?.name ?? mf.name}</div>
                        <div className="text-xs text-muted-foreground">{mf.quantity}{mf.unit}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{mf.calories} kcal</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">Nenhum alimento cadastrado</p>
              )}
              {meal.notes && (
                <div className="mt-3 glass rounded-xl p-3 text-xs text-muted-foreground">{meal.notes}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Emoji selection card ──────────────────────────────────────────────────────

function EmojiCard({ onSelect, onDismiss }: { onSelect: (mood: string) => void; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      className="glass rounded-2xl p-5 border border-primary/15"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-sm">Como foi essa refeição?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Selecione como você se sentiu</p>
        </div>
        <button onClick={onDismiss} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {MOODS.map((m) => (
          <button
            key={m.value}
            onClick={() => onSelect(m.value)}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl glass hover:bg-accent border border-transparent hover:border-primary/20 transition-all group"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform">{m.emoji}</span>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{m.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── WhatsApp icon ─────────────────────────────────────────────────────────────

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ── Diary card ────────────────────────────────────────────────────────────────

function DiaryCard({ mood, meal, isPending, onSave, onSkip }: {
  mood: string; meal: any; isPending: boolean;
  onSave: (photoUrl?: string, notes?: string) => void;
  onSkip: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const moodObj = MOODS.find((m) => m.value === mood);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/uploads/progress-photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = (r.data?.data ?? r.data)?.url ?? (r.data?.data ?? r.data)?.secure_url;
      setPhotoUrl(url);
      setPreview(URL.createObjectURL(file));
      toast.success('Foto carregada!');
    } catch {
      toast.error('Erro ao enviar foto');
    }
    setUploading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      className="glass rounded-2xl p-5 border border-primary/15 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">Diário Alimentar</p>
          <p className="text-xs text-muted-foreground">
            {moodObj?.emoji} {moodObj?.label} • {meal?.name || MEAL_LABELS[meal?.type] || 'Refeição'}
          </p>
        </div>
      </div>

      {/* Photo upload */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Foto da refeição (opcional)</p>
        {preview ? (
          <div className="relative w-full h-40 rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
            <button
              onClick={() => { setPreview(''); setPhotoUrl(''); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-all"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full h-28 rounded-xl border border-dashed border-white/15 hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            {uploading
              ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              : <Camera className="w-5 h-5 text-muted-foreground" />}
            <span className="text-xs text-muted-foreground">{uploading ? 'Enviando...' : 'Tirar ou escolher foto'}</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      </div>

      {/* Notes */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Observações (opcional)</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Como se sentiu, o que comeu a mais ou a menos..."
          rows={2}
          className="input-field w-full text-sm resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onSkip} disabled={isPending} className="btn-secondary flex-1 text-sm py-2.5">
          Pular
        </button>
        <button
          onClick={() => onSave(photoUrl || undefined, notes || undefined)}
          disabled={isPending || uploading}
          className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isPending ? 'Salvando...' : 'Salvar diário'}
        </button>
      </div>
    </motion.div>
  );
}
