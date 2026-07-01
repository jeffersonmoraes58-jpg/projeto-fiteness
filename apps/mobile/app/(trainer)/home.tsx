import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { router } from 'expo-router';

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

const quickActions = [
  { icon: '👥', label: 'Alunos', route: '/(trainer)/students', color: COLORS.primary },
  { icon: '📋', label: 'Treinos', route: '/(trainer)/workouts', color: COLORS.accent },
  { icon: '🏋️', label: 'Exercícios', route: '/(trainer)/exercises', color: COLORS.success },
  { icon: '📊', label: 'Relatórios', route: '/(trainer)/home', color: COLORS.warning },
];

export default function TrainerHomeScreen() {
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <LinearGradient
          colors={['#6f5cf020', '#06b6d420']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Painel do Trainer</Text>
              <Text style={styles.subtitle}>Gerencie seus alunos e treinos</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakIcon}>🏆</Text>
              <Text style={styles.streakText}>Pro</Text>
            </View>
          </View>

          {/* Quick stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Alunos', value: '0', color: COLORS.primary },
              { label: 'Treinos', value: '0', color: COLORS.accent },
              { label: 'Hoje', value: '0', color: COLORS.warning },
            ].map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <MotiView
                key={action.label}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 50 }}
                style={{ flex: 1 }}
              >
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                    <Text style={styles.actionEmoji}>{action.icon}</Text>
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
              </MotiView>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Atividade Recente</Text>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Nenhuma atividade recente</Text>
            <Text style={styles.emptySubtext}>
              Comece adicionando alunos e criando treinos
            </Text>
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Links Rápidos</Text>
          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => router.push('/(trainer)/students')}
            activeOpacity={0.8}
          >
            <Text style={styles.linkIcon}>👥</Text>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Gerenciar Alunos</Text>
              <Text style={styles.linkSubtitle}>Adicione e gerencie seus alunos</Text>
            </View>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => router.push('/(trainer)/workouts')}
            activeOpacity={0.8}
          >
            <Text style={styles.linkIcon}>📋</Text>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Criar Treino</Text>
              <Text style={styles.linkSubtitle}>Monte treinos personalizados</Text>
            </View>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => router.push('/(trainer)/exercises')}
            activeOpacity={0.8}
          >
            <Text style={styles.linkIcon}>🏋️</Text>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Biblioteca de Exercícios</Text>
              <Text style={styles.linkSubtitle}>Explore e gerencie exercícios</Text>
            </View>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 60 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 2 },
  streakBadge: { backgroundColor: COLORS.card, borderRadius: 16, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  streakIcon: { fontSize: 20 },
  streakText: { color: COLORS.warning, fontSize: 16, fontWeight: '700', marginTop: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 16, padding: 16, gap: 16, borderWidth: 1, borderColor: COLORS.border },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionEmoji: { fontSize: 22 },
  actionLabel: { color: COLORS.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 4 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkIcon: { fontSize: 24, marginRight: 12 },
  linkContent: { flex: 1 },
  linkTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  linkSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  linkArrow: { color: COLORS.muted, fontSize: 24, fontWeight: '300' },
});
