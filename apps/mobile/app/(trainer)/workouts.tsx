import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trainerService, Workout } from '../../src/services/trainer';

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

export default function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      setLoading(true);
      const data = await trainerService.getWorkouts();
      setWorkouts(data);
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível carregar os treinos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6f5cf020', '#06b6d420']} style={styles.header}>
        <Text style={styles.title}>Meus Treinos</Text>
        <Text style={styles.subtitle}>{workouts.length} treinos criados</Text>
      </LinearGradient>

      <TouchableOpacity style={styles.createButton} activeOpacity={0.8}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.createGradient}
        >
          <Text style={styles.createButtonText}>+ Novo Treino</Text>
        </LinearGradient>
      </TouchableOpacity>

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshing={loading}
        onRefresh={loadWorkouts}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Nenhum treino criado</Text>
            <Text style={styles.emptySubtext}>Crie seu primeiro treino</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.workoutCard} activeOpacity={0.8}>
            <View style={styles.workoutHeader}>
              <Text style={styles.workoutName}>{item.name}</Text>
              <View style={[styles.statusBadge, item.status === 'active' ? styles.activeBadge : styles.draftBadge]}>
                <Text style={[styles.statusText, item.status === 'active' ? styles.activeText : styles.draftText]}>
                  {item.status === 'active' ? 'Ativo' : 'Rascunho'}
                </Text>
              </View>
            </View>
            <View style={styles.workoutMeta}>
              <Text style={styles.metaItem}>🏋️ {item._count?.exercises ?? 0} exercícios</Text>
              <Text style={styles.metaItem}>👥 {item._count?.assignedStudents ?? 0} alunos</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 60 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  createButton: { margin: 20, borderRadius: 14, overflow: 'hidden' },
  createGradient: { paddingVertical: 14, alignItems: 'center' },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  workoutCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  workoutName: { color: COLORS.text, fontSize: 16, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeBadge: { backgroundColor: COLORS.success + '20' },
  draftBadge: { backgroundColor: COLORS.warning + '20' },
  statusText: { fontSize: 11, fontWeight: '600' },
  activeText: { color: COLORS.success },
  draftText: { color: COLORS.warning },
  workoutMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { color: COLORS.muted, fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
});
