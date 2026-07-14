import { Module } from '@nestjs/common';
import { NutritionistsController } from './nutritionists.controller';
import { NutritionistsService } from './nutritionists.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [NutritionistsController],
  providers: [NutritionistsService],
  exports: [NutritionistsService],
})
export class NutritionistsModule {}