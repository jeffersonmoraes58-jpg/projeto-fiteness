'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Apple, ChevronLeft, Flame, Beef, Wheat, Droplets, Users, UserCheck,
  Plus, Trash2, Save, CheckCircle, Clock,
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

interface MealRow {
  type: string;
  name: string;
  time: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
}

const emptyMeal = (): MealRow => ({
  type: 'BREAKFAST', name: 'Café da manhã', time: '', calories: '', protein: '', carbs: '', fat: '', notes: '',
});

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
        const d = r.data.data;
        if (!mealsLoaded) {
          setMeals(
            (d.meals || []).map((m: any) => ({
              type: m.type,
              name: m.name || MEAL_LABELS[m.type] || m.type,
              time: m.time || '',
              calories: m.calories != null ? String(m.calories) : '',
              protein: m.protein != null ? String(m.protein) : '',
              carbs: m.carbs != null ? String(m.carbs) : '',
              fat: m.fat != null ? String(m.fat) : '',
              notes: m.notes || '',
            })),
          );
          setMealsLoaded(true);
        }
        return d;
      }),
  });

  const { data: patients } = useQuery({
    queryKey: ['nutritionist-patients'],
    queryFn: () => api.get('/nutritionists/me/patients').then((r) => r.data.data || []),
  });

  const saveMealsMutation = useMutation({
    mutationFn: (rows: MealRow[]) =>
      api.patch(`/diets/${id}`, {
        meals: rows.map((m) => ({
          type: m.type,
          name: m.name || MEAL_LABELS[m.type] || m.type,
          time: m.time || null,
          calories: m.calories ? Number(m.calories) : null,
          protein: m.protein ? Number(m.protein) : null,
          carbs: m.carbs ? Number(m.carbs) : null,
          fat: m.fat ? Number(m.fat) : null,
          notes: m.notes || null,
        })),
      }),
    onSuccess: () => {
      setSaveMealSuccess(true);
      qc.invalidateQueries({ queryKey: ['diet', id] });
      toast.success('Refeições salvas!');
      setTimeout(() => setSaveMealSuccess(false), 3000);
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao salvar refeições'));
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => api.patch(`/diets/${id}`, { status: 'ACTIVE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diet', id] });
      toast.success('Dieta ativada!');
    },
  });

  const assignMutation = useMutation({
    mutationFn: (data: any) => api.post(`/diets/${id}/assign`, data),
    onSuccess: () => {
      setSelectedPatient('');
      setAssignError('');
      qc.invalidateQueries({ queryKey: ['diet', id] });
      toast.success('Dieta atribuída com sucesso!');
    },
    onError: (e: any) => {
      const msg = e.message || e.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao atribuir dieta');
      setAssignError(text);
      toast.error(text);
    },
  });

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) { setAssignError('Selecione um paciente'); return; }
    setAssignError('');
    assignMutation.mutate({ studentUserId: selectedPatient });
  };

  const addMeal = () => setMeals((prev) => [...prev, emptyMeal()]);

  const removeMeal = (idx: number) => setMeals((prev) => prev.filter((_, i) => i !== idx));

  const updateMeal = (idx: number, field: keyof MealRow, value: string) =>
    setMeals((prev) =>
      prev.map((m, i) => {
        if (i !== idx) return m;
        const updated = { ...m, [field]: value };
        if (field === 'type') updated.name = MEAL_LABELS[value] || value;
        return updated;
      }),
    );

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="glass-card animate-pulse h-24" />)}
      </div>
    );
  }

  if (!diet) {
    return (
      <div className="max-w-2xl mx-auto glass-card flex flex-col items-center justify-center py-16 text-center">
        <Apple className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="font-semibold mb-2">Dieta não encontrada</h2>
        <Link href="/nutritionist/diets" className="btn-secondary text-sm">Voltar</Link>
      </div>
    );
  }

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Rascunho', color: 'bg-yellow-500/10 text-yellow-400' },
    ACTIVE: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400' },
    ARCHIVED: { label: 'Arquivado', color: 'bg-muted text-muted-foreground' },
  };
  const status = STATUS_LABELS[diet.status] || STATUS_LABELS.DRAFT;

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
          Resumo Nutricional
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Calorias', value: diet.totalCalories ?? 0, unit: 'kcal', icon: Flame, color: 'text-orange-400' },
            { label: 'Proteína', value: diet.totalProtein ?? 0, unit: 'g', icon: Beef, color: 'text-red-400' },
            { label: 'Carboidratos', value: diet.totalCarbs ?? 0, unit: 'g', icon: Wheat, color: 'text-yellow-400' },
            { label: 'Gordura', value: diet.totalFat ?? 0, unit: 'g', icon: Droplets, color: 'text-blue-400' },
          ].map((m) => (
            <div key={m.label} className="glass rounded-xl p-3 text-center">
              <m.icon className={`w-5 h-5 ${m.color} mx-auto mb-2`} />
              <div className="font-bold">{m.value}{m.unit}</div>
              <div className="text-xs text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Meal editor */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Apple className="w-4 h-4 text-emerald-400" />
            Refeições ({meals.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addMeal}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </button>
            <button
              onClick={() => saveMealsMutation.mutate(meals)}
              disabled={saveMealsMutation.isPending}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
            >
              {saveMealSuccess ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saveMealsMutation.isPending ? 'Salvando...' : saveMealSuccess ? 'Salvo!' : 'Salvar'}
            </button>
          </div>
        </div>

        {meals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Clique em "Adicionar" para criar a primeira refeição
          </p>
        ) : (
          <div className="space-y-4">
            {meals.map((meal, idx) => (
              <div key={idx} className="glass rounded-xl p-4 space-y-3">
                {/* Type + time + remove */}
                <div className="flex items-center gap-2">
                  <select
                    value={meal.type}
                    onChange={(e) => updateMeal(idx, 'type', e.target.value)}
                    className="input-field flex-1 text-sm"
                  >
                    {MEAL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <div className="relative flex-shrink-0 w-28">
                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={meal.time}
                      onChange={(e) => updateMeal(idx, 'time', e.target.value)}
                      placeholder="08:00"
                      className="input-field pl-8 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMeal(idx)}
                    className="w-9 h-9 rounded-xl hover:bg-red-500/10 flex items-center justify-center transition-all text-red-400 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Macros grid */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { field: 'calories' as const, label: 'Calorias', placeholder: 'kcal' },
                    { field: 'protein' as const, label: 'Proteína', placeholder: 'g' },
                    { field: 'carbs' as const, label: 'Carboidratos', placeholder: 'g' },
                    { field: 'fat' as const, label: 'Gordura', placeholder: 'g' },
                  ].map(({ field, label, placeholder }) => (
                    <div key={field}>
                      <label className="text-[10px] text-muted-foreground block mb-1">{label}</label>
                      <input
                        type="number"
                        min={0}
                        value={meal[field]}
                        onChange={(e) => updateMeal(idx, field, e.target.value)}
                        placeholder={placeholder}
                        className="input-field py-1.5 text-sm text-center"
                      />
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <input
                  type="text"
                  value={meal.notes}
                  onChange={(e) => updateMeal(idx, 'notes', e.target.value)}
                  placeholder="Observações (ex: sem glúten, preferência...)"
                  className="input-field text-sm"
                />
              </div>
            ))}
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
        onSubmit={handleAssign}
        className="glass-card space-y-4"
      >
        <h2 className="font-semibold flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          Atribuir a paciente
        </h2>

        <p className="text-xs text-muted-foreground">
          A dieta ativa do paciente será substituída por esta.
        </p>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Paciente *</label>
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            className="input-field"
          >
            <option value="">Selecione um paciente...</option>
            {(patients || []).map((p: any) => (
              <option key={p.userId} value={p.userId}>
                {p.user?.profile?.firstName} {p.user?.profile?.lastName}
              </option>
            ))}
          </select>
        </div>

        {assignError && (
          <div className="glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">{assignError}</div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            {diet._count?.plans ?? 0} paciente(s) com esta dieta
          </div>
          <button
            type="submit"
            disabled={assignMutation.isPending}
            className="btn-primary flex items-center gap-2 text-sm py-2 disabled:opacity-50"
          >
            <UserCheck className="w-4 h-4" />
            {assignMutation.isPending ? 'Atribuindo...' : 'Atribuir dieta'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
