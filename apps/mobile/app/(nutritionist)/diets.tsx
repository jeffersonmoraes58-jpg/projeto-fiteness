import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';

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

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Rascunho', color: COLORS.warning, bg: COLORS.warning + '20' },
  ACTIVE: { label: 'Ativo', color: COLORS.success, bg: COLORS.success + '20' },
  ARCHIVED: { label: 'Arquivado', color: COLORS.muted, bg: COLORS.muted + '20' },
};

interface Diet {
  id: string;
  name: string;
  status?: string;
  isTemplate?: boolean;
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  _count?: { plans?: number };
}

interface NewDietForm {
  name: string;
  targetCalories: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
}

const INITIAL_FORM: NewDietForm = {
  name: '',
  targetCalories: '',
  targetProtein: '',
  targetCarbs: '',
  targetFat: '',
};

export default function NutritionistDietsScreen() {
  const [diets, setDiets] = useState<Diet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewDietForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const loadDiets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/diets');
      const data = res.data;
      setDiets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setDiets([]);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar as dietas.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiets();
  }, [loadDiets]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      Alert.alert('Atenção', 'O nome da dieta é obrigatório.');
      return;
    }
    try {
      setSaving(true);
      await api.post('/diets', {
        name: form.name.trim(),
        targetCalories: Number(form.targetCalories) || 0,
        targetProtein: Number(form.targetProtein) || 0,
        targetCarbs: Number(form.targetCarbs) || 0,
        targetFat: Number(form.targetFat) || 0,
        status: 'DRAFT',
      });
      setShowModal(false);
      setForm(INITIAL_FORM);
      loadDiets();
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message || 'Erro ao criar dieta.');
    } finally {
      setSaving(false);
    }
  };

  const filters = ['Todos', 'Ativo', 'Rascunho', 'Arquivado'];
  const STATUS_MAP: Record<string, string> = {
    Ativo: 'ACTIVE',
    Rascunho: 'DRAFT',
    Arquivado: 'ARCHIVED',
  };

  const filtered = diets.filter((d) => {
    const matchSearch = d.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'Todos' || d.status === STATUS_MAP[filter];
    return matchSearch && matchFilter;
  });

  const activeCount = diets.filter((d) => d.status === 'ACTIVE').length;
  const draftCount = diets.filter((d) => d.status === 'DRAFT').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#10b98120', '#06b6d420']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Dietas</Text>
            <Text style={styles.subtitle}>Planos alimentares criados</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)} activeOpacity={0.8}>
            <Text style={styles.addButtonText}>+ Nova</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>Ativas</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.warning }]}>{draftCount}</Text>
          <Text style={styles.summaryLabel}>Rascunhos</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.primary }]}>{diets.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar dieta..."
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando dietas...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🥗</Text>
              <Text style={styles.emptyText}>Nenhuma dieta encontrada</Text>
              <Text style={styles.emptySubtext}>
                {search ? 'Tente outro nome ou filtro.' : 'Crie sua primeira dieta para seus pacientes.'}
              </Text>
              {!search && (
                <TouchableOpacity style={styles.createBtn} onPress={() => setShowModal(true)}>
                  <Text style={styles.createBtnText}>Criar dieta</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filtered.map((diet) => {
              const statusInfo = STATUS_LABELS[diet.status || 'DRAFT'] || STATUS_LABELS.DRAFT;
              return (
                <View key={diet.id} style={styles.dietCard}>
                  <View style={styles.dietCardTop}>
                    <LinearGradient colors={['#10b981', '#06b6d4']} style={styles.dietIcon}>
                      <Text style={styles.dietIconEmoji}>🥗</Text>
                    </LinearGradient>
                    <View style={styles.dietInfo}>
                      <Text style={styles.dietName} numberOfLines={1}>{diet.name}</Text>
                      <View style={styles.dietMeta}>
                        <Text style={styles.metaItem}>🔥 {diet.totalCalories ?? 0} kcal</Text>
                        <Text style={styles.metaItem}>🥩 P: {diet.totalProtein ?? 0}g</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                    </View>
                  </View>

                  <View style={styles.macroRow}>
                    <MacroItem label="Proteína" value={diet.totalProtein ?? 0} unit="g" color={COLORS.primary} />
                    <MacroItem label="Carboidratos" value={diet.totalCarbs ?? 0} unit="g" color={COLORS.accent} />
                    <MacroItem label="Gordura" value={diet.totalFat ?? 0} unit="g" color={COLORS.warning} />
                    <MacroItem label="Pacientes" value={diet._count?.plans ?? 0} unit="" color={COLORS.success} />
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Dieta</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setForm(INITIAL_FORM); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <FormField
                label="Nome da dieta *"
                placeholder="Ex: Dieta de perda de peso"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
              />
              <FormField
                label="Calorias alvo (kcal)"
                placeholder="Ex: 2000"
                value={form.targetCalories}
                onChangeText={(v) => setForm({ ...form, targetCalories: v })}
                keyboardType="numeric"
              />
              <FormField
                label="Proteína alvo (g)"
                placeholder="Ex: 150"
                value={form.targetProtein}
                onChangeText={(v) => setForm({ ...form, targetProtein: v })}
                keyboardType="numeric"
              />
              <FormField
                label="Carboidratos alvo (g)"
                placeholder="Ex: 200"
                value={form.targetCarbs}
                onChangeText={(v) => setForm({ ...form, targetCarbs: v })}
                keyboardType="numeric"
              />
              <FormField
                label="Gordura alvo (g)"
                placeholder="Ex: 65"
                value={form.targetFat}
                onChangeText={(v) => setForm({ ...form, targetFat: v })}
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setShowModal(false); setForm(INITIAL_FORM); }}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleCreate}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Criar Dieta</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function MacroItem({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={macroStyles.item}>
      <Text style={[macroStyles.value, { color }]}>{value}{unit}</Text>
      <Text style={macroStyles.label}>{label}</Text>
    </View>
  );
}

function FormField({
  label, placeholder, value, onChangeText, keyboardType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
}) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={fieldStyles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

const macroStyles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center' },
  value: { fontSize: 15, fontWeight: '700' },
  label: { color: COLORS.muted, fontSize: 10, marginTop: 2 },
});

const fieldStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { color: COLORS.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  summaryRow: {
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
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 32, backgroundColor: COLORS.border },
  summaryValue: { fontSize: 22, fontWeight: '700' },
  summaryLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  searchContainer: { paddingHorizontal: 20, marginTop: 16 },
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
  filtersScroll: { marginTop: 12 },
  filtersContent: { paddingHorizontal: 20, gap: 8 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  loadingText: { color: COLORS.muted, marginTop: 12 },
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  dietCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dietCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dietIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dietIconEmoji: { fontSize: 20 },
  dietInfo: { flex: 1, marginLeft: 12 },
  dietName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  dietMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { color: COLORS.muted, fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  macroRow: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
  createBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  modalClose: { color: COLORS.muted, fontSize: 18, padding: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: { color: COLORS.muted, fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
