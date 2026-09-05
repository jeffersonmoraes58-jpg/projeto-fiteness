import { Module } from '@nestjs/common';
import { NutritionistsController } from './nutritionists.controller';
import { NutritionistsService } from './nutritionists.service';
import { EmailModule } from '../email/email.module';
import { SubscriptionsModule } from '../subscriptions/subscription.module';

@Module({
  imports: [EmailModule, SubscriptionsModule],
  controllers: [NutritionistsController],
  providers: [NutritionistsService],
  exports: [NutritionistsService],
})
export class NutritionistsModule {}