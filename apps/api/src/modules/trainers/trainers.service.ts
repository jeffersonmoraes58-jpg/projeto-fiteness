import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainersService {
  constructor(private prisma: PrismaService) {}

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
    const [totalStudents, totalWorkouts, recentLogs, upcomingAppointments] = await Promise.all([
      this.prisma.trainerStudent.count({ where: { trainerId: trainer.id, isActive: true } }),
      this.prisma.workout.count({ where: { trainerId: trainer.id } }),
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
    ]);
    return { trainer, stats: { totalStudents, totalWorkouts }, recentLogs, upcomingAppointments };
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
          },
        },
      },
    });
    const results = relations.map((r) => ({
      ...r.student,
      monthlyFee: r.monthlyFee,
      startedAt: r.startedAt,
      isActive: r.isActive,
      lastCheckinAt: r.student.workoutLogs[0]?.completedAt ?? null,
    }));
    if (!search) return results;
    const q = search.toLowerCase();
    return results.filter((s) => {
      const name = `${s.user?.profile?.firstName} ${s.user?.profile?.lastName} ${s.user?.email}`.toLowerCase();
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
    return this.prisma.trainerStudent.upsert({
      where: { trainerId_studentId: { trainerId: trainer.id, studentId: student.id } },
      update: { isActive: true, monthlyFee },
      create: { trainerId: trainer.id, studentId: student.id, monthlyFee, isActive: true },
    });
  }

  async getAppointments(userId: string) {
    const trainer = await this.getTrainer(userId);
    return this.prisma.appointment.findMany({
      where: { trainerId: trainer.id },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async createAppointment(userId: string, data: any) {
    const trainer = await this.getTrainer(userId);
    return this.prisma.appointment.create({ data: { trainerId: trainer.id, ...data } });
  }

  async updateAppointment(userId: string, id: string, data: any) {
    const trainer = await this.getTrainer(userId);
    return this.prisma.appointment.update({ where: { id, trainerId: trainer.id }, data });
  }

  async deleteAppointment(userId: string, id: string) {
    const trainer = await this.getTrainer(userId);
    return this.prisma.appointment.delete({ where: { id, trainerId: trainer.id } });
  }

  async getReports(userId: string) {
    const trainer = await this.getTrainer(userId);
    const since = new Date(Date.now() - 30 * 86400000);
    const [totalStudents, activeStudents, checkIns, recentLogs] = await Promise.all([
      this.prisma.trainerStudent.count({ where: { trainerId: trainer.id } }),
      this.prisma.trainerStudent.count({ where: { trainerId: trainer.id, isActive: true } }),
      this.prisma.workoutLog.count({ where: { workoutPlan: { workout: { trainerId: trainer.id } }, completedAt: { gte: since } } }),
      this.prisma.workoutLog.findMany({
        where: { workoutPlan: { workout: { trainerId: trainer.id } }, completedAt: { gte: since } },
        include: { student: { include: { user: { include: { profile: true } } } } },
        orderBy: { completedAt: 'desc' },
        take: 50,
      }),
    ]);
    return { summary: { totalStudents, activeStudents, checkInsLast30Days: checkIns }, recentLogs };
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

