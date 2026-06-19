import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { PlanFeatureGuard } from './plan-feature.guard';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, PlanFeatureGuard],
  exports: [SubscriptionService, PlanFeatureGuard],
})
export class SubscriptionsModule {}
