'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, ChevronLeft, Apple, Calendar, MessageCircle, UserCheck, Dumbbell,
  CheckSquare, Square, ClipboardList, ChevronDown, ChevronUp, Save, Scale,
  Plus, History, ClipboardCheck, X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Perda de peso',
  GAIN_MUSCLE: 'Ganho muscular',
  MAINTAIN_WEIGHT: 'Manutenção',
  IMPROVE_ENDURANCE: 'Resistência',
  INCREASE_FLEXIBILITY: 'Flexibilidade',
  ATHLETIC_PERFORMANCE: 'Performance',
  REHABILITATION: 'Reabilitação',
};

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Feminino' },
  { value: 'OTHER', label: 'Outro' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefiro não informar' },
];

const ACTIVITY_OPTIONS = [
  { value: 'SEDENTARY', label: 'Sedentário (sem exercício)', factor: 1.2 },
  { value: 'LIGHTLY_ACTIVE', label: 'Levemente ativo (1-3x/semana)', factor: 1.375 },
  { value: 'MODERATELY_ACTIVE', label: 'Moderadamente ativo (3-5x/semana)', factor: 1.55 },
  { value: 'VERY_ACTIVE', label: 'Muito ativo (6-7x/semana)', factor: 1.725 },
  { value: 'EXTRA_ACTIVE', label: 'Extremamente ativo (2x/dia)', factor: 1.9 },
];

const GOAL_OPTIONS = [
  { value: 'LOSE_WEIGHT', label: 'Perda de peso', calAdjust: -500 },
  { value: 'GAIN_MUSCLE', label: 'Ganho muscular', calAdjust: 300 },
  { value: 'MAINTAIN_WEIGHT', label: 'Manutenção', calAdjust: 0 },
  { value: 'IMPROVE_ENDURANCE', label: 'Resistência', calAdjust: 0 },
  { value: 'INCREASE_FLEXIBILITY', label: 'Flexibilidade', calAdjust: 0 },
  { value: 'ATHLETIC_PERFORMANCE', label: 'Performance atlética', calAdjust: 200 },
  { value: 'REHABILITATION', label: 'Reabilitação', calAdjust: 0 },
];

function calcBmi(weight: number, heightM: number) {
  return heightM > 0 ? weight / (heightM * heightM) : 0;
}

function calcTmb(weight: number, heightCm: number, age: number, gender: string) {
  if (gender === 'FEMALE') return 447.593 + 9.247 * weight + 3.098 * heightCm - 4.33 * age;
  return 88.362 + 13.397 * weight + 4.799 * heightCm - 5.677 * age;
}

function calcGet(tmb: number, activityLevel: string) {
  const opt = ACTIVITY_OPTIONS.find((a) => a.value === activityLevel);
  return tmb * (opt?.factor ?? 1.2);
}

function calcTargets(getVal: number, weight: number, goalType: string) {
  const goal = GOAL_OPTIONS.find((g) => g.value === goalType);
  const targetCal = getVal + (goal?.calAdjust ?? 0);
  const protein = Math.round(weight * 1.8);
  const fat = Math.round((targetCal * 0.25) / 9);
  const carbs = Math.round((targetCal - protein * 4 - fat * 9) / 4);
  const fiber = 30;
  const water = Math.round(weight * 35);
  return { protein, carbs, fat, fiber, water, targetCal };
}

const EMPTY_ASSESSMENT = {
  weight: '',
  height: '',
  age: '',
  gender: 'MALE',
  activityLevel: 'MODERATELY_ACTIVE',
  goal: 'MAINTAIN_WEIGHT',
  dietaryRestrictions: '',
  foodAllergies: '',
  observations: '',
};

const CONSULTATION_STATUS = {
  upcoming: { label: 'Agendada', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  completed: { label: 'Realizada', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  missed: { label: 'Não realizada', color: 'text-red-400', bg: 'bg-red-500/10' },
};

function getConsultationStatus(c: any) {
  if (c.completedAt) return 'completed';
  if (new Date(c.scheduledAt) < new Date()) return 'missed';
  return 'upcoming';
}

const TIMING_OPTIONS = [
  'Em jejum',
  'Café da manhã',
  'Pré-treino',
  'Intra-treino',
  'Pós-treino',
  'Almoço',
  'Jantar',
  'Antes de dormir',
  'Com as refeições',
];

const EMPTY_SUPPLEMENT_ITEM = { name: '', dosage: '', frequency: '', timing: '', notes: '' };

const EMPTY_PHYSICAL = {
  weight: '',
  height: '',
  bodyFatPercent: '',
  muscleMassKg: '',
  visceralFat: '',
  metabolicAge: '',
  waterPercent: '',
  neckCm: '',
  shouldersCm: '',
  chestCm: '',
  waistCm: '',
  hipCm: '',
  abdomenCm: '',
  rightArmCm: '',
  leftArmCm: '',
  rightThighCm: '',
  leftThighCm: '',
  rightCalfCm: '',
  leftCalfCm: '',
  notes: '',
};

const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
];

const EMPTY_ANAMNESIS = {
  practicesExercise: false,
  exerciseFrequency: '',
  previousInjuries: '',
  surgeries: '',
  cardiovascularIssues: false,
  bloodPressure: '',
  cholesterol: '',
  diabetes: false,
  smoking: false,
  alcohol: '',
  sleepHours: '',
  stressLevel: '',
  mainGoal: '',
  observations: '',
};

function BoolField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'w-12 h-6 rounded-full transition-colors relative',
          value ? 'bg-emerald-500' : 'bg-white/10',
        )}
      >
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', value ? 'translate-x-6' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();

  const [selectedDiet, setSelectedDiet] = useState('');
  const [dietError, setDietError] = useState('');
  const [dietSuccess, setDietSuccess] = useState(false);

  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [workoutError, setWorkoutError] = useState('');
  const [workoutSuccess, setWorkoutSuccess] = useState(false);

  const [anamnesisOpen, setAnamnesisOpen] = useState(false);
  const [anamnesisForm, setAnamnesisForm] = useState(EMPTY_ANAMNESIS);
  const [anamnesisLoaded, setAnamnesisLoaded] = useState(false);

  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState(EMPTY_ASSESSMENT);
  const [showHistory, setShowHistory] = useState(false);

  const [physicalOpen, setPhysicalOpen] = useState(false);
  const [physicalForm, setPhysicalForm] = useState(EMPTY_PHYSICAL);
  const [showPhysicalHistory, setShowPhysicalHistory] = useState(false);

  const [consultOpen, setConsultOpen] = useState(false);
  const [consultScheduledAt, setConsultScheduledAt] = useState('');
  const [consultNotes, setConsultNotes] = useState('');
  const [consultNext, setConsultNext] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeNext, setCompleteNext] = useState('');

  const [suppOpen, setSuppOpen] = useState(false);
  const [suppPlanName, setSuppPlanName] = useState('');
  const [suppStartDate, setSuppStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [suppEndDate, setSuppEndDate] = useState('');
  const [suppObs, setSuppObs] = useState('');
  const [suppItems, setSuppItems] = useState([{ ...EMPTY_SUPPLEMENT_ITEM }]);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const { data: patients, isLoading } = useQuery({
    queryKey: ['nutritionist-patients'],
    queryFn: () => api.get('/nutritionists/me/patients').then((r) => r.data.data),
  });

  const { data: diets } = useQuery({
    queryKey: ['diets-list'],
    queryFn: () => api.get('/diets').then((r) => r.data.data || []),
  });

  const { data: workouts } = useQuery({
    queryKey: ['workouts-list'],
    queryFn: () => api.get('/workouts').then((r) => r.data.data || []),
  });

  const patient = patients?.find((p: any) => p.id === id);

  const { data: anamnesis, isLoading: anamnesisLoading } = useQuery({
    queryKey: ['anamnesis', id],
    queryFn: () => api.get(`/nutritionists/me/patients/${id}/anamnesis`).then((r) => r.data),
    enabled: !!patient && anamnesisOpen,
  });

  useEffect(() => {
    if (anamnesis && !anamnesisLoaded) {
      setAnamnesisForm({
        practicesExercise: anamnesis.practicesExercise ?? false,
        exerciseFrequency: anamnesis.exerciseFrequency ?? '',
        previousInjuries: anamnesis.previousInjuries ?? '',
        surgeries: anamnesis.surgeries ?? '',
        cardiovascularIssues: anamnesis.cardiovascularIssues ?? false,
        bloodPressure: anamnesis.bloodPressure ?? '',
        cholesterol: anamnesis.cholesterol ?? '',
        diabetes: anamnesis.diabetes ?? false,
        smoking: anamnesis.smoking ?? false,
        alcohol: anamnesis.alcohol ?? '',
        sleepHours: anamnesis.sleepHours != null ? String(anamnesis.sleepHours) : '',
        stressLevel: anamnesis.stressLevel != null ? String(anamnesis.stressLevel) : '',
        mainGoal: anamnesis.mainGoal ?? '',
        observations: anamnesis.observations ?? '',
      });
      setAnamnesisLoaded(true);
    }
  }, [anamnesis, anamnesisLoaded]);

  const handleAnamnesisOpen = () => {
    setAnamnesisOpen((o) => !o);
  };

  const { data: assessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['nutritional-assessments', id],
    queryFn: () =>
      api.get(`/nutritionists/me/patients/${id}/nutritional-assessments`).then((r) => r.data),
    enabled: !!patient && assessmentOpen,
  });

  const assessmentMutation = useMutation({
    mutationFn: (data: any) =>
      api.post(`/nutritionists/me/patients/${id}/nutritional-assessments`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutritional-assessments', id] });
      setAssessmentForm(EMPTY_ASSESSMENT);
      setShowHistory(true);
      toast.success('Avaliação nutricional registrada!');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || e.message || 'Erro ao salvar avaliação';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const setAssField = (field: string, value: any) =>
    setAssessmentForm((prev) => ({ ...prev, [field]: value }));

  const derived = (() => {
    const w = parseFloat(assessmentForm.weight);
    const h = parseFloat(assessmentForm.height);
    const a = parseInt(assessmentForm.age);
    if (!w || !h || !a) return null;
    const heightM = h / 100;
    const bmi = calcBmi(w, heightM);
    const tmb = calcTmb(w, h, a, assessmentForm.gender);
    const get = calcGet(tmb, assessmentForm.activityLevel);
    const targets = calcTargets(get, w, assessmentForm.goal);
    return { bmi, tmb, get, ...targets };
  })();

  const handleAssessmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!derived) { toast.error('Preencha peso, altura e idade para calcular'); return; }
    const w = parseFloat(assessmentForm.weight);
    const h = parseFloat(assessmentForm.height);
    const a = parseInt(assessmentForm.age);
    const heightM = h / 100;
    assessmentMutation.mutate({
      weight: w,
      height: heightM,
      age: a,
      gender: assessmentForm.gender,
      activityLevel: assessmentForm.activityLevel,
      goal: assessmentForm.goal,
      bmi: parseFloat(derived.bmi.toFixed(2)),
      tmb: parseFloat(derived.tmb.toFixed(2)),
      get: parseFloat(derived.get.toFixed(2)),
      proteinTarget: derived.protein,
      carbsTarget: derived.carbs,
      fatTarget: derived.fat,
      fiberTarget: derived.fiber,
      waterTarget: derived.water,
      dietaryRestrictions: assessmentForm.dietaryRestrictions
        ? assessmentForm.dietaryRestrictions.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      foodAllergies: assessmentForm.foodAllergies
        ? assessmentForm.foodAllergies.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      observations: assessmentForm.observations || null,
    });
  };

  const { data: physicalAssessments, isLoading: physicalLoading } = useQuery({
    queryKey: ['physical-assessments', id],
    queryFn: () =>
      api.get(`/nutritionists/me/patients/${id}/physical-assessments`).then((r) => r.data),
    enabled: !!patient && physicalOpen,
  });

  const setPhyField = (field: string, value: any) =>
    setPhysicalForm((prev) => ({ ...prev, [field]: value }));

  const physicalBmi = (() => {
    const w = parseFloat(physicalForm.weight);
    const h = parseFloat(physicalForm.height);
    if (!w || !h) return null;
    return calcBmi(w, h / 100);
  })();

  const physicalMutation = useMutation({
    mutationFn: (data: any) =>
      api.post(`/nutritionists/me/patients/${id}/physical-assessments`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['physical-assessments', id] });
      setPhysicalForm(EMPTY_PHYSICAL);
      setShowPhysicalHistory(true);
      toast.success('Avaliação antropométrica registrada!');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || e.message || 'Erro ao salvar avaliação';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const handlePhysicalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(physicalForm.weight);
    const h = parseFloat(physicalForm.height);
    if (!w || !h) { toast.error('Peso e altura são obrigatórios'); return; }
    const opt = (val: string) => (val !== '' ? parseFloat(val) : null);
    const optInt = (val: string) => (val !== '' ? parseInt(val) : null);
    physicalMutation.mutate({
      weight: w,
      height: h / 100,
      bmi: physicalBmi ? parseFloat(physicalBmi.toFixed(2)) : 0,
      bodyFatPercent: opt(physicalForm.bodyFatPercent),
      muscleMassKg: opt(physicalForm.muscleMassKg),
      visceralFat: opt(physicalForm.visceralFat),
      metabolicAge: optInt(physicalForm.metabolicAge),
      waterPercent: opt(physicalForm.waterPercent),
      neckCm: opt(physicalForm.neckCm),
      shouldersCm: opt(physicalForm.shouldersCm),
      chestCm: opt(physicalForm.chestCm),
      waistCm: opt(physicalForm.waistCm),
      hipCm: opt(physicalForm.hipCm),
      abdomenCm: opt(physicalForm.abdomenCm),
      rightArmCm: opt(physicalForm.rightArmCm),
      leftArmCm: opt(physicalForm.leftArmCm),
      rightThighCm: opt(physicalForm.rightThighCm),
      leftThighCm: opt(physicalForm.leftThighCm),
      rightCalfCm: opt(physicalForm.rightCalfCm),
      leftCalfCm: opt(physicalForm.leftCalfCm),
      notes: physicalForm.notes || null,
    });
  };

  const { data: consultations, isLoading: consultLoading } = useQuery({
    queryKey: ['patient-consultations', id],
    queryFn: () =>
      api.get(`/nutritionists/me/patients/${id}/consultations`).then((r) => r.data),
    enabled: !!patient && consultOpen,
  });

  const createConsultMutation = useMutation({
    mutationFn: (data: any) =>
      api.post(`/nutritionists/me/patients/${id}/consultations`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-consultations', id] });
      setConsultScheduledAt('');
      setConsultNotes('');
      setConsultNext('');
      toast.success('Consulta agendada!');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || e.message || 'Erro ao agendar consulta';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const completeConsultMutation = useMutation({
    mutationFn: ({ consultationId, notes, nextConsultation }: any) =>
      api.patch(`/nutritionists/me/consultations/${consultationId}`, {
        completedAt: new Date().toISOString(),
        notes: notes || null,
        nextConsultation: nextConsultation || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-consultations', id] });
      setCompletingId(null);
      setCompleteNotes('');
      setCompleteNext('');
      toast.success('Consulta registrada como realizada!');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || e.message || 'Erro ao atualizar consulta';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultScheduledAt) { toast.error('Informe a data e hora da consulta'); return; }
    createConsultMutation.mutate({
      scheduledAt: new Date(consultScheduledAt).toISOString(),
      notes: consultNotes || null,
      nextConsultation: consultNext ? new Date(consultNext).toISOString() : null,
    });
  };

  const { data: suppPlans, isLoading: suppLoading } = useQuery({
    queryKey: ['supplementation-plans', id],
    queryFn: () =>
      api.get(`/nutritionists/me/patients/${id}/supplementation-plans`).then((r) => r.data),
    enabled: !!patient && suppOpen,
  });

  const suppMutation = useMutation({
    mutationFn: (data: any) =>
      api.post(`/nutritionists/me/patients/${id}/supplementation-plans`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplementation-plans', id] });
      setSuppPlanName('');
      setSuppStartDate(new Date().toISOString().split('T')[0]);
      setSuppEndDate('');
      setSuppObs('');
      setSuppItems([{ ...EMPTY_SUPPLEMENT_ITEM }]);
      toast.success('Plano de suplementação criado!');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || e.message || 'Erro ao salvar plano';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const togglePlanActive = useMutation({
    mutationFn: ({ planId, isActive }: { planId: string; isActive: boolean }) =>
      api.patch(`/nutritionists/me/supplementation-plans/${planId}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplementation-plans', id] }),
  });

  const addSuppItem = () => setSuppItems((prev) => [...prev, { ...EMPTY_SUPPLEMENT_ITEM }]);
  const removeSuppItem = (i: number) => setSuppItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateSuppItem = (i: number, field: string, value: string) =>
    setSuppItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleSuppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppPlanName.trim()) { toast.error('Informe o nome do plano'); return; }
    if (suppItems.some((it) => !it.name.trim() || !it.dosage.trim() || !it.frequency.trim())) {
      toast.error('Preencha nome, dosagem e frequência de todos os suplementos');
      return;
    }
    suppMutation.mutate({
      name: suppPlanName.trim(),
      startDate: suppStartDate,
      endDate: suppEndDate || null,
      observations: suppObs || null,
      items: suppItems.map(({ name, dosage, frequency, timing, notes }) => ({
        name, dosage, frequency,
        timing: timing || null,
        notes: notes || null,
      })),
    });
  };

  const anamnesisMutation = useMutation({
    mutationFn: (data: any) => api.put(`/nutritionists/me/patients/${id}/anamnesis`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anamnesis', id] });
      toast.success('Anamnese salva com sucesso!');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || e.message || 'Erro ao salvar anamnese';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const handleAnamnesisSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    anamnesisMutation.mutate({
      ...anamnesisForm,
      sleepHours: anamnesisForm.sleepHours ? parseFloat(anamnesisForm.sleepHours) : null,
      stressLevel: anamnesisForm.stressLevel ? parseInt(anamnesisForm.stressLevel) : null,
      exerciseFrequency: anamnesisForm.exerciseFrequency || null,
      previousInjuries: anamnesisForm.previousInjuries || null,
      surgeries: anamnesisForm.surgeries || null,
      bloodPressure: anamnesisForm.bloodPressure || null,
      cholesterol: anamnesisForm.cholesterol || null,
      alcohol: anamnesisForm.alcohol || null,
      mainGoal: anamnesisForm.mainGoal || null,
      observations: anamnesisForm.observations || null,
    });
  };

  const setField = (field: string, value: any) =>
    setAnamnesisForm((prev) => ({ ...prev, [field]: value }));

  const dietMutation = useMutation({
    mutationFn: (dietId: string) =>
      api.post(`/diets/${dietId}/assign`, { studentUserId: patient?.userId }),
    onSuccess: () => {
      setDietSuccess(true);
      setSelectedDiet('');
      setDietError('');
      qc.invalidateQueries({ queryKey: ['nutritionist-patients'] });
      setTimeout(() => setDietSuccess(false), 3000);
      toast.success('Dieta atribuída com sucesso!');
    },
    onError: (e: any) => {
      const msg = e.message || e.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao atribuir dieta');
      setDietError(text);
      toast.error(text);
    },
  });

  const workoutMutation = useMutation({
    mutationFn: (data: any) => api.post(`/workouts/${data.workoutId}/assign`, {
      studentId: patient?.id,
      dayOfWeek: data.dayOfWeek,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      notes: data.notes || undefined,
    }),
    onSuccess: () => {
      setWorkoutSuccess(true);
      setSelectedWorkout('');
      setDayOfWeek([]);
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setWorkoutNotes('');
      setWorkoutError('');
      setTimeout(() => setWorkoutSuccess(false), 3000);
      toast.success('Treino atribuído com sucesso!');
    },
    onError: (e: any) => {
      const msg = e.message || e.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao atribuir treino');
      setWorkoutError(text);
      toast.error(text);
    },
  });

  const toggleDay = (v: number) =>
    setDayOfWeek((prev) => prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v]);

  const handleDietAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiet) { setDietError('Selecione uma dieta'); return; }
    setDietError('');
    dietMutation.mutate(selectedDiet);
  };

  const handleWorkoutAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkout) { setWorkoutError('Selecione um treino'); return; }
    if (dayOfWeek.length === 0) { setWorkoutError('Selecione ao menos um dia da semana'); return; }
    if (!startDate) { setWorkoutError('Informe a data de início'); return; }
    setWorkoutError('');
    workoutMutation.mutate({ workoutId: selectedWorkout, dayOfWeek, startDate, endDate, notes: workoutNotes });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card animate-pulse h-32" />
        ))}
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-2xl mx-auto glass-card flex flex-col items-center justify-center py-16 text-center">
        <Users className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="font-semibold mb-2">Paciente não encontrado</h2>
        <Link href="/nutritionist/patients" className="btn-secondary text-sm">Voltar</Link>
      </div>
    );
  }

  const initials = `${patient.user?.profile?.firstName?.[0] || ''}${patient.user?.profile?.lastName?.[0] || ''}`;
  const compliance = patient.dietCompliance ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/nutritionist/patients" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold">Perfil do Paciente</h1>
      </div>

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {patient.user?.profile?.avatarUrl
              ? <img src={patient.user.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              : initials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">
              {patient.user?.profile?.firstName} {patient.user?.profile?.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">{patient.user?.email}</p>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full mt-1 inline-block',
              patient.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground',
            )}>
              {patient.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <Link href="/nutritionist/chat" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Adesão à dieta</span>
            <span className={compliance >= 70 ? 'text-emerald-400' : 'text-orange-400'}>{compliance}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                compliance >= 70 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-orange-500 to-red-500',
              )}
              style={{ width: `${compliance}%` }}
            />
          </div>
        </div>
      </motion.div>

      {/* Objective */}
      {patient.goalType && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
          <h2 className="font-semibold mb-2">Objetivo</h2>
          <p className="text-muted-foreground">{GOAL_LABELS[patient.goalType] || patient.goalType}</p>
        </motion.div>
      )}

      {/* Anamnese nutricional */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card">
        <button
          type="button"
          onClick={handleAnamnesisOpen}
          className="w-full flex items-center justify-between"
        >
          <h2 className="font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-cyan-400" />
            Ficha de Anamnese Nutricional
            {anamnesis && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ml-1">Preenchida</span>}
          </h2>
          {anamnesisOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {anamnesisOpen && (
          <form onSubmit={handleAnamnesisSubmit} className="mt-5 space-y-6">
            {anamnesisLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* Atividade física */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Atividade Física</h3>
                  <BoolField
                    label="Pratica exercícios físicos?"
                    value={anamnesisForm.practicesExercise}
                    onChange={(v) => setField('practicesExercise', v)}
                  />
                  {anamnesisForm.practicesExercise && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Frequência / modalidade</label>
                      <input
                        type="text"
                        value={anamnesisForm.exerciseFrequency}
                        onChange={(e) => setField('exerciseFrequency', e.target.value)}
                        placeholder="Ex: musculação 3x semana"
                        className="input-field"
                      />
                    </div>
                  )}
                </div>

                {/* Histórico clínico */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Histórico Clínico</h3>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Lesões anteriores</label>
                    <textarea
                      value={anamnesisForm.previousInjuries}
                      onChange={(e) => setField('previousInjuries', e.target.value)}
                      placeholder="Descreva lesões relevantes..."
                      rows={2}
                      className="input-field resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Cirurgias</label>
                    <textarea
                      value={anamnesisForm.surgeries}
                      onChange={(e) => setField('surgeries', e.target.value)}
                      placeholder="Descreva cirurgias realizadas..."
                      rows={2}
                      className="input-field resize-none"
                    />
                  </div>
                </div>

                {/* Saúde cardiovascular e metabólica */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Saúde Cardiovascular e Metabólica</h3>
                  <BoolField
                    label="Problemas cardiovasculares?"
                    value={anamnesisForm.cardiovascularIssues}
                    onChange={(v) => setField('cardiovascularIssues', v)}
                  />
                  <BoolField
                    label="Diabetes?"
                    value={anamnesisForm.diabetes}
                    onChange={(v) => setField('diabetes', v)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Pressão arterial</label>
                      <input
                        type="text"
                        value={anamnesisForm.bloodPressure}
                        onChange={(e) => setField('bloodPressure', e.target.value)}
                        placeholder="Ex: 120/80"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Colesterol</label>
                      <input
                        type="text"
                        value={anamnesisForm.cholesterol}
                        onChange={(e) => setField('cholesterol', e.target.value)}
                        placeholder="Ex: 190 mg/dL"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                {/* Hábitos de vida */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Hábitos de Vida</h3>
                  <BoolField
                    label="Fumante?"
                    value={anamnesisForm.smoking}
                    onChange={(v) => setField('smoking', v)}
                  />
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Consumo de álcool</label>
                    <input
                      type="text"
                      value={anamnesisForm.alcohol}
                      onChange={(e) => setField('alcohol', e.target.value)}
                      placeholder="Ex: socialmente, final de semana"
                      className="input-field"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Horas de sono / dia</label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        step={0.5}
                        value={anamnesisForm.sleepHours}
                        onChange={(e) => setField('sleepHours', e.target.value)}
                        placeholder="Ex: 7.5"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Nível de estresse (1-10)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={anamnesisForm.stressLevel}
                        onChange={(e) => setField('stressLevel', e.target.value)}
                        placeholder="Ex: 6"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                {/* Objetivo e observações */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Objetivo e Observações</h3>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Objetivo principal</label>
                    <input
                      type="text"
                      value={anamnesisForm.mainGoal}
                      onChange={(e) => setField('mainGoal', e.target.value)}
                      placeholder="Ex: emagrecer 8 kg em 4 meses"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Observações adicionais</label>
                    <textarea
                      value={anamnesisForm.observations}
                      onChange={(e) => setField('observations', e.target.value)}
                      placeholder="Informações complementares relevantes..."
                      rows={3}
                      className="input-field resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={anamnesisMutation.isPending}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {anamnesisMutation.isPending ? 'Salvando...' : 'Salvar anamnese'}
                </button>
              </>
            )}
          </form>
        )}
      </motion.div>

      {/* Avaliação nutricional */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card">
        <button
          type="button"
          onClick={() => setAssessmentOpen((o) => !o)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="font-semibold flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-400" />
            Avaliação Nutricional
            {assessments && assessments.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 ml-1">
                {assessments.length} registro{assessments.length > 1 ? 's' : ''}
              </span>
            )}
          </h2>
          {assessmentOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {assessmentOpen && (
          <div className="mt-5 space-y-6">
            {/* Formulário nova avaliação */}
            <form onSubmit={handleAssessmentSubmit} className="space-y-5">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-purple-400" />
                Nova avaliação
              </h3>

              {/* Dados antropométricos */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Dados Antropométricos</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Peso (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={assessmentForm.weight}
                      onChange={(e) => setAssField('weight', e.target.value)}
                      placeholder="70.5"
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Altura (cm) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={assessmentForm.height}
                      onChange={(e) => setAssField('height', e.target.value)}
                      placeholder="170"
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Idade *</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={assessmentForm.age}
                      onChange={(e) => setAssField('age', e.target.value)}
                      placeholder="30"
                      className="input-field"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Sexo *</label>
                  <select
                    value={assessmentForm.gender}
                    onChange={(e) => setAssField('gender', e.target.value)}
                    className="input-field"
                  >
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Perfil e objetivo */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Perfil e Objetivo</p>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nível de atividade *</label>
                  <select
                    value={assessmentForm.activityLevel}
                    onChange={(e) => setAssField('activityLevel', e.target.value)}
                    className="input-field"
                  >
                    {ACTIVITY_OPTIONS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Objetivo *</label>
                  <select
                    value={assessmentForm.goal}
                    onChange={(e) => setAssField('goal', e.target.value)}
                    className="input-field"
                  >
                    {GOAL_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cálculos em tempo real */}
              {derived && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Resultados Calculados</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="glass rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-purple-400">{derived.bmi.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">IMC</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {derived.bmi < 18.5 ? 'Abaixo' : derived.bmi < 25 ? 'Normal' : derived.bmi < 30 ? 'Sobrepeso' : 'Obeso'}
                      </div>
                    </div>
                    <div className="glass rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-cyan-400">{Math.round(derived.tmb)}</div>
                      <div className="text-xs text-muted-foreground">TMB (kcal)</div>
                    </div>
                    <div className="glass rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-emerald-400">{Math.round(derived.get)}</div>
                      <div className="text-xs text-muted-foreground">GET (kcal)</div>
                    </div>
                  </div>
                  <div className="glass rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">
                      Meta calórica: <span className="text-white font-bold">{Math.round(derived.targetCal)} kcal/dia</span>
                    </p>
                    {[
                      { label: 'Proteína', value: derived.protein, unit: 'g', color: 'bg-red-500' },
                      { label: 'Carboidratos', value: derived.carbs, unit: 'g', color: 'bg-yellow-500' },
                      { label: 'Gorduras', value: derived.fat, unit: 'g', color: 'bg-orange-500' },
                      { label: 'Fibras', value: derived.fiber, unit: 'g', color: 'bg-green-500' },
                      { label: 'Água', value: derived.water, unit: 'ml', color: 'bg-blue-500' },
                    ].map((m) => (
                      <div key={m.label} className="flex items-center gap-3">
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', m.color)} />
                        <span className="text-sm text-muted-foreground flex-1">{m.label}</span>
                        <span className="text-sm font-semibold">{m.value} {m.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Restrições e alergias */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Restrições Alimentares</p>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Restrições alimentares</label>
                  <input
                    type="text"
                    value={assessmentForm.dietaryRestrictions}
                    onChange={(e) => setAssField('dietaryRestrictions', e.target.value)}
                    placeholder="Ex: glúten, lactose (separar por vírgula)"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Alergias alimentares</label>
                  <input
                    type="text"
                    value={assessmentForm.foodAllergies}
                    onChange={(e) => setAssField('foodAllergies', e.target.value)}
                    placeholder="Ex: amendoim, camarão (separar por vírgula)"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Observações</label>
                  <textarea
                    value={assessmentForm.observations}
                    onChange={(e) => setAssField('observations', e.target.value)}
                    placeholder="Observações adicionais..."
                    rows={2}
                    className="input-field resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={assessmentMutation.isPending || !derived}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {assessmentMutation.isPending ? 'Salvando...' : 'Registrar avaliação'}
              </button>
            </form>

            {/* Histórico */}
            {assessments && assessments.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowHistory((h) => !h)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <History className="w-4 h-4" />
                  {showHistory ? 'Ocultar histórico' : `Ver histórico (${assessments.length})`}
                </button>

                {showHistory && (
                  <div className="mt-3 space-y-3">
                    {assessmentsLoading ? (
                      <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
                    ) : assessments.map((a: any) => (
                      <div key={a.id} className="glass rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(a.assessedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-xs font-medium">
                            {a.weight} kg · {(a.height * 100).toFixed(0)} cm · {a.age} anos
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-sm font-bold text-purple-400">{a.bmi?.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">IMC</div>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-cyan-400">{Math.round(a.tmb)}</div>
                            <div className="text-xs text-muted-foreground">TMB</div>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-emerald-400">{Math.round(a.get)}</div>
                            <div className="text-xs text-muted-foreground">GET</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-1 text-center text-xs">
                          {[
                            { label: 'Prot.', value: a.proteinTarget, unit: 'g' },
                            { label: 'Carb.', value: a.carbsTarget, unit: 'g' },
                            { label: 'Gord.', value: a.fatTarget, unit: 'g' },
                            { label: 'Fibra', value: a.fiberTarget, unit: 'g' },
                            { label: 'Água', value: a.waterTarget, unit: 'ml' },
                          ].map((m) => (
                            <div key={m.label} className="glass rounded-lg p-1.5">
                              <div className="font-semibold">{m.value ?? '—'}</div>
                              <div className="text-muted-foreground">{m.label}</div>
                            </div>
                          ))}
                        </div>
                        {(a.dietaryRestrictions?.length > 0 || a.foodAllergies?.length > 0) && (
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {a.dietaryRestrictions?.length > 0 && (
                              <p>Restrições: {a.dietaryRestrictions.join(', ')}</p>
                            )}
                            {a.foodAllergies?.length > 0 && (
                              <p>Alergias: {a.foodAllergies.join(', ')}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Avaliação antropométrica */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card">
        <button
          type="button"
          onClick={() => setPhysicalOpen((o) => !o)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="font-semibold flex items-center gap-2">
            <Scale className="w-4 h-4 text-orange-400" />
            Avaliação Antropométrica
            {physicalAssessments && physicalAssessments.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 ml-1">
                {physicalAssessments.length} registro{physicalAssessments.length > 1 ? 's' : ''}
              </span>
            )}
          </h2>
          {physicalOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {physicalOpen && (
          <div className="mt-5 space-y-6">
            <form onSubmit={handlePhysicalSubmit} className="space-y-5">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-orange-400" />
                Nova avaliação
              </h3>

              {/* Medidas básicas */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Medidas Básicas</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Peso (kg) *</label>
                    <input type="number" step="0.1" min="1" value={physicalForm.weight}
                      onChange={(e) => setPhyField('weight', e.target.value)}
                      placeholder="70.5" className="input-field" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Altura (cm) *</label>
                    <input type="number" step="0.1" min="1" value={physicalForm.height}
                      onChange={(e) => setPhyField('height', e.target.value)}
                      placeholder="170" className="input-field" required />
                  </div>
                </div>

                {physicalBmi && (
                  <div className={cn(
                    'glass rounded-xl p-3 flex items-center justify-between',
                    physicalBmi < 18.5 ? 'border border-blue-500/30' :
                    physicalBmi < 25 ? 'border border-emerald-500/30' :
                    physicalBmi < 30 ? 'border border-yellow-500/30' : 'border border-red-500/30',
                  )}>
                    <span className="text-sm text-muted-foreground">IMC calculado</span>
                    <div className="text-right">
                      <span className={cn(
                        'text-lg font-bold',
                        physicalBmi < 18.5 ? 'text-blue-400' :
                        physicalBmi < 25 ? 'text-emerald-400' :
                        physicalBmi < 30 ? 'text-yellow-400' : 'text-red-400',
                      )}>{physicalBmi.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {physicalBmi < 18.5 ? 'Abaixo do peso' : physicalBmi < 25 ? 'Peso normal' : physicalBmi < 30 ? 'Sobrepeso' : 'Obesidade'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Composição corporal */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Composição Corporal</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'bodyFatPercent', label: '% Gordura', placeholder: '20.5' },
                    { key: 'muscleMassKg', label: 'Massa muscular (kg)', placeholder: '35.0' },
                    { key: 'visceralFat', label: 'Gordura visceral', placeholder: '8' },
                    { key: 'waterPercent', label: '% Água corporal', placeholder: '55.0' },
                    { key: 'metabolicAge', label: 'Idade metabólica', placeholder: '28' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-sm font-medium mb-1.5 block">{label}</label>
                      <input type="number" step="0.1" min="0"
                        value={(physicalForm as any)[key]}
                        onChange={(e) => setPhyField(key, e.target.value)}
                        placeholder={placeholder} className="input-field" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Perimetria */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Perimetria (cm)</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'neckCm', label: 'Pescoço' },
                    { key: 'shouldersCm', label: 'Ombros' },
                    { key: 'chestCm', label: 'Tórax' },
                    { key: 'waistCm', label: 'Cintura' },
                    { key: 'abdomenCm', label: 'Abdômen' },
                    { key: 'hipCm', label: 'Quadril' },
                    { key: 'rightArmCm', label: 'Braço D' },
                    { key: 'leftArmCm', label: 'Braço E' },
                    { key: 'rightThighCm', label: 'Coxa D' },
                    { key: 'leftThighCm', label: 'Coxa E' },
                    { key: 'rightCalfCm', label: 'Panturrilha D' },
                    { key: 'leftCalfCm', label: 'Panturrilha E' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-sm font-medium mb-1.5 block">{label}</label>
                      <input type="number" step="0.1" min="0"
                        value={(physicalForm as any)[key]}
                        onChange={(e) => setPhyField(key, e.target.value)}
                        placeholder="—" className="input-field" />
                    </div>
                  ))}
                </div>

                {/* Relação cintura-quadril */}
                {physicalForm.waistCm && physicalForm.hipCm && (
                  <div className="glass rounded-xl p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Relação cintura/quadril (RCQ)</span>
                    <span className="font-bold text-orange-400">
                      {(parseFloat(physicalForm.waistCm) / parseFloat(physicalForm.hipCm)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Observações</label>
                <textarea value={physicalForm.notes} onChange={(e) => setPhyField('notes', e.target.value)}
                  placeholder="Observações adicionais..." rows={2} className="input-field resize-none" />
              </div>

              <button type="submit" disabled={physicalMutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" />
                {physicalMutation.isPending ? 'Salvando...' : 'Registrar avaliação'}
              </button>
            </form>

            {/* Histórico */}
            {physicalAssessments && physicalAssessments.length > 0 && (
              <div>
                <button type="button" onClick={() => setShowPhysicalHistory((h) => !h)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <History className="w-4 h-4" />
                  {showPhysicalHistory ? 'Ocultar histórico' : `Ver histórico (${physicalAssessments.length})`}
                </button>

                {showPhysicalHistory && (
                  <div className="mt-3 space-y-3">
                    {physicalLoading ? (
                      <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
                    ) : physicalAssessments.map((a: any) => (
                      <div key={a.id} className="glass rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(a.assessedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-xs font-medium">
                            {a.weight} kg · {(a.height * 100).toFixed(0)} cm · IMC {a.bmi?.toFixed(1)}
                          </span>
                        </div>

                        {(a.bodyFatPercent || a.muscleMassKg || a.waterPercent || a.visceralFat) && (
                          <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            {[
                              { label: '% Gord.', value: a.bodyFatPercent, suffix: '%' },
                              { label: 'Músculo', value: a.muscleMassKg, suffix: 'kg' },
                              { label: '% Água', value: a.waterPercent, suffix: '%' },
                              { label: 'Visceral', value: a.visceralFat, suffix: '' },
                            ].map((m) => m.value != null && (
                              <div key={m.label} className="glass rounded-lg p-1.5">
                                <div className="font-semibold">{m.value}{m.suffix}</div>
                                <div className="text-muted-foreground">{m.label}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {(a.waistCm || a.hipCm || a.abdomenCm) && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {[
                              { label: 'Cintura', value: a.waistCm },
                              { label: 'Quadril', value: a.hipCm },
                              { label: 'Abdômen', value: a.abdomenCm },
                              { label: 'Tórax', value: a.chestCm },
                              { label: 'Braço D', value: a.rightArmCm },
                              { label: 'Coxa D', value: a.rightThighCm },
                            ].filter((m) => m.value != null).map((m) => (
                              <span key={m.label} className="glass px-2 py-1 rounded-lg">
                                {m.label}: <strong>{m.value} cm</strong>
                              </span>
                            ))}
                            {a.waistCm && a.hipCm && (
                              <span className="glass px-2 py-1 rounded-lg text-orange-400">
                                RCQ: <strong>{(a.waistCm / a.hipCm).toFixed(2)}</strong>
                              </span>
                            )}
                          </div>
                        )}

                        {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Registro de consulta nutricional */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }} className="glass-card">
        <button type="button" onClick={() => setConsultOpen((o) => !o)} className="w-full flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-sky-400" />
            Consultas Nutricionais
            {consultations && consultations.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 ml-1">
                {consultations.length} registro{consultations.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          {consultOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {consultOpen && (
          <div className="mt-5 space-y-6">
            {/* Histórico de consultas */}
            {consultLoading ? (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}</div>
            ) : consultations && consultations.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-sky-400 uppercase tracking-wide">Histórico</p>
                {consultations.map((c: any) => {
                  const status = getConsultationStatus(c);
                  const s = CONSULTATION_STATUS[status];
                  const isCompleting = completingId === c.id;
                  return (
                    <div key={c.id} className="glass rounded-xl overflow-hidden">
                      <div className="p-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', s.bg, s.color)}>
                              {s.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(c.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {' '}
                              {new Date(c.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {c.notes && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.notes}</p>}
                          {c.nextConsultation && (
                            <p className="text-xs text-sky-400 mt-1">
                              Próxima: {new Date(c.nextConsultation).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                        {status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => setCompletingId(isCompleting ? null : c.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex-shrink-0"
                          >
                            {isCompleting ? <X className="w-3.5 h-3.5" /> : 'Concluir'}
                          </button>
                        )}
                      </div>

                      {isCompleting && (
                        <div className="border-t border-white/5 p-4 space-y-3 bg-white/2">
                          <p className="text-xs font-semibold text-emerald-400">Registrar como concluída</p>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Anotações da consulta</label>
                            <textarea
                              value={completeNotes}
                              onChange={(e) => setCompleteNotes(e.target.value)}
                              placeholder="Resumo, orientações, observações clínicas..."
                              rows={3}
                              className="input-field resize-none"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">Data da próxima consulta</label>
                            <input
                              type="datetime-local"
                              value={completeNext}
                              onChange={(e) => setCompleteNext(e.target.value)}
                              className="input-field"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={completeConsultMutation.isPending}
                            onClick={() => completeConsultMutation.mutate({ consultationId: c.id, notes: completeNotes, nextConsultation: completeNext })}
                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                          >
                            <Save className="w-4 h-4" />
                            {completeConsultMutation.isPending ? 'Salvando...' : 'Salvar e concluir'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Agendar nova consulta */}
            <form onSubmit={handleConsultSubmit} className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                Agendar consulta
              </h3>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Data e hora *</label>
                <input
                  type="datetime-local"
                  value={consultScheduledAt}
                  onChange={(e) => setConsultScheduledAt(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Anotações prévias</label>
                <textarea
                  value={consultNotes}
                  onChange={(e) => setConsultNotes(e.target.value)}
                  placeholder="Objetivos da consulta, tópicos a abordar..."
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Próxima consulta (opcional)</label>
                <input
                  type="datetime-local"
                  value={consultNext}
                  onChange={(e) => setConsultNext(e.target.value)}
                  className="input-field"
                />
              </div>

              <button
                type="submit"
                disabled={createConsultMutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Calendar className="w-4 h-4" />
                {createConsultMutation.isPending ? 'Agendando...' : 'Agendar consulta'}
              </button>
            </form>
          </div>
        )}
      </motion.div>

      {/* Plano de suplementação */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="glass-card">
        <button type="button" onClick={() => setSuppOpen((o) => !o)} className="w-full flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Apple className="w-4 h-4 text-lime-400" />
            Plano de Suplementação
            {suppPlans && suppPlans.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-400 ml-1">
                {suppPlans.filter((p: any) => p.isActive).length} ativo{suppPlans.filter((p: any) => p.isActive).length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          {suppOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {suppOpen && (
          <div className="mt-5 space-y-6">
            {/* Planos existentes */}
            {suppLoading ? (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}</div>
            ) : suppPlans && suppPlans.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-lime-400 uppercase tracking-wide">Planos existentes</p>
                {suppPlans.map((plan: any) => (
                  <div key={plan.id} className={cn('glass rounded-xl overflow-hidden border', plan.isActive ? 'border-lime-500/20' : 'border-white/5 opacity-60')}>
                    <button
                      type="button"
                      onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <div>
                        <div className="font-medium text-sm">{plan.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(plan.startDate).toLocaleDateString('pt-BR')}
                          {plan.endDate && ` → ${new Date(plan.endDate).toLocaleDateString('pt-BR')}`}
                          {' · '}{plan.items.length} suplemento{plan.items.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); togglePlanActive.mutate({ planId: plan.id, isActive: !plan.isActive }); }}
                          className={cn('text-xs px-2 py-1 rounded-lg transition-colors', plan.isActive ? 'bg-lime-500/20 text-lime-400 hover:bg-lime-500/30' : 'bg-white/5 text-muted-foreground hover:bg-white/10')}
                        >
                          {plan.isActive ? 'Ativo' : 'Inativo'}
                        </button>
                        {expandedPlan === plan.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {expandedPlan === plan.id && (
                      <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                        {plan.items.map((item: any, i: number) => (
                          <div key={item.id ?? i} className="glass rounded-lg p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">{item.name}</span>
                              <span className="text-xs font-medium text-lime-400">{item.dosage}</span>
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                              <span>{item.frequency}</span>
                              {item.timing && <span>· {item.timing}</span>}
                            </div>
                            {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                          </div>
                        ))}
                        {plan.observations && <p className="text-xs text-muted-foreground pt-1">{plan.observations}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Novo plano */}
            <form onSubmit={handleSuppSubmit} className="space-y-5">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-lime-400" />
                Novo plano
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nome do plano *</label>
                  <input
                    type="text"
                    value={suppPlanName}
                    onChange={(e) => setSuppPlanName(e.target.value)}
                    placeholder="Ex: Suplementação para hipertrofia"
                    className="input-field"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Início *</label>
                    <input type="date" value={suppStartDate} onChange={(e) => setSuppStartDate(e.target.value)} className="input-field" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Término</label>
                    <input type="date" value={suppEndDate} onChange={(e) => setSuppEndDate(e.target.value)} className="input-field" min={suppStartDate} />
                  </div>
                </div>
              </div>

              {/* Itens */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-lime-400 uppercase tracking-wide">Suplementos</p>
                {suppItems.map((item, i) => (
                  <div key={i} className="glass rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Suplemento {i + 1}</span>
                      {suppItems.length > 1 && (
                        <button type="button" onClick={() => removeSuppItem(i)} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                          Remover
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-sm font-medium mb-1.5 block">Nome *</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateSuppItem(i, 'name', e.target.value)}
                          placeholder="Ex: Whey Protein, Creatina"
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Dosagem *</label>
                        <input
                          type="text"
                          value={item.dosage}
                          onChange={(e) => updateSuppItem(i, 'dosage', e.target.value)}
                          placeholder="Ex: 30g, 5g, 2 cáps."
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Frequência *</label>
                        <input
                          type="text"
                          value={item.frequency}
                          onChange={(e) => updateSuppItem(i, 'frequency', e.target.value)}
                          placeholder="Ex: 1x ao dia"
                          className="input-field"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium mb-1.5 block">Momento de uso</label>
                        <select value={item.timing} onChange={(e) => updateSuppItem(i, 'timing', e.target.value)} className="input-field">
                          <option value="">Selecione...</option>
                          {TIMING_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium mb-1.5 block">Observações</label>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => updateSuppItem(i, 'notes', e.target.value)}
                          placeholder="Ex: Tomar com 200ml de água"
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" onClick={addSuppItem} className="w-full glass rounded-xl p-3 text-sm text-lime-400 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 border border-dashed border-lime-500/30">
                  <Plus className="w-4 h-4" />
                  Adicionar suplemento
                </button>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Observações gerais</label>
                <textarea value={suppObs} onChange={(e) => setSuppObs(e.target.value)} placeholder="Orientações gerais sobre o plano..." rows={2} className="input-field resize-none" />
              </div>

              <button type="submit" disabled={suppMutation.isPending} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" />
                {suppMutation.isPending ? 'Salvando...' : 'Criar plano'}
              </button>
            </form>
          </div>
        )}
      </motion.div>

      {/* Assign diet */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleDietAssign}
        className="glass-card space-y-4"
      >
        <h2 className="font-semibold flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          Atribuir dieta
        </h2>
        <p className="text-xs text-muted-foreground">A dieta ativa do paciente será substituída pela selecionada.</p>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Dieta *</label>
          <select value={selectedDiet} onChange={(e) => setSelectedDiet(e.target.value)} className="input-field">
            <option value="">Selecione uma dieta...</option>
            {(diets || []).map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.totalCalories ? ` — ${d.totalCalories} kcal` : ''}
              </option>
            ))}
          </select>
        </div>

        {dietError && <div className="glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">{dietError}</div>}
        {dietSuccess && <div className="glass rounded-xl p-3 border border-emerald-500/20 text-emerald-400 text-sm">Dieta atribuída com sucesso!</div>}

        <button type="submit" disabled={dietMutation.isPending} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
          <UserCheck className="w-4 h-4" />
          {dietMutation.isPending ? 'Atribuindo...' : 'Atribuir dieta'}
        </button>
      </motion.form>

      {/* Assign workout */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onSubmit={handleWorkoutAssign}
        className="glass-card space-y-5"
      >
        <h2 className="font-semibold flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-purple-400" />
          Atribuir treino
        </h2>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Treino *</label>
          <select value={selectedWorkout} onChange={(e) => setSelectedWorkout(e.target.value)} className="input-field">
            <option value="">Selecione um treino...</option>
            {(workouts || []).map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.name}{w.duration ? ` — ${w.duration} min` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Dias da semana *
          </label>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((d) => {
              const active = dayOfWeek.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`w-11 h-11 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                    active ? 'bg-primary text-primary-foreground' : 'glass hover:bg-accent text-muted-foreground'
                  }`}
                >
                  {active ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Data de início *</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Data de término</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" min={startDate} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Observações</label>
          <input type="text" value={workoutNotes} onChange={(e) => setWorkoutNotes(e.target.value)} placeholder="Ex: Foco em progressão de carga" className="input-field" />
        </div>

        {workoutError && <div className="glass rounded-xl p-3 border border-red-500/20 text-red-400 text-sm">{workoutError}</div>}
        {workoutSuccess && <div className="glass rounded-xl p-3 border border-emerald-500/20 text-emerald-400 text-sm">Treino atribuído com sucesso!</div>}

        <button type="submit" disabled={workoutMutation.isPending} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
          <Dumbbell className="w-4 h-4" />
          {workoutMutation.isPending ? 'Atribuindo...' : 'Atribuir treino'}
        </button>
      </motion.form>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card">
        <h2 className="font-semibold mb-4">Ações rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/nutritionist/diets/new" className="glass rounded-xl p-4 flex items-center gap-3 hover:bg-accent transition-all">
            <Apple className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-medium">Nova dieta</div>
              <div className="text-xs text-muted-foreground">Criar plano alimentar</div>
            </div>
          </Link>
          <Link href="/nutritionist/schedule" className="glass rounded-xl p-4 flex items-center gap-3 hover:bg-accent transition-all">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-sm font-medium">Agendar consulta</div>
              <div className="text-xs text-muted-foreground">Marcar sessão</div>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
