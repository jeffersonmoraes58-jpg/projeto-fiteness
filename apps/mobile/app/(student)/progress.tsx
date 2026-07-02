import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { studentService, ProgressData, Measurement } from '../../src/services/student';

const { width } = Dimensions.get('window');

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

export default function ProgressScreen() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'measurements' | 'photos' | 'charts'>('measurements');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await studentService.getProgress();
      setProgress(data);
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível carregar os dados de progresso');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const latestMeasurement = progress?.measurements?.[progress.measurements.length - 1];
  const previousMeasurement = progress?.measurements?.[progress.measurements.length - 2];

  const getDiff = (current?: number, previous?: number) => {
    if (current == null || previous == null) return null;
    const diff = current - previous;
    return {
      value: Math.abs(diff).toFixed(1),
      isPositive: diff > 0,
      isNeutral: diff === 0,
    };
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
        <Text style={styles.title}>Meu Progresso</Text>
        <Text style={styles.subtitle}>
          {progress?.measurements?.length || 0} medições registradas
        </Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'measurements' && styles.tabActive]}
          onPress={() => setActiveTab('measurements')}
        >
          <Text style={[styles.tabText, activeTab === 'measurements' && styles.tabTextActive]}>
            Medidas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'charts' && styles.tabActive]}
          onPress={() => setActiveTab('charts')}
        >
          <Text style={[styles.tabText, activeTab === 'charts' && styles.tabTextActive]}>
            Gráficos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'photos' && styles.tabActive]}
          onPress={() => setActiveTab('photos')}
        >
          <Text style={[styles.tabText, activeTab === 'photos' && styles.tabTextActive]}>
            Fotos
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {activeTab === 'measurements' && (
          <>
            {/* Latest measurements summary */}
            {latestMeasurement ? (
              <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Última Medição</Text>
                  <Text style={styles.summaryDate}>
                    {new Date(latestMeasurement.date).toLocaleDateString('pt-BR')}
                  </Text>

                  <View style={styles.measurementsGrid}>
                    <View style={styles.measureItem}>
                      <Text style={styles.measureValue}>{latestMeasurement.weight}kg</Text>
                      <Text style={styles.measureLabel}>Peso</Text>
                      {previousMeasurement?.weight ? (
                        <Text style={[styles.measureDiff, {
                          color: latestMeasurement.weight < previousMeasurement.weight ? COLORS.success : COLORS.warning
                        }]}>
                          {latestMeasurement.weight < previousMeasurement.weight ? '▼' : '▲'} {Math.abs(latestMeasurement.weight - previousMeasurement.weight).toFixed(1)}kg
                        </Text>
                      ) : null}
                    </View>
                    {latestMeasurement.bodyFat ? (
                      <View style={styles.measureItem}>
                        <Text style={styles.measureValue}>{latestMeasurement.bodyFat}%</Text>
                        <Text style={styles.measureLabel}>Gordura</Text>
                      </View>
                    ) : null}
                    {latestMeasurement.muscleMass ? (
                      <View style={styles.measureItem}>
                        <Text style={styles.measureValue}>{latestMeasurement.muscleMass}kg</Text>
                        <Text style={styles.measureLabel}>Músculo</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.bodyMeasures}>
                    {latestMeasurement.chest ? (
                      <View style={styles.bodyMeasureItem}>
                        <Text style={styles.bodyMeasureLabel}>Peito</Text>
                        <Text style={styles.bodyMeasureValue}>{latestMeasurement.chest}cm</Text>
                      </View>
                    ) : null}
                    {latestMeasurement.waist ? (
                      <View style={styles.bodyMeasureItem}>
                        <Text style={styles.bodyMeasureLabel}>Cintura</Text>
                        <Text style={styles.bodyMeasureValue}>{latestMeasurement.waist}cm</Text>
                      </View>
                    ) : null}
                    {latestMeasurement.hips ? (
                      <View style={styles.bodyMeasureItem}>
                        <Text style={styles.bodyMeasureLabel}>Quadril</Text>
                        <Text style={styles.bodyMeasureValue}>{latestMeasurement.hips}cm</Text>
                      </View>
                    ) : null}
                    {latestMeasurement.arms ? (
                      <View style={styles.bodyMeasureItem}>
                        <Text style={styles.bodyMeasureLabel}>Braços</Text>
                        <Text style={styles.bodyMeasureValue}>{latestMeasurement.arms}cm</Text>
                      </View>
                    ) : null}
                    {latestMeasurement.thighs ? (
                      <View style={styles.bodyMeasureItem}>
                        <Text style={styles.bodyMeasureLabel}>Coxas</Text>
                        <Text style={styles.bodyMeasureValue}>{latestMeasurement.thighs}cm</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </MotiView>
            ) : null}

            {/* Measurement history */}
            {progress?.measurements?.length ? (
              <>
                <Text style={styles.sectionTitle}>Histórico de Medidas</Text>
                {[...progress.measurements].reverse().map((m, index) => (
                  <MotiView
                    key={m.id}
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ delay: index * 30 }}
                  >
                    <View style={styles.historyCard}>
                      <View style={styles.historyHeader}>
                        <Text style={styles.historyDate}>
                          {new Date(m.date).toLocaleDateString('pt-BR')}
                        </Text>
                        <Text style={styles.historyWeight}>{m.weight}kg</Text>
                      </View>
                      <View style={styles.historyDetails}>
                        {m.bodyFat ? <Text style={styles.historyDetail}>Gordura: {m.bodyFat}%</Text> : null}
                        {m.muscleMass ? <Text style={styles.historyDetail}>Músculo: {m.muscleMass}kg</Text> : null}
                        {m.waist ? <Text style={styles.historyDetail}>Cintura: {m.waist}cm</Text> : null}
                      </View>
                    </View>
                  </MotiView>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📏</Text>
                <Text style={styles.emptyText}>Nenhuma medida registrada</Text>
                <Text style={styles.emptySubtext}>
                  Seu personal trainer pode registrar avaliações físicas para você
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'charts' && (
          <>
            {progress?.charts?.weight?.length ? (
              <>
                <Text style={styles.sectionTitle}>Evolução do Peso</Text>
                <View style={styles.chartCard}>
                  {progress.charts.weight.map((point, i) => (
                    <View key={i} style={styles.chartBar}>
                      <View style={[styles.chartBarFill, {
                        height: `${(point.value / Math.max(...progress.charts.weight.map(p => p.value))) * 100}%`,
                      }]} />
                      <Text style={styles.chartValue}>{point.value}</Text>
                      <Text style={styles.chartLabel}>
                        {new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {progress?.charts?.bodyFat?.length ? (
              <>
                <Text style={styles.sectionTitle}>Evolução do % Gordura</Text>
                <View style={styles.chartCard}>
                  {progress.charts.bodyFat.map((point, i) => (
                    <View key={i} style={styles.chartBar}>
                      <View style={[styles.chartBarFill, { backgroundColor: COLORS.warning, height: `${(point.value / Math.max(...progress.charts.bodyFat.map(p => p.value))) * 100}%` }]} />
                      <Text style={styles.chartValue}>{point.value}%</Text>
                      <Text style={styles.chartLabel}>
                        {new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {!progress?.charts?.weight?.length && !progress?.charts?.bodyFat?.length ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyText}>Nenhum dado para gráficos</Text>
                <Text style={styles.emptySubtext}>
                  Os gráficos serão exibidos conforme você registrar medições
                </Text>
              </View>
            ) : null}
          </>
        )}

        {activeTab === 'photos' && (
          <>
            {progress?.photos?.length ? (
              progress.photos.map((photo, index) => (
                <MotiView
                  key={photo.id}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: index * 50 }}
                >
                  <View style={styles.photoCard}>
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoEmoji}>📸</Text>
                    </View>
                    <View style={styles.photoInfo}>
                      <Text style={styles.photoAngle}>
                        {photo.angle === 'front' ? 'Frente' : photo.angle === 'side' ? 'Lateral' : photo.angle === 'back' ? 'Costas' : photo.angle}
                      </Text>
                      <Text style={styles.photoDate}>
                        {new Date(photo.date).toLocaleDateString('pt-BR')}
                      </Text>
                      {photo.weight ? (
                        <Text style={styles.photoWeight}>{photo.weight}kg</Text>
                      ) : null}
                      {photo.notes ? (
                        <Text style={styles.photoNotes}>{photo.notes}</Text>
                      ) : null}
                    </View>
                  </View>
                </MotiView>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📸</Text>
                <Text style={styles.emptyText}>Nenhuma foto de progresso</Text>
                <Text style={styles.emptySubtext}>
                  Fotos de progresso ajudam a visualizar sua evolução
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  tabText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  summaryDate: { color: COLORS.muted, fontSize: 13, marginTop: 2, marginBottom: 16 },
  measurementsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  measureItem: { flex: 1, alignItems: 'center' },
  measureValue: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  measureLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  measureDiff: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  bodyMeasures: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bodyMeasureItem: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bodyMeasureLabel: { color: COLORS.muted, fontSize: 12 },
  bodyMeasureValue: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  historyDate: { color: COLORS.muted, fontSize: 13 },
  historyWeight: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  historyDetails: { gap: 4 },
  historyDetail: { color: COLORS.muted, fontSize: 12 },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartBar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartBarFill: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  chartValue: { color: COLORS.text, fontSize: 10, marginTop: 4 },
  chartLabel: { color: COLORS.muted, fontSize: 8, marginTop: 2 },
  photoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  photoEmoji: { fontSize: 32 },
  photoInfo: { flex: 1, justifyContent: 'center' },
  photoAngle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  photoDate: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  photoWeight: { color: COLORS.accent, fontSize: 13, marginTop: 2 },
  photoNotes: { color: COLORS.muted, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },
});
