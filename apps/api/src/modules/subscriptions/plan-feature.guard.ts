import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from './subscription.service';
import { REQUIRE_FEATURE_KEY } from './require-feature.decorator';
import { PlanFeature } from '../../common/plan-limits';

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const features = this.reflector.getAllAndOverride<PlanFeature[]>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!features || features.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (!tenantId) throw new ForbiddenException('Tenant não identificado');

    for (const feature of features) {
      await this.subscriptionService.checkFeature(tenantId, feature);
    }

    return true;
  }
}
