'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Apple, ChevronLeft, Flame, Beef, Wheat, Droplets, Users, UserCheck,
  Plus, Save, CheckCircle, Download, ShoppingCart,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { openDietPDF, openShoppingListPDF } from '@/lib/diet-pdf';
import { MealCard, emptyMeal, calcMealMacros, MEAL_LABELS, type MealRow } from '@/components/nutritionist/meal-editor';
import toast from 'react-hot-toast';

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Perda de peso', GAIN_MUSCLE: 'Ganho muscular', MAINTAIN_WEIGHT: 'Manutenção',
  IMPROVE_ENDURANCE: 'Resistência', INCREASE_FLEXIBILITY: 'Flexibilidade',
  ATHLETIC_PERFORMANCE: 'Performance', REHABILITATION: 'Reabilitação',
};

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
              dayOfWeek: m.dayOfWeek ?? [],
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

  const selectedPatientStudentId = (patients as any[] | undefined)?.find((p: any) => p.userId === selectedPatient)?.id;
  const { data: assignSuggestion } = useQuery({
    queryKey: ['diet-suggestion', selectedPatientStudentId],
    queryFn: () => api.get(`/nutritionists/me/patients/${selectedPatientStudentId}/diet-suggestion`).then((r) => r.data?.data ?? r.data),
    enabled: !!selectedPatientStudentId,
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
            dayOfWeek: m.dayOfWeek ?? [],
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
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              const ok = openShoppingListPDF(diet);
              if (!ok) toast.error('Adicione alimentos à dieta primeiro (e permita pop-ups)');
            }}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl glass hover:bg-accent transition-all"
            title="Lista de compras somando os alimentos de todas as refeições"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Compras</span>
          </button>
          <button
            onClick={() => {
              const ok = openDietPDF(diet);
              if (!ok) toast.error('Permita pop-ups para gerar o PDF');
            }}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl glass hover:bg-accent transition-all"
            title="Baixar dieta em PDF (salva a partir da versão já gravada)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Macros summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          Totais da Dieta {hasFoods && <span className="text-xs text-emerald-400 font-normal">(calculado dos alimentos)</span>}
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {(() => {
            const kcal = hasFoods ? dietTotals.calories : (diet.totalCalories ?? 0);
            const protein = hasFoods ? dietTotals.protein : (diet.totalProtein ?? 0);
            const carbs = hasFoods ? dietTotals.carbs : (diet.totalCarbs ?? 0);
            const fat = hasFoods ? dietTotals.fat : (diet.totalFat ?? 0);
            const pct = (grams: number, kcalPerG: number) => (kcal > 0 ? Math.round(((grams * kcalPerG) / kcal) * 100) : null);
            return [
              { label: 'Calorias', value: Math.round(kcal), unit: 'kcal', pct: null, color: 'text-orange-400', Icon: Flame },
              { label: 'Proteína', value: protein, unit: 'g', pct: pct(protein, 4), color: 'text-red-400', Icon: Beef },
              { label: 'Carboidratos', value: carbs, unit: 'g', pct: pct(carbs, 4), color: 'text-yellow-400', Icon: Wheat },
              { label: 'Gordura', value: fat, unit: 'g', pct: pct(fat, 9), color: 'text-blue-400', Icon: Droplets },
            ];
          })().map((m) => (
            <div key={m.label} className="glass rounded-xl p-3 text-center">
              <m.Icon className={`w-5 h-5 ${m.color} mx-auto mb-1`} />
              <div className="font-bold text-sm">{m.value}{m.unit}</div>
              <div className="text-[10px] text-muted-foreground">{m.label}{m.pct !== null ? ` · ${m.pct}%` : ''}</div>
            </div>
          ))}
        </div>
        {diet.waterTargetMl && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Meta de água: {diet.waterTargetMl}ml/dia
          </p>
        )}
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
            {meals.map((meal, mealIdx) => (
              <MealCard
                key={mealIdx}
                meal={meal}
                onChange={(updated) => setMeals((prev) => prev.map((m, i) => i === mealIdx ? updated : m))}
                onRemove={() => setMeals((prev) => prev.filter((_, i) => i !== mealIdx))}
                canRemove={meals.length > 1}
              />
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
        {assignSuggestion && (
          <div className="rounded-xl border border-border/50 bg-white/5 p-3 space-y-2 text-xs">
            {assignSuggestion.goalType && (
              <p className="text-muted-foreground"><strong className="text-foreground">Objetivo do paciente:</strong> {GOAL_LABELS[assignSuggestion.goalType] || assignSuggestion.goalType}</p>
            )}
            {(assignSuggestion.foodAllergies || assignSuggestion.foodIntolerances) && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <div>
                  {assignSuggestion.foodAllergies && <p><strong>Alergias:</strong> {assignSuggestion.foodAllergies}</p>}
                  {assignSuggestion.foodIntolerances && <p><strong>Intolerâncias:</strong> {assignSuggestion.foodIntolerances}</p>}
                </div>
              </div>
            )}
            {assignSuggestion.tmbCalc && diet.totalCalories && (
              Math.abs(diet.totalCalories - assignSuggestion.tmbCalc.targetCalories) > assignSuggestion.tmbCalc.targetCalories * 0.15 ? (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <p>Esta dieta tem {diet.totalCalories} kcal, mas a meta sugerida para este paciente é ~{assignSuggestion.tmbCalc.targetCalories} kcal. Confira se faz sentido antes de atribuir.</p>
                </div>
              ) : (
                <p className="text-emerald-400">Calorias da dieta compatíveis com a meta sugerida (~{assignSuggestion.tmbCalc.targetCalories} kcal).</p>
              )
            )}
          </div>
        )}
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
