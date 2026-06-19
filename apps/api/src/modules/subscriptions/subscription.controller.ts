import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { SubscriptionService } from './subscription.service';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get('my')
  @ApiOperation({ summary: 'Retorna o plano atual e limites de features do tenant' })
  getMyPlan(@CurrentUser('tenantId') tenantId: string) {
    return this.subscriptionService.getMyPlan(tenantId);
  }
}
