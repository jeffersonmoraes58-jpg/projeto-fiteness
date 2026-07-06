import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { studentService } from '../../src/services/student';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 20 * 2 - 12) / 2;

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

const ALL_ACHIEVEMENTS = [
  { id: 'first_workout', title: 'Primeiro Treino', description: 'Complete seu primeiro treino', emoji: '💪', points: 50, category: 'treino' },
  { id: 'week_streak', title: '7 Dias Seguidos', description: 'Treine 7 dias consecutivos', emoji: '🔥', points: 150, category: 'sequencia' },
  { id: 'month_streak', title: '30 Dias Seguidos', description: 'Treine 30 dias consecutivos', emoji: '🔥', points: 500, category: 'sequencia' },
  { id: 'ten_workouts', title: '10 Treinos', description: 'Complete 10 treinos', emoji: '🏋️', points: 100, category: 'treino' },
  { id: 'fifty_workouts', title: '50 Treinos', description: 'Complete 50 treinos', emoji: '🏆', points: 300, category: 'treino' },
  { id: 'goal_reached', title: 'Meta Atingida', description: 'Conclua uma meta', emoji: '🎯', points: 200, category: 'metas' },
  { id: 'hydrated', title: 'Bem Hidratado', description: 'Beba 2L de água por 7 dias', emoji: '💧', points: 100, category: 'nutricao' },
  { id: 'diet_week', title: 'Dieta em Dia', description: 'Siga a dieta por 7 dias', emoji: '🥗', points: 150, category: 'nutricao' },
  { id: 'level_5', title: 'Nível 5', description: 'Alcance o nível 5', emoji: '⭐', points: 250, category: 'nivel' },
  { id: 'level_10', title: 'Nível 10', description: 'Alcance o nível 10', emoji: '🌟', points: 500, category: 'nivel' },
  { id: 'beast_mode', title: 'Beast Mode', description: 'Treine 5x em uma semana', emoji: '⚡', points: 200, category: 'treino' },
  { id: 'century', title: '100 Treinos', description: 'Complete 100 treinos', emoji: '🏅', points: 1000, category: 'treino' },
];

const CATEGORIES = [
  { key: 'todos', label: 'Todos' },
  { key: 'treino', label: 'Treino' },
  { key: 'sequencia', label: 'Sequência' },
  { key: 'metas', label: 'Metas' },
  { key: 'nutricao', label: 'Nutrição' },
  { key: 'nivel', label: 'Nível' },
];

interface DashboardStats {
  points: number;
  level: number;
  streak: number;
}

export default function AchievementsScreen() {
  const [earned, setEarned] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [achievementsData, dashboardData] = await Promise.allSettled([
        studentService.getAchievements(),
        studentService.getDashboard(),
      ]);
      if (achievementsData.status === 'fulfilled') setEarned(achievementsData.value);
      if (dashboardData.status === 'fulfilled') {
        const d = dashboardData.value;
        setStats({ points: d.points, level: d.level, streak: d.streak });
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível carregar as conquistas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const earnedTitles = new Set(earned.map((a: any) => a.title));
  const totalPoints = earned.reduce((sum: number, a: any) => sum + (a.points || 0), 0);
  const currentPoints = stats?.points ?? totalPoints;
  const currentLevel = stats?.level ?? 1;
  const nextLevelPoints = currentLevel * 500;
  const progressPct = Math.min((currentPoints / nextLevelPoints) * 100, 100);

  const filtered = filter === 'todos'
    ? ALL_ACHIEVEMENTS
    : ALL_ACHIEVEMENTS.filter((a) => a.category === filter);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.muted, marginTop: 12 }}>Carregando conquistas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <LinearGradient colors={['#6f5cf020', '#06b6d420']} style={styles.header}>
          <Text style={styles.headerTitle}>Conquistas</Text>
          <Text style={styles.headerSubtitle}>
            {earned.length} de {ALL_ACHIEVEMENTS.length} desbloqueadas
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { label: 'Desbloqueadas', value: String(earned.length), color: COLORS.warning },
              { label: 'Pontos', value: String(currentPoints), color: COLORS.primary },
              { label: 'Nível', value: String(currentLevel), color: COLORS.accent },
            ].map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Level progress */}
        <View style={styles.section}>
          <View style={styles.levelCard}>
            <View style={styles.levelRow}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                style={styles.levelBadge}
              >
                <Text style={styles.levelBadgeText}>{currentLevel}</Text>
              </LinearGradient>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.levelTitle}>Nível {currentLevel}</Text>
                <Text style={styles.levelSubtitle}>
                  {currentPoints} / {nextLevelPoints} pontos
                </Text>
              </View>
              <View style={styles.levelNextContainer}>
                <Text style={styles.levelNextLabel}>Próximo nível</Text>
                <Text style={styles.levelNextValue}>
                  {Math.max(nextLevelPoints - currentPoints, 0)} pts
                </Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${progressPct}%` as any }]} />
            </View>
          </View>
        </View>

        {/* Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setFilter(cat.key)}
              style={[styles.filterChip, filter === cat.key && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filter === cat.key && styles.filterChipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Achievements grid */}
        <View style={styles.grid}>
          {filtered.map((achievement) => {
            const isEarned = earnedTitles.has(achievement.title);
            return (
              <AchievementCard key={achievement.id} achievement={achievement} isEarned={isEarned} />
            );
          })}
        </View>

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>Nenhuma conquista nessa categoria</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function AchievementCard({ achievement, isEarned }: { achievement: typeof ALL_ACHIEVEMENTS[0]; isEarned: boolean }) {
  return (
    <View style={[styles.achCard, { width: CARD_SIZE }, !isEarned && styles.achCardLocked]}>
      {isEarned && (
        <View style={styles.achCheckBadge}>
          <Text style={styles.achCheckText}>✓</Text>
        </View>
      )}
      <View style={[styles.achIconContainer, isEarned && styles.achIconContainerEarned]}>
        {isEarned ? (
          <Text style={styles.achEmoji}>{achievement.emoji}</Text>
        ) : (
          <Text style={styles.achLockEmoji}>🔒</Text>
        )}
      </View>
      <Text style={[styles.achTitle, !isEarned && { color: COLORS.muted }]} numberOfLines={2}>
        {achievement.title}
      </Text>
      <Text style={styles.achDesc} numberOfLines={2}>{achievement.description}</Text>
      <View style={styles.achPointsRow}>
        <Text style={styles.achPointsStar}>⭐</Text>
        <Text style={[styles.achPoints, isEarned && { color: COLORS.warning }]}>
          {achievement.points} pts
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 60 },
  headerTitle: { color: COLORS.text, fontSize: 26, fontWeight: '700' },
  headerSubtitle: { color: COLORS.muted, fontSize: 14, marginTop: 4, marginBottom: 20 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  levelCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  levelTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  levelSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  levelNextContainer: { alignItems: 'flex-end' },
  levelNextLabel: { color: COLORS.muted, fontSize: 11 },
  levelNextValue: { color: COLORS.primary, fontSize: 13, fontWeight: '600', marginTop: 2 },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  filterScroll: { marginTop: 20 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: { color: COLORS.muted, fontSize: 13, fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
  },
  achCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  achCardLocked: { opacity: 0.45 },
  achCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achCheckText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  achIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  achIconContainerEarned: {
    backgroundColor: COLORS.primary + '30',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  achEmoji: { fontSize: 28 },
  achLockEmoji: { fontSize: 24 },
  achTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  achDesc: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 8,
  },
  achPointsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  achPointsStar: { fontSize: 10 },
  achPoints: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: COLORS.muted, fontSize: 15 },
});
