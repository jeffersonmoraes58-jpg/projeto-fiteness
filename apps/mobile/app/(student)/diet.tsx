import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { studentService, DietPlan, MealLog } from '../../src/services/student';

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

export default function DietScreen() {
  const [diet, setDiet] = useState<DietPlan | null>(null);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plan' | 'today'>('plan');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [dietData, logsData] = await Promise.all([
        studentService.getDiet(),
        studentService.getMealLogsToday(),
      ]);
      setDiet(dietData);
      setMealLogs(logsData || []);
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível carregar a dieta');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getTotalCalories = () => {
    return mealLogs.reduce((sum, log) => {
      return sum + (log.foods || []).reduce((s, f: any) => s + (f.calories || 0), 0);
    }, 0);
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
        <Text style={styles.title}>Plano Alimentar</Text>
        <Text style={styles.subtitle}>
          {diet ? `${diet.meals?.length || 0} refeições` : 'Nenhuma dieta ativa'}
        </Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'plan' && styles.tabActive]}
          onPress={() => setActiveTab('plan')}
        >
          <Text style={[styles.tabText, activeTab === 'plan' && styles.tabTextActive]}>
            Plano
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.tabActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
            Hoje
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'plan' ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {diet ? (
            <>
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
              >
                <View style={styles.dietHeader}>
                  <Text style={styles.dietName}>{diet.name}</Text>
                  {diet.description ? (
                    <Text style={styles.dietDesc}>{diet.description}</Text>
                  ) : null}
                </View>

                {/* Daily targets */}
                <View style={styles.targetsCard}>
                  <Text style={styles.targetsTitle}>Metas Diárias</Text>
                  <View style={styles.targetsGrid}>
                    <View style={styles.targetItem}>
                      <Text style={styles.targetValue}>{diet.dailyCalories}</Text>
                      <Text style={styles.targetLabel}>kcal</Text>
                    </View>
                    <View style={styles.targetItem}>
                      <Text style={[styles.targetValue, { color: COLORS.primary }]}>{diet.dailyProtein}g</Text>
                      <Text style={styles.targetLabel}>Proteína</Text>
                    </View>
                    <View style={styles.targetItem}>
                      <Text style={[styles.targetValue, { color: COLORS.accent }]}>{diet.dailyCarbs}g</Text>
                      <Text style={styles.targetLabel}>Carbs</Text>
                    </View>
                    <View style={styles.targetItem}>
                      <Text style={[styles.targetValue, { color: COLORS.warning }]}>{diet.dailyFat}g</Text>
                      <Text style={styles.targetLabel}>Gorduras</Text>
                    </View>
                  </View>
                </View>
              </MotiView>

              <Text style={styles.sectionTitle}>Refeições</Text>
              {diet.meals?.map((meal, index) => (
                <MotiView
                  key={meal.id || index}
                  from={{ opacity: 0, translateX: -10 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ delay: index * 50 }}
                >
                  <View style={styles.mealCard}>
                    <View style={styles.mealHeader}>
                      <View style={styles.mealTimeBadge}>
                        <Text style={styles.mealTimeText}>{meal.time}</Text>
                      </View>
                      <Text style={styles.mealName}>{meal.name}</Text>
                    </View>

                    {meal.foods?.map((food, fi) => (
                      <View key={food.id || fi} style={styles.foodRow}>
                        <View style={styles.foodInfo}>
                          <Text style={styles.foodName}>{food.name}</Text>
                          <Text style={styles.foodAmount}>
                            {food.amount}{food.unit}
                          </Text>
                        </View>
                        <Text style={styles.foodCalories}>{food.calories} kcal</Text>
                      </View>
                    ))}

                    <View style={styles.mealTotal}>
                      <Text style={styles.mealTotalText}>
                        Total: {meal.foods?.reduce((s, f) => s + f.calories, 0)} kcal
                      </Text>
                    </View>
                  </View>
                </MotiView>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🥗</Text>
              <Text style={styles.emptyText}>Nenhum plano alimentar</Text>
              <Text style={styles.emptySubtext}>
                Seu nutricionista ainda não atribuiu uma dieta para você
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {mealLogs.length > 0 ? (
            <>
              <View style={styles.todaySummary}>
                <Text style={styles.todayCalories}>
                  {getTotalCalories()} / {diet?.dailyCalories || 2200} kcal
                </Text>
                <Text style={styles.todayLabel}>Consumido hoje</Text>
              </View>

              {mealLogs.map((log, index) => (
                <MotiView
                  key={log.id}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: index * 50 }}
                >
                  <View style={styles.logCard}>
                    <Text style={styles.logMealName}>{log.mealName}</Text>
                    <Text style={styles.logTime}>
                      {new Date(log.loggedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {(log.foods || []).map((food: any, fi: number) => (
                      <View key={fi} style={styles.logFoodRow}>
                        <Text style={styles.logFoodName}>{food.name}</Text>
                        <Text style={styles.logFoodCals}>{food.calories} kcal</Text>
                      </View>
                    ))}
                  </View>
                </MotiView>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyText}>Nenhuma refeição registrada hoje</Text>
              <Text style={styles.emptySubtext}>
                Registre suas refeições para acompanhar sua alimentação
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
  dietHeader: { marginBottom: 16 },
  dietName: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  dietDesc: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  targetsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  targetsTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginBottom: 16 },
  targetsGrid: { flexDirection: 'row', gap: 12 },
  targetItem: { flex: 1, alignItems: 'center' },
  targetValue: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  targetLabel: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  mealCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mealTimeBadge: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  mealTimeText: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
  mealName: { color: COLORS.text, fontSize: 15, fontWeight: '600', flex: 1 },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  foodInfo: { flex: 1 },
  foodName: { color: COLORS.text, fontSize: 13 },
  foodAmount: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  foodCalories: { color: COLORS.muted, fontSize: 13 },
  mealTotal: { marginTop: 8, alignItems: 'flex-end' },
  mealTotalText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  todaySummary: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  todayCalories: { color: COLORS.text, fontSize: 28, fontWeight: '700' },
  todayLabel: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  logCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logMealName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  logTime: { color: COLORS.muted, fontSize: 12, marginTop: 2, marginBottom: 8 },
  logFoodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  logFoodName: { color: COLORS.text, fontSize: 13 },
  logFoodCals: { color: COLORS.muted, fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },
});
