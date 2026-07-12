import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { EmailService } from '../email/email.service';
import { PushService } from '../push/push.service';

@Injectable()
export class NotificationsScheduler {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private emailService: EmailService,
    private pushService: PushService,
  ) {}

  // Lembrete de treino — 7h todo dia
  @Cron('0 7 * * *')
  async workoutReminder() {
    const dayOfWeek = new Date().getDay();
    const plans = await this.prisma.workoutPlan.findMany({
      where: {
        isActive: true,
        dayOfWeek: { has: dayOfWeek },
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      include: {
        student: { include: { user: true } },
        workout: true,
      },
      distinct: ['studentId'],
    });

    for (const plan of plans) {
      const title = '💪 Hora de treinar!';
      const body = `Você tem treino hoje: ${plan.workout.name}. Bora lá!`;

      await this.notifications.create({
        userId: plan.student.userId, type: 'WORKOUT_REMINDER', title, body,
      });

      // Enviar push notification nativa (aparece na barra do Android)
      this.pushService.sendToUser(plan.student.userId, title, body, {
        url: '/student/workout',
        tag: 'workout-reminder',
      }).catch(() => {});
    }
  }

  // Lembrete de hidratação — 8h, 12h, 16h e 19h
  @Cron('0 8,12,16,19 * * *')
  async hydrationReminder() {
    const messages = [
      'Lembre de beber água! Manter-se hidratado melhora sua performance. 💧',
      'Hora de tomar água! Você já bebeu pelo menos 1 litro hoje? 💧',
      'Hidratação é fundamental! Que tal um copo de água agora? 💧',
      'Já bebeu água hoje? Seu corpo agradece! 💧',
    ];
    const body = messages[new Date().getHours() === 8 ? 0 : new Date().getHours() === 12 ? 1 : new Date().getHours() === 16 ? 2 : 3];

    const students = await this.prisma.student.findMany({
      include: { user: { select: { id: true, isActive: true } } },
    });

    for (const student of students) {
      if (!student.user.isActive) continue;
      await this.notifications.create({
        userId: student.userId,
        type: 'WATER_REMINDER',
        title: '💧 Beba água!',
        body,
      });
    }
  }

  // Aviso de vencimento de fatura — 9h todo dia
  @Cron('0 9 * * *')
  async invoiceDueReminder() {
    const now = new Date();

    // Faturas que vencem daqui a 3 dias
    const in3Start = new Date(now);
    in3Start.setDate(in3Start.getDate() + 3);
    in3Start.setHours(0, 0, 0, 0);
    const in3End = new Date(in3Start);
    in3End.setHours(23, 59, 59, 999);

    // Faturas que vencem hoje
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: 'PENDING',
        dueDate: { gte: todayStart, lte: in3End },
      },
      include: {
        billing: {
          include: {
            student: { include: { user: true } },
            trainer: { include: { user: { include: { profile: true } } } },
          },
        },
      },
    });

    for (const invoice of invoices) {
      const trainerName =
        [invoice.billing.trainer.user.profile?.firstName, invoice.billing.trainer.user.profile?.lastName]
          .filter(Boolean).join(' ') || 'Personal Trainer';
      const dueStr = new Date(invoice.billing.nextDueDate ?? invoice.dueDate).toLocaleDateString('pt-BR');
      const duesToday = new Date(invoice.dueDate) <= todayEnd;

      await this.notifications.create({
        userId: invoice.billing.student.userId,
        type: 'PAYMENT',
        title: duesToday ? '⚠️ Fatura vence hoje!' : '📅 Fatura vence em 3 dias',
        body: `Sua mensalidade de R$ ${Number(invoice.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com ${trainerName} vence ${duesToday ? 'hoje' : 'em 3 dias'} (${dueStr}).`,
      });
    }
  }

  // Alunos inativos há 3 dias — todo dia às 8h (alerta preventivo)
  @Cron('0 8 * * *')
  async inactivityWarning3Days() {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);

    const relations = await this.prisma.trainerStudent.findMany({
      where: { isActive: true },
      include: {
        trainer: { include: { user: { select: { id: true } } } },
        student: {
          include: {
            user: { include: { profile: true } },
            workoutLogs: { orderBy: { completedAt: 'desc' }, take: 1, select: { completedAt: true } },
          },
        },
      },
    });

    for (const rel of relations) {
      const lastLog = rel.student.workoutLogs[0];
      // Só notifica se o último treino foi há 3-6 dias (para não duplicar com o de 7)
      if (!lastLog) continue;
      const daysSinceLast = Math.floor((Date.now() - new Date(lastLog.completedAt).getTime()) / 86400000);
      if (daysSinceLast < 3 || daysSinceLast > 6) continue;

      const studentName = [rel.student.user.profile?.firstName, rel.student.user.profile?.lastName]
        .filter(Boolean).join(' ') || 'Aluno(a)';
      const lastStr = new Date(lastLog.completedAt).toLocaleDateString('pt-BR');

      await this.notifications.create({
        userId: rel.trainer.userId,
        type: 'SYSTEM',
        title: `💛 ${studentName} há 3 dias sem treinar`,
        body: `${studentName} não treina desde ${lastStr}. Um incentivo agora pode fazer a diferença!`,
      });
    }
  }

  // Alunos inativos há 7 dias — todo dia às 8h
  @Cron('0 8 * * *')
  async inactiveStudentAlert() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const relations = await this.prisma.trainerStudent.findMany({
      where: { isActive: true },
      include: {
        trainer: { include: { user: { select: { id: true } } } },
        student: {
          include: {
            user: { include: { profile: true } },
            workoutLogs: { orderBy: { completedAt: 'desc' }, take: 1, select: { completedAt: true } },
          },
        },
      },
    });

    for (const rel of relations) {
      const lastLog = rel.student.workoutLogs[0];
      if (lastLog && new Date(lastLog.completedAt) >= sevenDaysAgo) continue;

      const studentName = [rel.student.user.profile?.firstName, rel.student.user.profile?.lastName]
        .filter(Boolean).join(' ') || 'Aluno(a)';
      const lastStr = lastLog
        ? new Date(lastLog.completedAt).toLocaleDateString('pt-BR')
        : 'nunca';

      await this.notifications.create({
        userId: rel.trainer.userId,
        type: 'SYSTEM',
        title: `🔴 ${studentName} está inativo(a) há 7+ dias`,
        body: `${studentName} não treina há mais de 7 dias. Último treino: ${lastStr}. Considere entrar em contato!`,
      });

      // Também notificar o aluno como incentivo
      await this.notifications.create({
        userId: rel.student.userId,
        type: 'WORKOUT_REMINDER',
        title: '💪 Sentimos sua falta!',
        body: 'Já faz uma semana desde seu último treino. Que tal voltar hoje? Seu corpo agradece!',
      });
    }
  }

  // Parabéns aniversariante — 6h todo dia
  @Cron('0 6 * * *')
  async birthdayGreeting() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const profiles = await this.prisma.profile.findMany({
      where: { birthDate: { not: null } },
      include: { user: { select: { id: true, isActive: true } } },
    });

    const birthdayProfiles = profiles.filter((p) => {
      if (!p.birthDate || !p.user.isActive) return false;
      const bd = new Date(p.birthDate);
      return bd.getMonth() + 1 === month && bd.getDate() === day;
    });

    for (const p of birthdayProfiles) {
      const name = p.firstName || 'você';
      await this.notifications.create({
        userId: p.userId,
        type: 'BIRTHDAY',
        title: `🎂 Feliz aniversário, ${name}!`,
        body: 'Toda a equipe deseja um dia incrível para você! Que seus objetivos sejam alcançados! 🎉',
      });
    }

    // Notificar trainers sobre aniversariantes do dia
    if (birthdayProfiles.length === 0) return;
    const trainerStudentRelations = await this.prisma.trainerStudent.findMany({
      where: {
        isActive: true,
        student: {
          user: {
            id: { in: birthdayProfiles.map((p) => p.userId) },
          },
        },
      },
      include: {
        trainer: { include: { user: { select: { id: true } } } },
        student: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
      },
    });

    for (const rel of trainerStudentRelations) {
      const studentName = [rel.student.user.profile?.firstName, rel.student.user.profile?.lastName]
        .filter(Boolean).join(' ') || 'seu aluno';
      await this.notifications.create({
        userId: rel.trainer.userId,
        type: 'BIRTHDAY',
        title: `🎂 Aniversário de ${studentName}`,
        body: `Hoje é aniversário de ${studentName}! Que tal enviar uma mensagem de parabéns?`,
      });
    }
  }
}
