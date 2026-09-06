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

/**
 * Espelha o BillingService (personal ↔ aluno) para o par
 * nutricionista ↔ paciente. Tabelas separadas de propósito
 * (NutritionistPricing/PatientBilling/PatientInvoice) — mesmo padrão
 * já usado no restante do schema (Workout/Diet, TrainerStudent/
 * NutritionistPatient). Qualquer correção de bug feita aqui também
 * merece ser conferida no BillingService irmão, e vice-versa.
 */
@Injectable()
export class NutritionistBillingService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {}

  private mpClient() {
    const token = this.config.get<string>('MP_ACCESS_TOKEN', '');
    return new MercadoPagoConfig({ accessToken: token });
  }

  private async getNutritionist(userId: string) {
    const nutritionist = await this.prisma.nutritionist.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });
    if (!nutritionist) throw new NotFoundException('Nutricionista não encontrado');
    return nutritionist;
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

  // ── NUTRICIONISTA ────────────────────────────────────────

  async getPricing(userId: string) {
    return this.getPricingPublic(userId);
  }

  async setPricing(
    userId: string,
    monthlyPrice?: number,
    annualPrice?: number,
    mpAccessToken?: string,
  ) {
    const nutritionist = await this.getNutritionist(userId);
    const data: any = {
      monthlyPrice: monthlyPrice ?? null,
      annualPrice: annualPrice ?? null,
    };
    if (mpAccessToken !== undefined) {
      data.mpAccessToken = mpAccessToken || null;
    }
    return this.prisma.nutritionistPricing.upsert({
      where: { nutritionistId: nutritionist.id },
      update: data,
      create: { nutritionistId: nutritionist.id, ...data },
    });
  }

  async getPricingPublic(userId: string) {
    const nutritionist = await this.getNutritionist(userId);
    const pricing = await this.prisma.nutritionistPricing.findUnique({
      where: { nutritionistId: nutritionist.id },
    });
    if (!pricing) return { nutritionistId: nutritionist.id, monthlyPrice: null, annualPrice: null, hasMpToken: false };
    const { mpAccessToken, ...rest } = pricing as any;
    return { ...rest, hasMpToken: !!mpAccessToken };
  }

  async createSubscription(
    userId: string,
    studentUserId: string,
    interval: 'MONTHLY' | 'ANNUAL',
    customDueDate?: Date,
  ) {
    const nutritionist = await this.getNutritionist(userId);
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
      include: { user: { include: { profile: true } } },
    });
    if (!student) throw new NotFoundException('Paciente não encontrado');

    const pricing = await this.prisma.nutritionistPricing.findUnique({
      where: { nutritionistId: nutritionist.id },
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

    const billing = await this.prisma.patientBilling.upsert({
      where: { studentId_nutritionistId: { studentId: student.id, nutritionistId: nutritionist.id } },
      update: { interval: interval as any, amount, status: 'PENDING', nextDueDate: dueDate },
      create: {
        studentId: student.id,
        nutritionistId: nutritionist.id,
        interval: interval as any,
        amount,
        status: 'PENDING',
        startDate: now,
        nextDueDate: dueDate,
      },
    });

    const nutritionistName = [
      nutritionist.user.profile?.firstName,
      nutritionist.user.profile?.lastName,
    ]
      .filter(Boolean)
      .join(' ') || 'Nutricionista';

    const description =
      interval === 'ANNUAL'
        ? `Acompanhamento nutricional anual — ${nutritionistName}`
        : `Mensalidade — ${nutritionistName} — ${now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;

    await this.prisma.patientInvoice.deleteMany({
      where: { billingId: billing.id, status: 'PENDING' },
    });

    const invoice = await this.prisma.patientInvoice.create({
      data: { billingId: billing.id, amount, status: 'PENDING', dueDate, description },
    });

    const dueDateStr = dueDate.toLocaleDateString('pt-BR');
    await this.notifications.create({
      userId: student.userId,
      type: 'PAYMENT',
      title: '💳 Nova cobrança emitida',
      body: `${description}. Valor: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Vencimento: ${dueDateStr}.`,
    });

    return { billing, invoice };
  }

  async getNutritionistBillings(userId: string) {
    const nutritionist = await this.getNutritionist(userId);
    const billings = await this.prisma.patientBilling.findMany({
      where: { nutritionistId: nutritionist.id },
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
      accessReleasedAt: b.accessReleasedAt,
      accessReleaseNote: b.accessReleaseNote,
      latestInvoice: b.invoices[0] ?? null,
      invoices: b.invoices,
    }));
  }

  async markInvoicePaid(userId: string, invoiceId: string) {
    const nutritionist = await this.getNutritionist(userId);
    const invoice = await this.prisma.patientInvoice.findUnique({
      where: { id: invoiceId },
      include: { billing: true },
    });
    if (!invoice || invoice.billing.nutritionistId !== nutritionist.id) {
      throw new NotFoundException('Fatura não encontrada');
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Fatura já está paga');
    }
    const [updated] = await Promise.all([
      this.prisma.patientInvoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidAt: new Date() },
      }),
      this.prisma.patientBilling.update({
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
    const nutritionist = await this.getNutritionist(userId);
    const invoice = await this.prisma.patientInvoice.findUnique({
      where: { id: invoiceId },
      include: { billing: true },
    });
    if (!invoice || invoice.billing.nutritionistId !== nutritionist.id) {
      throw new NotFoundException('Fatura não encontrada');
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Fatura já paga não pode ser editada');
    }
    const data: any = {};
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.description !== undefined) data.description = dto.description;
    return this.prisma.patientInvoice.update({ where: { id: invoiceId }, data });
  }

  async deleteInvoice(userId: string, invoiceId: string) {
    const nutritionist = await this.getNutritionist(userId);
    const invoice = await this.prisma.patientInvoice.findUnique({
      where: { id: invoiceId },
      include: { billing: true },
    });
    if (!invoice || invoice.billing.nutritionistId !== nutritionist.id) {
      throw new NotFoundException('Fatura não encontrada');
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Fatura já paga não pode ser excluída');
    }
    await this.prisma.patientInvoice.delete({ where: { id: invoiceId } });
    return { ok: true };
  }

  async cancelBilling(userId: string, billingId: string) {
    const nutritionist = await this.getNutritionist(userId);
    const billing = await this.prisma.patientBilling.findUnique({
      where: { id: billingId },
    });
    if (!billing || billing.nutritionistId !== nutritionist.id) {
      throw new NotFoundException('Cobrança não encontrada');
    }
    await this.prisma.patientInvoice.deleteMany({
      where: { billingId, status: { in: ['PENDING', 'OVERDUE'] } },
    });
    await this.prisma.patientBilling.update({
      where: { id: billingId },
      data: { status: 'CANCELLED' },
    });
    return { ok: true };
  }

  /**
   * Liberação "na confiança": o nutricionista libera (ou revoga) o acesso do
   * paciente SEM alterar o financeiro — faturas pendentes/vencidas permanecem
   * em aberto e o billing não muda de status. O paciente deixa de ser
   * bloqueado pelo acesso.
   */
  async togglePatientAccess(
    userId: string,
    billingId: string,
    dto: { released?: boolean; note?: string } = {},
  ) {
    const nutritionist = await this.getNutritionist(userId);
    const billing = await this.prisma.patientBilling.findUnique({
      where: { id: billingId },
      include: {
        student: { include: { user: { include: { profile: true } } } },
      },
    });
    if (!billing || billing.nutritionistId !== nutritionist.id) {
      throw new NotFoundException('Cobrança não encontrada');
    }

    const released = dto.released !== false;
    const updated = await this.prisma.patientBilling.update({
      where: { id: billingId },
      data: released
        ? {
            accessReleasedAt: new Date(),
            accessReleaseNote: dto.note?.trim() || null,
          }
        : { accessReleasedAt: null, accessReleaseNote: null },
    });

    if (released) {
      await this.notifications.create({
        userId: billing.student.userId,
        type: 'PAYMENT',
        title: '🔓 Acesso liberado',
        body: dto.note?.trim()
          ? `Sua nutricionista liberou seu acesso: ${dto.note.trim()}`
          : `Sua nutricionista ${nutritionist.user?.profile?.firstName || ''} liberou seu acesso.`,
      });
    }

    return {
      ok: true,
      released,
      releasedAt: updated.accessReleasedAt,
      note: updated.accessReleaseNote,
      studentName:
        [billing.student.user.profile?.firstName, billing.student.user.profile?.lastName]
          .filter(Boolean)
          .join(' ') || billing.student.user.email,
    };
  }

  // ── ALUNO ────────────────────────────────────────────────

  async getStudentBilling(userId: string) {
    const student = await this.getStudent(userId);
    const billings = await this.prisma.patientBilling.findMany({
      where: { studentId: student.id },
      include: {
        nutritionist: { include: { user: { include: { profile: true } } } },
        invoices: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
    });
    return billings.map((b) => ({
      id: b.id,
      nutritionistId: b.nutritionistId,
      nutritionistName:
        [b.nutritionist.user.profile?.firstName, b.nutritionist.user.profile?.lastName]
          .filter(Boolean)
          .join(' ') || 'Nutricionista',
      interval: b.interval,
      amount: b.amount,
      status: b.status,
      nextDueDate: b.nextDueDate,
      pendingInvoice: b.invoices[0] ?? null,
      accessReleasedAt: b.accessReleasedAt,
      accessReleaseNote: b.accessReleaseNote,
      blocked:
        (b.status === 'OVERDUE' || b.status === 'SUSPENDED') &&
        !b.accessReleasedAt,
    }));
  }

  async generateCheckoutPro(userId: string, invoiceId: string) {
    const student = await this.getStudent(userId);
    const invoice = await this.prisma.patientInvoice.findUnique({
      where: { id: invoiceId },
      include: { billing: true },
    });
    if (!invoice || invoice.billing.studentId !== student.id) {
      throw new NotFoundException('Fatura não encontrada');
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Esta fatura já foi paga');
    }

    const nutritionistPricing = await this.prisma.nutritionistPricing.findUnique({
      where: { nutritionistId: invoice.billing.nutritionistId },
    });
    const token =
      (nutritionistPricing as any)?.mpAccessToken ||
      this.config.get<string>('MP_ACCESS_TOKEN', '');

    if (!token || token === 'placeholder') {
      throw new BadRequestException(
        'Token do Mercado Pago não configurado. O nutricionista deve configurar o token MP em Cobranças → Configurar Preços.',
      );
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const mpConfigured = new MercadoPagoConfig({ accessToken: token });
    const prefApi = new Preference(mpConfigured);

    let result: any;
    try {
      result = await prefApi.create({
        body: {
          items: [
            {
              id: invoice.id,
              title: invoice.description ?? 'Acompanhamento Nutricional',
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
    } catch (err: any) {
      const mpMessage = err?.message || err?.error?.message || JSON.stringify(err);
      if (mpMessage.includes('Unauthorized') || mpMessage.includes('unauthorized')) {
        throw new BadRequestException(
          'Token do Mercado Pago inválido ou sem permissão. Verifique se o token é de produção e tem as permissões necessárias.',
        );
      }
      throw new BadRequestException(
        `Erro ao criar checkout no Mercado Pago: ${mpMessage.slice(0, 200)}`,
      );
    }

    return {
      checkoutUrl: result.init_point,
      sandboxUrl: result.sandbox_init_point,
    };
  }

  async generatePixPayment(userId: string, invoiceId: string) {
    const student = await this.getStudent(userId);
    const invoice = await this.prisma.patientInvoice.findUnique({
      where: { id: invoiceId },
      include: { billing: true },
    });
    if (!invoice || invoice.billing.studentId !== student.id) {
      throw new NotFoundException('Fatura não encontrada');
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Esta fatura já foi paga');
    }

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

    const nutritionistPricing = await this.prisma.nutritionistPricing.findUnique({
      where: { nutritionistId: invoice.billing.nutritionistId },
    });
    const token =
      (nutritionistPricing as any)?.mpAccessToken ||
      this.config.get<string>('MP_ACCESS_TOKEN', '');

    if (!token || token === 'placeholder') {
      throw new BadRequestException(
        'Token do Mercado Pago não configurado. O nutricionista deve configurar o token MP em Cobranças → Configurar Preços.',
      );
    }

    const mpConfigured = new MercadoPagoConfig({ accessToken: token });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const paymentApi = new Payment(mpConfigured);

    let result: any;
    try {
      result = await paymentApi.create({
        body: {
          transaction_amount: invoice.amount,
          description: invoice.description ?? 'Acompanhamento Nutricional',
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
    } catch (err: any) {
      const mpMessage = err?.message || err?.error?.message || JSON.stringify(err);
      if (mpMessage.includes('Unauthorized') || mpMessage.includes('unauthorized')) {
        throw new BadRequestException(
          'Token do Mercado Pago inválido ou sem permissão para pagamentos PIX. Verifique se o token é de produção e tem as permissões necessárias.',
        );
      }
      throw new BadRequestException(
        `Erro ao gerar PIX no Mercado Pago: ${mpMessage.slice(0, 200)}`,
      );
    }

    const qrCode = (result as any).point_of_interaction?.transaction_data?.qr_code ?? '';
    const qrBase64 = (result as any).point_of_interaction?.transaction_data?.qr_code_base64 ?? '';

    await this.prisma.patientInvoice.update({
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

      let invoice = await this.prisma.patientInvoice.findFirst({
        where: { mpPaymentId: String(paymentId) },
        include: { billing: true },
      });
      if (!invoice && (payment as any).external_reference) {
        invoice = await this.prisma.patientInvoice.findFirst({
          where: { id: (payment as any).external_reference },
          include: { billing: true },
        });
        if (invoice) {
          await this.prisma.patientInvoice.update({
            where: { id: invoice.id },
            data: { mpPaymentId: String(paymentId) },
          });
        }
      }
      if (!invoice) return { ok: true };

      await Promise.all([
        this.prisma.patientInvoice.update({
          where: { id: invoice.id },
          data: { status: 'PAID', paidAt: new Date() },
        }),
        this.prisma.patientBilling.update({
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

    const newlyOverdue = await this.prisma.patientInvoice.findMany({
      where: { status: 'PENDING', dueDate: { lt: now } },
      include: {
        billing: {
          include: {
            student: { include: { user: { include: { profile: true } } } },
            nutritionist: { include: { user: { select: { id: true } } } },
          },
        },
      },
    });

    await this.prisma.patientInvoice.updateMany({
      where: { status: 'PENDING', dueDate: { lt: now } },
      data: { status: 'OVERDUE' },
    });

    for (const invoice of newlyOverdue) {
      const studentName = [
        invoice.billing.student.user.profile?.firstName,
        invoice.billing.student.user.profile?.lastName,
      ].filter(Boolean).join(' ') || invoice.billing.student.user.email;

      await this.notifications.create({
        userId: invoice.billing.student.userId,
        type: 'PAYMENT',
        title: '⚠️ Fatura vencida',
        body: `Sua mensalidade de ${invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} venceu. Entre em contato com sua nutricionista.`,
      });

      await this.notifications.create({
        userId: invoice.billing.nutritionist.userId,
        type: 'PAYMENT',
        title: '⚠️ Fatura vencida',
        body: `A mensalidade de ${studentName} (${invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) venceu.`,
      });
    }

    const overdueIds = await this.prisma.patientInvoice.findMany({
      where: { status: 'OVERDUE' },
      select: { billingId: true },
      distinct: ['billingId'],
    });

    for (const { billingId } of overdueIds) {
      await this.prisma.patientBilling.updateMany({
        where: { id: billingId, status: { notIn: ['ACTIVE', 'CANCELLED'] } },
        data: { status: 'SUSPENDED' },
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateNextInvoices() {
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);

    const billings = await this.prisma.patientBilling.findMany({
      where: { status: 'ACTIVE', nextDueDate: { lte: soon } },
      include: { nutritionist: { include: { user: { include: { profile: true } } } } },
    });

    for (const billing of billings) {
      const existing = await this.prisma.patientInvoice.findFirst({
        where: { billingId: billing.id, status: { in: ['PENDING', 'OVERDUE'] } },
      });
      if (existing) continue;

      const nutritionistName =
        [billing.nutritionist.user.profile?.firstName, billing.nutritionist.user.profile?.lastName]
          .filter(Boolean)
          .join(' ') || 'Nutricionista';

      const description =
        billing.interval === 'ANNUAL'
          ? `Acompanhamento nutricional anual — ${nutritionistName}`
          : `Mensalidade — ${nutritionistName} — ${billing.nextDueDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;

      await this.prisma.patientInvoice.create({
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
