'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Apple, ChevronLeft, Plus, Trash2, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Café da manhã' },
  { value: 'MORNING_SNACK', label: 'Lanche da manhã' },
  { value: 'LUNCH', label: 'Almoço' },
  { value: 'AFTERNOON_SNACK', label: 'Lanche da tarde' },
  { value: 'DINNER', label: 'Jantar' },
  { value: 'EVENING_SNACK', label: 'Ceia' },
];

const MEAL_LABEL: Record<string, string> = {
  BREAKFAST: 'Café da manhã',
  MORNING_SNACK: 'Lanche da manhã',
  LUNCH: 'Almoço',
  AFTERNOON_SNACK: 'Lanche da tarde',
  DINNER: 'Jantar',
  EVENING_SNACK: 'Ceia',
  PRE_WORKOUT: 'Pré-treino',
  POST_WORKOUT: 'Pós-treino',
};

export default function NewDietPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [totalCalories, setTotalCalories] = useState('');
  const [meals, setMeals] = useState([{ type: 'BREAKFAST', notes: '' }]);
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/diets', data),
    onSuccess: () => router.push('/nutritionist/diets'),
    onError: (e: any) => setError(e.response?.data?.message || 'Erro ao criar dieta'),
  });

  const addMeal = () => setMeals([...meals, { type: 'LUNCH', notes: '' }]);
  const removeMeal = (i: number) => setMeals(meals.filter((_, idx) => idx !== i));
  const updateMeal = (i: number, field: string, value: string) => {
    setMeals(meals.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Nome é obrigatório'); return; }
    createMutation.mutate({
      name,
      description,
      totalCalories: totalCalories ? Number(totalCalories) : undefined,
      meals: meals.map((m) => ({ ...m, name: MEAL_LABEL[m.type] || m.type })),
      status: 'ACTIVE',
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/nutritionist/diets" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nova Dieta</h1>
          <p className="text-muted-foreground text-sm">Crie um plano alimentar</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Apple className="w-4 h-4 text-emerald-400" />
            Informações gerais
          </h2>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Nome da dieta *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Dieta hipocalórica para emagrecimento"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os objetivos e observações..."
              className="input-field min-h-[80px] resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Total de calorias (kcal)</label>
            <input
              type="number"
              value={totalCalories}
              onChange={(e) => setTotalCalories(e.target.value)}
              placeholder="Ex: 2000"
              className="input-field"
              min={0}
            />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Refeições</h2>
            <button type="button" onClick={addMeal} className="btn-secondary flex items-center gap-2 text-sm py-1.5">
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </button>
          </div>

          <div className="space-y-3">
            {meals.map((meal, i) => (
              <div key={i} className="glass rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <select
                    value={meal.type}
                    onChange={(e) => updateMeal(i, 'type', e.target.value)}
                    className="input-field flex-1"
                  >
                    {MEAL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {meals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMeal(i)}
                      className="w-9 h-9 rounded-xl hover:bg-red-500/10 flex items-center justify-center transition-all text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={meal.notes}
                  onChange={(e) => updateMeal(i, 'notes', e.target.value)}
                  placeholder="Observações (opcional)"
                  className="input-field"
                />
              </div>
            ))}
          </div>
        </motion.div>

        {error && (
          <div className="glass rounded-xl p-4 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/nutritionist/diets" className="btn-secondary flex-1 text-center">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending ? 'Salvando...' : 'Criar dieta'}
          </button>
        </div>
      </form>
    </div>
  );
}
