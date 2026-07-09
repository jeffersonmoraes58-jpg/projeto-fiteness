import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscriptions/subscription.service';

@Injectable()
export class TrainersService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * Converte uma data para string YYYY-MM-DD no fuso America/Sao_Paulo (GMT-3).
   * Evita desalinhamento de 1 dia entre backend (UTC) e frontend (horário local).
   */
  private toBRDate(date: Date | string): string {
    const d = new Date(date);
    const br = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const y = br.getFullYear();
    const m = String(br.getMonth() + 1).padStart(2, '0');
    const day = String(br.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private async getTrainer(userId: string) {
    const trainer = await this.prisma.trainer.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });
    if (!trainer) throw new NotFoundException('Trainer não encontrado');
    return trainer;
  }

  async getDashboard(userId: string) {
    const trainer = await this.getTrainer(userId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const [students, workouts, recentLogs, upcomingAppointments, todayLogs, weekLogs, fees] =
      await Promise.all([
        this.prisma.trainerStudent.count({ where: { trainerId: trainer.id, isActive: true } }),
        this.prisma.workout.count({ where: { trainerId: trainer.id, NOT: { tags: { has: '__personalized' } } } }),
        this.prisma.workoutLog.findMany({
          where: { workoutPlan: { workout: { trainerId: trainer.id } } },
          orderBy: { completedAt: 'desc' },
          take: 10,
          include: { student: { include: { user: { include: { profile: true } } } } },
        }),
        this.prisma.appointment.findMany({
          where: { trainerId: trainer.id, scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: 'asc' },
          take: 5,
        }),
        this.prisma.workoutLog.count({
          where: { workoutPlan: { workout: { trainerId: trainer.id } }, completedAt: { gte: todayStart } },
        }),
        this.prisma.workoutLog.findMany({
          where: { workoutPlan: { workout: { trainerId: trainer.id } }, completedAt: { gte: sevenDaysAgo } },
          select: { completedAt: true },
        }),
        this.prisma.trainerStudent.findMany({
          where: { trainerId: trainer.id, isActive: true },
          select: { monthlyFee: true },
        }),
      ]);

    const revenue = fees.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

    const dailyMap: Record<string, number> = {};
    weekLogs.forEach((l) => {
      const key = this.toBRDate(l.completedAt);
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    });
    const weeklyCheckins: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      weeklyCheckins.push(dailyMap[this.toBRDate(d)] || 0);
    }

    return {
      totalStudents: students,
      totalWorkouts: workouts,
      todayAppointments: upcomingAppointments.length,
      recentActivity: recentLogs,
      trainer,
      checkins: todayLogs,
      revenue,
      weeklyCheckins,
      upcomingAppointments,
    };
  }

  async getStudents(userId: string, search?: string) {
    const trainer = await this.getTrainer(userId);
    const relations = await this.prisma.trainerStudent.findMany({
      where: { trainerId: trainer.id, isActive: true },
      include: {
        student: {
          include: {
            user: { include: { profile: true } },
            anamnesis: true,
            workoutLogs: { orderBy: { completedAt: 'desc' }, take: 1, select: { completedAt: true } },
            workoutPlans: { where: { isActive: true }, select: { id: true } },
          },
        },
      },
    });
    const results = relations.map((r) => ({
      id: r.student.id,
      userId: r.student.userId,
      isActive: r.isActive,
      streak: r.student.streak ?? 0,
      level: r.student.level ?? 1,
      points: r.student.points ?? 0,
      goalType: r.student.anamnesis?.mainGoal ?? null,
      anamnesis: r.student.anamnesis,
      lastCheckinAt: r.student.workoutLogs[0]?.completedAt ?? null,
      _count: { workoutPlans: r.student.workoutPlans?.length || 0 },
      monthlyFee: r.monthlyFee,
      createdAt: r.startedAt?.toISOString() || r.student.createdAt?.toISOString() || new Date().toISOString(),
      user: {
        id: r.student.user.id,
        email: r.student.user?.email || '',
        profile: {
          firstName: r.student.user?.profile?.firstName ?? '',
          lastName: r.student.user?.profile?.lastName ?? '',
          phone: r.student.user?.profile?.phone ?? null,
          avatarUrl: r.student.user?.profile?.avatarUrl ?? null,
        },
      },
    }));
    if (!search) return results;
    const q = search.toLowerCase();
    return results.filter((s) => {
      const name = `${s.user?.profile?.firstName ?? ''} ${s.user?.profile?.lastName ?? ''} ${s.user?.email ?? ''}`.toLowerCase();
      return name.includes(q);
    });
  }

  async removeStudent(userId: string, studentId: string) {
    const trainer = await this.getTrainer(userId);
    await this.prisma.trainerStudent.updateMany({
      where: { trainerId: trainer.id, studentId },
      data: { isActive: false },
    });
    return { message: 'Aluno removido' };
  }

  async addStudent(userId: string, studentUserId: string, monthlyFee?: number) {
    const trainer = await this.getTrainer(userId);
    const student = await this.prisma.student.findUnique({ where: { userId: studentUserId } });
    if (!student) throw new NotFoundException('Aluno não encontrado');

    const existing = await this.prisma.trainerStudent.findUnique({
      where: { trainerId_studentId: { trainerId: trainer.id, studentId: student.id } },
    });
    if (!existing || !existing.isActive) {
      await this.subscriptionService.checkStudentLimit(trainer.user.tenantId, trainer.id);
    }

    return this.prisma.trainerStudent.upsert({
      where: { trainerId_studentId: { trainerId: trainer.id, studentId: student.id } },
      update: { isActive: true, monthlyFee },
      create: { trainerId: trainer.id, studentId: student.id, monthlyFee, isActive: true },
    });
  }

  async getAppointments(userId: string) {
    const trainer = await this.getTrainer(userId);
    const appointments = await this.prisma.appointment.findMany({
      where: { trainerId: trainer.id },
      orderBy: { scheduledAt: 'asc' },
    });

    const studentIds = [...new Set(appointments.map((a) => a.studentId).filter(Boolean))];
    const students = studentIds.length
      ? await this.prisma.student.findMany({
          where: { id: { in: studentIds } },
          include: { user: { include: { profile: true } } },
        })
      : [];
    const studentMap = new Map(students.map((s) => [s.id, s]));

    return appointments.map((a) => ({ ...a, student: studentMap.get(a.studentId) ?? null }));
  }

  async createAppointment(userId: string, data: any) {
    const trainer = await this.getTrainer(userId);
    const appt = await this.prisma.appointment.create({ data: { trainerId: trainer.id, ...data } });
    const student = appt.studentId
      ? await this.prisma.student.findUnique({
          where: { id: appt.studentId },
          include: { user: { include: { profile: true } } },
        })
      : null;
    return { ...appt, student };
  }

  async updateAppointment(userId: string, id: string, data: any) {
    const trainer = await this.getTrainer(userId);
    const appt = await this.prisma.appointment.update({ where: { id, trainerId: trainer.id }, data });
    const student = appt.studentId
      ? await this.prisma.student.findUnique({
          where: { id: appt.studentId },
          include: { user: { include: { profile: true } } },
        })
      : null;
    return { ...appt, student };
  }

  async deleteAppointment(userId: string, id: string) {
    const trainer = await this.getTrainer(userId);
    await this.prisma.appointment.delete({ where: { id, trainerId: trainer.id } });
    return { message: 'Agendamento excluído' };
  }

  async getReports(userId: string, days = 30) {
    const trainer = await this.getTrainer(userId);
    const since = new Date(Date.now() - days * 86400000);

    const [totalStudents, activeStudents, totalWorkouts, logs, relations] = await Promise.all([
      this.prisma.trainerStudent.count({ where: { trainerId: trainer.id } }),
      this.prisma.trainerStudent.count({ where: { trainerId: trainer.id, isActive: true } }),
      this.prisma.workout.count({ where: { trainerId: trainer.id, NOT: { tags: { has: '__personalized' } } } }),
      this.prisma.workoutLog.findMany({
        where: { workoutPlan: { workout: { trainerId: trainer.id } }, completedAt: { gte: since } },
        select: { completedAt: true },
      }),
      this.prisma.trainerStudent.findMany({
        where: { trainerId: trainer.id, isActive: true },
        include: { student: { select: { streak: true } } },
      }),
    ]);

    const totalCheckins = logs.length;
    const avgStreak = relations.length
      ? Math.round(relations.reduce((s, r) => s + (r.student?.streak || 0), 0) / relations.length)
      : 0;

    const dailyMap: Record<string, number> = {};
    logs.forEach((log) => {
      const key = this.toBRDate(log.completedAt);
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    });
    const dailyCheckins: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = this.toBRDate(d);
      dailyCheckins.push(dailyMap[key] || 0);
    }

    return { activeStudents, totalCheckins, totalWorkouts, avgStreak, dailyCheckins, days };
  }

  async getPayments(userId: string) {
    const trainer = await this.getTrainer(userId);
    const allStudents = await this.prisma.trainerStudent.findMany({
      where: { trainerId: trainer.id },
      include: { student: { include: { user: { include: { profile: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    const active = allStudents.filter((s) => s.isActive);
    const mrr = active.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);
    const fees = allStudents.map((s) => ({
      id: s.id,
      studentName: `${s.student.user.profile?.firstName ?? ''} ${s.student.user.profile?.lastName ?? ''}`.trim() || s.student.user.email,
      amount: s.monthlyFee ?? 0,
      isActive: s.isActive,
      since: s.createdAt,
    }));
    return { mrr, activeCount: active.length, totalCount: allStudents.length, fees };
  }

  async update(userId: string, data: any) {
    const trainer = await this.getTrainer(userId);
    const { profile, trainer: trainerData } = data;
    await Promise.all([
      trainerData && Object.keys(trainerData).length
        ? this.prisma.trainer.update({ where: { id: trainer.id }, data: Object.fromEntries(Object.entries(trainerData).filter(([, v]) => v !== undefined && v !== '')) })
        : null,
      profile && Object.keys(profile).length
        ? this.prisma.profile.upsert({ where: { userId }, update: profile, create: { userId, ...profile } })
        : null,
    ]);
    return this.prisma.trainer.findUnique({
      where: { id: trainer.id },
      include: { user: { include: { profile: true } } },
    });
  }
}

