import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { WebView } from 'react-native-webview';

interface Props {
  url: string;
  style?: any;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://fitlynutri.com.br/api/v1';

function resolveVideoUrl(url: string): string {
  if (!url) return url;
  if (!url.includes('api.musclewiki.com')) return url;
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/stream\/videos\/(branded|unbranded)\/([^/]+)$/);
    if (!match) return url;
    return `${API_BASE}/musclewiki/stream/${match[1]}/${match[2]}`;
  } catch {
    return url;
  }
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

export default function VideoPlayer({ url, style }: Props) {
  const [loading, setLoading] = useState(true);
  const resolved = resolveVideoUrl(url);
  const ytId = getYouTubeId(resolved);

  if (!url) {
    return (
      <View style={[styles.container, style, styles.empty]}>
        <Text style={styles.emptyText}>Sem vídeo</Text>
      </View>
    );
  }

  if (ytId) {
    const embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?playsinline=1&rel=0&modestbranding=1`;
    return (
      <View style={[styles.container, style]}>
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator color="#6f5cf0" size="large" />
          </View>
        )}
        <WebView
          source={{ uri: embedUrl }}
          style={styles.webview}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          onLoadEnd={() => setLoading(false)}
        />
      </View>
    );
  }

  // MuscleWiki (via proxy da API), Cloudinary ou outro vídeo direto
  return (
    <View style={[styles.container, style]}>
      <Video
        source={{ uri: resolved }}
        style={styles.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        onReadyForDisplay={() => setLoading(false)}
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator color="#6f5cf0" size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { aspectRatio: 16 / 9, backgroundColor: '#0f0f1a', overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#0f0f1a' },
  video: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f1a',
  },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#64748b', fontSize: 14 },
});
