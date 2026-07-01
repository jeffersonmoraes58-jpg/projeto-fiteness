import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const COLORS = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  primary: '#6f5cf0',
  accent: '#06b6d4',
  text: '#f1f5f9',
  muted: '#64748b',
  border: 'rgba(255,255,255,0.08)',
};

const menuItems = [
  { icon: '👤', label: 'Meu Perfil', description: 'Editar informações pessoais' },
  { icon: '🔔', label: 'Notificações', description: 'Configurar alertas' },
  { icon: '⚙️', label: 'Configurações', description: 'Preferências do app' },
  { icon: '💳', label: 'Assinatura', description: 'Gerenciar plano' },
  { icon: '❓', label: 'Ajuda', description: 'Central de suporte' },
  { icon: '📝', label: 'Termos de Uso', description: 'Políticas e condições' },
];

export default function TrainerProfileScreen() {
  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            const { useAuthStore } = require('../../src/store/auth');
            useAuthStore.getState().logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6f5cf020', '#06b6d420']} style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>TR</Text>
          </View>
          <Text style={styles.profileName}>Trainer</Text>
          <Text style={styles.profileEmail}>trainer@fitlynutri.com</Text>
          <View style={styles.planBadge}>
            <Text style={styles.planText}>Plano Pro</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            activeOpacity={0.8}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <Text style={styles.version}>FitlyNutri v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 60 },
  profileSection: { alignItems: 'center', paddingVertical: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarText: { color: COLORS.primary, fontSize: 28, fontWeight: '700' },
  profileName: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  profileEmail: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  planBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  planText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuIcon: { fontSize: 22, marginRight: 12 },
  menuContent: { flex: 1 },
  menuLabel: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  menuDescription: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  menuArrow: { color: COLORS.muted, fontSize: 24, fontWeight: '300' },
  logoutButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
    alignItems: 'center',
  },
  logoutText: { color: '#ff3b30', fontSize: 15, fontWeight: '600' },
  version: { color: COLORS.muted, fontSize: 12, textAlign: 'center', marginTop: 16 },
});
