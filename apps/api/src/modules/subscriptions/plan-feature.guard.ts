import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from './subscription.service';
import { REQUIRE_FEATURE_KEY } from './require-feature.decorator';
import { PlanFeature, PLAN_LIMITS } from '../../common/plan-limits';

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
    const userId = request.user?.id;

    if (!tenantId) throw new ForbiddenException('Tenant não identificado');

    const effectivePlan = await this.subscriptionService.getEffectivePlan(tenantId, userId);
    for (const feature of features) {
      const limits = PLAN_LIMITS[effectivePlan];
      if (!limits[feature as keyof typeof limits] || limits[feature as keyof typeof limits] === false) {
        throw new ForbiddenException(
          `A funcionalidade "${feature}" não está disponível no seu plano. Faça upgrade para continuar.`,
        );
      }
    }

    return true;
  }
}
