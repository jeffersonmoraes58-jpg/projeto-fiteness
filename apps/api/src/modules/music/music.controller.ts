import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('music')
@Controller('music')
export class MusicController {
  constructor(private config: ConfigService) {}

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Buscar músicas no Jamendo (royalty-free)' })
  async search(@Query('q') q: string) {
    const clientId = this.config.get('JAMENDO_CLIENT_ID');
    if (!clientId) {
      throw new HttpException('Player de música não configurado', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const query = q?.trim() || 'workout';
    const url = new URL('https://api.jamendo.com/v3.0/tracks/');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('format', 'json');
    url.searchParams.set('search', query);
    url.searchParams.set('audioformat', 'mp32');
    url.searchParams.set('limit', '12');
    url.searchParams.set('order', 'popularity_total');
    url.searchParams.set('include', 'musicinfo');

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Jamendo HTTP ${res.status}`);
      const data: any = await res.json();
      return (data.results || []).map((t: any) => ({
        trackId: String(t.id),
        title: t.name,
        thumbnail: t.album_image || '',
        author: t.artist_name,
        duration: this.formatDuration(t.duration),
        audioUrl: t.audiodownload || t.audio,
      }));
    } catch (err: any) {
      console.error('Jamendo API error:', err.message);
      throw new HttpException('Erro ao buscar músicas', HttpStatus.BAD_GATEWAY);
    }
  }

  private formatDuration(seconds: number): string {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
