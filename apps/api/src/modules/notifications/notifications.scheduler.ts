import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsScheduler {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
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
      await this.notifications.create({
        userId: plan.student.userId,
        type: 'WORKOUT_REMINDER',
        title: '💪 Hora de treinar!',
        body: `Você tem treino hoje: ${plan.workout.name}. Bora lá!`,
      });
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
