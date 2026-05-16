'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, ChevronLeft, Apple, Calendar, MessageCircle, UserCheck, Dumbbell,
  CheckSquare, Square, ClipboardList, ChevronDown, ChevronUp, Save, Scale,
  Plus, History, ClipboardCheck, X, TrendingUp, TrendingDown, Minus, Activity,
  Camera, Trash2, ImageOff, Target, BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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

const GOAL_TYPE_OPTIONS = [
  { value: 'LOSE_WEIGHT', label: 'Perda de peso' },
  { value: 'GAIN_MUSCLE', label: 'Ganho muscular' },
  { value: 'MAINTAIN_WEIGHT', label: 'Manutenção' },
  { value: 'IMPROVE_ENDURANCE', label: 'Resistência' },
  { value: 'INCREASE_FLEXIBILITY', label: 'Flexibilidade' },
  { value: 'ATHLETIC_PERFORMANCE', label: 'Performance atlética' },
  { value: 'REHABILITATION', label: 'Reabilitação' },
];

const EMPTY_GOAL = {
  type: 'LOSE_WEIGHT',
  title: '',
  description: '',
  targetValue: '',
  currentValue: '',
  unit: '',
  targetDate: '',
};

const EVOLUTION_METRICS = [
  { key: 'weight', label: 'Peso (kg)', color: '#10b981' },
  { key: 'bmi', label: 'IMC', color: '#8b5cf6' },
  { key: 'bodyFatPercent', label: '% Gordura', color: '#f59e0b' },
  { key: 'muscleMassKg', label: 'Músculo (kg)', color: '#3b82f6' },
  { key: 'waistCm', label: 'Cintura (cm)', color: '#ef4444' },
];

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

  const [dietHistoryOpen, setDietHistoryOpen] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL);
  const [editingProgress, setEditingProgress] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState('');

  const [photosOpen, setPhotosOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoAngle, setPhotoAngle] = useState('Frente');
  const [photoDate, setPhotoDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [photoWeight, setPhotoWeight] = useState('');
  const [photoNotes, setPhotoNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState('');

  const [weightLogOpen, setWeightLogOpen] = useState(false);
  const [weightDate, setWeightDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [weightValue, setWeightValue] = useState('');
  const [weightNotes, setWeightNotes] = useState('');

  const [evolutionOpen, setEvolutionOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState('weight');

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

  const { data: dietHistory, isLoading: dietHistoryLoading } = useQuery({
    queryKey: ['patient-diet-history', id],
    queryFn: () =>
      api.get(`/nutritionists/me/patients/${id}/diet-history`).then((r) => r.data),
    enabled: !!patient && dietHistoryOpen,
  });

  const toggleDietPlanMutation = useMutation({
    mutationFn: ({ planId, isActive }: { planId: string; isActive: boolean }) =>
      api.patch(`/nutritionists/me/diet-plans/${planId}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-diet-history', id] }),
    onError: () => toast.error('Erro ao atualizar plano'),
  });

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['patient-goals', id],
    queryFn: () => api.get(`/nutritionists/me/patients/${id}/goals`).then((r) => r.data),
    enabled: !!patient && goalsOpen,
  });

  const createGoalMutation = useMutation({
    mutationFn: (data: any) => api.post(`/nutritionists/me/patients/${id}/goals`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-goals', id] });
      setGoalForm(EMPTY_GOAL);
      toast.success('Meta criada!');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || e.message || 'Erro ao criar meta';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ goalId, ...data }: any) =>
      api.patch(`/nutritionists/me/goals/${goalId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-goals', id] });
      setEditingProgress(null);
      setProgressValue('');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || e.message || 'Erro ao atualizar meta';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: string) => api.delete(`/nutritionists/me/goals/${goalId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-goals', id] });
      toast.success('Meta removida');
    },
    onError: () => toast.error('Erro ao remover meta'),
  });

  const setGoalField = (field: string, value: any) =>
    setGoalForm((prev) => ({ ...prev, [field]: value }));

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.title.trim()) { toast.error('Informe o título da meta'); return; }
    createGoalMutation.mutate({
      type: goalForm.type,
      title: goalForm.title.trim(),
      description: goalForm.description || null,
      targetValue: goalForm.targetValue ? parseFloat(goalForm.targetValue) : null,
      currentValue: goalForm.currentValue ? parseFloat(goalForm.currentValue) : null,
      unit: goalForm.unit || null,
      targetDate: goalForm.targetDate ? new Date(goalForm.targetDate).toISOString() : null,
    });
  };

  const { data: progressPhotos, isLoading: photosLoading } = useQuery({
    queryKey: ['progress-photos', id],
    queryFn: () =>
      api.get(`/nutritionists/me/patients/${id}/progress-photos`).then((r) => r.data),
    enabled: !!patient && photosOpen,
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: string) =>
      api.delete(`/nutritionists/me/patients/${id}/progress-photos/${photoId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress-photos', id] });
      toast.success('Foto removida');
    },
    onError: () => toast.error('Erro ao remover foto'),
  });

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) { toast.error('Selecione uma foto'); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', photoFile);
      const { data: uploaded } = await api.post('/uploads/progress-photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.post(`/nutritionists/me/patients/${id}/progress-photos`, {
        photoUrl: uploaded.url,
        angle: photoAngle,
        takenAt: new Date(photoDate).toISOString(),
        weight: photoWeight ? parseFloat(photoWeight) : null,
        notes: photoNotes || null,
      });
      qc.invalidateQueries({ queryKey: ['progress-photos', id] });
      setPhotoFile(null);
      setPhotoPreview('');
      setPhotoAngle('Frente');
      setPhotoDate(new Date().toISOString().slice(0, 16));
      setPhotoWeight('');
      setPhotoNotes('');
      toast.success('Foto registrada com sucesso!');
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Erro ao enviar foto';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setUploading(false);
    }
  };

  const photosByDate = progressPhotos
    ? Object.entries(
        progressPhotos.reduce((acc: any, p: any) => {
          const key = new Date(p.takenAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
          if (!acc[key]) acc[key] = [];
          acc[key].push(p);
          return acc;
        }, {}),
      )
    : [];

  const { data: weightLog, isLoading: weightLogLoading } = useQuery({
    queryKey: ['weight-log', id],
    queryFn: () =>
      api.get(`/nutritionists/me/patients/${id}/weight-log`).then((r) => r.data),
    enabled: !!patient && weightLogOpen,
  });

  const addWeightMutation = useMutation({
    mutationFn: (data: any) =>
      api.post(`/nutritionists/me/patients/${id}/weight-log`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight-log', id] });
      setWeightValue('');
      setWeightNotes('');
      toast.success('Peso registrado!');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || e.message || 'Erro ao registrar peso';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightValue) { toast.error('Informe o peso'); return; }
    addWeightMutation.mutate({
      weight: parseFloat(weightValue),
      measuredAt: new Date(weightDate).toISOString(),
      notes: weightNotes || null,
    });
  };

  const weightChartData = weightLog
    ? [...weightLog].reverse().map((w: any) => ({
        date: new Date(w.measuredAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        peso: w.weight,
      }))
    : [];

  const weightStats = (() => {
    if (!weightLog || weightLog.length === 0) return null;
    const weights = weightLog.map((w: any) => w.weight).filter(Boolean);
    const latest = weights[0];
    const oldest = weights[weights.length - 1];
    const diff = parseFloat((latest - oldest).toFixed(1));
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    return { latest, oldest, diff, min, max, count: weights.length };
  })();

  const { data: evolution, isLoading: evolutionLoading } = useQuery({
    queryKey: ['patient-evolution', id],
    queryFn: () =>
      api.get(`/nutritionists/me/patients/${id}/evolution`).then((r) => r.data),
    enabled: !!patient && evolutionOpen,
  });

  const evolutionChartData = evolution?.physical?.map((p: any) => ({
    date: new Date(p.assessedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    weight: p.weight,
    bmi: p.bmi ? parseFloat(p.bmi.toFixed(1)) : null,
    bodyFatPercent: p.bodyFatPercent,
    muscleMassKg: p.muscleMassKg,
    waistCm: p.waistCm,
  })) ?? [];

  const evolutionDelta = (() => {
    const data = evolution?.physical;
    if (!data || data.length < 2) return null;
    const first = data[0];
    const last = data[data.length - 1];
    return EVOLUTION_METRICS.map(({ key, label }) => {
      const f = first[key];
      const l = last[key];
      if (f == null || l == null) return null;
      const diff = parseFloat((l - f).toFixed(1));
      return { key, label, first: f, last: l, diff };
    }).filter(Boolean);
  })();

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

      {/* Histórico de dietas */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.250 }} className="glass-card">
        <button type="button" onClick={() => setDietHistoryOpen((o) => !o)} className="w-full flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-400" />
            Histórico de Dietas
            {dietHistory && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 ml-1">
                {dietHistory.length} plano{dietHistory.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          {dietHistoryOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {dietHistoryOpen && (
          <div className="mt-5 space-y-3">
            {dietHistoryLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}</div>
            ) : !dietHistory || dietHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma dieta atribuída ainda.
              </div>
            ) : (
              dietHistory.map((plan: any) => {
                const expanded = expandedPlanId === plan.id;
                return (
                  <div key={plan.id} className={cn(
                    'glass rounded-xl overflow-hidden border transition-all',
                    plan.isActive ? 'border-teal-500/20' : 'border-white/5',
                  )}>
                    <button
                      type="button"
                      onClick={() => setExpandedPlanId(expanded ? null : plan.id)}
                      className="w-full p-4 flex items-start justify-between text-left gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{plan.diet.name}</span>
                          <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded-full font-medium',
                            plan.isActive ? 'bg-teal-500/10 text-teal-400' : 'bg-white/5 text-muted-foreground',
                          )}>
                            {plan.isActive ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                          <span>Início: {new Date(plan.startDate).toLocaleDateString('pt-BR')}</span>
                          {plan.endDate && <span>Término: {new Date(plan.endDate).toLocaleDateString('pt-BR')}</span>}
                          <span>{plan._count.mealLogs} registro{plan._count.mealLogs !== 1 ? 's' : ''} de refeição</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleDietPlanMutation.mutate({ planId: plan.id, isActive: !plan.isActive }); }}
                          className={cn(
                            'text-xs px-2 py-1 rounded-lg transition-colors',
                            plan.isActive
                              ? 'bg-white/5 text-muted-foreground hover:bg-white/10'
                              : 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20',
                          )}
                        >
                          {plan.isActive ? 'Inativar' : 'Ativar'}
                        </button>
                        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                        {plan.diet.description && (
                          <p className="text-sm text-muted-foreground">{plan.diet.description}</p>
                        )}

                        {/* Macros */}
                        {plan.diet.totalCalories && (
                          <div className="grid grid-cols-5 gap-2 text-center text-xs">
                            {[
                              { label: 'Calorias', value: plan.diet.totalCalories, unit: 'kcal', color: 'text-amber-400' },
                              { label: 'Proteína', value: plan.diet.totalProtein, unit: 'g', color: 'text-red-400' },
                              { label: 'Carbs', value: plan.diet.totalCarbs, unit: 'g', color: 'text-yellow-400' },
                              { label: 'Gordura', value: plan.diet.totalFat, unit: 'g', color: 'text-orange-400' },
                              { label: 'Fibras', value: plan.diet.totalFiber, unit: 'g', color: 'text-green-400' },
                            ].map((m) => m.value != null && (
                              <div key={m.label} className="glass rounded-lg p-2">
                                <div className={cn('font-bold', m.color)}>{Math.round(m.value)}</div>
                                <div className="text-muted-foreground">{m.label}</div>
                                <div className="text-muted-foreground/60">{m.unit}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Tags */}
                        {plan.diet.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {plan.diet.tags.map((tag: string) => (
                              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {plan.notes && (
                          <p className="text-xs text-muted-foreground italic">{plan.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </motion.div>

      {/* Metas e objetivos */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.251 }} className="glass-card">
        <button type="button" onClick={() => setGoalsOpen((o) => !o)} className="w-full flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            Metas e Objetivos
            {goals && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ml-1">
                {goals.filter((g: any) => !g.isCompleted).length} ativa{goals.filter((g: any) => !g.isCompleted).length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          {goalsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {goalsOpen && (
          <div className="mt-5 space-y-6">
            {/* Lista de metas */}
            {goalsLoading ? (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}</div>
            ) : goals && goals.length > 0 && (
              <div className="space-y-3">
                {/* Ativas */}
                {goals.filter((g: any) => !g.isCompleted).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Em andamento</p>
                    {goals.filter((g: any) => !g.isCompleted).map((g: any) => {
                      const pct = g.targetValue && g.currentValue != null
                        ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))
                        : null;
                      const isEditing = editingProgress === g.id;
                      return (
                        <div key={g.id} className="glass rounded-xl p-4 space-y-3 border border-amber-500/10">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold">{g.title}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground">
                                  {GOAL_TYPE_OPTIONS.find((t) => t.value === g.type)?.label ?? g.type}
                                </span>
                              </div>
                              {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                              {g.targetDate && (
                                <p className="text-xs text-amber-400/70 mt-0.5">
                                  Prazo: {new Date(g.targetDate).toLocaleDateString('pt-BR')}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => updateGoalMutation.mutate({ goalId: g.id, isCompleted: true })}
                                className="text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                title="Marcar como concluída"
                              >✓</button>
                              <button
                                type="button"
                                onClick={() => deleteGoalMutation.mutate(g.id)}
                                className="text-xs px-2 py-1 rounded-lg bg-white/5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              ><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>

                          {/* Progresso */}
                          {g.targetValue != null && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Progresso</span>
                                <span className="font-medium">
                                  {g.currentValue ?? 0}{g.unit ? ` ${g.unit}` : ''} / {g.targetValue}{g.unit ? ` ${g.unit}` : ''}
                                  {pct != null && <span className="text-amber-400 ml-1">({pct}%)</span>}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
                                  style={{ width: `${pct ?? 0}%` }}
                                />
                              </div>
                              {isEditing ? (
                                <div className="flex gap-2 pt-1">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={progressValue}
                                    onChange={(e) => setProgressValue(e.target.value)}
                                    placeholder={`Valor atual (${g.unit || 'unidade'})`}
                                    className="input-field text-sm flex-1"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateGoalMutation.mutate({ goalId: g.id, currentValue: parseFloat(progressValue) })}
                                    disabled={!progressValue || updateGoalMutation.isPending}
                                    className="btn-primary text-xs px-3 disabled:opacity-50"
                                  >Salvar</button>
                                  <button type="button" onClick={() => setEditingProgress(null)} className="glass px-3 rounded-xl text-xs">✕</button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setEditingProgress(g.id); setProgressValue(String(g.currentValue ?? '')); }}
                                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                                >
                                  Atualizar progresso
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Concluídas */}
                {goals.filter((g: any) => g.isCompleted).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Concluídas</p>
                    {goals.filter((g: any) => g.isCompleted).map((g: any) => (
                      <div key={g.id} className="glass rounded-xl p-3 flex items-center justify-between opacity-70 border border-emerald-500/10">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">✓</span>
                            <span className="text-sm font-medium line-through text-muted-foreground">{g.title}</span>
                          </div>
                          {g.completedAt && (
                            <p className="text-xs text-emerald-400/70 mt-0.5 ml-5">
                              Concluída em {new Date(g.completedAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <button type="button" onClick={() => deleteGoalMutation.mutate(g.id)}
                          className="text-xs p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-muted-foreground transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Nova meta */}
            <form onSubmit={handleGoalSubmit} className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                Nova meta
              </h3>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Tipo *</label>
                <select value={goalForm.type} onChange={(e) => setGoalField('type', e.target.value)} className="input-field">
                  {GOAL_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Título *</label>
                <input
                  type="text"
                  value={goalForm.title}
                  onChange={(e) => setGoalField('title', e.target.value)}
                  placeholder="Ex: Perder 5 kg em 3 meses"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Descrição</label>
                <textarea
                  value={goalForm.description}
                  onChange={(e) => setGoalField('description', e.target.value)}
                  placeholder="Detalhes, estratégia, motivação..."
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Valor inicial</label>
                  <input type="number" step="0.1" value={goalForm.currentValue}
                    onChange={(e) => setGoalField('currentValue', e.target.value)}
                    placeholder="0" className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Meta</label>
                  <input type="number" step="0.1" value={goalForm.targetValue}
                    onChange={(e) => setGoalField('targetValue', e.target.value)}
                    placeholder="5" className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Unidade</label>
                  <input type="text" value={goalForm.unit}
                    onChange={(e) => setGoalField('unit', e.target.value)}
                    placeholder="kg, %" className="input-field" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Prazo</label>
                <input type="date" value={goalForm.targetDate}
                  onChange={(e) => setGoalField('targetDate', e.target.value)}
                  className="input-field" />
              </div>

              <button type="submit" disabled={createGoalMutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" />
                {createGoalMutation.isPending ? 'Salvando...' : 'Criar meta'}
              </button>
            </form>
          </div>
        )}
      </motion.div>

      {/* Fotos de progresso */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.252 }} className="glass-card">
        <button type="button" onClick={() => setPhotosOpen((o) => !o)} className="w-full flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Camera className="w-4 h-4 text-violet-400" />
            Fotos de Progresso
            {progressPhotos && progressPhotos.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 ml-1">
                {progressPhotos.length} foto{progressPhotos.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          {photosOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {photosOpen && (
          <div className="mt-5 space-y-6">
            {/* Formulário de upload */}
            <form onSubmit={handlePhotoSubmit} className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-violet-400" />
                Adicionar foto
              </h3>

              {/* Área de seleção */}
              <label className={cn(
                'flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed cursor-pointer transition-all',
                photoPreview ? 'border-violet-500/50 p-1' : 'border-white/10 hover:border-violet-500/40 hover:bg-white/2',
              )}>
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" className="h-full w-full object-contain rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Camera className="w-8 h-8" />
                    <span className="text-sm">Clique para selecionar foto</span>
                    <span className="text-xs">JPEG, PNG ou WEBP · máx. 10MB</span>
                  </div>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoFileChange} />
              </label>

              {photoPreview && (
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(''); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <X className="w-3 h-3" /> Remover foto
                </button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Ângulo *</label>
                  <select value={photoAngle} onChange={(e) => setPhotoAngle(e.target.value)} className="input-field">
                    {['Frente', 'Costas', 'Lateral esquerda', 'Lateral direita'].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Peso no dia (kg)</label>
                  <input type="number" step="0.1" min="1" value={photoWeight}
                    onChange={(e) => setPhotoWeight(e.target.value)} placeholder="70.5" className="input-field" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Data</label>
                <input type="datetime-local" value={photoDate} onChange={(e) => setPhotoDate(e.target.value)} className="input-field" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Observações</label>
                <input type="text" value={photoNotes} onChange={(e) => setPhotoNotes(e.target.value)}
                  placeholder="Ex: início do ciclo, 8 semanas de treino..." className="input-field" />
              </div>

              <button type="submit" disabled={uploading || !photoFile}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                <Camera className="w-4 h-4" />
                {uploading ? 'Enviando...' : 'Salvar foto'}
              </button>
            </form>

            {/* Galeria */}
            {photosLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {[...Array(3)].map((_, i) => <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : photosByDate.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <ImageOff className="w-8 h-8" />
                <span className="text-sm">Nenhuma foto registrada ainda</span>
              </div>
            ) : (
              <div className="space-y-5">
                {photosByDate.map(([date, photos]: any) => (
                  <div key={date}>
                    <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-3">{date}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {photos.map((p: any) => (
                        <div key={p.id} className="group relative rounded-xl overflow-hidden aspect-[3/4] bg-white/5">
                          <img
                            src={p.photoUrl}
                            alt={p.angle}
                            className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                            onClick={() => setLightboxUrl(p.photoUrl)}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-medium text-white">{p.angle}</span>
                                {p.weight && <span className="text-xs text-white/70 ml-2">{p.weight} kg</span>}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); deletePhotoMutation.mutate(p.id); }}
                                className="w-7 h-7 rounded-lg bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-colors pointer-events-auto"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-white" />
                              </button>
                            </div>
                            {p.notes && <p className="text-xs text-white/70 mt-0.5 line-clamp-1">{p.notes}</p>}
                          </div>
                          <div className="absolute top-2 left-2">
                            <span className="text-xs px-1.5 py-0.5 rounded-md bg-black/50 text-white/80 backdrop-blur-sm">{p.angle}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl('')}
        >
          <button type="button" onClick={() => setLightboxUrl('')} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
          <img src={lightboxUrl} alt="Foto de progresso" className="max-h-[90vh] max-w-full object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Registro de peso diário */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.255 }} className="glass-card">
        <button type="button" onClick={() => setWeightLogOpen((o) => !o)} className="w-full flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-400" />
            Registro de Peso Diário
            {weightLog && weightLog.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 ml-1">
                {weightLog.length} registro{weightLog.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          {weightLogOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {weightLogOpen && (
          <div className="mt-5 space-y-5">
            {/* Formulário de registro */}
            <form onSubmit={handleWeightSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Peso (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={weightValue}
                    onChange={(e) => setWeightValue(e.target.value)}
                    placeholder="70.5"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Data e hora</label>
                  <input
                    type="datetime-local"
                    value={weightDate}
                    onChange={(e) => setWeightDate(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Observações</label>
                <input
                  type="text"
                  value={weightNotes}
                  onChange={(e) => setWeightNotes(e.target.value)}
                  placeholder="Ex: em jejum, após treino..."
                  className="input-field"
                />
              </div>
              <button
                type="submit"
                disabled={addWeightMutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {addWeightMutation.isPending ? 'Registrando...' : 'Registrar peso'}
              </button>
            </form>

            {/* Stats e gráfico */}
            {weightLogLoading ? (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />)}</div>
            ) : weightLog && weightLog.length > 0 && (
              <>
                {/* Cards de resumo */}
                {weightStats && (
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Atual', value: `${weightStats.latest} kg`, color: 'text-rose-400' },
                      { label: 'Variação', value: `${weightStats.diff > 0 ? '+' : ''}${weightStats.diff} kg`, color: weightStats.diff < 0 ? 'text-emerald-400' : weightStats.diff > 0 ? 'text-red-400' : 'text-muted-foreground' },
                      { label: 'Mínimo', value: `${weightStats.min} kg`, color: 'text-emerald-400' },
                      { label: 'Máximo', value: `${weightStats.max} kg`, color: 'text-orange-400' },
                    ].map((s) => (
                      <div key={s.label} className="glass rounded-xl p-3">
                        <div className={cn('text-sm font-bold', s.color)}>{s.value}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Gráfico */}
                {weightChartData.length >= 2 && (
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                          formatter={(v: any) => [`${v} kg`, 'Peso']}
                        />
                        <Line type="monotone" dataKey="peso" stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e', r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Histórico recente */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {weightLog.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between glass rounded-lg px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-rose-400">{w.weight} kg</span>
                        {w.notes && <span className="text-xs text-muted-foreground">{w.notes}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(w.measuredAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        {' '}
                        {new Date(w.measuredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>

      {/* Evolução do paciente */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="glass-card">
        <button type="button" onClick={() => setEvolutionOpen((o) => !o)} className="w-full flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Evolução do Paciente
            {evolutionChartData.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ml-1">
                {evolutionChartData.length} avaliação{evolutionChartData.length !== 1 ? 'ões' : ''}
              </span>
            )}
          </h2>
          {evolutionOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {evolutionOpen && (
          <div className="mt-5 space-y-5">
            {evolutionLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />)}</div>
            ) : evolutionChartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma avaliação antropométrica registrada ainda.
                <br />
                <span className="text-xs">Registre avaliações acima para visualizar a evolução.</span>
              </div>
            ) : (
              <>
                {/* Seletor de métrica */}
                <div className="flex flex-wrap gap-2">
                  {EVOLUTION_METRICS.map((m) => {
                    const hasData = evolutionChartData.some((d: any) => d[m.key] != null);
                    if (!hasData) return null;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setActiveMetric(m.key)}
                        className={cn(
                          'text-xs px-3 py-1.5 rounded-lg font-medium transition-all border',
                          activeMetric === m.key
                            ? 'text-white border-transparent'
                            : 'glass border-transparent text-muted-foreground hover:bg-accent',
                        )}
                        style={activeMetric === m.key ? { backgroundColor: m.color + '33', borderColor: m.color + '66', color: m.color } : {}}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                {/* Gráfico */}
                {(() => {
                  const metric = EVOLUTION_METRICS.find((m) => m.key === activeMetric)!;
                  const chartData = evolutionChartData.filter((d: any) => d[activeMetric] != null);
                  if (chartData.length < 1) return <p className="text-sm text-muted-foreground text-center py-4">Sem dados para esta métrica.</p>;
                  return (
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={['auto', 'auto']} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                            labelStyle={{ color: '#e5e7eb' }}
                          />
                          <Line
                            type="monotone"
                            dataKey={activeMetric}
                            name={metric.label}
                            stroke={metric.color}
                            strokeWidth={2}
                            dot={{ fill: metric.color, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}

                {/* Delta primeira vs última */}
                {evolutionDelta && evolutionDelta.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Comparativo: primeira → última avaliação
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {evolutionDelta.map((d: any) => {
                        const improved = (d.key === 'bodyFatPercent' || d.key === 'waistCm') ? d.diff < 0 : d.diff > 0;
                        const neutral = d.diff === 0;
                        return (
                          <div key={d.key} className="glass rounded-xl p-3 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{d.label}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{d.first} → {d.last}</span>
                              <div className={cn(
                                'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg',
                                neutral ? 'bg-white/5 text-muted-foreground' : improved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
                              )}>
                                {neutral ? <Minus className="w-3 h-3" /> : improved ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {d.diff > 0 ? '+' : ''}{d.diff}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tabela histórica */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Histórico de avaliações</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left pb-2 font-medium">Data</th>
                          <th className="text-right pb-2 font-medium">Peso</th>
                          <th className="text-right pb-2 font-medium">IMC</th>
                          <th className="text-right pb-2 font-medium">% Gord.</th>
                          <th className="text-right pb-2 font-medium">Cintura</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {evolution.physical.slice().reverse().map((p: any, i: number) => (
                          <tr key={i} className="text-sm">
                            <td className="py-2 text-muted-foreground">
                              {new Date(p.assessedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </td>
                            <td className="py-2 text-right font-medium">{p.weight} kg</td>
                            <td className="py-2 text-right">{p.bmi?.toFixed(1) ?? '—'}</td>
                            <td className="py-2 text-right">{p.bodyFatPercent != null ? `${p.bodyFatPercent}%` : '—'}</td>
                            <td className="py-2 text-right">{p.waistCm != null ? `${p.waistCm} cm` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
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
