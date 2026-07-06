import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Alert, Modal, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const COLORS = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  primary: '#6f5cf0',
  accent: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  text: '#f1f5f9',
  muted: '#64748b',
  border: 'rgba(255,255,255,0.08)',
};

const SESSION_TYPES = ['WORKOUT_SESSION', 'ASSESSMENT', 'CONSULTATION', 'ONLINE'];
const SESSION_LABELS: Record<string, string> = {
  WORKOUT_SESSION: '💪 Treino presencial',
  ASSESSMENT: '📋 Avaliação física',
  CONSULTATION: '💬 Consultoria',
  ONLINE: '🖥️ Treino online',
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: 'Agendado', color: '#60a5fa', bg: '#3b82f610' },
  COMPLETED: { label: 'Concluído', color: COLORS.success, bg: '#10b98110' },
  CANCELLED: { label: 'Cancelado', color: COLORS.error, bg: '#ef444410' },
};

const FILTERS = [
  { key: 'upcoming', label: 'Próximos' },
  { key: 'completed', label: 'Concluídos' },
  { key: 'cancelled', label: 'Cancelados' },
  { key: 'all', label: 'Todos' },
] as const;

type FilterKey = typeof FILTERS[number]['key'];

const EMPTY_FORM = {
  studentId: '',
  date: '',
  time: '',
  type: 'WORKOUT_SESSION',
  duration: '60',
  location: '',
  notes: '',
};

interface Appointment {
  id: string;
  scheduledAt: string;
  status: string;
  type: string;
  duration?: number;
  location?: string;
  notes?: string;
  studentId?: string;
  student?: {
    user?: { profile?: { firstName?: string; lastName?: string } };
  };
}

interface Student {
  id: string;
  user?: { profile?: { firstName?: string; lastName?: string } };
}

export default function TrainerScheduleScreen() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>('upcoming');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['trainer-appointments'],
    queryFn: () => api.get('/trainers/me/appointments').then((r) => {
      const d = r.data;
      return Array.isArray(d) ? d : [];
    }),
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ['trainer-students-list'],
    queryFn: () => api.get('/trainers/me/students').then((r) => {
      const d = r.data;
      return Array.isArray(d) ? d : [];
    }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/trainers/me/appointments', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-appointments'] });
      closeModal();
    },
    onError: () => Alert.alert('Erro', 'Não foi possível criar o agendamento.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/trainers/me/appointments/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-appointments'] });
      closeModal();
    },
    onError: () => Alert.alert('Erro', 'Não foi possível atualizar o agendamento.'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/trainers/me/appointments/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer-appointments'] }),
    onError: () => Alert.alert('Erro', 'Não foi possível atualizar o status.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/trainers/me/appointments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer-appointments'] }),
    onError: () => Alert.alert('Erro', 'Não foi possível excluir o agendamento.'),
  });

  function openCreate() {
    setEditingId(null);
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    setForm({ ...EMPTY_FORM, date: dateStr, time: '08:00' });
    setShowModal(true);
  }

  function openEdit(a: Appointment) {
    setEditingId(a.id);
    const d = new Date(a.scheduledAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    setForm({
      studentId: a.studentId ?? '',
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      type: a.type ?? 'WORKOUT_SESSION',
      duration: String(a.duration ?? 60),
      location: a.location ?? '',
      notes: a.notes ?? '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function handleSubmit() {
    if (!form.studentId) {
      Alert.alert('Atenção', 'Selecione um aluno.');
      return;
    }
    if (!form.date || !form.time) {
      Alert.alert('Atenção', 'Preencha data e hora.');
      return;
    }
    const scheduledAt = new Date(`${form.date}T${form.time}:00`);
    const payload = {
      studentId: form.studentId,
      scheduledAt,
      type: form.type,
      duration: Number(form.duration) || 60,
      location: form.location || undefined,
      notes: form.notes || undefined,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  function handleComplete(id: string) {
    Alert.alert('Concluir sessão', 'Marcar esta sessão como concluída?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Concluir', onPress: () => statusMut.mutate({ id, status: 'COMPLETED' }) },
    ]);
  }

  function handleCancel(id: string) {
    Alert.alert('Cancelar agendamento', 'Cancelar este agendamento?', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar', style: 'destructive', onPress: () => statusMut.mutate({ id, status: 'CANCELLED' }) },
    ]);
  }

  function handleDelete(id: string) {
    Alert.alert('Excluir', 'Excluir permanentemente este agendamento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMut.mutate(id) },
    ]);
  }

  const today = new Date();
  const filtered = (appointments || [])
    .filter((a) => {
      if (filter === 'upcoming') return a.status === 'SCHEDULED' && new Date(a.scheduledAt) >= today;
      if (filter === 'completed') return a.status === 'COMPLETED';
      if (filter === 'cancelled') return a.status === 'CANCELLED';
      return true;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6f5cf020', '#06b6d420']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Agenda</Text>
            <Text style={styles.subtitle}>Gerencie seus agendamentos</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openCreate}>
            <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.addButtonGradient}>
              <Text style={styles.addButtonText}>+ Novo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Próximos', value: (appointments || []).filter(a => a.status === 'SCHEDULED' && new Date(a.scheduledAt) >= today).length, color: '#60a5fa' },
            { label: 'Concluídos', value: (appointments || []).filter(a => a.status === 'COMPLETED').length, color: COLORS.success },
            { label: 'Total', value: (appointments || []).length, color: COLORS.primary },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>
            {filter === 'upcoming' ? 'Nenhum agendamento futuro' : 'Nenhum registro'}
          </Text>
          {filter === 'upcoming' && (
            <TouchableOpacity style={styles.emptyButton} onPress={openCreate}>
              <Text style={styles.emptyButtonText}>+ Criar agendamento</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {filtered.map((a) => {
            const badge = STATUS_BADGE[a.status] ?? STATUS_BADGE.SCHEDULED;
            const date = new Date(a.scheduledAt);
            const studentName = a.student
              ? `${a.student.user?.profile?.firstName ?? ''} ${a.student.user?.profile?.lastName ?? ''}`.trim() || 'Aluno'
              : 'Aluno';
            const isScheduled = a.status === 'SCHEDULED';

            return (
              <View key={a.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={[styles.typeIcon, { backgroundColor: COLORS.primary + '20' }]}>
                    <Text style={styles.typeIconText}>
                      {a.type === 'ONLINE' ? '🖥️' : a.type === 'ASSESSMENT' ? '📋' : '💪'}
                    </Text>
                  </View>
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateDay}>{date.getDate()}</Text>
                    <Text style={styles.dateMonth}>
                      {date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardStudent}>{studentName}</Text>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardType}>{SESSION_LABELS[a.type] || a.type}</Text>
                  <Text style={styles.cardTime}>
                    🕐 {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {a.duration ? ` • ${a.duration}min` : ''}
                    {a.location ? ` • ${a.location}` : ''}
                  </Text>
                  {a.notes ? <Text style={styles.cardNotes}>{a.notes}</Text> : null}

                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(a)}>
                      <Text style={styles.actionBtnText}>✏️ Editar</Text>
                    </TouchableOpacity>
                    {isScheduled && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: COLORS.success + '40' }]}
                          onPress={() => handleComplete(a.id)}
                        >
                          <Text style={[styles.actionBtnText, { color: COLORS.success }]}>✓ Concluir</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: COLORS.warning + '40' }]}
                          onPress={() => handleCancel(a.id)}
                        >
                          <Text style={[styles.actionBtnText, { color: COLORS.warning }]}>✕ Cancelar</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: COLORS.error + '40' }]}
                      onPress={() => handleDelete(a.id)}
                    >
                      <Text style={[styles.actionBtnText, { color: COLORS.error }]}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Editar Agendamento' : 'Novo Agendamento'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Aluno *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.studentPicker}>
                {(students || []).map((s) => {
                  const name = `${s.user?.profile?.firstName ?? ''} ${s.user?.profile?.lastName ?? ''}`.trim() || 'Aluno';
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.studentChip, form.studentId === s.id && styles.studentChipActive]}
                      onPress={() => setForm({ ...form, studentId: s.id })}
                    >
                      <Text style={[styles.studentChipText, form.studentId === s.id && styles.studentChipTextActive]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.fieldLabel}>Data *</Text>
              <TextInput
                style={styles.input}
                value={form.date}
                onChangeText={(v) => setForm({ ...form, date: v })}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={COLORS.muted}
              />

              <Text style={styles.fieldLabel}>Hora *</Text>
              <TextInput
                style={styles.input}
                value={form.time}
                onChangeText={(v) => setForm({ ...form, time: v })}
                placeholder="HH:MM"
                placeholderTextColor={COLORS.muted}
              />

              <Text style={styles.fieldLabel}>Tipo de sessão</Text>
              <View style={styles.typeRow}>
                {SESSION_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                    onPress={() => setForm({ ...form, type: t })}
                  >
                    <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]} numberOfLines={2}>
                      {SESSION_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Duração (minutos)</Text>
              <TextInput
                style={styles.input}
                value={form.duration}
                onChangeText={(v) => setForm({ ...form, duration: v })}
                keyboardType="numeric"
                placeholder="60"
                placeholderTextColor={COLORS.muted}
              />

              <Text style={styles.fieldLabel}>Local (opcional)</Text>
              <TextInput
                style={styles.input}
                value={form.location}
                onChangeText={(v) => setForm({ ...form, location: v })}
                placeholder="Ex: Academia XYZ"
                placeholderTextColor={COLORS.muted}
              />

              <Text style={styles.fieldLabel}>Observações (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.notes}
                onChangeText={(v) => setForm({ ...form, notes: v })}
                placeholder="Observações sobre a sessão..."
                placeholderTextColor={COLORS.muted}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, isPending && styles.saveButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={isPending}
                >
                  <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.saveButtonGradient}>
                    <Text style={styles.saveButtonText}>{isPending ? 'Salvando...' : editingId ? 'Salvar' : 'Agendar'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  addButton: { borderRadius: 10, overflow: 'hidden' },
  addButtonGradient: { paddingHorizontal: 16, paddingVertical: 10 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  filterScroll: { maxHeight: 50 },
  filterContainer: { paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: COLORS.muted, fontSize: 15, textAlign: 'center' },
  emptyButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.primary + '20' },
  emptyButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  cardLeft: { alignItems: 'center', gap: 8 },
  typeIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeIconText: { fontSize: 20 },
  dateBlock: { alignItems: 'center' },
  dateDay: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  dateMonth: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardStudent: { color: COLORS.text, fontSize: 15, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardType: { color: COLORS.muted, fontSize: 12, marginBottom: 4 },
  cardTime: { color: COLORS.muted, fontSize: 12, marginBottom: 4 },
  cardNotes: { color: COLORS.muted, fontSize: 11, fontStyle: 'italic', marginBottom: 4 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  actionBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  actionBtnText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  modalClose: { color: COLORS.muted, fontSize: 18, padding: 4 },
  fieldLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  studentPicker: { marginBottom: 4 },
  studentChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    marginRight: 8,
  },
  studentChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  studentChipText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  studentChipTextActive: { color: '#fff' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    flex: 1, minWidth: '45%', alignItems: 'center',
  },
  typeChipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  typeChipText: { color: COLORS.muted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  typeChipTextActive: { color: COLORS.primary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: Platform.OS === 'ios' ? 20 : 0 },
  cancelButton: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  cancelButtonText: { color: COLORS.muted, fontWeight: '600' },
  saveButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonGradient: { paddingVertical: 14, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
