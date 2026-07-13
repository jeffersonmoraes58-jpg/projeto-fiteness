'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ChevronLeft, Apple, Star, Calendar,
  MessageCircle, Clock, Zap, ChevronRight, ClipboardList,
  TrendingUp, Heart, Activity, Moon, Brain, Target, Info,
  Plus, X, Search, Pencil, Scale, Save, Mail, Share2, Send,
  FileText, Download, Utensils, Droplets, Flame, Beef, Wheat,
  Camera, CheckCircle2, Circle, Trash2, BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { exportPatientReport } from '@/lib/exportPatientReport';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Perda de peso', GAIN_MUSCLE: 'Ganho muscular',
  MAINTAIN_WEIGHT: 'Manutenção', IMPROVE_ENDURANCE: 'Resistência',
  INCREASE_FLEXIBILITY: 'Flexibilidade', ATHLETIC_PERFORMANCE: 'Performance',
  REHABILITATION: 'Reabilitação',
};

const TABS = [
  { id: 'dietas', label: 'Dietas', icon: Apple },
  { id: 'diario', label: 'Diário Alimentar', icon: Utensils },
  { id: 'anamnese', label: 'Anamnese', icon: ClipboardList },
  { id: 'evolucao', label: 'Evolução', icon: TrendingUp },
];

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: 'Café da manhã', MORNING_SNACK: 'Lanche da manhã', LUNCH: 'Almoço',
  AFTERNOON_SNACK: 'Lanche da tarde', DINNER: 'Jantar', EVENING_SNACK: 'Ceia',
  PRE_WORKOUT: 'Pré-treino', POST_WORKOUT: 'Pós-treino',
};

const MEAL_ICONS: Record<string, any> = {
  BREAKFAST: '☕', MORNING_SNACK: '🍎', LUNCH: '🍽️',
  AFTERNOON_SNACK: '🥪', DINNER: '🌙', EVENING_SNACK: '🌜',
  PRE_WORKOUT: '⚡', POST_WORKOUT: '💪',
};

const MOOD_EMOJI: Record<string, string> = {
  great: '😊', ok: '😐', bad: '😞',
};

interface MealLogRow {
  id: string;
  date: string;
  time: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mood: string;
  photoUrl: string;
  notes: string;
}

export default function NutritionistPatientDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState('dietas');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: patients } = useQuery({
    queryKey: ['nutritionist-patients'],
    queryFn: () => api.get('/nutritionists/me/patients').then((r) => r.data.data),
  });
  const patient = (patients as any[])?.find((p: any) => p.id === id);

  const { data: dietHistory } = useQuery({
    queryKey: ['patient-diet-history', id],
    queryFn: () => api.get(`/nutritionists/me/patients/${id}/diet-history`).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: mealLogs } = useQuery<MealLogRow[]>({
    queryKey: ['patient-meal-logs', id],
    queryFn: () => api.get(`/nutritionists/me/patients/${id}/meal-logs`).then((r) => r.data.data ?? r.data ?? []),
    enabled: !!id && tab === 'diario',
  });

  const { data: anamnesis } = useQuery({
    queryKey: ['patient-anamnesis', id],
    queryFn: () => api.get(`/nutritionists/me/patients/${id}/anamnesis`).then((r) => r.data.data),
    enabled: !!id && tab === 'anamnese',
  });

  const { data: evolution } = useQuery({
    queryKey: ['patient-evolution', id],
    queryFn: () => api.get(`/nutritionists/me/patients/${id}/evolution`).then((r) => r.data.data),
    enabled: !!id && tab === 'evolucao',
  });

  // Group meal logs by date
  const groupedLogs = useMemo(() => {
    if (!mealLogs || !Array.isArray(mealLogs)) return {};
    const groups: Record<string, MealLogRow[]> = {};
    (mealLogs as MealLogRow[]).forEach((log) => {
      const date = new Date(log.date || log.time || Date.now()).toLocaleDateString('pt-BR');
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return groups;
  }, [mealLogs]);

  // Daily totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    Object.entries(groupedLogs).forEach(([date, logs]) => {
      totals[date] = logs.reduce(
        (acc, l) => ({
          calories: acc.calories + (l.calories || 0),
          protein: acc.protein + (l.protein || 0),
          carbs: acc.carbs + (l.carbs || 0),
          fat: acc.fat + (l.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );
    });
    return totals;
  }, [groupedLogs]);

  if (!patient) {
    return (
      <div className="max-w-2xl mx-auto glass-card flex flex-col items-center justify-center py-16">
        <Users className="w-12 h-12 text-muted-foreground mb-4" />
        <p>Paciente não encontrado</p>
        <Link href="/nutritionist/patients" className="btn-secondary text-sm mt-4">Voltar</Link>
      </div>
    );
  }

  const initials = `${patient.user?.profile?.firstName?.[0] || ''}${patient.user?.profile?.lastName?.[0] || ''}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/nutritionist/patients" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold">Perfil do Paciente</h1>
      </div>

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {patient.user?.profile?.avatarUrl
              ? <img src={patient.user.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              : initials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{patient.user?.profile?.firstName} {patient.user?.profile?.lastName}</h2>
            <p className="text-sm text-muted-foreground">{patient.user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Ativo</span>
              {patient.goalType && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                  {GOAL_LABELS[patient.goalType] || patient.goalType}
                </span>
              )}
            </div>
          </div>
          {(() => {
            const rawPhone = patient.user?.profile?.phone?.replace(/\D/g, '');
            if (!rawPhone) return null;
            const phone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
            return (
              <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/20">
                <WhatsAppIcon className="w-4 h-4 text-emerald-400" />
              </a>
            );
          })()}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="glass rounded-2xl p-1 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* TAB: DIETAS */}
        {tab === 'dietas' && (
          <motion.div key="dietas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Apple className="w-4 h-4 text-emerald-400" />
              Histórico de Dietas
            </h2>
            {(!dietHistory || (Array.isArray(dietHistory) ? dietHistory.length : 0) === 0) ? (
              <div className="glass-card text-center py-10 text-muted-foreground">
                <Apple className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma dieta atribuída ainda.</p>
              </div>
            ) : (
              (Array.isArray(dietHistory) ? dietHistory : []).map((plan: any) => (
                <div key={plan.id} className="glass-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{plan.diet?.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                        <span>{plan.diet?.totalCalories} kcal</span>
                        <span>P: {plan.diet?.totalProtein}g C: {plan.diet?.totalCarbs}g G: {plan.diet?.totalFat}g</span>
                      </div>
                      {plan.startDate && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(plan.startDate).toLocaleDateString('pt-BR')}
                          {plan.endDate ? ` → ${new Date(plan.endDate).toLocaleDateString('pt-BR')}` : ' — Atual'}
                        </div>
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      {plan.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* TAB: DIÁRIO ALIMENTAR */}
        {tab === 'diario' && (
          <motion.div key="diario" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Utensils className="w-4 h-4 text-orange-400" />
              Diário Alimentar
            </h2>

            {Object.keys(groupedLogs).length === 0 ? (
              <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
                <Utensils className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Nenhum registro alimentar encontrado.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  O paciente registrará as refeições pelo app e elas aparecerão aqui.
                </p>
              </div>
            ) : (
              Object.entries(groupedLogs).reverse().map(([date, logs]) => {
                const totals = dailyTotals[date];
                return (
                  <div key={date} className="glass-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">{date}</span>
                        <span className="text-xs text-muted-foreground">
                          {logs.length} refeição{logs.length !== 1 ? 'ões' : ''}
                        </span>
                      </div>
                      {totals && (
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-medium">{totals.calories} kcal</span>
                          <span className="text-purple-400">P:{totals.protein}g</span>
                          <span className="text-yellow-400">C:{totals.carbs}g</span>
                          <span className="text-orange-400">G:{totals.fat}g</span>
                        </div>
                      )}
                    </div>

                    {/* Macros bar */}
                    {totals && (
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden flex">
                        <div className="h-full bg-purple-500" style={{ width: `${totals.calories > 0 ? (totals.protein * 4 / totals.calories) * 100 : 0}%` }} />
                        <div className="h-full bg-yellow-500" style={{ width: `${totals.calories > 0 ? (totals.carbs * 4 / totals.calories) * 100 : 0}%` }} />
                        <div className="h-full bg-orange-500" style={{ width: `${totals.calories > 0 ? (totals.fat * 9 / totals.calories) * 100 : 0}%` }} />
                      </div>
                    )}

                    {/* Meal list */}
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div key={log.id} className="glass rounded-xl overflow-hidden">
                          <button
                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-all text-left"
                          >
                            <span className="text-lg">{MEAL_ICONS[log.mealType] || '🍽️'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{MEAL_LABELS[log.mealType] || log.mealType}</div>
                              <div className="text-xs text-muted-foreground">
                                {log.calories} kcal · P:{log.protein}g C:{log.carbs}g G:{log.fat}g
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {log.mood && <span className="text-sm">{MOOD_EMOJI[log.mood] || log.mood}</span>}
                              {log.photoUrl && <Camera className="w-3.5 h-3.5 text-muted-foreground" />}
                              {log.notes && <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
                              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedLog === log.id ? 'rotate-90' : ''}`} />
                            </div>
                          </button>

                          <AnimatePresence>
                            {expandedLog === log.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-border/30"
                              >
                                <div className="p-3 space-y-3">
                                  {log.photoUrl && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1.5">Foto da refeição:</p>
                                      <img src={log.photoUrl} alt="Refeição" className="w-full h-48 object-cover rounded-xl" />
                                    </div>
                                  )}
                                  {log.notes && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Observações:</p>
                                      <p className="text-sm">{log.notes}</p>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="glass rounded-lg p-2">
                                      <div className="text-sm font-bold">{log.calories}</div>
                                      <div className="text-[10px] text-muted-foreground">kcal</div>
                                    </div>
                                    <div className="glass rounded-lg p-2">
                                      <div className="text-sm font-bold text-purple-400">{log.protein}g</div>
                                      <div className="text-[10px] text-muted-foreground">Proteína</div>
                                    </div>
                                    <div className="glass rounded-lg p-2">
                                      <div className="text-sm font-bold text-yellow-400">{log.carbs}g</div>
                                      <div className="text-[10px] text-muted-foreground">Carbs</div>
                                    </div>
                                    <div className="glass rounded-lg p-2">
                                      <div className="text-sm font-bold text-orange-400">{log.fat}g</div>
                                      <div className="text-[10px] text-muted-foreground">Gordura</div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}

        {/* TAB: ANAMNESE */}
        {tab === 'anamnese' && (
          <motion.div key="anamnese" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <ClipboardList className="w-4 h-4 text-blue-400" />
              Anamnese
            </h2>
            {anamnesis ? (
              <div className="space-y-2 text-sm">
                {anamnesis.mainGoal && <p><strong>Objetivo:</strong> {anamnesis.mainGoal}</p>}
                {anamnesis.observations && <p><strong>Observações:</strong> {anamnesis.observations}</p>}
                {anamnesis.practicesExercise !== undefined && <p><strong>Exercício:</strong> {anamnesis.practicesExercise ? 'Sim' : 'Não'}</p>}
                {anamnesis.exerciseFrequency && <p><strong>Frequência:</strong> {anamnesis.exerciseFrequency}</p>}
                {anamnesis.previousInjuries && <p><strong>Lesões:</strong> {anamnesis.previousInjuries}</p>}
                {anamnesis.surgeries && <p><strong>Cirurgias:</strong> {anamnesis.surgeries}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Anamnese não preenchida.</p>
            )}
          </motion.div>
        )}

        {/* TAB: EVOLUÇÃO */}
        {tab === 'evolucao' && (
          <motion.div key="evolucao" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Evolução do Paciente
            </h2>
            {evolution ? (
              <div className="space-y-4">
                {evolution.physical?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Avaliações Físicas</p>
                    <div className="space-y-2">
                      {evolution.physical.slice(-5).map((a: any, i: number) => (
                        <div key={i} className="glass rounded-lg p-3 flex items-center justify-between">
                          <span className="text-xs">{new Date(a.assessedAt).toLocaleDateString('pt-BR')}</span>
                          <span className="text-sm font-medium">{a.weight}kg · IMC {a.bmi}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {evolution.nutritional?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Avaliações Nutricionais</p>
                    <div className="space-y-2">
                      {evolution.nutritional.slice(-5).map((a: any, i: number) => (
                        <div key={i} className="glass rounded-lg p-3 flex items-center justify-between">
                          <span className="text-xs">{new Date(a.assessedAt).toLocaleDateString('pt-BR')}</span>
                          <span className="text-sm font-medium">TMB {a.tmb} · GET {a.get} kcal</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados de evolução.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}