import { Controller, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BillingService } from '../billing/billing.service';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { ChallengesService } from '../challenges/challenges.service';
import { Public } from '../../decorators/public.decorator';

@ApiTags('mercadopago')
@Controller('mercadopago')
export class MercadoPagoController {
  constructor(
    private billingService: BillingService,
    private subscriptionService: SubscriptionService,
    private challengesService: ChallengesService,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook unificado Mercado Pago — roteia para billing, subscriptions ou challenges' })
  async handleWebhook(@Body() body: any, @Query() query: any) {
    await Promise.allSettled([
      this.billingService.handleWebhook(body, query),
      this.subscriptionService.handleMPWebhook(body),
      this.challengesService.handleWebhook(body),
    ]);
    return { received: true };
  }
}
