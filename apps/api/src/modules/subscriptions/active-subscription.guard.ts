import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from './subscription.service';

export const SKIP_SUBSCRIPTION_CHECK_KEY = 'skip_subscription_check';

/**
 * Guard global que bloqueia requisições de tenants com assinatura
 * EXPIRED, CANCELED ou PAST_DUE.
 *
 * Plano FREE com status ACTIVE passa normalmente (nunca expira).
 * Admins e endpoints marcados com @SkipSubscriptionCheck() são isentos.
 */
@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return true;

    const role = user.role;
    if (role === 'ADMIN' || role === 'STUDENT') return true;

    const tenantId = user.tenantId;
    if (!tenantId) return true;

    await this.subscriptionService.assertSubscriptionActive(tenantId);
    return true;
  }
}
