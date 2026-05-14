'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plus, Flame, Beef, Wheat, Droplets,
  Leaf, X, Filter,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Todos', 'Proteínas', 'Carboidratos', 'Gorduras', 'Frutas', 'Vegetais', 'Laticínios', 'Personalizados'];

export default function NutritionistFoods() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', brand: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', portion: '100', portionUnit: 'g' });
  const queryClient = useQueryClient();

  const { data: foods, isLoading } = useQuery({
    queryKey: ['foods-database', search],
    queryFn: () => api.get(`/meals/foods?search=${search}`).then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/meals/foods', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods-database'] });
      setShowAddForm(false);
      setForm({ name: '', brand: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', portion: '100', portionUnit: 'g' });
    },
  });

  const filtered = (foods || []).filter((f: any) =>
    f.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Banco de Alimentos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {foods?.length ?? 0} alimentos cadastrados
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary flex items-center gap-2 text-sm py-2"
        >
          <Plus className="w-4 h-4" />
          Novo alimento
        </button>
      </div>

      {/* Add food form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border border-primary/20"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Novo Alimento</h2>
            <button onClick={() => setShowAddForm(false)} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input placeholder="Nome do alimento *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field col-span-2" />
            <input placeholder="Marca (opcional)" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input-field" />
            <div className="flex gap-2">
              <input placeholder="Porção" value={form.portion} onChange={(e) => setForm({ ...form, portion: e.target.value })} className="input-field flex-1" type="number" />
              <select value={form.portionUnit} onChange={(e) => setForm({ ...form, portionUnit: e.target.value })} className="input-field w-20 bg-background">
                <option>g</option><option>ml</option><option>un</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Calorias (kcal) *', field: 'calories' },
              { label: 'Proteína (g) *', field: 'protein' },
              { label: 'Carboidratos (g) *', field: 'carbs' },
              { label: 'Gordura (g) *', field: 'fat' },
              { label: 'Fibra (g)', field: 'fiber' },
            ].map(({ label, field }) => (
              <input
                key={field}
                placeholder={label}
                value={(form as any)[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="input-field"
                type="number"
              />
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddForm(false)} className="btn-secondary flex-1 text-sm py-2">Cancelar</button>
            <button
              disabled={!form.name || !form.calories || createMutation.isPending}
              onClick={() => createMutation.mutate({
                name: form.name,
                brand: form.brand || undefined,
                portion: Number(form.portion),
                portionUnit: form.portionUnit,
                calories: Number(form.calories),
                protein: Number(form.protein),
                carbs: Number(form.carbs),
                fat: Number(form.fat),
                fiber: form.fiber ? Number(form.fiber) : undefined,
                isPublic: false,
              })}
              className="btn-primary flex-1 text-sm py-2"
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar alimento'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Search & category */}
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
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all border',
                category === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'glass border-transparent hover:bg-accent',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Foods table */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_72px_72px_72px_60px] gap-0 px-4 py-3 border-b border-border/50 text-xs text-muted-foreground font-medium">
          <span>Alimento</span>
          <span className="text-center">Porção</span>
          <span className="text-center flex items-center justify-center gap-1"><Flame className="w-3 h-3 text-orange-400" />Kcal</span>
          <span className="text-center flex items-center justify-center gap-1"><Beef className="w-3 h-3 text-red-400" />Prot</span>
          <span className="text-center flex items-center justify-center gap-1"><Wheat className="w-3 h-3 text-yellow-400" />Carb</span>
          <span className="text-center flex items-center justify-center gap-1"><Droplets className="w-3 h-3 text-blue-400" />Gord</span>
        </div>
        <div className="divide-y divide-border/30">
          {isLoading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_72px_72px_72px_60px] gap-0 px-4 py-3 animate-pulse">
                <div className="h-3 bg-white/10 rounded w-2/3" />
                {[...Array(5)].map((__, j) => <div key={j} className="h-3 bg-white/5 rounded mx-auto w-10" />)}
              </div>
            ))
          ) : filtered.length > 0 ? (
            filtered.map((food: any, i: number) => (
              <motion.div
                key={food.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="grid grid-cols-[1fr_80px_72px_72px_72px_60px] gap-0 px-4 py-3 hover:bg-accent/50 transition-all text-sm items-center"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-medium truncate flex items-center gap-2">
                    {food.name}
                    {!food.nutritionistId && <Leaf className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                  </div>
                  {food.brand && <div className="text-xs text-muted-foreground truncate">{food.brand}</div>}
                </div>
                <div className="text-center text-xs text-muted-foreground">{food.portion}{food.portionUnit}</div>
                <div className="text-center font-medium">{food.calories}</div>
                <div className="text-center text-muted-foreground">{food.protein}g</div>
                <div className="text-center text-muted-foreground">{food.carbs}g</div>
                <div className="text-center text-muted-foreground">{food.fat}g</div>
              </motion.div>
            ))
          ) : (
            <div className="py-16 text-center">
              <Filter className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum alimento encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
