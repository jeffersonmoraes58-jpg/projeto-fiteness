import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  private async getStudent(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });
    if (!student) throw new NotFoundException('Aluno não encontrado');
    return student;
  }

  async getDashboard(userId: string) {
    const student = await this.getStudent(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [workoutLogs, waterLogs, activePlan, activeDiet] = await Promise.all([
      this.prisma.workoutLog.findMany({
        where: { studentId: student.id },
        orderBy: { completedAt: 'desc' },
        take: 7,
      }),
      this.prisma.waterLog.findMany({
        where: { studentId: student.id, loggedAt: { gte: today } },
      }),
      this.prisma.workoutPlan.findFirst({
        where: { studentId: student.id, isActive: true },
        include: { workout: { include: { exercises: { include: { exercise: true } } } } },
      }),
      this.prisma.dietPlan.findFirst({
        where: { studentId: student.id, isActive: true },
        include: { diet: { include: { meals: { include: { foods: true } } } } },
      }),
    ]);

    const totalWaterToday = waterLogs.reduce((s, l) => s + l.amount, 0);
    const workoutsThisWeek = workoutLogs.filter(
      (l) => l.completedAt >= new Date(Date.now() - 7 * 86400000),
    ).length;

    return {
      student: { ...student, user: undefined, userId: undefined },
      user: student.user,
      stats: {
        streak: student.streak,
        level: student.level,
        points: student.points,
        workoutsThisWeek,
        waterToday: totalWaterToday,
      },
      activeWorkout: activePlan?.workout ?? null,
      activeDiet: activeDiet?.diet ?? null,
    };
  }

  async getWorkoutPlan(userId: string) {
    const student = await this.getStudent(userId);
    return this.prisma.workoutPlan.findMany({
      where: { studentId: student.id, isActive: true },
      include: {
        workout: {
          include: {
            exercises: { include: { exercise: true }, orderBy: { order: 'asc' } },
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async getWorkoutLogs(userId: string) {
    const student = await this.getStudent(userId);
    return this.prisma.workoutLog.findMany({
      where: { studentId: student.id },
      orderBy: { completedAt: 'desc' },
      take: 20,
      include: { workoutPlan: { include: { workout: true } } },
    });
  }

  async logWorkout(userId: string, data: { workoutPlanId?: string; duration?: number; notes?: string; feeling?: number }) {
    const student = await this.getStudent(userId);
    const log = await this.prisma.workoutLog.create({
      data: {
        studentId: student.id,
        workoutPlanId: data.workoutPlanId,
        duration: data.duration,
        notes: data.notes,
        feeling: data.feeling,
        completedAt: new Date(),
      },
    });
    await this.prisma.student.update({
      where: { id: student.id },
      data: { streak: { increment: 1 }, points: { increment: 10 } },
    });
    await this.checkAndAwardAchievements(student.id);
    return log;
  }

  private async checkAndAwardAchievements(studentId: string): Promise<void> {
    const [student, totalLogs, weekLogs, existing] = await Promise.all([
      this.prisma.student.findUnique({ where: { id: studentId } }),
      this.prisma.workoutLog.count({ where: { studentId } }),
      this.prisma.workoutLog.count({
        where: { studentId, completedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
      this.prisma.achievement.findMany({ where: { studentId }, select: { title: true } }),
    ]);
    if (!student) return;

    const earned = new Set(existing.map((a) => a.title));
    const toCreate: Array<{ title: string; description: string; points: number; category: string }> = [];

    // Workout count
    for (const m of [
      { count: 1,   title: 'Primeiro Treino', description: 'Completou o primeiro treino!',   points: 50,   category: 'treino' },
      { count: 10,  title: '10 Treinos',      description: 'Completou 10 treinos!',           points: 100,  category: 'treino' },
      { count: 50,  title: '50 Treinos',      description: 'Completou 50 treinos!',           points: 300,  category: 'treino' },
      { count: 100, title: '100 Treinos',     description: 'Completou 100 treinos!',          points: 1000, category: 'treino' },
    ]) {
      if (totalLogs >= m.count && !earned.has(m.title)) toCreate.push(m);
    }

    // Beast mode
    if (weekLogs >= 5 && !earned.has('Beast Mode'))
      toCreate.push({ title: 'Beast Mode', description: 'Treinou 5x em uma semana!', points: 200, category: 'treino' });

    // Streak
    const streak = student.streak ?? 0;
    if (streak >= 7 && !earned.has('7 dias seguidos'))
      toCreate.push({ title: '7 dias seguidos', description: 'Treinou 7 dias consecutivos!', points: 150, category: 'sequencia' });
    if (streak >= 30 && !earned.has('30 dias seguidos'))
      toCreate.push({ title: '30 dias seguidos', description: 'Treinou 30 dias consecutivos!', points: 500, category: 'sequencia' });

    // Level
    const newLevel = Math.floor((student.points ?? 0) / 500) + 1;
    if (newLevel >= 5 && !earned.has('Nível 5'))
      toCreate.push({ title: 'Nível 5', description: 'Alcançou o nível 5!', points: 250, category: 'nivel' });
    if (newLevel >= 10 && !earned.has('Nível 10'))
      toCreate.push({ title: 'Nível 10', description: 'Alcançou o nível 10!', points: 500, category: 'nivel' });

    if (toCreate.length === 0) {
      await this.prisma.student.update({ where: { id: studentId }, data: { level: newLevel } });
      return;
    }

    const bonusPoints = toCreate.reduce((sum, a) => sum + a.points, 0);
    await Promise.all([
      this.prisma.achievement.createMany({ data: toCreate.map((a) => ({ ...a, studentId })) }),
      this.prisma.student.update({
        where: { id: studentId },
        data: { points: { increment: bonusPoints }, level: newLevel },
      }),
    ]);
  }

  async getDietPlan(userId: string) {
    const student = await this.getStudent(userId);
    return this.prisma.dietPlan.findFirst({
      where: { studentId: student.id, isActive: true },
      include: {
        diet: {
          include: {
            meals: { include: { foods: true }, orderBy: { order: 'asc' } },
          },
        },
      },
    });
  }

  async logWater(userId: string, amount: number) {
    const student = await this.getStudent(userId);
    return this.prisma.waterLog.create({
      data: { studentId: student.id, amount, loggedAt: new Date() },
    });
  }

  async getWaterToday(userId: string) {
    const student = await this.getStudent(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const logs = await this.prisma.waterLog.findMany({
      where: { studentId: student.id, loggedAt: { gte: today } },
    });
    return { total: logs.reduce((s, l) => s + l.amount, 0), logs };
  }

  async getProgress(userId: string) {
    const student = await this.getStudent(userId);
    const [measurements, photos, assessments] = await Promise.all([
      this.prisma.bodyMeasurement.findMany({
        where: { studentId: student.id },
        orderBy: { measuredAt: 'desc' },
        take: 30,
      }),
      this.prisma.progressPhoto.findMany({
        where: { studentId: student.id },
        orderBy: { takenAt: 'desc' },
        take: 20,
      }),
      this.prisma.physicalAssessment.findMany({
        where: { studentId: student.id },
        orderBy: { assessedAt: 'desc' },
        take: 10,
      }),
    ]);
    return { measurements, photos, assessments };
  }

  async addMeasurement(userId: string, data: any) {
    const student = await this.getStudent(userId);
    return this.prisma.bodyMeasurement.create({
      data: { studentId: student.id, ...data },
    });
  }

  async getAchievements(userId: string) {
    const student = await this.getStudent(userId);
    return this.prisma.achievement.findMany({
      where: { studentId: student.id },
      orderBy: { earnedAt: 'desc' },
    });
  }

  async update(userId: string, data: any) {
    const student = await this.getStudent(userId);
    const { profile, ...studentData } = data;
    const [updatedStudent] = await Promise.all([
      Object.keys(studentData).length
        ? this.prisma.student.update({ where: { id: student.id }, data: studentData })
        : student,
      profile
        ? this.prisma.profile.update({ where: { userId }, data: profile })
        : null,
    ]);
    return updatedStudent;
  }

  async findByTenant(tenantId: string, search?: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        role: 'STUDENT',
        isActive: true,
        ...(search && {
          OR: [
            { profile: { firstName: { contains: search, mode: 'insensitive' } } },
            { profile: { lastName: { contains: search, mode: 'insensitive' } } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { profile: true, student: true },
    });
  }
}
