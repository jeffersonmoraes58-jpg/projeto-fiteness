import { Module } from '@nestjs/common';
import { MercadoPagoController } from './mercadopago.controller';
import { BillingModule } from '../billing/billing.module';
import { SubscriptionsModule } from '../subscriptions/subscription.module';

@Module({
  imports: [BillingModule, SubscriptionsModule],
  controllers: [MercadoPagoController],
})
export class MercadoPagoModule {}
