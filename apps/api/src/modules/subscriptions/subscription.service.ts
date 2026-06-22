import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { PLAN_LIMITS, PLAN_DISPLAY_NAMES, PLAN_PRICES, PlanFeature } from '../../common/plan-limits';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private mpClient() {
    return new MercadoPagoConfig({
      accessToken: this.config.get<string>('MP_ACCESS_TOKEN', ''),
    });
  }

  private nextPeriodEnd() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
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

  async checkFeature(tenantId: string, feature: PlanFeature): Promise<void> {
    const plan = await this.getTenantPlan(tenantId);
    if (!PLAN_LIMITS[plan][feature]) {
      throw new ForbiddenException(
        `A funcionalidade "${feature}" não está disponível no plano ${PLAN_DISPLAY_NAMES[plan]}. Faça upgrade para continuar.`,
      );
    }
  }

  async checkStudentLimit(tenantId: string, trainerId: string): Promise<void> {
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

  async createMPCheckout(tenantId: string, plan: SubscriptionPlan, returnUrl: string) {
    const price = PLAN_PRICES[plan];
    if (!price) throw new BadRequestException('Plano inválido para checkout');

    const preference = new Preference(this.mpClient());
    const result = await preference.create({
      body: {
        items: [
          {
            id: plan,
            title: `Fitlynutri — Plano ${PLAN_DISPLAY_NAMES[plan]}`,
            quantity: 1,
            unit_price: price,
            currency_id: 'BRL',
          },
        ],
        external_reference: `${tenantId}:${plan}`,
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

      const colonIdx = ref.indexOf(':');
      const tenantId = ref.slice(0, colonIdx);
      const plan = ref.slice(colonIdx + 1) as SubscriptionPlan;

      if (!tenantId || !Object.values(SubscriptionPlan).includes(plan)) return { received: true };

      await this.prisma.tenantSubscription.upsert({
        where: { tenantId },
        update: {
          plan,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.nextPeriodEnd(),
        },
        create: {
          tenantId,
          plan,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.nextPeriodEnd(),
        },
      });
    } catch {
      // não rejeitar a requisição — MP pode reenviar se receber erro
    }

    return { received: true };
  }
}
