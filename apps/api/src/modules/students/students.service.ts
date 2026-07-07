import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async getStudent(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });
    if (!student) throw new NotFoundException('Aluno não encontrado');
    return student;
  }

  async getMyAppointments(userId: string) {
    const student = await this.getStudent(userId);
    return this.prisma.appointment.findMany({
      where: { studentId: student.id },
      include: {
        trainer: { include: { user: { include: { profile: true } } } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async getContacts(userId: string) {
    const student = await this.getStudent(userId);

    const [trainerRelations, nutritionistRelations] = await Promise.all([
      this.prisma.trainerStudent.findMany({
        where: { studentId: student.id, isActive: true },
        include: { trainer: { include: { user: { include: { profile: true } } } } },
      }),
      this.prisma.nutritionistPatient.findMany({
        where: { studentId: student.id, isActive: true },
        include: { nutritionist: { include: { user: { include: { profile: true } } } } },
      }),
    ]);

    return {
      trainers: trainerRelations.map((r) => ({
        userId: r.trainer.userId,
        firstName: r.trainer.user.profile?.firstName ?? '',
        lastName: r.trainer.user.profile?.lastName ?? '',
        avatarUrl: r.trainer.user.profile?.avatarUrl ?? null,
        role: 'TRAINER',
      })),
      nutritionists: nutritionistRelations.map((r) => ({
        userId: r.nutritionist.userId,
        firstName: r.nutritionist.user.profile?.firstName ?? '',
        lastName: r.nutritionist.user.profile?.lastName ?? '',
        avatarUrl: r.nutritionist.user.profile?.avatarUrl ?? null,
        role: 'NUTRITIONIST',
      })),
    };
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
        include: { diet: { include: { meals: { include: { foods: { include: { food: true } } } } } } },
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
      todayWorkout: activePlan?.workout ?? null,
      activeDiet: activeDiet?.diet ?? null,
    };
  }

  async getWorkoutPlan(userId: string) {
    const student = await this.getStudent(userId);
    const plans = await this.prisma.workoutPlan.findMany({
      where: { studentId: student.id, isActive: true },
      include: {
        workout: {
          include: {
            exercises: { include: { exercise: true }, orderBy: { order: 'asc' } },
            trainer: { include: { user: { include: { profile: true } } } },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Retorna sempre array para compatibilidade com web e mobile
    return plans.map((p) => ({
      id: p.id,
      name: p.workout.name,
      description: p.workout.description,
      estimatedMinutes: p.workout.duration,
      exercises: p.workout.exercises.map((we) => ({
        id: we.id,
        exerciseId: we.exerciseId,
        name: we.exercise.name,
        sets: we.sets,
        reps: we.reps,
        restSeconds: we.restSeconds,
        weight: we.weight,
        notes: we.notes,
        videoUrl: we.exercise.videoUrl,
        gifUrl: we.exercise.gifUrl,
        category: we.exercise.category,
      })),
    }));
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

  async startWorkout(userId: string, workoutPlanId: string) {
    const student = await this.getStudent(userId);
    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id: workoutPlanId },
      include: {
        workout: { include: { trainer: { include: { user: true } } } },
        student: { include: { user: { include: { profile: true } } } },
      },
    });
    if (plan?.workout?.trainer) {
      try {
        const studentName = [
          plan.student.user.profile?.firstName,
          plan.student.user.profile?.lastName,
        ].filter(Boolean).join(' ') || student.user.email;
        await this.notifications.create({
          userId: plan.workout.trainer.userId,
          type: 'WORKOUT_REMINDER',
          title: '🏃 Treino iniciado!',
          body: `${studentName} começou o treino "${plan.workout.name}".`,
        });
      } catch (err) {
        console.error('[startWorkout] failed to notify trainer:', err);
      }
    }
    return { ok: true };
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

    if (data.workoutPlanId) {
      try {
        const plan = await this.prisma.workoutPlan.findUnique({
          where: { id: data.workoutPlanId },
          include: {
            workout: { include: { trainer: { include: { user: true } } } },
            student: { include: { user: { include: { profile: true } } } },
          },
        });
        if (plan?.workout?.trainer) {
          const studentName = [
            plan.student.user.profile?.firstName,
            plan.student.user.profile?.lastName,
          ].filter(Boolean).join(' ') || student.user.email;
          await this.notifications.create({
            userId: plan.workout.trainer.userId,
            type: 'ACHIEVEMENT',
            title: '✅ Treino finalizado!',
            body: `${studentName} concluiu o treino "${plan.workout.name}". 🎉`,
          });
        }
      } catch (err) {
        console.error('[logWorkout] failed to notify trainer:', err);
      }
    }

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
    for (const { count, ...achievement } of [
      { count: 1,   title: 'Primeiro Treino', description: 'Completou o primeiro treino!',   points: 50,   category: 'treino' },
      { count: 10,  title: '10 Treinos',      description: 'Completou 10 treinos!',           points: 100,  category: 'treino' },
      { count: 50,  title: '50 Treinos',      description: 'Completou 50 treinos!',           points: 300,  category: 'treino' },
      { count: 100, title: '100 Treinos',     description: 'Completou 100 treinos!',          points: 1000, category: 'treino' },
    ]) {
      if (totalLogs >= count && !earned.has(achievement.title)) toCreate.push(achievement);
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
            meals: { include: { foods: { include: { food: true } } }, orderBy: { order: 'asc' } },
            nutritionist: { include: { user: { include: { profile: true } } } },
          },
        },
      },
    });
  }

  async logMeal(userId: string, data: any) {
    const student = await this.getStudent(userId);
    const dietPlan = await this.prisma.dietPlan.findFirst({
      where: { studentId: student.id, isActive: true },
    });
    return this.prisma.mealLog.create({
      data: {
        studentId: student.id,
        dietPlanId: dietPlan?.id ?? null,
        mealType: data.mealType,
        calories: data.calories ?? 0,
        protein: data.protein ?? 0,
        carbs: data.carbs ?? 0,
        fat: data.fat ?? 0,
        mood: data.mood ?? null,
        notes: data.notes ?? null,
        photoUrl: data.photoUrl ?? null,
      },
    });
  }

  async getMealLogsToday(userId: string) {
    const student = await this.getStudent(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.mealLog.findMany({
      where: { studentId: student.id, loggedAt: { gte: today } },
      orderBy: { loggedAt: 'desc' },
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

  async getAnamneseStatus(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { anamnesis: true },
    });
    if (!student) throw new NotFoundException('Aluno não encontrado');
    return { filled: !!student.anamnesis, anamnesis: student.anamnesis };
  }

  async submitAnamnese(userId: string, data: any) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException('Aluno não encontrado');

    const { anamneseType, ...answers } = data;
    const anamnesis = await this.prisma.anamnesis.upsert({
      where: { studentId: student.id },
      create: { studentId: student.id, ...answers },
      update: { ...answers, completedAt: new Date() },
    });
    return { success: true, anamnesis };
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
