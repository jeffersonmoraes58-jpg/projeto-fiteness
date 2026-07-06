import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MusicController } from './music.controller';

@Module({ imports: [ConfigModule], controllers: [MusicController] })
export class MusicModule {}
