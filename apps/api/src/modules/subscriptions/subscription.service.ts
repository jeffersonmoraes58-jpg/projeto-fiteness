import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, SubscriptionStatus, BillingInterval } from '@prisma/client';
import {
  PLAN_LIMITS,
  PLAN_DISPLAY_NAMES,
  PLAN_PRICES,
  PLAN_PRICES_ANNUAL,
  getPlanPrice,
  PlanFeature,
} from '../../common/plan-limits';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Verifica assinaturas com currentPeriodEnd < now() e marca como EXPIRED.
   * Também transiciona TRIAL vencido (trialEndsAt < now()) para EXPIRED.
   * Plano FREE nunca expira.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireSubscriptions() {
    const now = new Date();

    const expiredPaid = await this.prisma.tenantSubscription.updateMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        plan: { not: SubscriptionPlan.FREE },
        currentPeriodEnd: { lt: now },
      },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    const expiredTrial = await this.prisma.tenantSubscription.updateMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: { lt: now },
      },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    if (expiredPaid.count || expiredTrial.count) {
      this.logger.log(
        `Assinaturas expiradas: ${expiredPaid.count} ACTIVE + ${expiredTrial.count} TRIAL`,
      );
    }
    return { expiredPaid: expiredPaid.count, expiredTrial: expiredTrial.count };
  }

  private mpClient() {
    return new MercadoPagoConfig({
      accessToken: this.config.get<string>('MP_ACCESS_TOKEN', ''),
    });
  }

  private nextPeriodEnd(cycle: BillingInterval = 'MONTHLY') {
    const d = new Date();
    if (cycle === 'ANNUAL') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d;
  }

  async getTenantPlan(tenantId: string): Promise<SubscriptionPlan> {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      select: { plan: true },
    });
    return sub?.plan ?? SubscriptionPlan.FREE;
  }

  async getMyPlan(tenantId: string) {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });
    const plan = sub?.plan ?? SubscriptionPlan.FREE;
    const limits = PLAN_LIMITS[plan];
    const displayName = PLAN_DISPLAY_NAMES[plan];
    return { plan, displayName, limits, subscription: sub };
  }

  /**
   * Bloqueia ação se a assinatura do tenant estiver EXPIRED/CANCELED/PAST_DUE.
   * Plano FREE ACTIVE passa normalmente (nunca expira).
   */
  async assertSubscriptionActive(tenantId: string): Promise<void> {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      select: { status: true, plan: true },
    });
    if (!sub) return; // sem assinatura registrada — não bloqueia (edge case de tenants antigos)
    const blocked: SubscriptionStatus[] = [
      SubscriptionStatus.EXPIRED,
      SubscriptionStatus.CANCELED,
      SubscriptionStatus.PAST_DUE,
    ];
    if (blocked.includes(sub.status)) {
      throw new ForbiddenException(
        'Sua assinatura não está ativa. Renove o plano para continuar usando a plataforma.',
      );
    }
  }

  async checkFeature(tenantId: string, feature: PlanFeature): Promise<void> {
    await this.assertSubscriptionActive(tenantId);
    const plan = await this.getTenantPlan(tenantId);
    if (!PLAN_LIMITS[plan][feature]) {
      throw new ForbiddenException(
        `A funcionalidade "${feature}" não está disponível no plano ${PLAN_DISPLAY_NAMES[plan]}. Faça upgrade para continuar.`,
      );
    }
  }

  async checkStudentLimit(tenantId: string, trainerId: string): Promise<void> {
    await this.assertSubscriptionActive(tenantId);
    const plan = await this.getTenantPlan(tenantId);
    const maxStudents = PLAN_LIMITS[plan].maxStudents;
    if (maxStudents === -1) return;

    const currentCount = await this.prisma.trainerStudent.count({
      where: { trainerId, isActive: true },
    });

    if (currentCount >= maxStudents) {
      throw new ForbiddenException(
        `Limite de ${maxStudents} aluno(s) atingido no plano ${PLAN_DISPLAY_NAMES[plan]}. Faça upgrade para adicionar mais alunos.`,
      );
    }
  }

  async createMPCheckout(
    tenantId: string,
    plan: SubscriptionPlan,
    returnUrl: string,
    cycle: BillingInterval = 'MONTHLY',
  ) {
    const price = getPlanPrice(plan, cycle);
    if (!price) throw new BadRequestException('Plano inválido para checkout');

    const cycleLabel = cycle === 'ANNUAL' ? 'Anual' : 'Mensal';
    const preference = new Preference(this.mpClient());
    const result = await preference.create({
      body: {
        items: [
          {
            id: `${plan}-${cycle}`,
            title: `Fitlynutri — Plano ${PLAN_DISPLAY_NAMES[plan]} (${cycleLabel})`,
            quantity: 1,
            unit_price: price,
            currency_id: 'BRL',
          },
        ],
        external_reference: `${tenantId}:${plan}:${cycle}`,
        back_urls: {
          success: `${returnUrl}?status=success`,
          failure: `${returnUrl}?status=failure`,
          pending: `${returnUrl}?status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${this.config.get('API_URL', 'https://api.fitlynutri.com.br')}/subscriptions/webhook/mp`,
      },
    });

    return { checkoutUrl: result.init_point };
  }

  async handleMPWebhook(body: any) {
    // Suporta ambos os formatos de notificação do MP (IPN legado e Webhooks)
    const paymentId = body?.data?.id ?? body?.id;
    if (!paymentId || body?.type === 'test') return { received: true };

    try {
      const paymentApi = new Payment(this.mpClient());
      const payment = await paymentApi.get({ id: String(paymentId) });

      if (payment.status !== 'approved') return { received: true };

      const ref = payment.external_reference;
      if (!ref || !ref.includes(':')) return { received: true };

      // Formato: tenantId:PLAN[:CYCLE] — CYCLE opcional para compatibilidade
      const parts = ref.split(':');
      const tenantId = parts[0];
      const plan = parts[1] as SubscriptionPlan;
      const cycle: BillingInterval =
        parts[2] === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

      if (!tenantId || !Object.values(SubscriptionPlan).includes(plan)) return { received: true };

      await this.prisma.tenantSubscription.upsert({
        where: { tenantId },
        update: {
          plan,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: cycle,
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.nextPeriodEnd(cycle),
        },
        create: {
          tenantId,
          plan,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: cycle,
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.nextPeriodEnd(cycle),
        },
      });
    } catch {
      // não rejeitar a requisição — MP pode reenviar se receber erro
    }

    return { received: true };
  }
}
