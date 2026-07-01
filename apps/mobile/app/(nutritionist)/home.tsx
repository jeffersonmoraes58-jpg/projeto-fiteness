import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  primary: '#6f5cf0',
  text: '#f1f5f9',
  muted: '#64748b',
};

export default function NutritionistHomeScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6f5cf020', '#06b6d420']} style={styles.header}>
        <Text style={styles.title}>Painel do Nutricionista</Text>
        <Text style={styles.subtitle}>Gerencie seus pacientes e dietas</Text>
      </LinearGradient>
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🥗</Text>
        <Text style={styles.emptyText}>Painel do Nutricionista</Text>
        <Text style={styles.emptySubtext}>Em breve você poderá gerenciar seus pacientes aqui</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 60 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },
});
