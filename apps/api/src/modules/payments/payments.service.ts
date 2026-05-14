import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-04-10',
    });
  }

  async createCheckoutSession(tenantId: string, priceId: string, successUrl: string, cancelUrl: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });

    if (!tenant) throw new BadRequestException('Tenant não encontrado');

    let customerId = tenant.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        metadata: { tenantId },
        name: tenant.name,
      });
      customerId = customer.id;
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { tenantId },
      subscription_data: {
        trial_period_days: 14,
        metadata: { tenantId },
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.get('STRIPE_WEBHOOK_SECRET') || '',
      );
    } catch {
      throw new BadRequestException('Webhook inválido');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const tenantId = session.metadata?.tenantId;
    if (!tenantId) return;

    await this.prisma.tenantSubscription.upsert({
      where: { tenantId },
      update: {
        status: SubscriptionStatus.ACTIVE,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
      },
      create: {
        tenantId,
        status: SubscriptionStatus.ACTIVE,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
      },
    });

    await this.prisma.payment.create({
      data: {
        amount: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || 'BRL',
        status: PaymentStatus.PAID,
        externalId: session.id,
        description: 'Subscription checkout',
      },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription as string },
    });

    if (subscription) {
      await this.prisma.tenantSubscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date((invoice.period_start || 0) * 1000),
          currentPeriodEnd: new Date((invoice.period_end || 0) * 1000),
        },
      });

      await this.prisma.payment.create({
        data: {
          tenantSubscriptionId: subscription.id,
          amount: (invoice.amount_paid || 0) / 100,
          currency: invoice.currency.toUpperCase(),
          status: PaymentStatus.PAID,
          externalId: invoice.id,
          paidAt: new Date(),
        },
      });
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription as string },
    });

    if (subscription) {
      await this.prisma.tenantSubscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.PAST_DUE },
      });
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.prisma.tenantSubscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { status: SubscriptionStatus.CANCELED },
    });
  }

  async getPortalUrl(tenantId: string, returnUrl: string) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('Sem assinatura ativa');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  async getSubscriptionStatus(tenantId: string) {
    return this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
  }
}
