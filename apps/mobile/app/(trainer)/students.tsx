import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trainerService, Student } from '../../src/services/trainer';

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

export default function StudentsScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await trainerService.getStudents();
      setStudents(data);
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível carregar os alunos');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

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
        <Text style={styles.title}>Meus Alunos</Text>
        <Text style={styles.subtitle}>{students.length} alunos cadastrados</Text>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar aluno..."
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await loadStudents();
          setRefreshing(false);
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>Nenhum aluno encontrado</Text>
            <Text style={styles.emptySubtext}>
              Os alunos vinculados a você aparecerão aqui
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.studentCard} activeOpacity={0.8}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
              </Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentEmail}>{item.email}</Text>
              <Text style={styles.studentWorkouts}>
                {item._count?.workoutPlans ?? 0} treinos ativos
              </Text>
            </View>
            <View style={[styles.statusBadge, item.status === 'ACTIVE' ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.statusText, item.status === 'ACTIVE' ? styles.activeText : styles.inactiveText]}>
                {item.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
              </Text>
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
  searchContainer: { paddingHorizontal: 20, paddingTop: 16 },
  searchInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  studentInfo: { flex: 1 },
  studentName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  studentEmail: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  studentWorkouts: { color: COLORS.accent, fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeBadge: { backgroundColor: COLORS.success + '20' },
  inactiveBadge: { backgroundColor: COLORS.muted + '20' },
  statusText: { fontSize: 11, fontWeight: '600' },
  activeText: { color: COLORS.success },
  inactiveText: { color: COLORS.muted },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: COLORS.muted, fontSize: 15 },
  emptySubtext: { color: COLORS.muted, fontSize: 13, marginTop: 4, textAlign: 'center' },
});
