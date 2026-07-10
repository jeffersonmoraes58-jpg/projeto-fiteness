import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
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
    private emailService: EmailService,
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

  /**
   * Notifica tenants cuja assinatura (mensal ou anual) está próxima de expirar:
   * - 7 dias antes (primeiro aviso)
   * - 3 dias antes (segundo aviso)
   * - 1 dia antes (último aviso)
   * Só envia se ainda não tiver enviado para este ciclo (verifica lastExpiringNotificationAt).
   */
  @Cron('0 0 12 * * *', { timeZone: 'America/Sao_Paulo' })
  async notifyExpiringSubscriptions() {
    const now = new Date();
    const daysAhead = [7, 3, 1];

    for (const days of daysAhead) {
      // Calcula o target: assinaturas que expiram exatamente daqui a `days` dias
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      
      // Janela de 24h para capturar a data
      const start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(targetDate);
      end.setHours(23, 59, 59, 999);

      // Busca assinaturas ACTIVE que expiram nesta janela
      const subs = await this.prisma.tenantSubscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          plan: { not: SubscriptionPlan.FREE },
          currentPeriodEnd: { gte: start, lte: end },
          // Evita reenvio: ou nunca notificou, ou notificou há mais de 2 dias
          OR: [
            { lastExpiringNotificationAt: null },
            { lastExpiringNotificationAt: { lt: new Date(now.getTime() - 2 * 86400000) } },
          ],
        },
        include: {
          tenant: {
            include: {
              users: {
                where: { role: { in: ['ADMIN', 'STUDIO_OWNER'] } },
                take: 1,
                include: { profile: true },
              },
            },
          },
        },
      });

      for (const sub of subs) {
        const admin = sub.tenant.users[0];
        if (!admin?.email) continue;

        const cycleLabel = sub.billingCycle === 'ANNUAL' ? 'Anual' : 'Mensal';
        const adminName = `${admin.profile?.firstName ?? ''} ${admin.profile?.lastName ?? ''}`.trim() || admin.email;

        await this.emailService.sendSubscriptionExpiring({
          to: admin.email,
          adminName,
          planLabel: PLAN_DISPLAY_NAMES[sub.plan],
          cycleLabel,
          expiresAt: sub.currentPeriodEnd!,
          daysLeft: days,
          tenantId: sub.tenantId,
        });

        // Marca que notificou para evitar reenvio
        await this.prisma.tenantSubscription.update({
          where: { id: sub.id },
          data: { lastExpiringNotificationAt: new Date() },
        });
      }

      if (subs.length > 0) {
        this.logger.log(`Notificações de expiração (${days}d): ${subs.length} emails enviados`);
      }
    }
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
  /**
   * Resolve o plano efetivo de um usuário.
   * Se o user tem planOverride definido, usa ele.
   * Caso contrário, usa o plano do tenant.
   */
  async getEffectivePlan(tenantId: string, userId?: string): Promise<SubscriptionPlan> {
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { planOverride: true },
      });
      if (user?.planOverride) return user.planOverride;
    }
    return this.getTenantPlan(tenantId);
  }

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

    // Verifica se o token do Mercado Pago está configurado
    const mpToken = this.config.get<string>('MP_ACCESS_TOKEN', '');
    if (!mpToken) {
      this.logger.error('[MP Checkout] MP_ACCESS_TOKEN não configurado nas variáveis de ambiente');
      throw new BadRequestException(
        'Pagamento via Mercado Pago não configurado. Entre em contato com o suporte.',
      );
    }

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
    this.logger.log(`[MP Webhook] Recebido: ${JSON.stringify(body)}`);

    // Suporta ambos os formatos de notificação do MP (IPN legado e Webhooks)
    const paymentId = body?.data?.id ?? body?.id;
    if (!paymentId || body?.type === 'test') {
      this.logger.log('[MP Webhook] Ignorado (test ou sem paymentId)');
      return { received: true };
    }

    try {
      const paymentApi = new Payment(this.mpClient());
      const payment = await paymentApi.get({ id: String(paymentId) });

      this.logger.log(`[MP Webhook] Payment ${paymentId}: status=${payment.status}, ref=${payment.external_reference}`);

      if (payment.status !== 'approved') {
        this.logger.log(`[MP Webhook] Pagamento não aprovado (status=${payment.status}), ignorando`);
        return { received: true };
      }

      const ref = payment.external_reference;
      if (!ref || !ref.includes(':')) {
        this.logger.log('[MP Webhook] external_reference inválida ou ausente');
        return { received: true };
      }

      // Formato: tenantId:PLAN[:CYCLE] — CYCLE opcional para compatibilidade
      const parts = ref.split(':');
      const tenantId = parts[0];
      const plan = parts[1] as SubscriptionPlan;
      const cycle: BillingInterval =
        parts[2] === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

      if (!tenantId || !Object.values(SubscriptionPlan).includes(plan)) {
        this.logger.log(`[MP Webhook] Dados inválidos: tenantId=${tenantId}, plan=${plan}`);
        return { received: true };
      }

      this.logger.log(`[MP Webhook] Ativando plano ${plan} (${cycle}) para tenant ${tenantId}`);

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

      this.logger.log(`[MP Webhook] Plano ativado com sucesso para tenant ${tenantId}`);
    } catch (err) {
      this.logger.error(`[MP Webhook] Erro ao processar pagamento ${paymentId}:`, err);
      // não rejeitar a requisição — MP pode reenviar se receber erro
    }

    return { received: true };
  }
}
