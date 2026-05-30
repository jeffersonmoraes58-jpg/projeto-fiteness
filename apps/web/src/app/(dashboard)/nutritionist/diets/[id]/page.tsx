'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Apple, ChevronLeft, Flame, Beef, Wheat, Droplets, Users, UserCheck,
  Plus, Trash2, Save, CheckCircle, Clock, Search, X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Café da manhã' },
  { value: 'MORNING_SNACK', label: 'Lanche da manhã' },
  { value: 'LUNCH', label: 'Almoço' },
  { value: 'AFTERNOON_SNACK', label: 'Lanche da tarde' },
  { value: 'DINNER', label: 'Jantar' },
  { value: 'EVENING_SNACK', label: 'Ceia' },
  { value: 'PRE_WORKOUT', label: 'Pré-treino' },
  { value: 'POST_WORKOUT', label: 'Pós-treino' },
];
const MEAL_LABELS: Record<string, string> = Object.fromEntries(MEAL_TYPES.map((t) => [t.value, t.label]));

interface FoodItem {
  foodId: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // per 100g reference
  _cal100: number;
  _prot100: number;
  _carb100: number;
  _fat100: number;
}

interface MealRow {
  type: string;
  name: string;
  time: string;
  notes: string;
  foods: FoodItem[];
}

const emptyMeal = (): MealRow => ({
  type: 'BREAKFAST',
  name: 'Café da manhã',
  time: '',
  notes: '',
  foods: [],
});

function calcMealMacros(foods: FoodItem[]) {
  return foods.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories,
      protein: acc.protein + f.protein,
      carbs: acc.carbs + f.carbs,
      fat: acc.fat + f.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function calcFoodMacros(food: any, qty: number) {
  const factor = qty / (food.portion ?? 100);
  return {
    calories: Math.round(food.calories * factor * 10) / 10,
    protein: Math.round(food.protein * factor * 10) / 10,
    carbs: Math.round(food.carbs * factor * 10) / 10,
    fat: Math.round(food.fat * factor * 10) / 10,
  };
}

// ── Food search per meal ───────────────────────────────────────────────────────

function FoodSearch({ mealIdx, onAdd }: { mealIdx: number; onAdd: (item: FoodItem) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [qty, setQty] = useState('100');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.get(`/nutritionists/me/foods?search=${encodeURIComponent(query)}`);
        setResults(r.data?.data ?? r.data ?? []);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleAdd = () => {
    if (!selected || !qty) return;
    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) return;
    const macros = calcFoodMacros(selected, qtyNum);
    onAdd({
      foodId: selected.id,
      name: selected.name,
      quantity: qtyNum,
      unit: selected.portionUnit ?? 'g',
      ...macros,
      _cal100: selected.calories,
      _prot100: selected.protein,
      _carb100: selected.carbs,
      _fat100: selected.fat,
    });
    setQuery('');
    setResults([]);
    setSelected(null);
    setQty('100');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {!selected ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar alimento..."
            className="input-field pl-9 text-sm w-full"
          />
          {open && (query.length >= 2) && (
            <div className="absolute z-50 top-full mt-1 w-full glass rounded-xl border border-white/10 shadow-xl max-h-48 overflow-y-auto">
              {loading && <div className="px-4 py-3 text-sm text-muted-foreground">Buscando...</div>}
              {!loading && results.length === 0 && <div className="px-4 py-3 text-sm text-muted-foreground">Nenhum resultado</div>}
              {results.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setSelected(f); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors text-sm flex justify-between items-center"
                >
                  <span>{f.name}</span>
                  <span className="text-xs text-muted-foreground">{f.calories} kcal/100{f.portionUnit ?? 'g'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 glass rounded-xl px-3 py-2 text-sm">
            <span className="font-medium">{selected.name}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              {calcFoodMacros(selected, parseFloat(qty) || 100).calories} kcal · {calcFoodMacros(selected, parseFloat(qty) || 100).protein}g prot
            </span>
          </div>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            min={1}
            className="input-field w-20 text-sm text-center"
            placeholder="100"
          />
          <span className="text-xs text-muted-foreground">{selected.portionUnit ?? 'g'}</span>
          <button
            type="button"
            onClick={handleAdd}
            className="btn-primary px-3 py-2 text-xs"
          >
            Adicionar
          </button>
          <button
            type="button"
            onClick={() => { setSelected(null); setQuery(''); }}
            className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DietDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();

  const [meals, setMeals] = useState<MealRow[]>([]);
  const [mealsLoaded, setMealsLoaded] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [assignError, setAssignError] = useState('');
  const [saveMealSuccess, setSaveMealSuccess] = useState(false);

  const { data: diet, isLoading } = useQuery({
    queryKey: ['diet', id],
    queryFn: () =>
      api.get(`/diets/${id}`).then((r) => {
        const d = r.data?.data ?? r.data;
        if (!mealsLoaded) {
          setMeals(
            (d.meals || []).map((m: any) => ({
              type: m.type,
              name: m.name || MEAL_LABELS[m.type] || m.type,
              time: m.time || '',
              notes: m.notes || '',
              foods: (m.foods || []).map((f: any) => ({
                foodId: f.foodId ?? f.id,
                name: f.food?.name ?? f.name ?? '',
                quantity: f.quantity,
                unit: f.unit ?? 'g',
                calories: f.calories,
                protein: f.protein,
                carbs: f.carbs,
                fat: f.fat,
                _cal100: f.food?.calories ?? f.calories,
                _prot100: f.food?.protein ?? f.protein,
                _carb100: f.food?.carbs ?? f.carbs,
                _fat100: f.food?.fat ?? f.fat,
              })),
            })),
          );
          setMealsLoaded(true);
        }
        return d;
      }),
  });

  const { data: patients } = useQuery({
    queryKey: ['nutritionist-patients'],
    queryFn: () => api.get('/nutritionists/me/patients').then((r) => r.data?.data ?? r.data ?? []),
  });

  // diet totals from all meals
  const dietTotals = meals.reduce(
    (acc, m) => {
      const t = calcMealMacros(m.foods);
      return {
        calories: acc.calories + t.calories,
        protein: acc.protein + t.protein,
        carbs: acc.carbs + t.carbs,
        fat: acc.fat + t.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const saveMealsMutation = useMutation({
    mutationFn: (rows: MealRow[]) => {
      const totals = rows.reduce(
        (acc, m) => {
          const t = calcMealMacros(m.foods);
          return { calories: acc.calories + t.calories, protein: acc.protein + t.protein, carbs: acc.carbs + t.carbs, fat: acc.fat + t.fat };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );
      return api.patch(`/diets/${id}`, {
        totalCalories: Math.round(totals.calories),
        totalProtein: Math.round(totals.protein * 10) / 10,
        totalCarbs: Math.round(totals.carbs * 10) / 10,
        totalFat: Math.round(totals.fat * 10) / 10,
        meals: rows.map((m) => {
          const t = calcMealMacros(m.foods);
          return {
            type: m.type,
            name: m.name || MEAL_LABELS[m.type] || m.type,
            time: m.time || null,
            calories: Math.round(t.calories) || null,
            protein: Math.round(t.protein * 10) / 10 || null,
            carbs: Math.round(t.carbs * 10) / 10 || null,
            fat: Math.round(t.fat * 10) / 10 || null,
            notes: m.notes || null,
            foods: m.foods.map((f) => ({
              foodId: f.foodId,
              quantity: f.quantity,
              unit: f.unit,
              calories: f.calories,
              protein: f.protein,
              carbs: f.carbs,
              fat: f.fat,
            })),
          };
        }),
      });
    },
    onSuccess: () => {
      setSaveMealSuccess(true);
      qc.invalidateQueries({ queryKey: ['diet', id] });
      toast.success('Dieta salva!');
      setTimeout(() => setSaveMealSuccess(false), 3000);
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao salvar'));
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => api.patch(`/diets/${id}`, { status: 'ACTIVE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['diet', id] }); toast.success('Dieta ativada!'); },
  });

  const assignMutation = useMutation({
    mutationFn: (data: any) => api.post(`/diets/${id}/assign`, data),
    onSuccess: () => {
      setSelectedPatient('');
      setAssignError('');
      qc.invalidateQueries({ queryKey: ['diet', id] });
      toast.success('Dieta atribuída!');
    },
    onError: (e: any) => {
      const msg = e.message || e.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao atribuir');
      setAssignError(text);
      toast.error(text);
    },
  });

  const addMeal = () => setMeals((prev) => [...prev, emptyMeal()]);
  const removeMeal = (idx: number) => setMeals((prev) => prev.filter((_, i) => i !== idx));
  const updateMeal = (idx: number, field: keyof Omit<MealRow, 'foods'>, value: string) =>
    setMeals((prev) => prev.map((m, i) => {
      if (i !== idx) return m;
      const updated = { ...m, [field]: value };
      if (field === 'type') updated.name = MEAL_LABELS[value] || value;
      return updated;
    }));

  const addFoodToMeal = (mealIdx: number, item: FoodItem) =>
    setMeals((prev) => prev.map((m, i) => i === mealIdx ? { ...m, foods: [...m.foods, item] } : m));

  const removeFoodFromMeal = (mealIdx: number, foodIdx: number) =>
    setMeals((prev) => prev.map((m, i) => i === mealIdx ? { ...m, foods: m.foods.filter((_, fi) => fi !== foodIdx) } : m));

  const updateFoodQty = (mealIdx: number, foodIdx: number, qty: number) =>
    setMeals((prev) => prev.map((m, i) => {
      if (i !== mealIdx) return m;
      const foods = m.foods.map((f, fi) => {
        if (fi !== foodIdx) return f;
        const factor = qty / 100;
        return {
          ...f,
          quantity: qty,
          calories: Math.round(f._cal100 * factor * 10) / 10,
          protein: Math.round(f._prot100 * factor * 10) / 10,
          carbs: Math.round(f._carb100 * factor * 10) / 10,
          fat: Math.round(f._fat100 * factor * 10) / 10,
        };
      });
      return { ...m, foods };
    }));

  if (isLoading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="glass-card animate-pulse h-24" />)}
    </div>
  );

  if (!diet) return (
    <div className="max-w-2xl mx-auto glass-card flex flex-col items-center justify-center py-16 text-center">
      <Apple className="w-12 h-12 text-muted-foreground mb-4" />
      <h2 className="font-semibold mb-2">Dieta não encontrada</h2>
      <Link href="/nutritionist/diets" className="btn-secondary text-sm">Voltar</Link>
    </div>
  );

  const STATUS: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Rascunho', color: 'bg-yellow-500/10 text-yellow-400' },
    ACTIVE: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400' },
    ARCHIVED: { label: 'Arquivado', color: 'bg-muted text-muted-foreground' },
  };
  const status = STATUS[diet.status] || STATUS.DRAFT;
  const hasFoods = meals.some((m) => m.foods.length > 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/nutritionist/diets" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{diet.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
            {diet.status === 'DRAFT' && (
              <button
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
                className="text-xs px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition-all disabled:opacity-50"
              >
                {activateMutation.isPending ? 'Ativando...' : 'Ativar dieta'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Macros summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          Totais da Dieta {hasFoods && <span className="text-xs text-emerald-400 font-normal">(calculado dos alimentos)</span>}
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Calorias', value: hasFoods ? Math.round(dietTotals.calories) : (diet.totalCalories ?? 0), unit: 'kcal', color: 'text-orange-400', Icon: Flame },
            { label: 'Proteína', value: hasFoods ? dietTotals.protein : (diet.totalProtein ?? 0), unit: 'g', color: 'text-red-400', Icon: Beef },
            { label: 'Carboidratos', value: hasFoods ? dietTotals.carbs : (diet.totalCarbs ?? 0), unit: 'g', color: 'text-yellow-400', Icon: Wheat },
            { label: 'Gordura', value: hasFoods ? dietTotals.fat : (diet.totalFat ?? 0), unit: 'g', color: 'text-blue-400', Icon: Droplets },
          ].map((m) => (
            <div key={m.label} className="glass rounded-xl p-3 text-center">
              <m.Icon className={`w-5 h-5 ${m.color} mx-auto mb-1`} />
              <div className="font-bold text-sm">{m.value}{m.unit}</div>
              <div className="text-[10px] text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Meal editor */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Apple className="w-4 h-4 text-emerald-400" />
            Refeições ({meals.length})
          </h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={addMeal} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Adicionar refeição
            </button>
            <button
              onClick={() => saveMealsMutation.mutate(meals)}
              disabled={saveMealsMutation.isPending}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
            >
              {saveMealSuccess ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saveMealsMutation.isPending ? 'Salvando...' : saveMealSuccess ? 'Salvo!' : 'Salvar dieta'}
            </button>
          </div>
        </div>

        {meals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Clique em "Adicionar refeição" para começar
          </p>
        ) : (
          <div className="space-y-5">
            {meals.map((meal, mealIdx) => {
              const totals = calcMealMacros(meal.foods);
              return (
                <div key={mealIdx} className="glass rounded-xl p-4 space-y-4 border border-white/5">

                  {/* Meal header */}
                  <div className="flex items-center gap-2">
                    <select
                      value={meal.type}
                      onChange={(e) => updateMeal(mealIdx, 'type', e.target.value)}
                      className="input-field flex-1 text-sm font-medium"
                    >
                      {MEAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <div className="relative w-28 flex-shrink-0">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={meal.time}
                        onChange={(e) => updateMeal(mealIdx, 'time', e.target.value)}
                        placeholder="08:00"
                        className="input-field pl-8 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMeal(mealIdx)}
                      className="w-9 h-9 rounded-xl hover:bg-red-500/10 flex items-center justify-center text-red-400 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Meal macro totals (from foods) */}
                  {meal.foods.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: 'Calorias', value: Math.round(totals.calories), unit: 'kcal', color: 'text-orange-400' },
                        { label: 'Prot.', value: totals.protein, unit: 'g', color: 'text-red-400' },
                        { label: 'Carb.', value: totals.carbs, unit: 'g', color: 'text-yellow-400' },
                        { label: 'Gord.', value: totals.fat, unit: 'g', color: 'text-blue-400' },
                      ].map((s) => (
                        <div key={s.label} className="glass rounded-lg py-1.5">
                          <div className={`text-xs font-bold ${s.color}`}>{s.value}{s.unit}</div>
                          <div className="text-[10px] text-muted-foreground">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Food list */}
                  {meal.foods.length > 0 && (
                    <div className="space-y-1.5">
                      {meal.foods.map((food, foodIdx) => (
                        <div key={foodIdx} className="flex items-center gap-2 glass rounded-lg px-3 py-2">
                          <span className="text-sm flex-1 font-medium">{food.name}</span>
                          <input
                            type="number"
                            value={food.quantity}
                            onChange={(e) => updateFoodQty(mealIdx, foodIdx, parseFloat(e.target.value) || 0)}
                            min={1}
                            className="w-16 bg-transparent border border-white/10 rounded-lg text-center text-sm py-1 focus:outline-none focus:border-white/30"
                          />
                          <span className="text-xs text-muted-foreground w-4">{food.unit}</span>
                          <span className="text-xs text-muted-foreground min-w-[80px] text-right">
                            {food.calories}kcal · {food.protein}g P
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFoodFromMeal(mealIdx, foodIdx)}
                            className="w-6 h-6 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Food search */}
                  <FoodSearch mealIdx={mealIdx} onAdd={(item) => addFoodToMeal(mealIdx, item)} />

                  {/* Notes */}
                  <input
                    type="text"
                    value={meal.notes}
                    onChange={(e) => updateMeal(mealIdx, 'notes', e.target.value)}
                    placeholder="Observações (ex: sem glúten, preferência...)"
                    className="input-field text-sm"
                  />
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Description */}
      {diet.description && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card">
          <h2 className="font-semibold mb-2">Descrição</h2>
          <p className="text-sm text-muted-foreground">{diet.description}</p>
        </motion.div>
      )}

      {/* Assign to patient */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={(e) => { e.preventDefault(); if (!selectedPatient) { setAssignError('Selecione um paciente'); return; } setAssignError(''); assignMutation.mutate({ studentUserId: selectedPatient }); }}
        className="glass-card space-y-4"
      >
        <h2 className="font-semibold flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          Atribuir a paciente
        </h2>
        <p className="text-xs text-muted-foreground">A dieta ativa do paciente será substituída por esta.</p>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Paciente *</label>
          <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="input-field">
            <option value="">Selecione um paciente...</option>
            {(patients || []).map((p: any) => (
              <option key={p.userId} value={p.userId}>
                {p.user?.profile?.firstName} {p.user?.profile?.lastName}
              </option>
            ))}
          </select>
        </div>
        {assignError && <div className="glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">{assignError}</div>}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            {diet._count?.plans ?? 0} paciente(s) com esta dieta
          </div>
          <button type="submit" disabled={assignMutation.isPending} className="btn-primary flex items-center gap-2 text-sm py-2 disabled:opacity-50">
            <UserCheck className="w-4 h-4" />
            {assignMutation.isPending ? 'Atribuindo...' : 'Atribuir dieta'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
