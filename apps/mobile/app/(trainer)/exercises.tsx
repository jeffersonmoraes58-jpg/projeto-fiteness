import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, Modal, ScrollView, Image, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { trainerService } from '../../src/services/trainer';
import { api } from '../../src/services/api';

const C = {
  bg: '#0f0f1a', card: '#1a1a2e', primary: '#6f5cf0',
  accent: '#06b6d4', success: '#10b981', warning: '#f59e0b',
  danger: '#ef4444', text: '#f1f5f9', muted: '#64748b',
  border: 'rgba(255,255,255,0.08)',
};

const CATEGORIES = [
  { value: 'CHEST', label: 'Peito' }, { value: 'BACK', label: 'Costas' },
  { value: 'SHOULDERS', label: 'Ombros' }, { value: 'BICEPS', label: 'Bíceps' },
  { value: 'TRICEPS', label: 'Tríceps' }, { value: 'LEGS', label: 'Pernas' },
  { value: 'GLUTES', label: 'Glúteos' }, { value: 'CORE', label: 'Core' },
  { value: 'CARDIO', label: 'Cardio' }, { value: 'FULL_BODY', label: 'Corpo todo' },
  { value: 'MOBILITY', label: 'Mobilidade' },
];

const DIFFICULTY = ['', 'Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Elite'];
const EQUIPMENT = ['Halteres', 'Barra', 'Polia', 'Kettlebell', 'Yoga', 'Peso corporal', 'Anilha', 'Elástico', 'Alongamento', 'Smith', 'Bosu', 'Medicine ball', 'TRX', 'Vitruvian', 'Máquina', 'Cardio'];
const EMPTY = { name: '', description: '', instructions: '', category: 'CHEST', difficulty: '1', equipment: '', videoUrl: '' };

function ytId(url: string) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

function thumb(url: string) {
  if (!url) return null;
  const id = ytId(url);
  if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  if (url.includes('cloudinary.com')) return url.replace('/upload/', '/upload/so_0,w_320,h_240,c_fill/').replace(/\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i, '.jpg');
  return null;
}

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [eqFilter, setEqFilter] = useState('');
  const [source, setSource] = useState<'all' | 'app' | 'mine'>('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [videoModal, setVideoModal] = useState<any>(null);
  const [added, setAdded] = useState<any[]>([]);
  const [woModal, setWoModal] = useState(false);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [addingWo, setAddingWo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [upProgress, setUpProgress] = useState(0);

  const load = useCallback(async () => {
    try { setLoading(true); const d = await trainerService.getExercises(catFilter || undefined, search || undefined); setExercises(d || []); }
    catch { Alert.alert('Erro', 'Não foi possível carregar os exercícios'); }
    finally { setLoading(false); }
  }, [catFilter, search]);

  useEffect(() => { load(); }, [load]);

  const filtered = exercises.filter(e => {
    const ms = e.name?.toLowerCase().includes(search.toLowerCase());
    const mc = !catFilter || e.category === catFilter;
    const me = !eqFilter || (e.equipment || []).includes(eqFilter);
    const mf = source === 'all' || (source === 'mine' && (!e.isPublic || e.trainerId)) || (source === 'app' && e.isPublic && !e.trainerId);
    return ms && mc && me && mf;
  });

  const sys = filtered.filter(e => e.isPublic && !e.trainerId);
  const mine = filtered.filter(e => !e.isPublic || e.trainerId);
  const isAdded = (id: string) => added.some(a => a.id === id);
  const toggle = (ex: any) => setAdded(p => p.some(a => a.id === ex.id) ? p.filter(a => a.id !== ex.id) : [...p, ex]);

  const create = async () => {
    if (!form.name) { Alert.alert('Atenção', 'Nome é obrigatório'); return; }
    try {
      setCreating(true);
      await trainerService.createExercise({ name: form.name, description: form.description || undefined, instructions: form.instructions || undefined, category: form.category, difficulty: Number(form.difficulty), equipment: form.equipment ? form.equipment.split(',').map(e => e.trim()).filter(Boolean) : [], videoUrl: form.videoUrl || undefined });
      setShowForm(false); setForm(EMPTY); load();
    } catch (err: any) { Alert.alert('Erro', err?.message || 'Erro ao criar'); }
    finally { setCreating(false); }
  };

  const edit = async () => {
    if (!editId || !editForm.name) return;
    try {
      setSaving(true);
      await trainerService.updateExercise(editId, { name: editForm.name, description: editForm.description || undefined, instructions: editForm.instructions || undefined, category: editForm.category, difficulty: Number(editForm.difficulty), equipment: editForm.equipment ? editForm.equipment.split(',').map(e => e.trim()).filter(Boolean) : [], videoUrl: editForm.videoUrl || undefined });
      setEditId(null); load();
    } catch (err: any) { Alert.alert('Erro', err?.message || 'Erro ao atualizar'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!delId) return;
    try { setDeleting(true); await trainerService.deleteExercise(delId); setDelId(null); load(); }
    catch (err: any) { Alert.alert('Erro', err?.message || 'Erro ao excluir'); }
    finally { setDeleting(false); }
  };

  const uploadVideo = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true });
      if (r.canceled) return;
      const f = r.assets[0];
      const fd = new FormData();
      fd.append('file', { uri: f.uri, name: f.name, type: f.mimeType || 'video/mp4' } as any);
      setUploading(true); setUpProgress(0);
      const { data } = await api.post('/uploads/exercise-video', fd, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: (e: any) => { if (e.total) setUpProgress(Math.round((e.loaded / e.total) * 100)); } });
      setForm(f => ({ ...f, videoUrl: data?.data?.url || data?.url })); setUpProgress(100);
    } catch { Alert.alert('Erro', 'Erro ao enviar vídeo'); }
    finally { setUploading(false); }
  };

  const addToWo = async (wid: string) => {
    try {
      setAddingWo(true);
      const w = await trainerService.getWorkoutById(wid);
      const cur = (w.exercises || []).map((e: any) => ({ exerciseId: e.exercise?.id || e.exerciseId, sets: e.sets || 3, reps: String(e.reps || '10'), restSeconds: e.restSeconds ?? 60 }));
      const toAdd = added.filter(ex => !cur.find((c: any) => c.exerciseId === ex.id)).map(ex => ({ exerciseId: ex.id, sets: 3, reps: '10', restSeconds: 60 }));
      await trainerService.updateWorkout(wid, { exercises: [...cur, ...toAdd] });
      setWoModal(false); setAdded([]); Alert.alert('Sucesso', 'Exercícios adicionados ao treino!');
    } catch (err: any) { Alert.alert('Erro', err?.message || 'Erro ao adicionar'); }
    finally { setAddingWo(false); }
  };

  const openWo = async () => {
    try { const d = await trainerService.getWorkouts(); setWorkouts(d || []); setWoModal(true); }
    catch { Alert.alert('Erro', 'Não foi possível carregar os treinos'); }
  };

  const startEdit = (ex: any) => {
    setEditId(ex.id); setEditForm({ name: ex.name || '', description: ex.description || '', instructions: ex.instructions || '', category: ex.category || 'CHEST', difficulty: String(ex.difficulty || 1), equipment: (ex.equipment || []).join(', '), videoUrl: ex.videoUrl || '' });
  };

  const clearF = () => { setCatFilter(''); setEqFilter(''); setSearch(''); setSource('all'); };
  const hasF = !!(catFilter || eqFilter || source !== 'all');

  const renderItem = ({ item }: { item: any }) => {
    const t = thumb(item.videoUrl);
    const cl = CATEGORIES.find(c => c.value === item.category)?.label || item.category;
    const isSys = item.isPublic && !item.trainerId;
    const isEd = editId === item.id;

    if (isEd) {
      return (
        <View style={st.editCard}>
          <View style={st.editHeader}><Text style={st.editTitle}>Editar</Text><TouchableOpacity onPress={() => setEditId(null)}><Text style={st.cancelText}>Cancelar</Text></TouchableOpacity></View>
          <TextInput style={st.inp} placeholder="Nome *" placeholderTextColor={C.muted} value={editForm.name} onChangeText={t => setEditForm(f => ({ ...f, name: t }))} />
          <View style={st.row}>
            <View style={st.half}><Text style={st.lbl}>Categoria</Text><ScrollView horizontal>{CATEGORIES.map(c => <TouchableOpacity key={c.value} style={[st.chip, editForm.category === c.value && st.chipA]} onPress={() => setEditForm(f => ({ ...f, category: c.value }))}><Text style={[st.chipT, editForm.category === c.value && st.chipTA]}>{c.label}</Text></TouchableOpacity>)}</ScrollView></View>
            <View style={st.half}><Text style={st.lbl}>Dificuldade</Text><ScrollView horizontal>{DIFFICULTY.slice(1).map((l, i) => <TouchableOpacity key={i + 1} style={[st.chip, editForm.difficulty === String(i + 1) && st.chipA]} onPress={() => setEditForm(f => ({ ...f, difficulty: String(i + 1) }))}><Text style={[st.chipT, editForm.difficulty === String(i + 1) && st.chipTA]}>{l}</Text></TouchableOpacity>)}</ScrollView></View>
          </View>
          <TextInput style={st.inp} placeholder="Equipamento" placeholderTextColor={C.muted} value={editForm.equipment} onChangeText={t => setEditForm(f => ({ ...f, equipment: t }))} />
          <TextInput style={[st.inp, st.ta]} placeholder="Descrição" placeholderTextColor={C.muted} value={editForm.description} onChangeText={t => setEditForm(f => ({ ...f, description: t }))} multiline numberOfLines={2} />
          <View style={st.vs}><Text style={st.lbl}>Vídeo</Text>{editForm.videoUrl ? <View style={st.vp}><Text style={st.vt} numberOfLines={1}>{editForm.videoUrl}</Text><TouchableOpacity onPress={() => setEditForm(f => ({ ...f, videoUrl: '' }))}><Text style={st.rm}>Remover</Text></TouchableOpacity></View> : <TouchableOpacity style={st.ub} onPress={uploadVideo}><Text style={st.ubt}>📹 Adicionar vídeo</Text></TouchableOpacity>}</View>
          <View style={st.ea}><TouchableOpacity style={st.cb} onPress={() => setEditId(null)}><Text style={st.cbt}>Cancelar</Text></TouchableOpacity><TouchableOpacity style={[st.sb, (!editForm.name || saving) && st.dis]} onPress={edit} disabled={!editForm.name || saving}><Text style={st.sbt}>{saving ? 'Salvando...' : 'Salvar'}</Text></TouchableOpacity></View>
        </View>
      );
    }

    return (
      <TouchableOpacity style={st.card} activeOpacity={0.9}>
        <View style={st.row2}>
          <View style={[st.thumb, !t && st.thumbP]}>
            {t ? <Image source={{ uri: t }} style={st.thumbI} /> : <Text style={st.thumbE}>🏋️</Text>}
            {item.videoUrl && <TouchableOpacity style={st.pb} onPress={() => setVideoModal(item)}><Text style={st.pi}>▶</Text></TouchableOpacity>}
          </View>
          <View style={st.info}>
            <View style={st.nr}><Text style={st.n} numberOfLines={1}>{item.name}</Text>{isSys && <View style={st.ab}><Text style={st.apt}>App</Text></View>}</View>
            <View style={st.tags}>{(item.equipment || []).slice(0, 2).map((eq: string) => <View key={eq} style={st.tag}><Text style={st.tagT}>{eq}</Text></View>)}<View style={st.tag}><Text style={st.tagT}>{cl}</Text></View></View>
            <TouchableOpacity style={st.addB} onPress={() => toggle(item)}><Text style={[st.addBT, isAdded(item.id) && st.addedT]}>{isAdded(item.id) ? '✓ Adicionado' : '+ Adicionar ao treino'}</Text></TouchableOpacity>
          </View>
          <View style={st.acts}>
            {item.videoUrl && <TouchableOpacity style={st.ib} onPress={() => setVideoModal(item)}><Text style={st.it}>▶</Text></TouchableOpacity>}
            {isSys ? <TouchableOpacity style={st.ib} onPress={() => startEdit(item)}><Text style={st.it}>📹</Text></TouchableOpacity> : <><TouchableOpacity style={st.ib} onPress={() => startEdit(item)}><Text style={st.it}>✏️</Text></TouchableOpacity><TouchableOpacity style={st.ib} onPress={() => setDelId(item.id)}><Text style={st.it}>🗑️</Text></TouchableOpacity></>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={[st.c, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.primary} /></View>;

  return (
    <View style={st.c}>
      <LinearGradient colors={['#6f5cf020', '#06b6d420']} style={st.h}><Text style={st.t}>Biblioteca de Exercícios</Text><Text style={st.sub}>{exercises.length} exercícios</Text></LinearGradient>

      <TouchableOpacity style={st.cb2} onPress={() => setShowForm(!showForm)}><Text style={st.cbt2}>{showForm ? '✕ Cancelar' : '+ Criar exercício'}</Text></TouchableOpacity>

      {showForm && (
        <View style={st.fc}>
          <Text style={st.ft}>Novo Exercício</Text>
          <TextInput style={st.inp} placeholder="Nome *" placeholderTextColor={C.muted} value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} />
          <View style={st.row}>
            <View style={st.half}><Text style={st.lbl}>Categoria</Text><ScrollView horizontal>{CATEGORIES.map(c => <TouchableOpacity key={c.value} style={[st.chip, form.category === c.value && st.chipA]} onPress={() => setForm(f => ({ ...f, category: c.value }))}><Text style={[st.chipT, form.category === c.value && st.chipTA]}>{c.label}</Text></TouchableOpacity>)}</ScrollView></View>
            <View style={st.half}><Text style={st.lbl}>Dificuldade</Text><ScrollView horizontal>{DIFFICULTY.slice(1).map((l, i) => <TouchableOpacity key={i + 1} style={[st.chip, form.difficulty === String(i + 1) && st.chipA]} onPress={() => setForm(f => ({ ...f, difficulty: String(i + 1) }))}><Text style={[st.chipT, form.difficulty === String(i + 1) && st.chipTA]}>{l}</Text></TouchableOpacity>)}</ScrollView></View>
          </View>
          <TextInput style={st.inp} placeholder="Equipamento" placeholderTextColor={C.muted} value={form.equipment} onChangeText={t => setForm(f => ({ ...f, equipment: t }))} />
          <TextInput style={[st.inp, st.ta]} placeholder="Descrição" placeholderTextColor={C.muted} value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} multiline numberOfLines={2} />
          <View style={st.vs}><Text style={st.lbl}>Vídeo</Text>{uploading ? <View style={st.uc}><Text style={st.ut}>Enviando... {upProgress}%</Text><View style={st.pb2}><View style={[st.pf, { width: `${upProgress}%` }]} /></View></View> : form.videoUrl ? <View style={st.vp}><Text style={st.vt} numberOfLines={1}>{form.videoUrl}</Text><TouchableOpacity onPress={() => setForm(f => ({ ...f, videoUrl: '' }))}><Text style={st.rm}>Remover</Text></TouchableOpacity></View> : <View style={st.vo}><TouchableOpacity style={st.ub} onPress={uploadVideo}><Text style={st.ubt}>📤 Upload vídeo</Text></TouchableOpacity><TextInput style={[st.inp, { flex: 1 }]} placeholder="Ou link do YouTube..." placeholderTextColor={C.muted} value={form.videoUrl} onChangeText={t => setForm(f => ({ ...f, videoUrl: t }))} /></View>}</View>
          <View style={st.fa}><TouchableOpacity style={st.cb} onPress={() => setShowForm(false)}><Text style={st.cbt}>Cancelar</Text></TouchableOpacity><TouchableOpacity style={[st.sb, (!form.name || creating) && st.dis]} onPress={create} disabled={!form.name || creating}><Text style={st.sbt}>{creating ? 'Criando...' : 'Criar'}</Text></TouchableOpacity></View>
        </View>
      )}

      <View style={st.sc}><TextInput style={st.si} placeholder="Buscar..." placeholderTextColor={C.muted} value={search} onChangeText={setSearch} /></View>

      <View style={st.sfr}>{[{ key: 'all', label: 'Todos' }, { key: 'app', label: 'App' }, { key: 'mine', label: 'Meus' }].map(f => <TouchableOpacity key={f.key} style={[st.sc2, source === f.key && st.sc2A]} onPress={() => setSource(f.key as any)}><Text style={[st.sct, source === f.key && st.sctA]}>{f.label}</Text></TouchableOpacity>)}</View>

      <View style={st.fr}><FlatList horizontal data={CATEGORIES} keyExtractor={c => c.value} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }} showsHorizontalScrollIndicator={false} renderItem={({ item }) => <TouchableOpacity style={[st.fc2, catFilter === item.value && st.fc2A]} onPress={() => setCatFilter(catFilter === item.value ? '' : item.value)}><Text style={[st.fct, catFilter === item.value && st.fctA]}>{item.label}</Text></TouchableOpacity>} /></View>

      <View style={st.fr}><FlatList horizontal data={EQUIPMENT} keyExtractor={e => e} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }} showsHorizontalScrollIndicator={false} renderItem={({ item }) => <TouchableOpacity style={[st.fc2, eqFilter === item && st.fc2A]} onPress={() => setEqFilter(eqFilter === item ? '' : item)}><Text style={[st.fct, eqFilter === item && st.fctA]}>{item}</Text></TouchableOpacity>} /></View>

      {hasF && <TouchableOpacity style={st.cf} onPress={clearF}><Text style={st.cft}>Limpar filtros</Text></TouchableOpacity>}

      <FlatList data={source === 'all' ? [...sys, ...mine] : filtered} keyExtractor={i => i.id} contentContainerStyle={{ padding: 20, paddingBottom: 160 }} refreshing={loading} onRefresh={load} ListEmptyComponent={<View style={st.es}><Text style={st.ei}>🏋️</Text><Text style={st.et}>Nenhum exercício</Text>{hasF && <TouchableOpacity onPress={clearF}><Text style={st.cft}>Limpar filtros</Text></TouchableOpacity>}</View>} renderItem={renderItem} />

      {added.length > 0 && <View style={st.bb}><View style={st.bbc}><View style={st.cnt}><Text style={st.cntT}>{added.length}</Text></View><Text style={st.bbt}>{added.length} selecionado{added.length > 1 ? 's' : ''}</Text><TouchableOpacity onPress={() => setAdded([])}><Text style={st.clr}>Limpar</Text></TouchableOpacity><TouchableOpacity style={st.useb} onPress={openWo}><Text style={st.usebt}>Usar no treino ›</Text></TouchableOpacity></View></View>}

      <Modal visible={!!videoModal} transparent animationType="fade" onRequestClose={() => setVideoModal(null)}>
        <TouchableOpacity style={st.mo} activeOpacity={1} onPress={() => setVideoModal(null)}>
          <View style={st.vmc}><View style={st.vmh}><Text style={st.vmt} numberOfLines={1}>{videoModal?.name}</Text><TouchableOpacity onPress={() => setVideoModal(null)}><Text style={st.cmt}>✕</Text></TouchableOpacity></View><View style={st.vc}>{videoModal?.videoUrl ? ytId(videoModal.videoUrl) ? <View style={st.yp}><Text style={st.yt}>YouTube</Text><TouchableOpacity style={st.oyb} onPress={() => Linking.openURL(videoModal.videoUrl)}><Text style={st.oyt}>Abrir no YouTube</Text></TouchableOpacity></View> : <Video source={{ uri: videoModal.videoUrl }} style={st.vp2} useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay /> : <Text style={st.nvt}>Sem vídeo</Text>}</View></View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={woModal} transparent animationType="slide" onRequestClose={() => setWoModal(false)}>
        <TouchableOpacity style={st.mo} activeOpacity={1} onPress={() => setWoModal(false)}>
          <View style={st.pmc}><View style={st.pmh}><Text style={st.pmt}>Adicionar a qual treino?</Text><TouchableOpacity onPress={() => setWoModal(false)}><Text style={st.cmt}>✕</Text></TouchableOpacity></View><ScrollView style={st.pl}>{workouts.length === 0 ? <Text style={st.pe}>Nenhum treino</Text> : workouts.filter((w: any) => w.status !== 'ARCHIVED').map((w: any) => <TouchableOpacity key={w.id} style={st.pi2} onPress={() => addToWo(w.id)} disabled={addingWo}><View style={st.pii}><Text style={st.pie}>📋</Text></View><View style={st.pii2}><Text style={st.pin}>{w.name}</Text><Text style={st.pic}>{w._count?.exercises ?? 0} exercícios</Text></View>{addingWo && <ActivityIndicator size="small" color={C.primary} />}</TouchableOpacity>)}</ScrollView></View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!delId} transparent animationType="fade" onRequestClose={() => setDelId(null)}>
        <TouchableOpacity style={st.mo} activeOpacity={1} onPress={() => setDelId(null)}>
          <View style={st.dmc}><View style={st.di}><Text style={st.de}>🗑️</Text></View><Text style={st.dt}>Excluir exercício</Text><Text style={st.ds}>Esta ação não pode ser desfeita.</Text><View style={st.da}><TouchableOpacity style={st.cb} onPress={() => setDelId(null)}><Text style={st.cbt}>Cancelar</Text></TouchableOpacity><TouchableOpacity style={[st.db, deleting && st.dis]} onPress={del} disabled={deleting}><Text style={st.dbt}>{deleting ? 'Excluindo...' : 'Excluir'}</Text></TouchableOpacity></View></View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  h: { padding: 24, paddingTop: 60 },
  t: { color: C.text, fontSize: 24, fontWeight: '700' },
  sub: { color: C.muted, fontSize: 14, marginTop: 4 },
  cb2: { margin: 20, marginBottom: 0, padding: 14, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: C.border, alignItems: 'center' },
  cbt2: { color: C.primary, fontSize: 14, fontWeight: '600' },
  fc: { margin: 20, marginBottom: 0, padding: 16, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.primary + '40' },
  ft: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  inp: { backgroundColor: C.bg, borderRadius: 10, padding: 12, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  ta: { minHeight: 60, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  half: { flex: 1 },
  lbl: { color: C.muted, fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, marginRight: 4 },
  chipA: { backgroundColor: C.primary + '30', borderColor: C.primary },
  chipT: { color: C.muted, fontSize: 11, fontWeight: '500' },
  chipTA: { color: C.primary, fontWeight: '600' },
  vs: { marginBottom: 8 },
  vp: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border },
  vt: { color: C.accent, fontSize: 12, flex: 1 },
  rm: { color: C.danger, fontSize: 12, fontWeight: '600', marginLeft: 8 },
  ub: { backgroundColor: C.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', marginBottom: 8 },
  ubt: { color: C.primary, fontSize: 13, fontWeight: '600' },
  uc: { backgroundColor: C.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  ut: { color: C.muted, fontSize: 12, marginBottom: 6 },
  pb2: { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  pf: { height: '100%', backgroundColor: C.primary, borderRadius: 2 },
  vo: { gap: 8 },
  fa: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cb: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  cbt: { color: C.muted, fontSize: 13, fontWeight: '600' },
  sb: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center' },
  sbt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  dis: { opacity: 0.5 },
  editCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: C.primary + '40' },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  editTitle: { color: C.primary, fontSize: 14, fontWeight: '700' },
  cancelText: { color: C.muted, fontSize: 13 },
  ea: { flexDirection: 'row', gap: 12, marginTop: 4 },
  card: { backgroundColor: C.card, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  row2: { flexDirection: 'row', padding: 12 },
  thumb: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumbP: { backgroundColor: C.primary + '20', alignItems: 'center', justifyContent: 'center' },
  thumbI: { width: '100%', height: '100%' },
  thumbE: { fontSize: 24 },
  pb: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  pi: { color: '#fff', fontSize: 18 },
  info: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  nr: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  n: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1 },
  ab: { backgroundColor: C.primary + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  apt: { color: C.primary, fontSize: 9, fontWeight: '700' },
  tags: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  tag: { backgroundColor: C.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagT: { color: C.muted, fontSize: 10, fontWeight: '500' },
  addB: { marginTop: 6 },
  addBT: { color: C.primary, fontSize: 11, fontWeight: '600' },
  addedT: { color: C.success },
  acts: { justifyContent: 'center', gap: 4, marginLeft: 8 },
  ib: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  it: { fontSize: 12 },
  sc: { paddingHorizontal: 20, paddingTop: 16 },
  si: { backgroundColor: C.card, borderRadius: 12, padding: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
  sfr: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  sc2: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  sc2A: { backgroundColor: C.primary + '30', borderColor: C.primary },
  sct: { color: C.muted, fontSize: 12, fontWeight: '500' },
  sctA: { color: C.primary, fontWeight: '600' },
  fr: { paddingHorizontal: 20, paddingBottom: 8 },
  fc2: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  fc2A: { backgroundColor: C.primary + '30', borderColor: C.primary },
  fct: { color: C.muted, fontSize: 11, fontWeight: '500' },
  fctA: { color: C.primary, fontWeight: '600' },
  cf: { paddingHorizontal: 20, paddingBottom: 8 },
  cft: { color: C.primary, fontSize: 12, fontWeight: '600' },
  es: { alignItems: 'center', paddingVertical: 40 },
  ei: { fontSize: 32, marginBottom: 8 },
  et: { color: C.muted, fontSize: 14 },
  bb: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32 },
  bbc: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.primary + '40', gap: 8 },
  cnt: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  cntT: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bbt: { color: C.text, fontSize: 13, fontWeight: '600', flex: 1 },
  clr: { color: C.muted, fontSize: 12 },
  useb: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  usebt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  vmc: { width: '90%', maxWidth: 400, backgroundColor: C.card, borderRadius: 16, overflow: 'hidden' },
  vmh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  vmt: { color: C.text, fontSize: 16, fontWeight: '700', flex: 1 },
  cmt: { color: C.muted, fontSize: 18, marginLeft: 12 },
  vc: { aspectRatio: 16 / 9, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  yp: { alignItems: 'center', gap: 12 },
  yt: { color: C.muted, fontSize: 14 },
  oyb: { backgroundColor: C.danger, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  oyt: { color: '#fff', fontSize: 14, fontWeight: '600' },
  vp2: { width: '100%', height: '100%' },
  nvt: { color: C.muted, fontSize: 14 },
  pmc: { width: '90%', maxWidth: 400, backgroundColor: C.card, borderRadius: 16, overflow: 'hidden', maxHeight: '70%' },
  pmh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  pmt: { color: C.text, fontSize: 16, fontWeight: '700' },
  pl: { padding: 8 },
  pe: { color: C.muted, fontSize: 14, textAlign: 'center', padding: 20 },
  pi2: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 12 },
  pii: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primary + '20', alignItems: 'center', justifyContent: 'center' },
  pie: { fontSize: 18 },
  pii2: { flex: 1 },
  pin: { color: C.text, fontSize: 14, fontWeight: '600' },
  pic: { color: C.muted, fontSize: 12, marginTop: 2 },
  dmc: { width: '80%', maxWidth: 320, backgroundColor: C.card, borderRadius: 16, padding: 24, alignItems: 'center' },
  di: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.danger + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  de: { fontSize: 24 },
  dt: { color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  ds: { color: C.muted, fontSize: 13, marginBottom: 20 },
  da: { flexDirection: 'row', gap: 12, width: '100%' },
  db: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: C.danger, alignItems: 'center' },
  dbt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
