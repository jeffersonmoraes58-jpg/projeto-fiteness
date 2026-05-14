import { Module } from '@nestjs/common';
import { NutritionistsController } from './nutritionists.controller';
import { NutritionistsService } from './nutritionists.service';

@Module({
  controllers: [NutritionistsController],
  providers: [NutritionistsService],
  exports: [NutritionistsService],
})
export class NutritionistsModule {}

