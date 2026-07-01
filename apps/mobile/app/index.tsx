import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { MotiView } from 'moti';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  primary: '#6f5cf0',
  accent: '#06b6d4',
  text: '#f1f5f9',
  muted: '#64748b',
};

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          style={styles.logoContainer}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.accent]}
            style={styles.logoCircle}
          >
            <Text style={styles.logoText}>F</Text>
          </LinearGradient>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200 }}
        >
          <Text style={styles.title}>FitlyNutri</Text>
          <Text style={styles.subtitle}>
            Sua jornada fitness começa aqui
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 400 }}
          style={styles.features}
        >
          {[
            { icon: '💪', title: 'Treinos Personalizados', desc: 'Planos feitos sob medida para você' },
            { icon: '🥗', title: 'Dietas Inteligentes', desc: 'Nutrição calculada para seus objetivos' },
            { icon: '📊', title: 'Acompanhamento', desc: 'Evolução detalhada do seu progresso' },
          ].map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </MotiView>
      </View>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: 600 }}
        style={styles.bottom}
      >
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/login')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.accent]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text style={styles.buttonText}>Entrar</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/register')}
          activeOpacity={0.8}
        >
          <Text style={styles.registerText}>Criar conta</Text>
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  features: { marginTop: 48, gap: 20 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  featureIcon: { fontSize: 28 },
  featureTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  featureDesc: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  bottom: { paddingHorizontal: 32, paddingBottom: 48, gap: 12 },
  loginButton: { borderRadius: 16, overflow: 'hidden' },
  gradient: { paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  registerText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
});
