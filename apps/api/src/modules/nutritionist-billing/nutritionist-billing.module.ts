import { Module } from '@nestjs/common';
import { NutritionistBillingController } from './nutritionist-billing.controller';
import { NutritionistBillingService } from './nutritionist-billing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscription.module';

@Module({
  imports: [PrismaModule, NotificationsModule, SubscriptionsModule],
  controllers: [NutritionistBillingController],
  providers: [NutritionistBillingService],
  exports: [NutritionistBillingService],
})
export class NutritionistBillingModule {}
