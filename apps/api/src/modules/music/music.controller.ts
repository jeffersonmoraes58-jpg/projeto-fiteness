import { Controller, Get, Param, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../decorators/public.decorator';
import { MusicService } from './music.service';

@ApiTags('music')
@Controller('music')
export class MusicController {
  constructor(private musicService: MusicService) {}

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Buscar músicas — YouTube, Spotify ou Deezer' })
  async search(
    @Query('q') q: string,
    @Query('service') service: string,
  ) {
    const query = q?.trim();
    if (!query) return [];

    switch (service) {
      case 'youtube': return this.musicService.searchYouTube(query);
      case 'spotify': return this.musicService.searchSpotify(query);
      case 'deezer':  return this.musicService.searchDeezer(query);
      default:
        throw new HttpException(
          'Serviço inválido. Use youtube, spotify ou deezer.',
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  @Public()
  @Get('stream/:videoId')
  @ApiOperation({ summary: 'Stream de áudio YouTube (proxy para background play)' })
  async streamAudio(
    @Param('videoId') videoId: string,
    @Res() res: Response,
  ) {
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      throw new HttpException('Video ID inválido', HttpStatus.BAD_REQUEST);
    }
    await this.musicService.streamYouTubeAudio(videoId, res);
  }
}
