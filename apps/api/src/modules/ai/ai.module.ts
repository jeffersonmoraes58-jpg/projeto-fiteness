import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { SubscriptionsModule } from '../subscriptions/subscription.module';
import { PlanFeatureGuard } from '../subscriptions/plan-feature.guard';

@Module({
  imports: [SubscriptionsModule],
  controllers: [AiController],
  providers: [AiService, PlanFeatureGuard],
  exports: [AiService],
})
export class AiModule {}
