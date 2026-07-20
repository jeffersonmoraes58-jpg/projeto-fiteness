import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { SubscriptionService } from './subscription.service';
import { Public } from '../../decorators/public.decorator';
import { SkipSubscriptionCheck } from './skip-subscription-check.decorator';
import { SubscriptionPlan, BillingInterval } from '@prisma/client';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get('my')
  @SkipSubscriptionCheck()
  @ApiOperation({ summary: 'Retorna o plano atual e limites de features do tenant' })
  getMyPlan(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.subscriptionService.getMyPlan(tenantId, userId);
  }

  @Post('checkout')
  @SkipSubscriptionCheck()
  @ApiOperation({ summary: 'Cria preferência de pagamento Mercado Pago para upgrade de plano' })
  createCheckout(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { plan: SubscriptionPlan; returnUrl: string; cycle?: BillingInterval },
  ) {
    return this.subscriptionService.createMPCheckout(
      tenantId,
      body.plan,
      body.returnUrl,
      body.cycle ?? 'MONTHLY',
    );
  }

  @Public()
  @Post('webhook/mp')
  @ApiOperation({ summary: 'Webhook Mercado Pago — ativa plano após pagamento aprovado' })
  mpWebhook(@Body() body: any) {
    return this.subscriptionService.handleMPWebhook(body);
  }
}
