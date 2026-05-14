import { Module } from '@nestjs/common';
import { DietsController } from './diets.controller';
import { DietsService } from './diets.service';

@Module({
  controllers: [DietsController],
  providers: [DietsService],
  exports: [DietsService],
})
export class DietsModule {}

