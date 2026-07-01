import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

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

// Mock data for now
const MOCK_STUDENTS = [
  { id: '1', name: 'João Silva', email: 'joao@email.com', workouts: 3, status: 'active' },
  { id: '2', name: 'Maria Santos', email: 'maria@email.com', workouts: 5, status: 'active' },
  { id: '3', name: 'Pedro Oliveira', email: 'pedro@email.com', workouts: 1, status: 'inactive' },
];

export default function StudentsScreen() {
  const [search, setSearch] = useState('');

  const filteredStudents = MOCK_STUDENTS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6f5cf020', '#06b6d420']} style={styles.header}>
        <Text style={styles.title}>Meus Alunos</Text>
        <Text style={styles.subtitle}>{MOCK_STUDENTS.length} alunos cadastrados</Text>
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
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>Nenhum aluno encontrado</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.studentCard} activeOpacity={0.8}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentEmail}>{item.email}</Text>
              <Text style={styles.studentWorkouts}>{item.workouts} treinos ativos</Text>
            </View>
            <View style={[styles.statusBadge, item.status === 'active' ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.statusText, item.status === 'active' ? styles.activeText : styles.inactiveText]}>
                {item.status === 'active' ? 'Ativo' : 'Inativo'}
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
});
