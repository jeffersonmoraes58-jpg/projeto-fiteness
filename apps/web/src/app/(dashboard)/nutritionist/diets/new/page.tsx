'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Apple, ChevronLeft, Plus, Save, User, AlertTriangle, Sparkles, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MealCard, emptyMeal, calcMealMacros, type MealRow } from '@/components/nutritionist/meal-editor';

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Perda de peso', GAIN_MUSCLE: 'Ganho muscular', MAINTAIN_WEIGHT: 'Manutenção',
  IMPROVE_ENDURANCE: 'Resistência', INCREASE_FLEXIBILITY: 'Flexibilidade',
  ATHLETIC_PERFORMANCE: 'Performance', REHABILITATION: 'Reabilitação',
};

const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export default function NewDietPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId') || '';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [totalCalories, setTotalCalories] = useState('');
  const [totalProtein, setTotalProtein] = useState('');
  const [totalCarbs, setTotalCarbs] = useState('');
  const [totalFat, setTotalFat] = useState('');
  const [waterTargetMl, setWaterTargetMl] = useState('');
  const [meals, setMeals] = useState<MealRow[]>([emptyMeal()]);
  const [error, setError] = useState('');

  const [patientId, setPatientId] = useState(patientIdFromUrl);
  const [autoAssign, setAutoAssign] = useState(!!patientIdFromUrl);

  const { data: patients = [] } = useQuery({
    queryKey: ['nutritionist-patients'],
    queryFn: () => api.get('/nutritionists/me/patients').then((r) => r.data?.data ?? r.data ?? []),
  });
  const selectedPatient = (patients as any[]).find((p) => p.id === patientId);

  const { data: suggestion } = useQuery({
    queryKey: ['diet-suggestion', patientId],
    queryFn: () => api.get(`/nutritionists/me/patients/${patientId}/diet-suggestion`).then((r) => r.data?.data ?? r.data),
    enabled: !!patientId,
  });

  // pré-preenche meta de água a partir da anamnese, só na primeira vez que a sugestão chegar
  useEffect(() => {
    if (suggestion?.waterIntakeLiters && !waterTargetMl) {
      setWaterTargetMl(String(Math.round(suggestion.waterIntakeLiters * 1000)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion]);

  function applySuggestion() {
    if (!suggestion?.tmbCalc) return;
    setTotalCalories(String(suggestion.tmbCalc.targetCalories));
    setTotalProtein(String(suggestion.tmbCalc.macros.protein.grams));
    setTotalCarbs(String(suggestion.tmbCalc.macros.carbs.grams));
    setTotalFat(String(suggestion.tmbCalc.macros.fat.grams));
  }

  const hasFoods = meals.some((m) => m.foods.length > 0);
  const dietTotals = meals.reduce(
    (acc, m) => {
      const t = calcMealMacros(m.foods);
      return { calories: acc.calories + t.calories, protein: acc.protein + t.protein, carbs: acc.carbs + t.carbs, fat: acc.fat + t.fat };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description,
        // se já tem alimento nas refeições, os totais vêm deles (igual ao editor da dieta);
        // senão usa a meta digitada/sugerida manualmente.
        totalCalories: hasFoods ? Math.round(dietTotals.calories) : (totalCalories ? Number(totalCalories) : undefined),
        totalProtein: hasFoods ? Math.round(dietTotals.protein * 10) / 10 : (totalProtein ? Number(totalProtein) : undefined),
        totalCarbs: hasFoods ? Math.round(dietTotals.carbs * 10) / 10 : (totalCarbs ? Number(totalCarbs) : undefined),
        totalFat: hasFoods ? Math.round(dietTotals.fat * 10) / 10 : (totalFat ? Number(totalFat) : undefined),
        waterTargetMl: waterTargetMl ? Number(waterTargetMl) : undefined,
        meals: meals.map((m) => ({
          type: m.type,
          name: m.name,
          time: m.time || undefined,
          dayOfWeek: m.dayOfWeek,
          notes: m.notes || undefined,
          foods: m.foods.map((f) => ({
            foodId: f.foodId,
            quantity: f.quantity,
            unit: f.unit,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
          })),
        })),
        status: 'ACTIVE',
      };
      const res = await api.post('/diets', payload);
      const created = res.data?.data ?? res.data;
      if (autoAssign && patientId && selectedPatient?.userId) {
        await api.post(`/diets/${created.id}/assign`, { studentUserId: selectedPatient.userId });
      }
      return created;
    },
    onSuccess: () => router.push('/nutritionist/diets'),
    onError: (e: any) => setError(e.response?.data?.message || 'Erro ao criar dieta'),
  });

  const addMeal = () => setMeals((prev) => [...prev, emptyMeal('LUNCH')]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Nome é obrigatório'); return; }
    setError('');
    createMutation.mutate();
  };

  const kcalSum = (Number(totalProtein) || 0) * 4 + (Number(totalCarbs) || 0) * 4 + (Number(totalFat) || 0) * 9;

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
        {/* Paciente + sugestão */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            Paciente (opcional)
          </h2>
          <p className="text-xs text-muted-foreground -mt-2">
            Selecione pra puxar automaticamente meta calórica, alergias e dias de treino do paciente.
          </p>
          <select value={patientId} onChange={(e) => { setPatientId(e.target.value); setAutoAssign(true); }} className="input-field bg-background">
            <option value="">Criar sem vincular (modelo/template)</option>
            {(patients as any[]).map((p: any) => (
              <option key={p.id} value={p.id}>
                {[p.user?.profile?.firstName, p.user?.profile?.lastName].filter(Boolean).join(' ') || p.user?.email}
              </option>
            ))}
          </select>

          {patientId && suggestion && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3 text-sm">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {suggestion.goalType && <span><strong className="text-foreground">Objetivo:</strong> {GOAL_LABELS[suggestion.goalType] || suggestion.goalType}</span>}
                {suggestion.lastAssessment && <span><strong className="text-foreground">Última avaliação:</strong> {suggestion.lastAssessment.weight}kg / {suggestion.lastAssessment.height}cm</span>}
              </div>

              {(suggestion.foodAllergies || suggestion.foodIntolerances || suggestion.foodDislikes) && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-300 space-y-0.5">
                    {suggestion.foodAllergies && <p><strong>Alergias:</strong> {suggestion.foodAllergies}</p>}
                    {suggestion.foodIntolerances && <p><strong>Intolerâncias:</strong> {suggestion.foodIntolerances}</p>}
                    {suggestion.foodDislikes && <p><strong>Não come:</strong> {suggestion.foodDislikes}</p>}
                  </div>
                </div>
              )}

              {suggestion.trainer?.workoutDays?.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Dumbbell className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  Treina com {suggestion.trainer.name} nos dias: {suggestion.trainer.workoutDays.map((d: number) => WEEKDAY_LABELS[d]).join(', ')}
                  {' '}— considere refeições pré/pós-treino nesses dias.
                </div>
              )}

              {suggestion.tmbCalc ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-xs">
                    <p className="text-emerald-400 font-semibold">Sugestão: {suggestion.tmbCalc.targetCalories} kcal/dia</p>
                    <p className="text-muted-foreground">
                      P {suggestion.tmbCalc.macros.protein.grams}g · C {suggestion.tmbCalc.macros.carbs.grams}g · G {suggestion.tmbCalc.macros.fat.grams}g
                    </p>
                  </div>
                  <button type="button" onClick={applySuggestion} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5" /> Usar sugestão
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sem avaliação física completa (peso/altura/idade/sexo) — registre uma na aba "Avaliação" do paciente pra calcular a meta automaticamente.
                </p>
              )}

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} />
                Já atribuir esta dieta ao paciente ao salvar
              </label>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card space-y-4">
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Calorias (kcal)</label>
              <input
                type="number" value={hasFoods ? Math.round(dietTotals.calories) : totalCalories}
                onChange={(e) => setTotalCalories(e.target.value)} placeholder="2000" className="input-field" min={0}
                disabled={hasFoods} title={hasFoods ? 'Calculado a partir dos alimentos adicionados' : undefined}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Proteína (g)</label>
              <input
                type="number" value={hasFoods ? dietTotals.protein : totalProtein}
                onChange={(e) => setTotalProtein(e.target.value)} placeholder="150" className="input-field" min={0}
                disabled={hasFoods}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Carboidratos (g)</label>
              <input
                type="number" value={hasFoods ? dietTotals.carbs : totalCarbs}
                onChange={(e) => setTotalCarbs(e.target.value)} placeholder="220" className="input-field" min={0}
                disabled={hasFoods}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Gordura (g)</label>
              <input
                type="number" value={hasFoods ? dietTotals.fat : totalFat}
                onChange={(e) => setTotalFat(e.target.value)} placeholder="55" className="input-field" min={0}
                disabled={hasFoods}
              />
            </div>
          </div>
          {hasFoods ? (
            <p className="text-xs text-emerald-400">Calculado automaticamente a partir dos alimentos das refeições abaixo.</p>
          ) : (
            kcalSum > 0 && totalCalories && Math.abs(kcalSum - Number(totalCalories)) > Number(totalCalories) * 0.1 && (
              <p className="text-xs text-amber-400">
                Os macros somam ~{Math.round(kcalSum)} kcal, mas a meta está em {totalCalories} kcal — confira antes de salvar.
              </p>
            )
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Meta de água (ml/dia)</label>
            <input type="number" value={waterTargetMl} onChange={(e) => setWaterTargetMl(e.target.value)} placeholder="2000" className="input-field max-w-[160px]" min={0} />
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
              <MealCard
                key={i}
                meal={meal}
                onChange={(updated) => setMeals((prev) => prev.map((m, idx) => idx === i ? updated : m))}
                onRemove={() => setMeals((prev) => prev.filter((_, idx) => idx !== i))}
                canRemove={meals.length > 1}
              />
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
