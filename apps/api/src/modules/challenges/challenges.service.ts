import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

@Injectable()
export class ChallengesService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private async getStudent(userId: string) {
    const s = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });
    if (!s) throw new NotFoundException('Aluno não encontrado');
    return s;
  }

  private async getTrainer(userId: string) {
    const t = await this.prisma.trainer.findUnique({ where: { userId } });
    if (!t) throw new NotFoundException('Trainer não encontrado');
    return t;
  }

  // ── TRAINER CRUD ──────────────────────────────────────────

  async createChallenge(userId: string, dto: {
    title: string;
    description?: string;
    type: string;
    duration: number;
    targetValue?: number;
    points?: number;
    price?: number;
    coverUrl?: string;
    startDate: string;
    endDate: string;
  }) {
    const trainer = await this.getTrainer(userId);
    return this.prisma.challenge.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        duration: dto.duration,
        targetValue: dto.targetValue,
        points: dto.points ?? 100,
        price: dto.price ?? 0,
        coverUrl: dto.coverUrl,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        trainerId: trainer.id,
        isActive: true,
      },
    });
  }

  async getTrainerChallenges(userId: string) {
    const trainer = await this.getTrainer(userId);
    return this.prisma.challenge.findMany({
      where: { trainerId: trainer.id },
      include: { _count: { select: { participants: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateChallenge(userId: string, challengeId: string, dto: {
    title?: string;
    description?: string;
    type?: string;
    duration?: number;
    targetValue?: number;
    points?: number;
    price?: number;
    coverUrl?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }) {
    const trainer = await this.getTrainer(userId);
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.trainerId !== trainer.id) {
      throw new NotFoundException('Desafio não encontrado');
    }
    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    return this.prisma.challenge.update({ where: { id: challengeId }, data });
  }

  async deleteChallenge(userId: string, challengeId: string) {
    const trainer = await this.getTrainer(userId);
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.trainerId !== trainer.id) {
      throw new NotFoundException('Desafio não encontrado');
    }
    await this.prisma.studentChallenge.deleteMany({ where: { challengeId } });
    await this.prisma.challenge.delete({ where: { id: challengeId } });
    return { ok: true };
  }

  // ── STUDENT — READ ────────────────────────────────────────

  async findAvailable(userId: string) {
    const student = await this.getStudent(userId);
    const joined = await this.prisma.studentChallenge.findMany({
      where: { studentId: student.id },
      select: { challengeId: true },
    });
    const joinedIds = joined.map((j) => j.challengeId);
    return this.prisma.challenge.findMany({
      where: {
        isActive: true,
        id: { notIn: joinedIds },
        endDate: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(userId: string) {
    const student = await this.getStudent(userId);
    return this.prisma.studentChallenge.findMany({
      where: { studentId: student.id, isCompleted: false },
      include: { challenge: true },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async findCompleted(userId: string) {
    const student = await this.getStudent(userId);
    return this.prisma.studentChallenge.findMany({
      where: { studentId: student.id, isCompleted: true },
      include: { challenge: true },
      orderBy: { completedAt: 'desc' },
    });
  }

  // ── STUDENT — JOIN (free only) ────────────────────────────

  async join(userId: string, challengeId: string) {
    const student = await this.getStudent(userId);
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');

    if (challenge.price > 0) {
      throw new BadRequestException('Este desafio é pago. Use o endpoint de compra.');
    }

    const existing = await this.prisma.studentChallenge.findFirst({
      where: { studentId: student.id, challengeId },
    });
    if (existing) throw new ConflictException('Já participando deste desafio');

    return this.prisma.studentChallenge.create({
      data: { studentId: student.id, challengeId, joinedAt: new Date(), isPaid: true },
      include: { challenge: true },
    });
  }

  // ── STUDENT — PURCHASE ────────────────────────────────────

  private async getMpToken(trainerId: string | null): Promise<string> {
    if (trainerId) {
      const pricing = await this.prisma.trainerPricing.findUnique({ where: { trainerId } });
      if ((pricing as any)?.mpAccessToken) return (pricing as any).mpAccessToken;
    }
    const token = this.config.get<string>('MP_ACCESS_TOKEN', '');
    if (!token || token === 'placeholder') {
      throw new BadRequestException('Token do Mercado Pago não configurado.');
    }
    return token;
  }

  async purchasePix(userId: string, challengeId: string) {
    const student = await this.getStudent(userId);
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');
    if (challenge.price <= 0) throw new BadRequestException('Desafio gratuito — use /join');

    const existing = await this.prisma.studentChallenge.findFirst({
      where: { studentId: student.id, challengeId },
    });
    if (existing?.isPaid) throw new ConflictException('Você já comprou este desafio');

    const token = await this.getMpToken(challenge.trainerId);
    const mpClient = new MercadoPagoConfig({ accessToken: token });
    const paymentApi = new Payment(mpClient);

    const studentName = [student.user.profile?.firstName, student.user.profile?.lastName]
      .filter(Boolean).join(' ') || 'Aluno';
    const nameParts = studentName.split(' ');

    const result = await paymentApi.create({
      body: {
        transaction_amount: challenge.price,
        description: `Desafio: ${challenge.title}`,
        payment_method_id: 'pix',
        external_reference: `challenge-${challengeId}-${student.id}`,
        payer: {
          email: student.user.email,
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(' ') || nameParts[0],
        },
      },
    });

    if (!existing) {
      await this.prisma.studentChallenge.create({
        data: {
          studentId: student.id,
          challengeId,
          joinedAt: new Date(),
          isPaid: false,
          paymentId: String(result.id),
        },
      });
    } else {
      await this.prisma.studentChallenge.update({
        where: { id: existing.id },
        data: { paymentId: String(result.id) },
      });
    }

    return {
      paymentId: result.id,
      qrCode: (result.point_of_interaction as any)?.transaction_data?.qr_code,
      qrCodeBase64: (result.point_of_interaction as any)?.transaction_data?.qr_code_base64,
      amount: challenge.price,
    };
  }

  async purchaseCheckout(userId: string, challengeId: string) {
    const student = await this.getStudent(userId);
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');
    if (challenge.price <= 0) throw new BadRequestException('Desafio gratuito — use /join');

    const existing = await this.prisma.studentChallenge.findFirst({
      where: { studentId: student.id, challengeId },
    });
    if (existing?.isPaid) throw new ConflictException('Você já comprou este desafio');

    const token = await this.getMpToken(challenge.trainerId);
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const mpClient = new MercadoPagoConfig({ accessToken: token });
    const prefApi = new Preference(mpClient);

    const result = await prefApi.create({
      body: {
        items: [{
          id: challengeId,
          title: `Desafio: ${challenge.title}`,
          quantity: 1,
          unit_price: challenge.price,
          currency_id: 'BRL',
        }],
        payer: {
          email: student.user.email,
          name: student.user.profile?.firstName ?? 'Aluno',
          surname: student.user.profile?.lastName ?? '',
        },
        external_reference: `challenge-${challengeId}-${student.id}`,
        ...(frontendUrl.includes('localhost') ? {} : {
          back_urls: {
            success: `${frontendUrl}/student/challenges?payment=success`,
            failure: `${frontendUrl}/student/challenges?payment=failure`,
            pending: `${frontendUrl}/student/challenges?payment=pending`,
          },
          auto_return: 'approved',
        }),
      },
    });

    if (!existing) {
      await this.prisma.studentChallenge.create({
        data: { studentId: student.id, challengeId, joinedAt: new Date(), isPaid: false },
      });
    }

    return { checkoutUrl: result.init_point };
  }

  // ── WEBHOOK ───────────────────────────────────────────────

  async handleWebhook(data: any) {
    const paymentId = data?.data?.id ?? data?.id;
    if (!paymentId) return { ok: true };

    const token = this.config.get<string>('MP_ACCESS_TOKEN', '');
    if (!token || token === 'placeholder') return { ok: true };

    try {
      const mpClient = new MercadoPagoConfig({ accessToken: token });
      const paymentApi = new Payment(mpClient);
      const payment = await paymentApi.get({ id: paymentId });

      const ref: string = (payment as any).external_reference ?? '';
      if (!ref.startsWith('challenge-')) return { ok: true };

      if ((payment as any).status !== 'approved') return { ok: true };

      const parts = ref.split('-');
      // format: challenge-{challengeId}-{studentId}
      const challengeId = parts[1];
      const studentId = parts[2];

      await this.prisma.studentChallenge.updateMany({
        where: { challengeId, studentId },
        data: { isPaid: true, paymentId: String(paymentId) },
      });
    } catch {
      // Ignore payment fetch errors (may be for billing payments, not challenges)
    }

    return { ok: true };
  }

  // ── TRAINER — LESSON CRUD ─────────────────────────────────

  async createLesson(userId: string, challengeId: string, dto: {
    title: string; description?: string; order?: number; type?: string;
    contentUrl?: string; thumbnailUrl?: string; duration?: number; isFree?: boolean;
  }) {
    const trainer = await this.getTrainer(userId);
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.trainerId !== trainer.id) throw new NotFoundException('Desafio não encontrado');

    const count = await this.prisma.challengeLesson.count({ where: { challengeId } });
    return this.prisma.challengeLesson.create({
      data: {
        challengeId,
        title: dto.title,
        description: dto.description,
        order: dto.order ?? count,
        type: dto.type ?? 'video',
        contentUrl: dto.contentUrl,
        thumbnailUrl: dto.thumbnailUrl,
        duration: dto.duration,
        isFree: dto.isFree ?? false,
      },
      include: { attachments: true },
    });
  }

  async getLessons(challengeId: string) {
    return this.prisma.challengeLesson.findMany({
      where: { challengeId },
      include: { attachments: true, _count: { select: { progress: true } } },
      orderBy: { order: 'asc' },
    });
  }

  async updateLesson(userId: string, lessonId: string, dto: any) {
    const trainer = await this.getTrainer(userId);
    const lesson = await this.prisma.challengeLesson.findUnique({
      where: { id: lessonId },
      include: { challenge: true },
    });
    if (!lesson || lesson.challenge.trainerId !== trainer.id) throw new NotFoundException('Aula não encontrada');
    return this.prisma.challengeLesson.update({ where: { id: lessonId }, data: dto, include: { attachments: true } });
  }

  async deleteLesson(userId: string, lessonId: string) {
    const trainer = await this.getTrainer(userId);
    const lesson = await this.prisma.challengeLesson.findUnique({
      where: { id: lessonId },
      include: { challenge: true },
    });
    if (!lesson || lesson.challenge.trainerId !== trainer.id) throw new NotFoundException('Aula não encontrada');
    await this.prisma.challengeLesson.delete({ where: { id: lessonId } });
    return { ok: true };
  }

  async reorderLessons(userId: string, challengeId: string, orders: { id: string; order: number }[]) {
    const trainer = await this.getTrainer(userId);
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.trainerId !== trainer.id) throw new NotFoundException('Desafio não encontrado');
    await Promise.all(orders.map(({ id, order }) =>
      this.prisma.challengeLesson.update({ where: { id }, data: { order } })
    ));
    return this.getLessons(challengeId);
  }

  async addAttachment(userId: string, lessonId: string, dto: { name: string; url: string; type: string; size?: number }) {
    const trainer = await this.getTrainer(userId);
    const lesson = await this.prisma.challengeLesson.findUnique({
      where: { id: lessonId }, include: { challenge: true },
    });
    if (!lesson || lesson.challenge.trainerId !== trainer.id) throw new NotFoundException('Aula não encontrada');
    return this.prisma.lessonAttachment.create({ data: { lessonId, ...dto } });
  }

  async deleteAttachment(userId: string, attachmentId: string) {
    const trainer = await this.getTrainer(userId);
    const att = await this.prisma.lessonAttachment.findUnique({
      where: { id: attachmentId },
      include: { lesson: { include: { challenge: true } } },
    });
    if (!att || att.lesson.challenge.trainerId !== trainer.id) throw new NotFoundException('Anexo não encontrado');
    await this.prisma.lessonAttachment.delete({ where: { id: attachmentId } });
    return { ok: true };
  }

  // ── STUDENT — CONTENT ACCESS + PROGRESS ──────────────────

  async getChallengeContent(userId: string, challengeId: string) {
    const student = await this.getStudent(userId);
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        lessons: {
          include: { attachments: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');

    // Check access: either free lesson preview OR student has paid
    const sc = await this.prisma.studentChallenge.findFirst({
      where: { studentId: student.id, challengeId },
    });
    const hasPaidAccess = sc?.isPaid === true;

    // Get student's lesson progress
    const progressList = await this.prisma.lessonProgress.findMany({
      where: { studentId: student.id, lesson: { challengeId } },
    });
    const progressMap = Object.fromEntries(progressList.map((p) => [p.lessonId, p]));

    const lessons = challenge.lessons.map((lesson) => ({
      ...lesson,
      // Hide contentUrl if not paid and not free
      contentUrl: (hasPaidAccess || lesson.isFree) ? lesson.contentUrl : null,
      attachments: hasPaidAccess ? lesson.attachments : [],
      myProgress: progressMap[lesson.id] ?? null,
      isLocked: !hasPaidAccess && !lesson.isFree,
    }));

    const totalLessons = lessons.length;
    const completedLessons = Object.values(progressMap).filter((p) => p.isCompleted).length;
    const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    return {
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        coverUrl: (challenge as any).coverUrl,
        type: challenge.type,
        price: (challenge as any).price,
      },
      hasPaidAccess,
      lessons,
      totalLessons,
      completedLessons,
      overallProgress,
    };
  }

  async updateLessonProgress(userId: string, lessonId: string, progress: number) {
    const student = await this.getStudent(userId);
    const lesson = await this.prisma.challengeLesson.findUnique({
      where: { id: lessonId },
      include: { challenge: true },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada');

    // Verify access
    const sc = await this.prisma.studentChallenge.findFirst({
      where: { studentId: student.id, challengeId: lesson.challengeId },
    });
    if (!sc?.isPaid && !lesson.isFree) throw new ForbiddenException('Acesso não autorizado');

    const isCompleted = progress >= 90; // 90% = completed
    const existing = await this.prisma.lessonProgress.findUnique({
      where: { studentId_lessonId: { studentId: student.id, lessonId } },
    });

    const updated = await this.prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: student.id, lessonId } },
      create: {
        studentId: student.id,
        lessonId,
        progress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
      update: {
        progress: Math.max(progress, existing?.progress ?? 0), // never go backwards
        isCompleted: existing?.isCompleted || isCompleted,
        completedAt: (existing?.isCompleted || isCompleted) ? (existing?.completedAt ?? new Date()) : null,
      },
    });

    // Update overall challenge progress
    const challengeId = lesson.challengeId;
    const totalLessons = await this.prisma.challengeLesson.count({ where: { challengeId } });
    const completedLessons = await this.prisma.lessonProgress.count({
      where: { studentId: student.id, lesson: { challengeId }, isCompleted: true },
    });
    const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    await this.prisma.studentChallenge.updateMany({
      where: { studentId: student.id, challengeId },
      data: { progress: overallProgress, isCompleted: overallProgress >= 100, completedAt: overallProgress >= 100 ? new Date() : null },
    });

    return updated;
  }

  // ── PROGRESS ─────────────────────────────────────────────

  async updateProgress(userId: string, challengeId: string, progress: number) {
    const student = await this.getStudent(userId);
    const sc = await this.prisma.studentChallenge.findFirst({
      where: { studentId: student.id, challengeId },
      include: { challenge: true },
    });
    if (!sc) throw new NotFoundException('Participação não encontrada');
    if (!sc.isPaid) throw new ForbiddenException('Acesso ao desafio não confirmado');

    const isCompleted = progress >= (sc.challenge.targetValue ?? 100);
    const updated = await this.prisma.studentChallenge.update({
      where: { id: sc.id },
      data: {
        progress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });
    if (isCompleted && !sc.isCompleted) {
      await this.prisma.student.update({
        where: { id: student.id },
        data: { points: { increment: sc.challenge.points ?? 100 } },
      });
    }
    return updated;
  }
}
