import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';

const COLORS = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  primary: '#6f5cf0',
  accent: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#f1f5f9',
  muted: '#64748b',
  border: 'rgba(255,255,255,0.08)',
};

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Perder peso',
  GAIN_MUSCLE: 'Ganhar músculo',
  IMPROVE_ENDURANCE: 'Melhorar resistência',
  INCREASE_FLEXIBILITY: 'Aumentar flexibilidade',
  MAINTAIN_WEIGHT: 'Manter peso',
  ATHLETIC_PERFORMANCE: 'Performance atlética',
  REHABILITATION: 'Reabilitação',
};

const GOAL_EMOJIS: Record<string, string> = {
  LOSE_WEIGHT: '⬇️',
  GAIN_MUSCLE: '💪',
  IMPROVE_ENDURANCE: '🏃',
  INCREASE_FLEXIBILITY: '🤸',
  MAINTAIN_WEIGHT: '⚖️',
  ATHLETIC_PERFORMANCE: '⚡',
  REHABILITATION: '🩺',
};

const GOAL_TYPES = Object.keys(GOAL_LABELS);

const GOAL_COLORS = [
  ['#6f5cf0', '#4f46e5'],
  ['#06b6d4', '#0284c7'],
  ['#10b981', '#059669'],
  ['#f59e0b', '#d97706'],
  ['#ec4899', '#db2777'],
];

interface Goal {
  id: string;
  title: string;
  type: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  targetDate?: string;
  isCompleted: boolean;
  createdAt: string;
}

const STATIC_GOALS: Goal[] = [];

async function fetchGoals(): Promise<Goal[]> {
  try {
    const { data } = await api.get('/goals');
    return Array.isArray(data) ? data : data?.data ?? [];
  } catch {
    return STATIC_GOALS;
  }
}

async function createGoal(body: any): Promise<Goal> {
  const { data } = await api.post('/goals', body);
  return data?.data ?? data;
}

async function completeGoal(id: string): Promise<void> {
  await api.post(`/goals/${id}/complete`);
}

function daysLeft(dateStr: string): number {
  return Math.max(Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000), 0);
}

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'GAIN_MUSCLE',
    targetValue: '',
    unit: '',
    targetDate: '',
  });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await fetchGoals();
      setGoals(data);
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível carregar as metas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      Alert.alert('Atenção', 'Informe um título para a meta');
      return;
    }
    setSaving(true);
    try {
      await createGoal({
        title: form.title.trim(),
        type: form.type,
        targetValue: form.targetValue ? Number(form.targetValue) : undefined,
        unit: form.unit || undefined,
        targetDate: form.targetDate || undefined,
      });
      setShowForm(false);
      setForm({ title: '', type: 'GAIN_MUSCLE', targetValue: '', unit: '', targetDate: '' });
      await load(true);
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível criar a meta');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = (goal: Goal) => {
    Alert.alert(
      'Concluir Meta',
      `Marcar "${goal.title}" como concluída?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Concluir',
          onPress: async () => {
            try {
              await completeGoal(goal.id);
              await load(true);
            } catch {
              Alert.alert('Erro', 'Não foi possível concluir a meta');
            }
          },
        },
      ]
    );
  };

  const active = goals.filter((g) => !g.isCompleted);
  const completed = goals.filter((g) => g.isCompleted);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.muted, marginTop: 12 }}>Carregando metas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <LinearGradient colors={['#6f5cf020', '#06b6d420']} style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Minhas Metas</Text>
              <Text style={styles.headerSubtitle}>
                {active.length} ativa{active.length !== 1 ? 's' : ''} · {completed.length} concluída{completed.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.newButton}
              onPress={() => setShowForm(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.newButtonGradient}
              >
                <Text style={styles.newButtonText}>+ Nova</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Active goals */}
        {active.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>EM ANDAMENTO</Text>
            {active.map((goal, i) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                index={i}
                onComplete={() => handleComplete(goal)}
              />
            ))}
          </View>
        )}

        {/* Completed goals */}
        {completed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONCLUÍDAS</Text>
            {completed.map((goal, i) => (
              <GoalCard key={goal.id} goal={goal} index={i} isCompleted />
            ))}
          </View>
        )}

        {/* Empty state */}
        {goals.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>🎯</Text>
            </View>
            <Text style={styles.emptyTitle}>Sem metas definidas</Text>
            <Text style={styles.emptySubtext}>
              Crie sua primeira meta e comece a acompanhar seu progresso.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowForm(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.emptyButtonGradient}
              >
                <Text style={styles.emptyButtonText}>Criar primeira meta</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal visible={showForm} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowForm(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Meta</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Título</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Chegar a 75kg"
                  placeholderTextColor={COLORS.muted}
                  value={form.title}
                  onChangeText={(v) => setForm({ ...form, title: v })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tipo</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {GOAL_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.typeChip, form.type === type && styles.typeChipActive]}
                        onPress={() => setForm({ ...form, type })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.typeChipEmoji}>{GOAL_EMOJIS[type]}</Text>
                        <Text style={[styles.typeChipText, form.type === type && styles.typeChipTextActive]}>
                          {GOAL_LABELS[type]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Valor alvo</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 75"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="numeric"
                    value={form.targetValue}
                    onChangeText={(v) => setForm({ ...form, targetValue: v })}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Unidade</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: kg"
                    placeholderTextColor={COLORS.muted}
                    value={form.unit}
                    onChangeText={(v) => setForm({ ...form, unit: v })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Data alvo (AAAA-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 2025-12-31"
                  placeholderTextColor={COLORS.muted}
                  value={form.targetDate}
                  onChangeText={(v) => setForm({ ...form, targetDate: v })}
                />
              </View>

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowForm(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, (!form.title.trim() || saving) && styles.saveButtonDisabled]}
                  onPress={handleCreate}
                  activeOpacity={0.8}
                  disabled={!form.title.trim() || saving}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.accent]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.saveButtonGradient}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Criar Meta</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function GoalCard({
  goal,
  index,
  isCompleted,
  onComplete,
}: {
  goal: Goal;
  index: number;
  isCompleted?: boolean;
  onComplete?: () => void;
}) {
  const [colors] = useState(GOAL_COLORS[index % GOAL_COLORS.length]);
  const progress = goal.targetValue
    ? Math.min(Math.round(((goal.currentValue ?? 0) / goal.targetValue) * 100), 100)
    : isCompleted ? 100 : 0;
  const countdown = goal.targetDate ? daysLeft(goal.targetDate) : null;

  return (
    <View style={[styles.goalCard, isCompleted && styles.goalCardCompleted]}>
      <View style={styles.goalRow}>
        {/* Left icon */}
        <View style={[
          styles.goalIconBox,
          isCompleted
            ? styles.goalIconBoxCompleted
            : { backgroundColor: colors[0] + '30' },
        ]}>
          {isCompleted ? (
            <Text style={styles.goalCheckEmoji}>✅</Text>
          ) : (
            <Text style={styles.goalTypeEmoji}>{GOAL_EMOJIS[goal.type] || '🎯'}</Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.goalContent}>
          <View style={styles.goalTitleRow}>
            <Text style={[styles.goalTitle, isCompleted && { color: COLORS.muted }]} numberOfLines={1}>
              {goal.title}
            </Text>
            {isCompleted && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>Concluída</Text>
              </View>
            )}
            {!isCompleted && countdown !== null && (
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownText}>
                  {countdown === 0 ? 'Hoje!' : countdown === 1 ? 'Amanhã' : `${countdown}d`}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.goalType}>
            {GOAL_LABELS[goal.type] || goal.type}
            {goal.targetValue ? ` · Meta: ${goal.targetValue}${goal.unit || ''}` : ''}
          </Text>

          {goal.targetValue ? (
            <View style={{ marginTop: 8 }}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressCurrent}>
                  {goal.currentValue ?? 0}{goal.unit || ''}
                </Text>
                <Text style={styles.progressPercent}>{progress}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${progress}%` as any,
                      backgroundColor: isCompleted ? COLORS.success : colors[0],
                    },
                  ]}
                />
              </View>
            </View>
          ) : null}
        </View>

        {/* Complete button */}
        {!isCompleted && onComplete && (
          <TouchableOpacity onPress={onComplete} style={styles.completeBtn} activeOpacity={0.7}>
            <Text style={styles.completeBtnText}>›</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 26, fontWeight: '700' },
  headerSubtitle: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  newButton: { borderRadius: 12, overflow: 'hidden' },
  newButtonGradient: { paddingHorizontal: 16, paddingVertical: 10 },
  newButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  goalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goalCardCompleted: { opacity: 0.65 },
  goalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  goalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  goalIconBoxCompleted: { backgroundColor: COLORS.success + '20' },
  goalCheckEmoji: { fontSize: 22 },
  goalTypeEmoji: { fontSize: 22 },
  goalContent: { flex: 1 },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  goalTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1 },
  completedBadge: {
    backgroundColor: COLORS.success + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  completedBadgeText: { color: COLORS.success, fontSize: 10, fontWeight: '600' },
  countdownBadge: {
    backgroundColor: COLORS.accent + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countdownText: { color: COLORS.accent, fontSize: 10, fontWeight: '600' },
  goalType: { color: COLORS.muted, fontSize: 12 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressCurrent: { color: COLORS.muted, fontSize: 11 },
  progressPercent: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 3 },
  completeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  completeBtnText: { color: COLORS.muted, fontSize: 20, lineHeight: 22 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: '600', marginBottom: 8 },
  emptySubtext: { color: COLORS.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyButton: { borderRadius: 14, overflow: 'hidden' },
  emptyButtonGradient: { paddingHorizontal: 28, paddingVertical: 13 },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.muted,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { color: COLORS.muted, fontSize: 14 },
  formGroup: { marginBottom: 16 },
  formRow: { flexDirection: 'row', gap: 12 },
  formLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipActive: {
    backgroundColor: COLORS.primary + '30',
    borderColor: COLORS.primary,
  },
  typeChipEmoji: { fontSize: 14 },
  typeChipText: { color: COLORS.muted, fontSize: 13, fontWeight: '500' },
  typeChipTextActive: { color: COLORS.text },
  formButtons: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 16 },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  saveButton: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
