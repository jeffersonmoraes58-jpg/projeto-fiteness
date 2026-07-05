import { Controller, Get, Param, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../decorators/public.decorator';
import ytSearch from 'yt-search';
import ytdl from '@distube/ytdl-core';

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

  @Public()
  @Get('audio/:videoId')
  @ApiOperation({ summary: 'Stream de áudio do YouTube (MP3) para background playback' })
  async streamAudio(@Param('videoId') videoId: string, @Res() res: Response) {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      // Valida se o vídeo existe
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title;

      // Configura headers para streaming de áudio
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `inline; filename="${title}.mp3"`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Stream de áudio (formato MP3, qualidade mais baixa para performance)
      const stream = ytdl(url, {
        quality: 'lowestaudio',
        filter: 'audioonly',
      });

      stream.on('error', (err) => {
        console.error('Erro no stream de áudio:', err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erro ao carregar áudio' });
        }
      });

      stream.pipe(res);
    } catch (error: any) {
      console.error('Erro ao obter áudio do YouTube:', error.message);
      throw new HttpException(
        { error: 'Não foi possível carregar o áudio deste vídeo' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
