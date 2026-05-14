import { Controller, Post, Get, Body, Headers, RawBodyRequest, Req, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../decorators/public.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar sessão de checkout' })
  createCheckout(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { priceId: string; successUrl: string; cancelUrl: string },
  ) {
    return this.paymentsService.createCheckoutSession(
      tenantId,
      body.priceId,
      body.successUrl,
      body.cancelUrl,
    );
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Portal de gerenciamento de assinatura' })
  getPortal(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { returnUrl: string },
  ) {
    return this.paymentsService.getPortalUrl(tenantId, body.returnUrl);
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status da assinatura' })
  getSubscription(@CurrentUser('tenantId') tenantId: string) {
    return this.paymentsService.getSubscriptionStatus(tenantId);
  }

  @Public()
  @Post('webhook/stripe')
  @ApiOperation({ summary: 'Webhook Stripe (interno)' })
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody as Buffer, signature);
  }
}
