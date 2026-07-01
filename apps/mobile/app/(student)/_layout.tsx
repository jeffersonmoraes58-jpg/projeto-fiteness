import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  primary: '#6f5cf0',
  accent: '#06b6d4',
  text: '#f1f5f9',
  muted: '#64748b',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '🏠',
    workout: '💪',
    diet: '🥗',
    progress: '📊',
    profile: '👤',
  };
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <Text style={styles.tabEmoji}>{icons[name] || '📱'}</Text>
    </View>
  );
}

export default function StudentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Treino',
          tabBarIcon: ({ focused }) => <TabIcon name="workout" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          title: 'Dieta',
          tabBarIcon: ({ focused }) => <TabIcon name="diet" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progresso',
          tabBarIcon: ({ focused }) => <TabIcon name="progress" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconFocused: {
    backgroundColor: COLORS.primary + '20',
  },
  tabEmoji: { fontSize: 18 },
});
