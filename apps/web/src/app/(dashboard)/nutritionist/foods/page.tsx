'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Flame, Beef, Wheat, Droplets,
  Leaf, X, Pencil, Trash2, Check, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'todos', label: 'Todos' },
  { value: 'proteinas', label: 'Proteínas' },
  { value: 'carboidratos', label: 'Carboidratos' },
  { value: 'gorduras', label: 'Gorduras' },
  { value: 'frutas', label: 'Frutas' },
  { value: 'vegetais', label: 'Vegetais' },
  { value: 'laticinios', label: 'Laticínios' },
  { value: 'outros', label: 'Outros' },
];

const CAT_COLORS: Record<string, string> = {
  proteinas: 'bg-red-500/10 text-red-400 border-red-500/20',
  carboidratos: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  gorduras: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  frutas: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  vegetais: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  laticinios: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  outros: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const emptyForm = () => ({
  name: '', brand: '', category: 'proteinas',
  calories: '', protein: '', carbs: '', fat: '', fiber: '',
  portion: '100', portionUnit: 'g',
});

type FormState = ReturnType<typeof emptyForm>;

function FoodForm({
  initial,
  onSave,
  onCancel,
  isPending,
  title,
}: {
  initial: FormState;
  onSave: (data: FormState) => void;
  onCancel: () => void;
  isPending: boolean;
  title: string;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="glass-card border border-primary/20"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">{title}</h2>
        <button onClick={onCancel} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <input
          placeholder="Nome do alimento *"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="input-field col-span-2"
        />
        <input
          placeholder="Marca (opcional)"
          value={form.brand}
          onChange={(e) => set('brand', e.target.value)}
          className="input-field"
        />
        <select
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          className="input-field bg-background"
        >
          {CATEGORIES.filter((c) => c.value !== 'todos').map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            placeholder="Porção"
            value={form.portion}
            onChange={(e) => set('portion', e.target.value)}
            className="input-field flex-1"
            type="number"
          />
          <select
            value={form.portionUnit}
            onChange={(e) => set('portionUnit', e.target.value)}
            className="input-field w-20 bg-background"
          >
            <option>g</option><option>ml</option><option>un</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {([
          { label: 'Calorias (kcal) *', field: 'calories' as const },
          { label: 'Proteína (g) *', field: 'protein' as const },
          { label: 'Carboidratos (g) *', field: 'carbs' as const },
          { label: 'Gordura (g) *', field: 'fat' as const },
          { label: 'Fibra (g)', field: 'fiber' as const },
        ]).map(({ label, field }) => (
          <input
            key={field}
            placeholder={label}
            value={form[field]}
            onChange={(e) => set(field, e.target.value)}
            className="input-field"
            type="number"
          />
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-secondary flex-1 text-sm py-2">Cancelar</button>
        <button
          disabled={!form.name || !form.calories || isPending}
          onClick={() => onSave(form)}
          className="btn-primary flex-1 text-sm py-2"
        >
          {isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </motion.div>
  );
}

// ── Group foods by category ───────────────────────────────────────────────────

function groupByCategory(foods: any[]) {
  const order = CATEGORIES.filter((c) => c.value !== 'todos').map((c) => c.value);
  const groups: Record<string, any[]> = {};
  for (const cat of order) groups[cat] = [];
  for (const f of foods) {
    const key = groups[f.category] ? f.category : 'outros';
    groups[key].push(f);
  }
  return order.map((cat) => ({ cat, label: CATEGORIES.find((c) => c.value === cat)!.label, foods: groups[cat] })).filter((g) => g.foods.length > 0);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NutritionistFoodsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todos');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (cat: string) =>
    setCollapsedGroups((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const { data: foods = [], isLoading } = useQuery<any[]>({
    queryKey: ['foods-database', search, category],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category !== 'todos') params.set('category', category);
      return api.get(`/nutritionists/me/foods?${params}`).then((r) => r.data?.data ?? r.data ?? []);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormState) =>
      api.post('/nutritionists/me/foods', {
        name: data.name,
        brand: data.brand || undefined,
        category: data.category,
        portion: Number(data.portion),
        portionUnit: data.portionUnit,
        calories: Number(data.calories),
        protein: Number(data.protein),
        carbs: Number(data.carbs),
        fat: Number(data.fat),
        fiber: data.fiber ? Number(data.fiber) : undefined,
        isPublic: false,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['foods-database'] });
      setShowAddForm(false);
      toast.success('Alimento criado!');
    },
    onError: () => toast.error('Erro ao criar alimento'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) =>
      api.patch(`/nutritionists/me/foods/${id}`, {
        name: data.name,
        brand: data.brand || undefined,
        category: data.category,
        portion: Number(data.portion),
        portionUnit: data.portionUnit,
        calories: Number(data.calories),
        protein: Number(data.protein),
        carbs: Number(data.carbs),
        fat: Number(data.fat),
        fiber: data.fiber ? Number(data.fiber) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['foods-database'] });
      setEditingId(null);
      toast.success('Alimento atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar alimento'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/nutritionists/me/foods/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['foods-database'] });
      setConfirmDeleteId(null);
      toast.success('Alimento excluído!');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || 'Erro ao excluir';
      toast.error(msg);
      setConfirmDeleteId(null);
    },
  });

  const groups = category === 'todos' && !search ? groupByCategory(foods) : null;

  const tableHeader = (
    <div className="grid grid-cols-[1fr_80px_68px_68px_68px_68px_88px] gap-0 px-4 py-3 border-b border-border/50 text-xs text-muted-foreground font-medium">
      <span>Alimento</span>
      <span className="text-center">Porção</span>
      <span className="text-center flex items-center justify-center gap-1"><Flame className="w-3 h-3 text-orange-400" />Kcal</span>
      <span className="text-center flex items-center justify-center gap-1"><Beef className="w-3 h-3 text-red-400" />Prot</span>
      <span className="text-center flex items-center justify-center gap-1"><Wheat className="w-3 h-3 text-yellow-400" />Carb</span>
      <span className="text-center flex items-center justify-center gap-1"><Droplets className="w-3 h-3 text-blue-400" />Gord</span>
      <span className="text-center">Ações</span>
    </div>
  );

  const FoodRow = ({ food, i }: { food: any; i: number }) => {
    if (editingId === food.id) {
      return (
        <div key={food.id} className="px-3 py-3 border-b border-border/30">
          <FoodForm
            title="Editar Alimento"
            initial={{
              name: food.name,
              brand: food.brand ?? '',
              category: food.category ?? 'outros',
              calories: String(food.calories),
              protein: String(food.protein),
              carbs: String(food.carbs),
              fat: String(food.fat),
              fiber: food.fiber ? String(food.fiber) : '',
              portion: String(food.portion),
              portionUnit: food.portionUnit ?? 'g',
            }}
            onSave={(data) => updateMutation.mutate({ id: food.id, data })}
            onCancel={() => setEditingId(null)}
            isPending={updateMutation.isPending}
          />
        </div>
      );
    }

    return (
      <motion.div
        key={food.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: i * 0.02 }}
        className="grid grid-cols-[1fr_80px_68px_68px_68px_68px_88px] gap-0 px-4 py-3 hover:bg-accent/50 transition-all text-sm items-center border-b border-border/30 last:border-0"
      >
        <div className="min-w-0 pr-2">
          <div className="font-medium truncate flex items-center gap-2">
            {food.name}
            {!food.nutritionistId && <Leaf className="w-3 h-3 text-emerald-400 flex-shrink-0" aria-label="Alimento público" />}
          </div>
          {food.brand && <div className="text-xs text-muted-foreground truncate">{food.brand}</div>}
        </div>
        <div className="text-center text-xs text-muted-foreground">{food.portion}{food.portionUnit}</div>
        <div className="text-center font-medium">{food.calories}</div>
        <div className="text-center text-muted-foreground">{food.protein}g</div>
        <div className="text-center text-muted-foreground">{food.carbs}g</div>
        <div className="text-center text-muted-foreground">{food.fat}g</div>
        <div className="flex items-center justify-center gap-1">
          {food.nutritionistId ? (
            <>
              <button
                onClick={() => { setEditingId(food.id); setConfirmDeleteId(null); }}
                className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                title="Editar"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {confirmDeleteId === food.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => deleteMutation.mutate(food.id)}
                    disabled={deleteMutation.isPending}
                    className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-400 transition-all"
                    title="Confirmar exclusão"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground transition-all"
                    title="Cancelar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setConfirmDeleteId(food.id); setEditingId(null); }}
                  className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-all"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground px-1">público</span>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Banco de Alimentos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {foods.length} alimentos cadastrados
          </p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}
          className="btn-primary flex items-center gap-2 text-sm py-2"
        >
          <Plus className="w-4 h-4" />
          Novo alimento
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <FoodForm
            title="Novo Alimento"
            initial={emptyForm()}
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setShowAddForm(false)}
            isPending={createMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Search & category tabs */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar alimento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all border',
                category === cat.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'glass border-transparent hover:bg-accent',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Foods — grouped when "Todos" without search, flat otherwise */}
      {isLoading ? (
        <div className="glass-card !p-0 overflow-hidden">
          {tableHeader}
          <div className="divide-y divide-border/30">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_68px_68px_68px_68px_88px] gap-0 px-4 py-3 animate-pulse">
                <div className="h-3 bg-white/10 rounded w-2/3" />
                {[...Array(6)].map((__, j) => <div key={j} className="h-3 bg-white/5 rounded mx-auto w-10" />)}
              </div>
            ))}
          </div>
        </div>
      ) : groups ? (
        <div className="space-y-4">
          {groups.map(({ cat, label, foods: catFoods }) => (
            <div key={cat} className="glass-card !p-0 overflow-hidden">
              <button
                onClick={() => toggleGroup(cat)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-border/50 hover:bg-accent/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', CAT_COLORS[cat] ?? CAT_COLORS.outros)}>
                    {label}
                  </span>
                  <span className="text-sm text-muted-foreground">{catFoods.length} alimentos</span>
                </div>
                {collapsedGroups[cat]
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
              </button>
              <AnimatePresence initial={false}>
                {!collapsedGroups[cat] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-[1fr_80px_68px_68px_68px_68px_88px] gap-0 px-4 py-2 text-xs text-muted-foreground font-medium border-b border-border/30 bg-white/2">
                      <span>Alimento</span>
                      <span className="text-center">Porção</span>
                      <span className="text-center">Kcal</span>
                      <span className="text-center">Prot</span>
                      <span className="text-center">Carb</span>
                      <span className="text-center">Gord</span>
                      <span className="text-center">Ações</span>
                    </div>
                    {catFoods.map((food: any, i: number) => (
                      <FoodRow key={food.id} food={food} i={i} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card !p-0 overflow-hidden">
          {tableHeader}
          <div>
            {foods.length > 0 ? (
              foods.map((food: any, i: number) => <FoodRow key={food.id} food={food} i={i} />)
            ) : (
              <div className="py-16 text-center">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum alimento encontrado</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
