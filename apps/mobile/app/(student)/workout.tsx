import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { studentService, WorkoutPlan, WorkoutLog } from '../../src/services/student';

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

export default function WorkoutScreen() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'history'>('plan');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [planData, logsData] = await Promise.all([
        studentService.getWorkoutPlan(),
        studentService.getWorkoutLogs(),
      ]);
      setPlan(planData);
      setLogs(logsData || []);
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível carregar os treinos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStartWorkout = async () => {
    if (!plan) return;
    try {
      setStarting(true);
      await studentService.startWorkout(plan.id);
      Alert.alert('Treino Iniciado!', 'Bom treino! 💪');
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Erro ao iniciar treino');
    } finally {
      setStarting(false);
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
        <Text style={styles.subtitle}>
          {plan ? `${plan.exercises?.length || 0} exercícios` : 'Nenhum treino ativo'}
        </Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'plan' && styles.tabActive]}
          onPress={() => setActiveTab('plan')}
        >
          <Text style={[styles.tabText, activeTab === 'plan' && styles.tabTextActive]}>
            Treino Ativo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Histórico
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'plan' ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {plan ? (
            <>
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  {plan.description ? (
                    <Text style={styles.planDesc}>{plan.description}</Text>
                  ) : null}
                  {plan.estimatedMinutes ? (
                    <Text style={styles.planMeta}>⏱ ~{plan.estimatedMinutes} minutos</Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.startButton}
                  onPress={handleStartWorkout}
                  disabled={starting}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.accent]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.startGradient}
                  >
                    <Text style={styles.startText}>
                      {starting ? 'Iniciando...' : '▶ Iniciar Treino'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </MotiView>

              <Text style={styles.sectionTitle}>Exercícios</Text>
              {plan.exercises?.map((ex, index) => (
                <MotiView
                  key={ex.id || index}
                  from={{ opacity: 0, translateX: -10 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ delay: index * 50 }}
                >
                  <View style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                      <View style={styles.exerciseNumber}>
                        <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName}>{ex.name}</Text>
                        <Text style={styles.exerciseMeta}>
                          {ex.sets} séries x {ex.reps} reps
                          {ex.weight ? ` · ${ex.weight}kg` : ''}
                        </Text>
                      </View>
                    </View>
                    {ex.notes ? (
                      <Text style={styles.exerciseNotes}>{ex.notes}</Text>
                    ) : null}
                    <View style={styles.exerciseFooter}>
                      <Text style={styles.restText}>⏱ {ex.restSeconds}s descanso</Text>
                    </View>
                  </View>
                </MotiView>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💪</Text>
              <Text style={styles.emptyText}>Nenhum treino ativo</Text>
              <Text style={styles.emptySubtext}>
                Seu personal trainer ainda não atribuiu um treino para você
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <MotiView
                key={log.id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 50 }}
              >
                <View style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logDate}>
                      {new Date(log.startedAt).toLocaleDateString('pt-BR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </Text>
                    <View style={[styles.logStatus, log.completedAt ? styles.logCompleted : styles.logPending]}>
                      <Text style={[styles.logStatusText, log.completedAt ? styles.logCompletedText : styles.logPendingText]}>
                        {log.completedAt ? 'Concluído' : 'Em andamento'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.logExercises}>
                    {log.exercises?.length || 0} exercícios realizados
                  </Text>
                  {log.notes ? (
                    <Text style={styles.logNotes}>{log.notes}</Text>
                  ) : null}
                </View>
              </MotiView>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>Nenhum treino realizado</Text>
              <Text style={styles.emptySubtext}>
                Seu histórico de treinos aparecerá aqui
              </Text>
            </View>
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
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  tabText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  planHeader: { marginBottom: 16 },
  planName: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  planDesc: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  planMeta: { color: COLORS.accent, fontSize: 13, marginTop: 8 },
  startButton: { borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
  startGradient: { paddingVertical: 16, alignItems: 'center' },
  startText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  exerciseCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center' },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseNumberText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  exerciseMeta: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  exerciseNotes: { color: COLORS.warning, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  exerciseFooter: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  restText: { color: COLORS.accent, fontSize: 12 },
  logCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logDate: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  logStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  logCompleted: { backgroundColor: COLORS.success + '20' },
  logPending: { backgroundColor: COLORS.warning + '20' },
  logStatusText: { fontSize: 11, fontWeight: '600' },
  logCompletedText: { color: COLORS.success },
  logPendingText: { color: COLORS.warning },
  logExercises: { color: COLORS.muted, fontSize: 13 },
  logNotes: { color: COLORS.muted, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },
});
