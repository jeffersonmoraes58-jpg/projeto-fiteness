import { Controller, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BillingService } from '../billing/billing.service';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { Public } from '../../decorators/public.decorator';

@ApiTags('mercadopago')
@Controller('mercadopago')
export class MercadoPagoController {
  constructor(
    private billingService: BillingService,
    private subscriptionService: SubscriptionService,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook unificado Mercado Pago — roteia para billing ou subscriptions' })
  async handleWebhook(@Body() body: any, @Query() query: any) {
    await Promise.allSettled([
      this.billingService.handleWebhook(body, query),
      this.subscriptionService.handleMPWebhook(body),
    ]);
    return { received: true };
  }
}
