import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Garante que o layout esteja montado antes de qualquer navegação
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#6f5cf0" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
