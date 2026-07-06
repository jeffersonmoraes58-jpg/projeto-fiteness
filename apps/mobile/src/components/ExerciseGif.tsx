import React, { useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';

interface Props {
  gifUrl?: string | null;
  videoUrl?: string | null;
  name: string;
  style?: any;
}

/**
 * ExerciseGif
 *
 * Exibe o GIF do exercício com fallback:
 * 1. Tenta mostrar o GIF (gifUrl)
 * 2. Se não tiver GIF, mostra placeholder com o nome do exercício
 *
 * Os GIFs podem vir do Google Drive, Cloudinary ou qualquer CDN.
 * Para Google Drive, use o formato:
 * https://drive.google.com/uc?export=view&id=FILE_ID
 */
export default function ExerciseGif({ gifUrl, videoUrl, name, style }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const url = gifUrl || videoUrl;

  if (!url) {
    return (
      <View style={[styles.container, style, styles.placeholder]}>
        <Text style={styles.placeholderIcon}>🏋️</Text>
        <Text style={styles.placeholderText}>{name}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri: url }}
        style={styles.gif}
        resizeMode="contain"
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator color="#6f5cf0" size="large" />
        </View>
      )}
      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorIcon}>🎥</Text>
          <Text style={styles.errorText}>GIF indisponível</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    aspectRatio: 16 / 9,
    backgroundColor: '#0f0f1a',
    overflow: 'hidden',
    borderRadius: 12,
  },
  gif: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f1a',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
  placeholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,15,26,0.9)',
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  errorText: {
    color: '#64748b',
    fontSize: 12,
  },
});
