'use client';

// Editor de refeição compartilhado entre "Nova Dieta" e o detalhe da dieta —
// antes só o detalhe tinha a busca de alimento/quantidade/horário; criar uma
// dieta nova mostrava só o tipo da refeição e um campo de observação, sem
// nenhuma forma de montar o cardápio de fato. Agora as duas telas usam o
// mesmo <MealCard>, com o mesmo recurso (inclusive dia da semana, que também
// não existia em lugar nenhum).

import { useEffect, useRef, useState } from 'react';
import { Clock, Search, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Café da manhã' },
  { value: 'MORNING_SNACK', label: 'Lanche da manhã' },
  { value: 'LUNCH', label: 'Almoço' },
  { value: 'AFTERNOON_SNACK', label: 'Lanche da tarde' },
  { value: 'PRE_WORKOUT', label: 'Pré-treino' },
  { value: 'POST_WORKOUT', label: 'Pós-treino' },
  { value: 'DINNER', label: 'Jantar' },
  { value: 'EVENING_SNACK', label: 'Ceia' },
];
export const MEAL_LABELS: Record<string, string> = Object.fromEntries(MEAL_TYPES.map((t) => [t.value, t.label]));

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface FoodItem {
  foodId: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // referência por 100 unidades (pra recalcular quando a quantidade muda)
  _cal100: number;
  _prot100: number;
  _carb100: number;
  _fat100: number;
}

export interface MealRow {
  type: string;
  name: string;
  time: string;
  notes: string;
  dayOfWeek: number[]; // vazio = todos os dias
  foods: FoodItem[];
}

export const emptyMeal = (type = 'BREAKFAST'): MealRow => ({
  type,
  name: MEAL_LABELS[type] || type,
  time: '',
  notes: '',
  dayOfWeek: [],
  foods: [],
});

export function calcMealMacros(foods: FoodItem[]) {
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

export function calcFoodMacros(food: any, qty: number) {
  const factor = qty / (food.portion ?? 100);
  return {
    calories: Math.round(food.calories * factor * 10) / 10,
    protein: Math.round(food.protein * factor * 10) / 10,
    carbs: Math.round(food.carbs * factor * 10) / 10,
    fat: Math.round(food.fat * factor * 10) / 10,
  };
}

// ── Busca de alimento (TACO + próprios) ─────────────────────────────────────
function FoodSearch({ onAdd }: { onAdd: (item: FoodItem) => void }) {
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
          <button type="button" onClick={handleAdd} className="btn-primary px-3 py-2 text-xs">
            Adicionar
          </button>
          <button
            type="button"
            onClick={() => { setSelected(null); setQuery(''); }}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Cartão de refeição completo (tipo, horário, dias, alimentos, notas) ─────
export function MealCard({
  meal,
  onChange,
  onRemove,
  canRemove = true,
}: {
  meal: MealRow;
  onChange: (updated: MealRow) => void;
  onRemove: () => void;
  canRemove?: boolean;
}) {
  const totals = calcMealMacros(meal.foods);

  const toggleDay = (d: number) => {
    const days = meal.dayOfWeek.includes(d)
      ? meal.dayOfWeek.filter((x) => x !== d)
      : [...meal.dayOfWeek, d].sort();
    onChange({ ...meal, dayOfWeek: days });
  };

  const addFood = (item: FoodItem) => onChange({ ...meal, foods: [...meal.foods, item] });
  const removeFood = (idx: number) => onChange({ ...meal, foods: meal.foods.filter((_, i) => i !== idx) });
  const updateFoodQty = (idx: number, qty: number) => {
    const foods = meal.foods.map((f, i) => {
      if (i !== idx) return f;
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
    onChange({ ...meal, foods });
  };

  return (
    <div className="glass rounded-xl p-4 space-y-4 border border-white/5">
      {/* Tipo + horário + remover */}
      <div className="flex items-center gap-2">
        <select
          value={meal.type}
          onChange={(e) => onChange({ ...meal, type: e.target.value, name: MEAL_LABELS[e.target.value] || e.target.value })}
          className="input-field flex-1 text-sm font-medium"
        >
          {MEAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <div className="relative w-28 flex-shrink-0">
          <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={meal.time}
            onChange={(e) => onChange({ ...meal, time: e.target.value })}
            placeholder="08:00"
            className="input-field pl-8 text-sm"
          />
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="w-9 h-9 rounded-xl hover:bg-red-500/10 flex items-center justify-center text-red-400 flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dias da semana */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Dias da semana</span>
          {meal.dayOfWeek.length > 0 && (
            <button type="button" onClick={() => onChange({ ...meal, dayOfWeek: [] })} className="text-[10px] text-primary hover:underline">
              Todos os dias
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {WEEKDAYS_SHORT.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={cn(
                'flex-1 h-8 rounded-lg text-[11px] font-medium transition-all border',
                meal.dayOfWeek.length === 0 || meal.dayOfWeek.includes(i)
                  ? 'bg-primary/15 border-primary/30 text-primary'
                  : 'border-transparent text-muted-foreground/50 hover:bg-white/5',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Totais da refeição (dos alimentos) */}
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

      {/* Lista de alimentos */}
      {meal.foods.length > 0 && (
        <div className="space-y-1.5">
          {meal.foods.map((food, idx) => (
            <div key={idx} className="flex items-center gap-2 glass rounded-lg px-3 py-2">
              <span className="text-sm flex-1 font-medium">{food.name}</span>
              <input
                type="number"
                value={food.quantity}
                onChange={(e) => updateFoodQty(idx, parseFloat(e.target.value) || 0)}
                min={1}
                className="w-16 bg-transparent border border-white/10 rounded-lg text-center text-sm py-1 focus:outline-none focus:border-white/30"
              />
              <span className="text-xs text-muted-foreground w-4">{food.unit}</span>
              <span className="text-xs text-muted-foreground min-w-[80px] text-right">
                {food.calories}kcal · {food.protein}g P
              </span>
              <button
                type="button"
                onClick={() => removeFood(idx)}
                className="w-6 h-6 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <FoodSearch onAdd={addFood} />

      <input
        type="text"
        value={meal.notes}
        onChange={(e) => onChange({ ...meal, notes: e.target.value })}
        placeholder="Observações (ex: sem glúten, preferência...)"
        className="input-field text-sm"
      />
    </div>
  );
}
