import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
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
}
