import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, Image, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { router } from 'expo-router';
import { studentService, Contact, Achievement } from '../../src/services/student';
import { useAuthStore } from '../../src/store/auth';

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

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [contacts, setContacts] = useState<Contact | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [contactsData, achievementsData] = await Promise.all([
        studentService.getContacts(),
        studentService.getAchievements(),
      ]);
      setContacts(contactsData);
      setAchievements(achievementsData || []);
    } catch (err: any) {
      // Silently fail - profile still shows user data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
            logout();
            router.replace('/login');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile header */}
        <LinearGradient colors={['#6f5cf020', '#06b6d420']} style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'Atleta'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Aluno</Text>
          </View>
        </LinearGradient>

        {/* Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contatos</Text>
          <View style={styles.contactsCard}>
            {contacts?.trainer ? (
              <View style={styles.contactRow}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>👨‍🏫</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Personal Trainer</Text>
                  <Text style={styles.contactName}>{contacts.trainer.name}</Text>
                  <Text style={styles.contactEmail}>{contacts.trainer.email}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.contactRow}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>👨‍🏫</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Personal Trainer</Text>
                  <Text style={styles.contactName}>Não atribuído</Text>
                </View>
              </View>
            )}

            <View style={styles.contactDivider} />

            {contacts?.nutritionist ? (
              <View style={styles.contactRow}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>🥗</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Nutricionista</Text>
                  <Text style={styles.contactName}>{contacts.nutritionist.name}</Text>
                  <Text style={styles.contactEmail}>{contacts.nutritionist.email}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.contactRow}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>🥗</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Nutricionista</Text>
                  <Text style={styles.contactName}>Não atribuído</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Achievements */}
        {achievements.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conquistas ({achievements.length})</Text>
            <View style={styles.achievementsGrid}>
              {achievements.map((ach) => (
                <MotiView
                  key={ach.id}
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 50 }}
                >
                  <View style={styles.achievementCard}>
                    <Text style={styles.achievementEmoji}>{ach.emoji || '🏆'}</Text>
                    <Text style={styles.achievementTitle}>{ach.title}</Text>
                    <Text style={styles.achievementDesc}>{ach.description}</Text>
                    <Text style={styles.achievementDate}>
                      {new Date(ach.unlockedAt).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </MotiView>
              ))}
            </View>
          </View>
        ) : null}

        {/* Menu items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <Text style={styles.menuIcon}>👤</Text>
              <Text style={styles.menuText}>Editar Perfil</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <Text style={styles.menuIcon}>🔔</Text>
              <Text style={styles.menuText}>Notificações</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <Text style={styles.menuIcon}>🔒</Text>
              <Text style={styles.menuText}>Privacidade</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <Text style={styles.menuIcon}>❓</Text>
              <Text style={styles.menuText}>Ajuda</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>🚪</Text>
              <Text style={[styles.menuText, { color: '#ef4444' }]}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App info */}
        <Text style={styles.version}>FitlyNutri v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 60, alignItems: 'center' },
  avatarContainer: { marginBottom: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarText: { color: COLORS.primary, fontSize: 32, fontWeight: '700' },
  userName: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  userEmail: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  roleBadge: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 12,
  },
  roleText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  contactsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarText: { fontSize: 20 },
  contactInfo: { flex: 1 },
  contactLabel: { color: COLORS.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  contactName: { color: COLORS.text, fontSize: 15, fontWeight: '600', marginTop: 2 },
  contactEmail: { color: COLORS.muted, fontSize: 12, marginTop: 1 },
  contactDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achievementCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    width: (width - 48) / 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  achievementEmoji: { fontSize: 28, marginBottom: 6 },
  achievementTitle: { color: COLORS.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  achievementDesc: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 2 },
  achievementDate: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  menuCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIcon: { fontSize: 18, marginRight: 12 },
  menuText: { color: COLORS.text, fontSize: 15, flex: 1 },
  menuArrow: { color: COLORS.muted, fontSize: 20 },
  menuDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 50 },
  logoutItem: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4 },
  version: { color: COLORS.muted, fontSize: 12, textAlign: 'center', marginTop: 24 },
});
