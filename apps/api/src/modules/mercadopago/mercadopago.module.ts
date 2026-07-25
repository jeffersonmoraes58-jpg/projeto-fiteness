import { Module } from '@nestjs/common';
import { MercadoPagoController } from './mercadopago.controller';
import { BillingModule } from '../billing/billing.module';
import { SubscriptionsModule } from '../subscriptions/subscription.module';
import { ChallengesModule } from '../challenges/challenges.module';

@Module({
  imports: [BillingModule, SubscriptionsModule, ChallengesModule],
  controllers: [MercadoPagoController],
})
export class MercadoPagoModule {}
