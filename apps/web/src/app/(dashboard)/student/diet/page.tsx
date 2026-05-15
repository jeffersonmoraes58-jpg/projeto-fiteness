'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Apple, Droplets, Plus, ChevronDown, ChevronUp,
  Coffee, Sun, UtensilsCrossed, Moon, Zap, CheckCircle2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const MEAL_ICONS: Record<string, any> = {
  BREAKFAST: Coffee,
  MORNING_SNACK: Apple,
  LUNCH: Sun,
  AFTERNOON_SNACK: Apple,
  DINNER: Moon,
  EVENING_SNACK: Moon,
  PRE_WORKOUT: Zap,
  POST_WORKOUT: Zap,
};

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: 'Café da manhã',
  MORNING_SNACK: 'Lanche da manhã',
  LUNCH: 'Almoço',
  AFTERNOON_SNACK: 'Lanche da tarde',
  DINNER: 'Jantar',
  EVENING_SNACK: 'Ceia',
  PRE_WORKOUT: 'Pré-treino',
  POST_WORKOUT: 'Pós-treino',
};

const WATER_AMOUNTS = [150, 200, 300, 500];

export default function StudentDiet() {
  const [expandedMeal, setExpandedMeal] = useState<string | null>('BREAKFAST');
  const [showWaterPicker, setShowWaterPicker] = useState(false);
  const queryClient = useQueryClient();

  const { data: dietPlan } = useQuery({
    queryKey: ['student-diet-plan'],
    queryFn: () => api.get('/students/me/diet').then((r) => r.data.data),
  });

  const { data: waterData } = useQuery({
    queryKey: ['student-water-today'],
    queryFn: () => api.get('/students/me/water/today').then((r) => r.data.data),
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

  const todayLog: any = null;
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Minha Dieta</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {dietPlan?.diet?.name || 'Plano alimentar do dia'}
        </p>
      </div>

      {/* Calorie summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
      >
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
                cx="50" cy="50" r="40"
                fill="none"
                stroke="url(#dietGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={251.2}
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 - (Math.min(consumedCalories / totalCalories, 1) * 251.2) }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="dietGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
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

        {/* Macros */}
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
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full bg-gradient-to-r ${m.color} rounded-full`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Water */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Hidratação</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {waterTotal} ml de {waterGoal} ml
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
              <motion.div
                key={waterTotal}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((waterTotal / waterGoal) * 100, 100)}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
              />
            </div>
          </div>
          <button
            onClick={() => setShowWaterPicker((v) => !v)}
            className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center hover:bg-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
          </button>
        </div>

        <AnimatePresence>
          {showWaterPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-3">Quanto você bebeu?</p>
                <div className="grid grid-cols-4 gap-2">
                  {WATER_AMOUNTS.map((ml) => (
                    <button
                      key={ml}
                      onClick={() => waterMutation.mutate(ml)}
                      disabled={waterMutation.isPending}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 transition-all disabled:opacity-60"
                    >
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
        {(dietPlan?.diet?.meals || [...Array(4)]).map((meal: any, i: number) => (
          <MealCard
            key={meal?.id || i}
            meal={meal}
            index={i}
            isExpanded={expandedMeal === (meal?.type || String(i))}
            onToggle={() => setExpandedMeal(
              expandedMeal === (meal?.type || String(i)) ? null : (meal?.type || String(i))
            )}
          />
        ))}
      </div>
    </div>
  );
}

function MealCard({ meal, index, isExpanded, onToggle }: {
  meal: any;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
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
    'from-yellow-500 to-orange-500',
    'from-emerald-500 to-teal-500',
    'from-blue-500 to-indigo-500',
    'from-purple-500 to-pink-500',
    'from-red-500 to-rose-500',
    'from-cyan-500 to-blue-500',
    'from-orange-500 to-red-500',
    'from-green-500 to-emerald-500',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card !p-0 overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-all text-left"
      >
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconColors[index % iconColors.length]} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{label}</span>
            {meal.time && (
              <span className="text-xs text-muted-foreground">{meal.time}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {meal.calories ? `${meal.calories} kcal` : '—'} •
            P: {meal.protein ?? 0}g C: {meal.carbs ?? 0}g G: {meal.fat ?? 0}g
          </div>
        </div>
        <CheckCircle2 className="w-4 h-4 text-muted-foreground/30 mr-1" />
        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50"
          >
            <div className="p-4">
              {meal.foods?.length > 0 ? (
                <div className="space-y-2">
                  {meal.foods.map((mf: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent transition-all">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <Apple className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">{mf.food?.name}</div>
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
                <div className="mt-3 glass rounded-xl p-3 text-xs text-muted-foreground">
                  {meal.notes}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
