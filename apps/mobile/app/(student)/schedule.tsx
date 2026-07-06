import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { studentService, Appointment } from '../../src/services/student';

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

const SESSION_LABELS: Record<string, string> = {
  WORKOUT_SESSION: 'Treino presencial',
  ASSESSMENT: 'Avaliação física',
  CONSULTATION: 'Consultoria',
  ONLINE: 'Treino online',
};

const SESSION_EMOJIS: Record<string, string> = {
  WORKOUT_SESSION: '🏋️',
  ASSESSMENT: '📋',
  CONSULTATION: '💬',
  ONLINE: '💻',
};

type Tab = 'upcoming' | 'past';

interface ExtendedAppointment extends Appointment {
  scheduledAt?: string;
  type?: string;
  duration?: number;
  notes?: string;
  location?: string;
  trainer?: any;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getDaysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function getStatusInfo(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'SCHEDULED': return { label: 'Agendado', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' };
    case 'COMPLETED': return { label: 'Concluído', color: COLORS.success, bg: COLORS.success + '20' };
    case 'CANCELLED': return { label: 'Cancelado', color: COLORS.danger, bg: COLORS.danger + '15' };
    default: return { label: status, color: COLORS.muted, bg: 'rgba(255,255,255,0.06)' };
  }
}

export default function ScheduleScreen() {
  const [appointments, setAppointments] = useState<ExtendedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('upcoming');
  const now = new Date();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await studentService.getAppointments();
      setAppointments(data as ExtendedAppointment[]);
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível carregar os agendamentos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const upcoming = appointments
    .filter((a) => {
      const dateStr = a.scheduledAt || a.date;
      return a.status === 'SCHEDULED' && dateStr && new Date(dateStr) >= now;
    })
    .sort((a, b) => {
      const da = a.scheduledAt || a.date;
      const db = b.scheduledAt || b.date;
      return new Date(da).getTime() - new Date(db).getTime();
    });

  const past = appointments
    .filter((a) => {
      const dateStr = a.scheduledAt || a.date;
      return a.status !== 'SCHEDULED' || !dateStr || new Date(dateStr) < now;
    })
    .sort((a, b) => {
      const da = a.scheduledAt || a.date;
      const db = b.scheduledAt || b.date;
      return new Date(db).getTime() - new Date(da).getTime();
    });

  const list = tab === 'upcoming' ? upcoming : past;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.muted, marginTop: 12 }}>Carregando agenda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#6f5cf020', '#06b6d420']} style={styles.header}>
        <Text style={styles.headerTitle}>Minha Agenda</Text>
        <Text style={styles.headerSubtitle}>Sessões com seu personal trainer</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {([
          { key: 'upcoming', label: `Próximas (${upcoming.length})` },
          { key: 'past', label: 'Histórico' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={COLORS.primary}
          />
        }
      >
        {list.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>📅</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {tab === 'upcoming' ? 'Nenhum agendamento próximo' : 'Sem histórico de sessões'}
            </Text>
            <Text style={styles.emptySubtext}>
              {tab === 'upcoming'
                ? 'Seu personal trainer irá agendar sessões e elas aparecerão aqui.'
                : 'Sessões concluídas ou canceladas aparecerão aqui.'}
            </Text>
          </View>
        ) : (
          list.map((appt) => (
            <AppointmentCard key={appt.id} appt={appt} now={now} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function AppointmentCard({ appt, now }: { appt: ExtendedAppointment; now: Date }) {
  const dateStr = appt.scheduledAt || appt.date;
  const status = appt.status ?? 'SCHEDULED';
  const statusInfo = getStatusInfo(status);
  const sessionType = appt.type ?? 'WORKOUT_SESSION';
  const isUpcoming = status === 'SCHEDULED' && dateStr && new Date(dateStr) >= now;
  const daysUntil = dateStr ? getDaysUntil(dateStr) : null;

  const trainerName = appt.trainer?.user?.profile
    ? `${appt.trainer.user.profile.firstName ?? ''} ${appt.trainer.user.profile.lastName ?? ''}`.trim()
    : appt.professionalName || 'Personal Trainer';

  return (
    <View style={[styles.apptCard, status === 'CANCELLED' && styles.apptCardCancelled]}>
      <View style={styles.apptRow}>
        {/* Icon */}
        <View style={[
          styles.apptIconBox,
          status === 'COMPLETED' && { backgroundColor: COLORS.success + '20' },
          status === 'CANCELLED' && { backgroundColor: COLORS.danger + '15' },
          status === 'SCHEDULED' && { backgroundColor: COLORS.primary + '20' },
        ]}>
          {status === 'COMPLETED' ? (
            <Text style={styles.apptEmoji}>✅</Text>
          ) : status === 'CANCELLED' ? (
            <Text style={styles.apptEmoji}>🚫</Text>
          ) : (
            <Text style={styles.apptEmoji}>{SESSION_EMOJIS[sessionType] || '📅'}</Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.apptContent}>
          <View style={styles.apptTitleRow}>
            <Text style={styles.apptType} numberOfLines={1}>
              {SESSION_LABELS[sessionType] || appt.title || sessionType}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          <Text style={styles.apptTrainer}>👤 {trainerName}</Text>

          {dateStr ? (
            <View style={styles.apptMeta}>
              <Text style={styles.apptMetaText}>📅 {formatDate(dateStr)}</Text>
              <Text style={styles.apptMetaText}>🕐 {formatTime(dateStr)}{appt.duration ? ` · ${appt.duration}min` : ''}</Text>
              {appt.location ? (
                <Text style={styles.apptMetaText}>📍 {appt.location}</Text>
              ) : null}
            </View>
          ) : null}

          {appt.notes ? (
            <Text style={styles.apptNotes}>{appt.notes}</Text>
          ) : null}
        </View>

        {/* Countdown */}
        {isUpcoming && daysUntil !== null ? (
          <View style={styles.countdown}>
            <Text style={[
              styles.countdownText,
              daysUntil === 0 ? { color: COLORS.warning } : { color: COLORS.primary },
            ]}>
              {daysUntil === 0 ? 'Hoje!' : daysUntil === 1 ? 'Amanhã' : `em ${daysUntil}d`}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 60 },
  headerTitle: { color: COLORS.text, fontSize: 26, fontWeight: '700' },
  headerSubtitle: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  tabsContainer: {
    flexDirection: 'row',
    margin: 20,
    marginBottom: 0,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  apptCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  apptCardCancelled: { opacity: 0.6 },
  apptRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  apptIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  apptEmoji: { fontSize: 22 },
  apptContent: { flex: 1 },
  apptTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  apptType: { color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },
  apptTrainer: { color: COLORS.muted, fontSize: 12, marginBottom: 8 },
  apptMeta: { gap: 3 },
  apptMetaText: { color: COLORS.muted, fontSize: 12 },
  apptNotes: { color: COLORS.muted, fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  countdown: { flexShrink: 0, alignItems: 'flex-end', justifyContent: 'flex-start' },
  countdownText: { fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
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
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { color: COLORS.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
