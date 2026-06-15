import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../decorators/public.decorator';
import * as ytSearch from 'yt-search';

@ApiTags('music')
@Controller('music')
export class MusicController {
  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Buscar músicas no YouTube' })
  async search(@Query('q') q: string) {
    if (!q?.trim()) return [];
    const result = await (ytSearch as any)(q.trim());
    return result.videos.slice(0, 12).map((v: any) => ({
      videoId: v.videoId,
      title: v.title,
      thumbnail: v.thumbnail,
      author: v.author?.name ?? '',
      duration: v.timestamp ?? '',
    }));
  }
}
