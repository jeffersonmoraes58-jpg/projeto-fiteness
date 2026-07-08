import { Injectable, ServiceUnavailableException, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MusicResult {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  type: 'track' | 'playlist';
  embedUrl: string;
}

interface SpotifyTokenCache {
  token: string;
  expiresAt: number;
}

@Injectable()
export class MusicService {
  private spotifyCache: SpotifyTokenCache | null = null;

  constructor(private config: ConfigService) {}

  async searchYouTube(q: string): Promise<MusicResult[]> {
    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'YouTube API não configurada. Adicione YOUTUBE_API_KEY ao .env para habilitar busca personalizada.',
      );
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', q);
    url.searchParams.set('type', 'video');
    url.searchParams.set('videoCategoryId', '10');
    url.searchParams.set('maxResults', '15');
    url.searchParams.set('key', apiKey);

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`YouTube API HTTP ${res.status}`);
      const data: any = await res.json();
      if (data.error) throw new Error(data.error.message);

      return (data.items || []).map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ??
          '',
        author: item.snippet.channelTitle,
        type: 'track' as const,
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1`,
      }));
    } catch (err: any) {
      throw new BadGatewayException('Erro ao buscar no YouTube: ' + err.message);
    }
  }

  async searchSpotify(q: string): Promise<MusicResult[]> {
    const clientId = this.config.get<string>('SPOTIFY_CLIENT_ID');
    const clientSecret = this.config.get<string>('SPOTIFY_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'Spotify não configurado. Adicione SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET ao .env.',
      );
    }

    const token = await this.getSpotifyToken(clientId, clientSecret);

    const url = new URL('https://api.spotify.com/v1/search');
    url.searchParams.set('q', q);
    url.searchParams.set('type', 'playlist');
    url.searchParams.set('limit', '15');
    url.searchParams.set('market', 'BR');

    try {
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Spotify API HTTP ${res.status}`);
      const data: any = await res.json();

      return (data.playlists?.items || [])
        .filter(Boolean)
        .map((item: any) => ({
          id: item.id,
          title: item.name,
          thumbnail: item.images?.[0]?.url ?? '',
          author: item.owner?.display_name ?? 'Spotify',
          type: 'playlist' as const,
          embedUrl: `https://open.spotify.com/embed/playlist/${item.id}?utm_source=generator&theme=0`,
        }));
    } catch (err: any) {
      throw new BadGatewayException('Erro ao buscar no Spotify: ' + err.message);
    }
  }

  async searchDeezer(q: string): Promise<MusicResult[]> {
    const url = new URL('https://api.deezer.com/search');
    url.searchParams.set('q', q);
    url.searchParams.set('limit', '20');

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Deezer API HTTP ${res.status}`);
      const data: any = await res.json();

      return (data.data || []).map((item: any) => ({
        id: String(item.id),
        title: item.title,
        thumbnail: item.album?.cover_medium ?? item.album?.cover ?? '',
        author: item.artist?.name ?? '',
        type: 'track' as const,
        embedUrl: `https://widget.deezer.com/widget/auto/track/${item.id}`,
      }));
    } catch (err: any) {
      throw new BadGatewayException('Erro ao buscar no Deezer: ' + err.message);
    }
  }

  private async getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
    if (this.spotifyCache && Date.now() < this.spotifyCache.expiresAt - 300_000) {
      return this.spotifyCache.token;
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) throw new Error('Falha ao obter token Spotify');
    const data: any = await res.json();

    this.spotifyCache = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return this.spotifyCache.token;
  }
}
