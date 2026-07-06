import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Alert, Modal,
  KeyboardAvoidingView, Platform,
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
  text: '#f1f5f9',
  muted: '#64748b',
  border: 'rgba(255,255,255,0.08)',
};

type TabType = 'upcoming' | 'completed';

interface Patient {
  id: string;
  studentId?: string;
  user?: {
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

interface Consultation {
  id: string;
  scheduledAt: string;
  completedAt?: string | null;
  notes?: string;
  student?: {
    user?: {
      profile?: {
        firstName?: string;
        lastName?: string;
      };
    };
  };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getPatientName(consultation: Consultation) {
  const profile = consultation.student?.user?.profile;
  if (!profile) return 'Paciente';
  return `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Paciente';
}

export default function NutritionistScheduleScreen() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [showModal, setShowModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [consultRes, patientRes] = await Promise.allSettled([
        api.get('/nutritionists/me/consultations'),
        api.get('/nutritionists/me/patients'),
      ]);

      if (consultRes.status === 'fulfilled') {
        const data = consultRes.value.data;
        setConsultations(Array.isArray(data) ? data : []);
      }
      if (patientRes.status === 'fulfilled') {
        const data = patientRes.value.data;
        setPatients(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        Alert.alert('Erro', 'Não foi possível carregar os agendamentos.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!selectedPatientId) {
      Alert.alert('Atenção', 'Selecione um paciente.');
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      Alert.alert('Atenção', 'Informe a data e hora da consulta.');
      return;
    }
    try {
      setSaving(true);
      const [year, month, day] = scheduledDate.split('-').map(Number);
      const [hour, minute] = scheduledTime.split(':').map(Number);
      const scheduledAt = new Date(year, month - 1, day, hour, minute);
      await api.post('/nutritionists/me/consultations', {
        studentId: selectedPatientId,
        scheduledAt: scheduledAt.toISOString(),
      });
      setShowModal(false);
      setSelectedPatientId('');
      setScheduledDate('');
      setScheduledTime('');
      loadData();
      Alert.alert('Sucesso', 'Consulta agendada com sucesso!');
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message || 'Erro ao agendar consulta.');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (consultationId: string) => {
    Alert.alert('Concluir Consulta', 'Marcar esta consulta como concluída?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Concluir',
        onPress: async () => {
          try {
            await api.patch(`/nutritionists/me/consultations/${consultationId}`, {
              completedAt: new Date().toISOString(),
            });
            loadData();
          } catch {
            Alert.alert('Erro', 'Não foi possível concluir a consulta.');
          }
        },
      },
    ]);
  };

  const now = new Date();
  const upcoming = consultations
    .filter((c) => !c.completedAt && new Date(c.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const completed = consultations
    .filter((c) => !!c.completedAt)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const displayed = activeTab === 'upcoming' ? upcoming : completed;
  const todayConsultations = consultations.filter((c) => {
    const d = new Date(c.scheduledAt);
    return d.toDateString() === now.toDateString();
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#06b6d420', '#6f5cf020']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Agenda</Text>
            <Text style={styles.subtitle}>Gerencie suas consultas</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)} activeOpacity={0.8}>
            <Text style={styles.addButtonText}>+ Nova</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Today summary */}
      <View style={styles.todayCard}>
        <Text style={styles.todayLabel}>Consultas hoje</Text>
        <Text style={styles.todayCount}>{todayConsultations.length}</Text>
        <Text style={styles.todayDate}>
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Próximas ({upcoming.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Concluídas ({completed.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando agenda...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {displayed.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'upcoming' ? 'Nenhuma consulta agendada' : 'Nenhuma consulta concluída'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'upcoming'
                  ? 'Agende uma nova consulta para seus pacientes.'
                  : 'As consultas concluídas aparecerão aqui.'}
              </Text>
              {activeTab === 'upcoming' && (
                <TouchableOpacity style={styles.scheduleBtn} onPress={() => setShowModal(true)}>
                  <Text style={styles.scheduleBtnText}>Agendar consulta</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            displayed.map((consultation) => {
              const name = getPatientName(consultation);
              const isCompleted = !!consultation.completedAt;

              return (
                <View key={consultation.id} style={[styles.consultCard, isCompleted && styles.consultCardDim]}>
                  <View style={[styles.consultIcon, { backgroundColor: isCompleted ? COLORS.success + '20' : COLORS.accent + '20' }]}>
                    <Text style={styles.consultIconEmoji}>{isCompleted ? '✅' : '🗓️'}</Text>
                  </View>
                  <View style={styles.consultInfo}>
                    <Text style={styles.consultName}>{name}</Text>
                    <Text style={styles.consultDate}>
                      {formatDate(consultation.scheduledAt)} · {formatTime(consultation.scheduledAt)}
                    </Text>
                    {consultation.notes ? (
                      <Text style={styles.consultNotes} numberOfLines={1}>{consultation.notes}</Text>
                    ) : null}
                  </View>
                  {!isCompleted && (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleComplete(consultation.id)}
                    >
                      <Text style={styles.completeBtnText}>Concluir</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Schedule Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Consulta</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Patient picker */}
            <Text style={styles.fieldLabel}>Paciente *</Text>
            <ScrollView
              style={styles.patientList}
              showsVerticalScrollIndicator={false}
            >
              {patients.length === 0 ? (
                <Text style={styles.noPatientsText}>Nenhum paciente cadastrado</Text>
              ) : (
                patients.map((p) => {
                  const first = p.user?.profile?.firstName || '';
                  const last = p.user?.profile?.lastName || '';
                  const name = `${first} ${last}`.trim() || 'Sem nome';
                  const pid = p.studentId || p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.patientOption, selectedPatientId === pid && styles.patientOptionSelected]}
                      onPress={() => setSelectedPatientId(pid)}
                    >
                      <Text style={[styles.patientOptionText, selectedPatientId === pid && styles.patientOptionTextSelected]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <Text style={styles.fieldLabel}>Data (AAAA-MM-DD) *</Text>
            <View style={styles.fieldInput}>
              <Text style={styles.fieldInputText} onPress={() => {}}>
                {scheduledDate || 'Ex: 2026-07-15'}
              </Text>
            </View>
            {/* Simple text inputs for date/time since DateTimePicker requires native module */}
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeField}>
                <Text style={styles.fieldLabel}>Data *</Text>
                <View style={styles.fieldInput}>
                  <Text
                    style={[styles.fieldInputText, !scheduledDate && { color: COLORS.muted }]}
                    onPress={() => Alert.prompt
                      ? Alert.prompt('Data', 'Formato: AAAA-MM-DD', (v) => setScheduledDate(v || ''))
                      : Alert.alert('Info', 'Digite a data no formato AAAA-MM-DD')}
                  >
                    {scheduledDate || 'AAAA-MM-DD'}
                  </Text>
                </View>
              </View>
              <View style={styles.dateTimeField}>
                <Text style={styles.fieldLabel}>Hora *</Text>
                <View style={styles.fieldInput}>
                  <Text
                    style={[styles.fieldInputText, !scheduledTime && { color: COLORS.muted }]}
                    onPress={() => Alert.prompt
                      ? Alert.prompt('Hora', 'Formato: HH:MM', (v) => setScheduledTime(v || ''))
                      : Alert.alert('Info', 'Digite a hora no formato HH:MM')}
                  >
                    {scheduledTime || 'HH:MM'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleCreate}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>Agendar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  addButton: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  todayCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  todayLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  todayCount: { color: COLORS.accent, fontSize: 36, fontWeight: '700', marginTop: 4 },
  todayDate: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  loadingText: { color: COLORS.muted, marginTop: 12 },
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  consultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  consultCardDim: { opacity: 0.7 },
  consultIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  consultIconEmoji: { fontSize: 20 },
  consultInfo: { flex: 1, marginLeft: 12 },
  consultName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  consultDate: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  consultNotes: { color: COLORS.accent, fontSize: 11, marginTop: 3 },
  completeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: COLORS.success + '20' },
  completeBtnText: { color: COLORS.success, fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
  scheduleBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  scheduleBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  modalClose: { color: COLORS.muted, fontSize: 18, padding: 4 },
  fieldLabel: { color: COLORS.muted, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  patientList: { maxHeight: 160, marginBottom: 12 },
  noPatientsText: { color: COLORS.muted, fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  patientOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  patientOptionSelected: { backgroundColor: COLORS.primary + '30', borderColor: COLORS.primary },
  patientOptionText: { color: COLORS.muted, fontSize: 14 },
  patientOptionTextSelected: { color: COLORS.primary, fontWeight: '600' },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  fieldInputText: { color: COLORS.text, fontSize: 14 },
  dateTimeRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  dateTimeField: { flex: 1 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: { color: COLORS.muted, fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
