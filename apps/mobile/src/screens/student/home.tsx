import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

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

export default function StudentHomeScreen() {
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
              <Text style={styles.greeting}>Bom dia, João! 👋</Text>
              <Text style={styles.subtitle}>Vamos treinar hoje?</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>32</Text>
            </View>
          </View>

          {/* Quick stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Pontos', value: '2.450', color: COLORS.primary },
              { label: 'Nível', value: '8', color: COLORS.accent },
              { label: 'Streak', value: '32d', color: COLORS.warning },
            ].map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Today's workout */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Treino de Hoje</Text>
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 100 }}
          >
            <TouchableOpacity
              style={styles.workoutCard}
              onPress={() => router.push('/student/workout')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.primary + '40', COLORS.accent + '20']}
                style={styles.workoutGradient}
              >
                <View style={styles.workoutHeader}>
                  <View>
                    <Text style={styles.workoutTitle}>Treino A - Peito e Tríceps</Text>
                    <Text style={styles.workoutMeta}>8 exercícios · ~60 min</Text>
                  </View>
                  <View style={styles.workoutBadge}>
                    <Text style={styles.workoutBadgeText}>Hoje</Text>
                  </View>
                </View>

                <View style={styles.exercisePreview}>
                  {['Supino', 'Crossover', 'Tríceps', '+5'].map((ex, i) => (
                    <View key={ex} style={[styles.exerciseTag, i === 3 && styles.exerciseTagMore]}>
                      <Text style={[styles.exerciseTagText, i === 3 && { color: COLORS.accent }]}>{ex}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={styles.startButton} activeOpacity={0.8}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.accent]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.startButtonGradient}
                  >
                    <Text style={styles.startButtonText}>Iniciar Treino</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          </MotiView>
        </View>

        {/* Today's diet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dieta de Hoje</Text>
          <View style={styles.dietCard}>
            <MacroBar label="Proteína" current={120} target={160} color="#6f5cf0" />
            <MacroBar label="Carboidratos" current={180} target={250} color="#06b6d4" />
            <MacroBar label="Gordura" current={45} target={65} color="#f59e0b" />

            <View style={styles.calorieRow}>
              <Text style={styles.calorieText}>1.820 / 2.200 kcal</Text>
              <Text style={styles.caloriePercent}>83%</Text>
            </View>
          </View>
        </View>

        {/* Water tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hidratação</Text>
          <View style={styles.waterCard}>
            <View style={styles.waterInfo}>
              <Text style={styles.waterAmount}>1.4L</Text>
              <Text style={styles.waterGoal}>/ 3.0L</Text>
            </View>
            <View style={styles.waterGlasses}>
              {[...Array(8)].map((_, i) => (
                <TouchableOpacity key={i} style={[styles.waterGlass, i < 4 && styles.waterGlassFilled]}>
                  <Text style={styles.waterGlassText}>💧</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Recent achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conquistas Recentes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
            {[
              { emoji: '🏆', title: '30 Dias', desc: 'Sequência' },
              { emoji: '💪', title: 'Força', desc: 'Novo PR' },
              { emoji: '🥗', title: 'Dieta', desc: '7 dias' },
              { emoji: '🔥', title: 'Queima', desc: '5k kcal' },
            ].map((ach) => (
              <View key={ach.title} style={styles.achievementCard}>
                <Text style={styles.achievementEmoji}>{ach.emoji}</Text>
                <Text style={styles.achievementTitle}>{ach.title}</Text>
                <Text style={styles.achievementDesc}>{ach.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

function MacroBar({ label, current, target, color }: any) {
  const percent = Math.min((current / target) * 100, 100);
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: COLORS.text, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: COLORS.muted, fontSize: 12 }}>{current}g / {target}g</Text>
      </View>
      <View style={{ height: 6, backgroundColor: COLORS.border, borderRadius: 3 }}>
        <View style={{ width: `${percent}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
      </View>
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
  workoutCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  workoutGradient: { padding: 20 },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  workoutTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  workoutMeta: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  workoutBadge: { backgroundColor: COLORS.primary + '30', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  workoutBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  exercisePreview: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  exerciseTag: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  exerciseTagMore: { backgroundColor: COLORS.accent + '20' },
  exerciseTagText: { color: COLORS.text, fontSize: 12 },
  startButton: { borderRadius: 14, overflow: 'hidden' },
  startButtonGradient: { paddingVertical: 14, alignItems: 'center' },
  startButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dietCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  calorieText: { color: COLORS.muted, fontSize: 13 },
  caloriePercent: { color: COLORS.success, fontSize: 13, fontWeight: '600' },
  waterCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  waterInfo: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  waterAmount: { color: COLORS.accent, fontSize: 36, fontWeight: '700' },
  waterGoal: { color: COLORS.muted, fontSize: 18, marginLeft: 4 },
  waterGlasses: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  waterGlass: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  waterGlassFilled: { backgroundColor: COLORS.accent + '20', borderColor: COLORS.accent + '40' },
  waterGlassText: { fontSize: 20 },
  achievementsScroll: { marginLeft: -4 },
  achievementCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginHorizontal: 6, alignItems: 'center', width: 90, borderWidth: 1, borderColor: COLORS.border },
  achievementEmoji: { fontSize: 28, marginBottom: 6 },
  achievementTitle: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  achievementDesc: { color: COLORS.muted, fontSize: 10, marginTop: 2 },
});
