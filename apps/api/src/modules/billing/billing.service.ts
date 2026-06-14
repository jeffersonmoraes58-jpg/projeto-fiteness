import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {}

  private mpClient() {
    const token = this.config.get<string>('MP_ACCESS_TOKEN', '');
    return new MercadoPagoConfig({ accessToken: token });
  }

  private async getTrainer(userId: string) {
    const trainer = await this.prisma.trainer.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });
    if (!trainer) throw new NotFoundException('Trainer não encontrado');
    return trainer;
  }

  private async getStudent(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });
    if (!student) throw new NotFoundException('Aluno não encontrado');
    return student;
  }

  private nextDueDate(interval: 'MONTHLY' | 'ANNUAL'): Date {
    const d = new Date();
    if (interval === 'ANNUAL') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d;
  }

  // ── TRAINER ──────────────────────────────────────────────

  async getPricing(userId: string) {
    return this.getPricingPublic(userId);
  }

  async setPricing(
    userId: string,
    monthlyPrice?: number,
    annualPrice?: number,
    mpAccessToken?: string,
  ) {
    const trainer = await this.getTrainer(userId);
    const data: any = {
      monthlyPrice: monthlyPrice ?? null,
      annualPrice: annualPrice ?? null,
    };
    // Only update token if a value was explicitly provided
    if (mpAccessToken !== undefined) {
      data.mpAccessToken = mpAccessToken || null;
    }
    return this.prisma.trainerPricing.upsert({
      where: { trainerId: trainer.id },
      update: data,
      create: { trainerId: trainer.id, ...data },
    });
  }

  async getPricingPublic(userId: string) {
    const trainer = await this.getTrainer(userId);
    const pricing = await this.prisma.trainerPricing.findUnique({
      where: { trainerId: trainer.id },
    });
    if (!pricing) return { trainerId: trainer.id, monthlyPrice: null, annualPrice: null, hasMpToken: false };
    const { mpAccessToken, ...rest } = pricing as any;
    return { ...rest, hasMpToken: !!mpAccessToken };
  }

  async createSubscription(
    userId: string,
    studentUserId: string,
    interval: 'MONTHLY' | 'ANNUAL',
    customDueDate?: Date,
  ) {
    const trainer = await this.getTrainer(userId);
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
      include: { user: { include: { profile: true } } },
    });
    if (!student) throw new NotFoundException('Aluno não encontrado');

    const pricing = await this.prisma.trainerPricing.findUnique({
      where: { trainerId: trainer.id },
    });
    if (!pricing) {
      throw new BadRequestException('Configure seus preços antes de criar cobranças');
    }

    const amount = interval === 'ANNUAL' ? pricing.annualPrice : pricing.monthlyPrice;
    if (!amount) {
      throw new BadRequestException(
        `Preço ${interval === 'ANNUAL' ? 'anual' : 'mensal'} não configurado`,
      );
    }

    const now = new Date();
    const dueDate = customDueDate ? new Date(customDueDate) : new Date(now);
    if (!customDueDate) dueDate.setDate(dueDate.getDate() + 7);

    const billing = await this.prisma.studentBilling.upsert({
      where: { studentId_trainerId: { studentId: student.id, trainerId: trainer.id } },
      update: { interval: interval as any, amount, status: 'PENDING', nextDueDate: dueDate },
      create: {
        studentId: student.id,
        trainerId: trainer.id,
        interval: interval as any,
        amount,
        status: 'PENDING',
        startDate: now,
        nextDueDate: dueDate,
      },
    });

    const trainerName = [
      trainer.user.profile?.firstName,
      trainer.user.profile?.lastName,
    ]
      .filter(Boolean)
      .join(' ') || 'Personal Trainer';

    const description =
      interval === 'ANNUAL'
        ? `Consultoria anual — ${trainerName}`
        : `Mensalidade — ${trainerName} — ${now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;

    await this.prisma.invoice.deleteMany({
      where: { billingId: billing.id, status: 'PENDING' },
    });

    const invoice = await this.prisma.invoice.create({
      data: { billingId: billing.id, amount, status: 'PENDING', dueDate, description },
    });

    return { billing, invoice };
  }

  async getTrainerBillings(userId: string) {
    const trainer = await this.getTrainer(userId);
    const billings = await this.prisma.studentBilling.findMany({
      where: { trainerId: trainer.id },
      include: {
        student: { include: { user: { include: { profile: true } } } },
        invoices: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
      orderBy: { createdAt: 'desc' },
    });
    return billings.map((b) => ({
      id: b.id,
      studentId: b.studentId,
      studentUserId: b.student.userId,
      studentName:
        [b.student.user.profile?.firstName, b.student.user.profile?.lastName]
          .filter(Boolean)
          .join(' ') || b.student.user.email,
      studentEmail: b.student.user.email,
      interval: b.interval,
      amount: b.amount,
      status: b.status,
      nextDueDate: b.nextDueDate,
      startDate: b.startDate,
      latestInvoice: b.invoices[0] ?? null,
      invoices: b.invoices,
    }));
  }

  async markInvoicePaid(userId: string, invoiceId: string) {
    const trainer = await this.getTrainer(userId);
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { billing: true },
    });
    if (!invoice || invoice.billing.trainerId !== trainer.id) {
      throw new NotFoundException('Fatura não encontrada');
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Fatura já está paga');
    }
    const [updated] = await Promise.all([
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidAt: new Date() },
      }),
      this.prisma.studentBilling.update({
        where: { id: invoice.billingId },
        data: {
          status: 'ACTIVE',
          nextDueDate: this.nextDueDate(invoice.billing.interval as any),
        },
      }),
    ]);
    return updated;
  }

  async updateInvoice(
    userId: string,
    invoiceId: string,
    dto: { dueDate?: Date; amount?: number; description?: string },
  ) {
    const trainer = await this.getTrainer(userId);
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { billing: true },
    });
    if (!invoice || invoice.billing.trainerId !== trainer.id) {
      throw new NotFoundException('Fatura não encontrada');
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Fatura já paga não pode ser editada');
    }
    const data: any = {};
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.description !== undefined) data.description = dto.description;
    return this.prisma.invoice.update({ where: { id: invoiceId }, data });
  }

  async deleteInvoice(userId: string, invoiceId: string) {
    const trainer = await this.getTrainer(userId);
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { billing: true },
    });
    if (!invoice || invoice.billing.trainerId !== trainer.id) {
      throw new NotFoundException('Fatura não encontrada');
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Fatura já paga não pode ser excluída');
    }
    await this.prisma.invoice.delete({ where: { id: invoiceId } });
    return { ok: true };
  }

  async cancelBilling(userId: string, billingId: string) {
    const trainer = await this.getTrainer(userId);
    const billing = await this.prisma.studentBilling.findUnique({
      where: { id: billingId },
    });
    if (!billing || billing.trainerId !== trainer.id) {
      throw new NotFoundException('Cobrança não encontrada');
    }
    await this.prisma.invoice.deleteMany({
      where: { billingId, status: { in: ['PENDING', 'OVERDUE'] } },
    });
    await this.prisma.studentBilling.update({
      where: { id: billingId },
      data: { status: 'CANCELLED' },
    });
    return { ok: true };
  }

  // ── STUDENT ──────────────────────────────────────────────

  async getStudentBilling(userId: string) {
    const student = await this.getStudent(userId);
    const billings = await this.prisma.studentBilling.findMany({
      where: { studentId: student.id },
      include: {
        trainer: { include: { user: { include: { profile: true } } } },
        invoices: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
    });
    return billings.map((b) => ({
      id: b.id,
      trainerId: b.trainerId,
      trainerName:
        [b.trainer.user.profile?.firstName, b.trainer.user.profile?.lastName]
          .filter(Boolean)
          .join(' ') || 'Trainer',
      interval: b.interval,
      amount: b.amount,
      status: b.status,
      nextDueDate: b.nextDueDate,
      pendingInvoice: b.invoices[0] ?? null,
    }));
  }

  async generateCheckoutPro(userId: string, invoiceId: string) {
    const student = await this.getStudent(userId);
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { billing: true },
    });
    if (!invoice || invoice.billing.studentId !== student.id) {
      throw new NotFoundException('Fatura não encontrada');
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Esta fatura já foi paga');
    }

    const trainerPricing = await this.prisma.trainerPricing.findUnique({
      where: { trainerId: invoice.billing.trainerId },
    });
    const token =
      (trainerPricing as any)?.mpAccessToken ||
      this.config.get<string>('MP_ACCESS_TOKEN', '');

    if (!token || token === 'placeholder') {
      throw new BadRequestException(
        'Token do Mercado Pago não configurado. O trainer deve configurar o token MP em Cobranças → Configurar Preços.',
      );
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const mpConfigured = new MercadoPagoConfig({ accessToken: token });
    const prefApi = new Preference(mpConfigured);

    const result = await prefApi.create({
      body: {
        items: [
          {
            id: invoice.id,
            title: invoice.description ?? 'Mensalidade Personal Trainer',
            quantity: 1,
            unit_price: invoice.amount,
            currency_id: 'BRL',
          },
        ],
        payer: {
          email: student.user.email,
          name: student.user.profile?.firstName ?? 'Aluno',
          surname: student.user.profile?.lastName ?? '',
        },
        // auto_return requires publicly accessible URLs — omit on localhost
        ...(frontendUrl.includes('localhost') ? {} : {
          back_urls: {
            success: `${frontendUrl}/student/billing?payment=success`,
            failure: `${frontendUrl}/student/billing?payment=failure`,
            pending: `${frontendUrl}/student/billing?payment=pending`,
          },
          auto_return: 'approved',
        }),
        external_reference: invoice.id,
        payment_methods: {
          excluded_payment_types: [{ id: 'ticket' }],
        },
      },
    });

    return {
      checkoutUrl: result.init_point,
      sandboxUrl: result.sandbox_init_point,
    };
  }

  async generatePixPayment(userId: string, invoiceId: string) {
    const student = await this.getStudent(userId);
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { billing: true },
    });
    if (!invoice || invoice.billing.studentId !== student.id) {
      throw new NotFoundException('Fatura não encontrada');
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Esta fatura já foi paga');
    }

    // Return cached QR if still valid
    if (
      invoice.pixQrCode &&
      invoice.pixExpiresAt &&
      invoice.pixExpiresAt > new Date()
    ) {
      return {
        pixQrCode: invoice.pixQrCode,
        pixQrCodeBase64: invoice.pixQrCodeBase64,
        expiresAt: invoice.pixExpiresAt,
        mpPaymentId: invoice.mpPaymentId,
      };
    }

    // Prefer trainer's own token; fall back to global env token
    const trainerPricing = await this.prisma.trainerPricing.findUnique({
      where: { trainerId: invoice.billing.trainerId },
    });
    const token =
      (trainerPricing as any)?.mpAccessToken ||
      this.config.get<string>('MP_ACCESS_TOKEN', '');

    if (!token || token === 'placeholder') {
      throw new BadRequestException(
        'Token do Mercado Pago não configurado. O trainer deve configurar o token MP em Cobranças → Configurar Preços.',
      );
    }

    const mpConfigured = new MercadoPagoConfig({ accessToken: token });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const paymentApi = new Payment(mpConfigured);

    const result = await paymentApi.create({
      body: {
        transaction_amount: invoice.amount,
        description: invoice.description ?? 'Mensalidade Personal Trainer',
        payment_method_id: 'pix',
        payer: {
          email: student.user.email,
          first_name: student.user.profile?.firstName ?? 'Aluno',
          last_name: student.user.profile?.lastName ?? '',
        },
        date_of_expiration: expiresAt.toISOString(),
      },
      requestOptions: { idempotencyKey: invoiceId },
    });

    const qrCode = (result as any).point_of_interaction?.transaction_data?.qr_code ?? '';
    const qrBase64 = (result as any).point_of_interaction?.transaction_data?.qr_code_base64 ?? '';

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        mpPaymentId: String(result.id),
        pixQrCode: qrCode,
        pixQrCodeBase64: qrBase64,
        pixExpiresAt: expiresAt,
      },
    });

    return { pixQrCode: qrCode, pixQrCodeBase64: qrBase64, expiresAt, mpPaymentId: String(result.id) };
  }

  // ── WEBHOOK ──────────────────────────────────────────────

  async handleWebhook(body: any, query: any) {
    const paymentId = query?.id ?? body?.data?.id;
    if (!paymentId) return { ok: true };

    const token = this.config.get<string>('MP_ACCESS_TOKEN', '');
    if (!token || token === 'placeholder') return { ok: true };

    try {
      const paymentApi = new Payment(this.mpClient());
      const payment = await paymentApi.get({ id: String(paymentId) });
      if ((payment as any).status !== 'approved') return { ok: true };

      // Find invoice by mpPaymentId (Pix) or by external_reference (Checkout Pro)
      let invoice = await this.prisma.invoice.findFirst({
        where: { mpPaymentId: String(paymentId) },
        include: { billing: true },
      });
      if (!invoice && (payment as any).external_reference) {
        invoice = await this.prisma.invoice.findFirst({
          where: { id: (payment as any).external_reference },
          include: { billing: true },
        });
        if (invoice) {
          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { mpPaymentId: String(paymentId) },
          });
        }
      }
      if (!invoice) return { ok: true };

      await Promise.all([
        this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'PAID', paidAt: new Date() },
        }),
        this.prisma.studentBilling.update({
          where: { id: invoice.billingId },
          data: {
            status: 'ACTIVE',
            nextDueDate: this.nextDueDate(invoice.billing.interval as any),
          },
        }),
      ]);
    } catch {
      // ignore MP errors — return 200 to stop retries
    }

    return { ok: true };
  }

  // ── CRON JOBS ────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkOverdueInvoices() {
    const now = new Date();

    const newlyOverdue = await this.prisma.invoice.findMany({
      where: { status: 'PENDING', dueDate: { lt: now } },
      include: {
        billing: {
          include: {
            student: { include: { user: { include: { profile: true } } } },
            trainer: { include: { user: { select: { id: true } } } },
          },
        },
      },
    });

    await this.prisma.invoice.updateMany({
      where: { status: 'PENDING', dueDate: { lt: now } },
      data: { status: 'OVERDUE' },
    });

    for (const invoice of newlyOverdue) {
      const studentName = [
        invoice.billing.student.user.profile?.firstName,
        invoice.billing.student.user.profile?.lastName,
      ].filter(Boolean).join(' ') || invoice.billing.student.user.email;

      // Notify student
      await this.notifications.create({
        userId: invoice.billing.student.userId,
        type: 'PAYMENT',
        title: '⚠️ Fatura vencida',
        body: `Sua mensalidade de ${invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} venceu. Entre em contato com seu personal.`,
      });

      // Notify trainer
      await this.notifications.create({
        userId: invoice.billing.trainer.userId,
        type: 'PAYMENT',
        title: '⚠️ Fatura vencida',
        body: `A mensalidade de ${studentName} (${invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) venceu.`,
      });
    }

    const overdueIds = await this.prisma.invoice.findMany({
      where: { status: 'OVERDUE' },
      select: { billingId: true },
      distinct: ['billingId'],
    });

    for (const { billingId } of overdueIds) {
      await this.prisma.studentBilling.updateMany({
        where: { id: billingId, status: { notIn: ['ACTIVE', 'CANCELLED'] } },
        data: { status: 'SUSPENDED' },
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateNextInvoices() {
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);

    const billings = await this.prisma.studentBilling.findMany({
      where: { status: 'ACTIVE', nextDueDate: { lte: soon } },
      include: { trainer: { include: { user: { include: { profile: true } } } } },
    });

    for (const billing of billings) {
      const existing = await this.prisma.invoice.findFirst({
        where: { billingId: billing.id, status: { in: ['PENDING', 'OVERDUE'] } },
      });
      if (existing) continue;

      const trainerName =
        [billing.trainer.user.profile?.firstName, billing.trainer.user.profile?.lastName]
          .filter(Boolean)
          .join(' ') || 'Personal Trainer';

      const description =
        billing.interval === 'ANNUAL'
          ? `Consultoria anual — ${trainerName}`
          : `Mensalidade — ${trainerName} — ${billing.nextDueDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;

      await this.prisma.invoice.create({
        data: {
          billingId: billing.id,
          amount: billing.amount,
          status: 'PENDING',
          dueDate: billing.nextDueDate,
          description,
        },
      });
    }
  }
}
