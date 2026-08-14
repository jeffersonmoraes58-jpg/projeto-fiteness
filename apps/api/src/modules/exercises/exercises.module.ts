import { Module } from '@nestjs/common';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';
import { OwnVideosSyncController } from './own-videos-sync.controller';
import { OwnVideosSyncService } from './own-videos-sync.service';

@Module({
  controllers: [ExercisesController, OwnVideosSyncController],
  providers: [ExercisesService, OwnVideosSyncService],
  exports: [ExercisesService],
})
export class ExercisesModule {}

