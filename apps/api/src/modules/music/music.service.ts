import { Injectable, BadGatewayException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

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

// InnerTube client key used by YouTube's own web player — no personal API key required
const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_CLIENT_VERSION = '2.20231121.08.00';

@Injectable()
export class MusicService {
  private spotifyCache: SpotifyTokenCache | null = null;
  private readonly logger = new Logger('Music');

  constructor(private config: ConfigService) {}

  async searchYouTube(q: string): Promise<MusicResult[]> {
    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    if (apiKey) {
      return this.searchYouTubeDataApi(q, apiKey);
    }
    return this.searchYouTubeInnerTube(q);
  }

  private async searchYouTubeDataApi(q: string, apiKey: string): Promise<MusicResult[]> {
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
        thumbnail: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? '',
        author: item.snippet.channelTitle,
        type: 'track' as const,
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&rel=1`,
      }));
    } catch (err: any) {
      throw new BadGatewayException('Erro ao buscar no YouTube: ' + err.message);
    }
  }

  private async searchYouTubeInnerTube(q: string): Promise<MusicResult[]> {
    try {
      const res = await fetch(
        `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}&prettyPrint=false`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-YouTube-Client-Name': '1',
            'X-YouTube-Client-Version': INNERTUBE_CLIENT_VERSION,
            'Origin': 'https://www.youtube.com',
            'Referer': 'https://www.youtube.com/',
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB',
                clientVersion: INNERTUBE_CLIENT_VERSION,
                hl: 'pt',
                gl: 'BR',
              },
            },
            query: q,
          }),
        },
      );

      if (!res.ok) throw new Error(`InnerTube HTTP ${res.status}`);
      const data: any = await res.json();

      const items: any[] =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents?.[0]
          ?.itemSectionRenderer?.contents ?? [];

      const results: MusicResult[] = [];
      for (const item of items) {
        const vr = item.videoRenderer;
        if (!vr?.videoId) continue;
        const thumbs: any[] = vr.thumbnail?.thumbnails ?? [];
        const thumb = thumbs.find((t) => t.width >= 320) ?? thumbs[thumbs.length - 1] ?? {};
        results.push({
          id: vr.videoId,
          title: vr.title?.runs?.[0]?.text ?? '',
          thumbnail: thumb.url ?? '',
          author: vr.ownerText?.runs?.[0]?.text ?? vr.shortBylineText?.runs?.[0]?.text ?? '',
          type: 'track' as const,
          embedUrl: `https://www.youtube.com/embed/${vr.videoId}?autoplay=1&rel=1`,
        });
        if (results.length >= 10) break;
      }

      return results;
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

  async streamYouTubeAudio(videoId: string, res: Response) {
    const { execFile } = require('child_process') as typeof import('child_process');
    const { promisify } = require('util') as typeof import('util');
    const execFileAsync = promisify(execFile);

    try {
      const { stdout } = await execFileAsync('yt-dlp', [
        '-f', 'bestaudio',
        '-g',
        '--no-warnings',
        `https://www.youtube.com/watch?v=${videoId}`,
      ], { timeout: 30000 });

      const audioUrl = stdout.trim().split('\n')[0];
      if (!audioUrl) throw new Error('No audio URL returned by yt-dlp');

      const streamRes = await fetch(audioUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!streamRes.ok || !streamRes.body) {
        throw new Error(`Upstream returned ${streamRes.status}`);
      }

      const contentType = streamRes.headers.get('content-type') || 'audio/webm; codecs=opus';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Accept-Ranges', 'bytes');

      const reader = streamRes.body.getReader();
      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) { res.end(); return; }
        const canWrite = res.write(value);
        if (!canWrite) {
          await new Promise((resolve) => res.once('drain', resolve));
        }
        return pump();
      };
      await pump();
    } catch (err: any) {
      this.logger.warn(`Stream failed for ${videoId}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({ statusCode: 502, message: 'Não foi possível obter o stream de áudio.' });
      } else {
        res.end();
      }
    }
  }
}
