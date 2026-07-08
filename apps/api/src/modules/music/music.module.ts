import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';

@Module({ imports: [ConfigModule], controllers: [MusicController], providers: [MusicService] })
export class MusicModule {}
