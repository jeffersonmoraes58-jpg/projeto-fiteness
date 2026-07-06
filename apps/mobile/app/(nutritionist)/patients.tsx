import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';

const COLORS = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  primary: '#6f5cf0',
  accent: '#06b6d4',
  success: '#10b981',
  text: '#f1f5f9',
  muted: '#64748b',
  border: 'rgba(255,255,255,0.08)',
};

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: 'Perda de peso',
  GAIN_MUSCLE: 'Ganho muscular',
  MAINTAIN_WEIGHT: 'Manutenção',
  IMPROVE_ENDURANCE: 'Resistência',
  INCREASE_FLEXIBILITY: 'Flexibilidade',
  ATHLETIC_PERFORMANCE: 'Performance',
  REHABILITATION: 'Reabilitação',
};

const AVATAR_COLORS: [string, string][] = [
  ['#6f5cf0', '#06b6d4'],
  ['#10b981', '#06b6d4'],
  ['#f59e0b', '#ef4444'],
  ['#8b5cf6', '#ec4899'],
  ['#06b6d4', '#3b82f6'],
];

type FilterType = 'Todos' | 'Ativos' | 'Inativos';

interface Patient {
  id: string;
  isActive?: boolean;
  goalType?: string;
  dietCompliance?: number;
  user?: {
    email?: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export default function NutritionistPatientsScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('Todos');

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/nutritionists/me/patients');
      const data = res.data;
      setPatients(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setPatients([]);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar os pacientes.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filtered = patients.filter((p) => {
    const first = p.user?.profile?.firstName || '';
    const last = p.user?.profile?.lastName || '';
    const name = `${first} ${last}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchFilter =
      filter === 'Todos' ||
      (filter === 'Ativos' && p.isActive) ||
      (filter === 'Inativos' && !p.isActive);
    return matchSearch && matchFilter;
  });

  const activeCount = patients.filter((p) => p.isActive).length;
  const inactiveCount = patients.filter((p) => !p.isActive).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#6f5cf020', '#06b6d420']} style={styles.header}>
        <Text style={styles.title}>Pacientes</Text>
        <Text style={styles.subtitle}>{patients.length} pacientes cadastrados</Text>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar paciente..."
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.filterRow}>
          {(['Todos', 'Ativos', 'Inativos'] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>{patients.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Ativos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.muted }]}>{inactiveCount}</Text>
          <Text style={styles.statLabel}>Inativos</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando pacientes...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>Nenhum paciente encontrado</Text>
              <Text style={styles.emptySubtext}>
                {search ? 'Tente outro nome ou filtro.' : 'Você não tem pacientes cadastrados ainda.'}
              </Text>
            </View>
          ) : (
            filtered.map((patient, index) => {
              const first = patient.user?.profile?.firstName || '';
              const last = patient.user?.profile?.lastName || '';
              const initials = `${first[0] || ''}${last[0] || ''}`.toUpperCase() || '?';
              const email = patient.user?.email || '';
              const goal = GOAL_LABELS[patient.goalType || ''] || 'Sem objetivo definido';
              const compliance = patient.dietCompliance ?? 0;
              const avatarColors = AVATAR_COLORS[index % AVATAR_COLORS.length];

              return (
                <View key={patient.id} style={styles.patientCard}>
                  <View style={styles.cardTop}>
                    <LinearGradient colors={avatarColors} style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </LinearGradient>
                    <View style={styles.patientInfo}>
                      <Text style={styles.patientName}>{first} {last}</Text>
                      <Text style={styles.patientEmail} numberOfLines={1}>{email}</Text>
                      <Text style={styles.patientGoal}>{goal}</Text>
                    </View>
                    <View style={[styles.badge, patient.isActive ? styles.badgeActive : styles.badgeInactive]}>
                      <Text style={[styles.badgeText, patient.isActive ? styles.badgeActiveText : styles.badgeInactiveText]}>
                        {patient.isActive ? 'Ativo' : 'Inativo'}
                      </Text>
                    </View>
                  </View>

                  {/* Compliance bar */}
                  <View style={styles.complianceRow}>
                    <Text style={styles.complianceLabel}>Adesão à dieta</Text>
                    <Text style={styles.complianceValue}>{compliance}%</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(compliance, 100)}%` as any },
                        compliance >= 70 ? styles.progressGood : styles.progressBad,
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 60 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  searchContainer: { paddingHorizontal: 20, paddingTop: 16 },
  searchRow: { marginBottom: 12 },
  searchInput: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: COLORS.border },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  loadingText: { color: COLORS.muted, marginTop: 12 },
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  patientCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  patientInfo: { flex: 1, marginLeft: 12 },
  patientName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  patientEmail: { color: COLORS.muted, fontSize: 12, marginTop: 1 },
  patientGoal: { color: COLORS.accent, fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeActive: { backgroundColor: '#10b98120' },
  badgeInactive: { backgroundColor: COLORS.muted + '20' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeActiveText: { color: '#10b981' },
  badgeInactiveText: { color: COLORS.muted },
  complianceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  complianceLabel: { color: COLORS.muted, fontSize: 12 },
  complianceValue: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressGood: { backgroundColor: '#10b981' },
  progressBad: { backgroundColor: '#f59e0b' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
});
