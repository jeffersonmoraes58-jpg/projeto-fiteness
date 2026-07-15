import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class TrainersService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    private emailService: EmailService,
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

    // Buscar IDs dos alunos ativos para filtrar check-ins
    const activeStudentIds = (
      await this.prisma.trainerStudent.findMany({
        where: { trainerId: trainer.id, isActive: true },
        select: { studentId: true },
      })
    ).map((s) => s.studentId);

    const [students, workouts, recentLogs, upcomingAppointments, todayLogs, weekLogs, fees] =
      await Promise.all([
        this.prisma.trainerStudent.count({ where: { trainerId: trainer.id, isActive: true } }),
        this.prisma.workout.count({ where: { trainerId: trainer.id, NOT: { tags: { has: '__personalized' } } } }),
        this.prisma.workoutLog.findMany({
          where: {
            studentId: { in: activeStudentIds },
            workoutPlan: { workout: { trainerId: trainer.id } },
          },
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
          where: {
            studentId: { in: activeStudentIds },
            workoutPlan: { workout: { trainerId: trainer.id } },
            completedAt: { gte: todayStart },
          },
        }),
        this.prisma.workoutLog.findMany({
          where: {
            studentId: { in: activeStudentIds },
            workoutPlan: { workout: { trainerId: trainer.id } },
            completedAt: { gte: sevenDaysAgo },
          },
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

  async searchStudents(userId: string, query: string) {
    const trainer = await this.getTrainer(userId);
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const users = await this.prisma.user.findMany({
      where: {
        role: 'STUDENT',
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { profile: { firstName: { contains: q, mode: 'insensitive' } } },
          { profile: { lastName: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: { profile: true, student: true },
      take: 20,
    });

    return users
      .filter((u) => u.student)
      .map((u) => ({
        id: u.id,
        userId: u.id,
        studentId: u.student!.id,
        email: u.email,
        profile: {
          firstName: u.profile?.firstName ?? '',
          lastName: u.profile?.lastName ?? '',
          avatarUrl: u.profile?.avatarUrl ?? null,
        },
      }));
  }

  async searchStudentByEmail(userId: string, email: string) {
    const q = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: q, mode: 'insensitive' },
        role: 'STUDENT'
      },
      include: { profile: true, student: true },
    });
    if (!user || !user.student) return null;
    return { userId: user.id, studentId: user.student.id, email: user.email, profile: user.profile };
  }

  async removeStudent(userId: string, studentId: string) {
    const trainer = await this.getTrainer(userId);
    await Promise.all([
      this.prisma.trainerStudent.updateMany({
        where: { trainerId: trainer.id, studentId },
        data: { isActive: false },
      }),
      this.prisma.workoutPlan.updateMany({
        where: { studentId, isActive: true },
        data: { isActive: false },
      }),
    ]);
    return { message: 'Aluno removido' };
  }

  async addStudent(userId: string, studentUserId: string, monthlyFee?: number, goalType?: string) {
    const trainer = await this.getTrainer(userId);
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
      include: { user: true },
    });
    if (!student) throw new NotFoundException('Aluno não encontrado');
    if (!student.user) throw new NotFoundException('Usuário vinculado ao aluno não encontrado — o cadastro está incompleto');

    const existing = await this.prisma.trainerStudent.findUnique({
      where: { trainerId_studentId: { trainerId: trainer.id, studentId: student.id } },
    });
    if (!existing || !existing.isActive) {
      await this.subscriptionService.checkStudentLimit(trainer.user.tenantId, trainer.id);
    }

    await Promise.all([
      this.prisma.trainerStudent.upsert({
        where: { trainerId_studentId: { trainerId: trainer.id, studentId: student.id } },
        update: { isActive: true, monthlyFee },
        create: { trainerId: trainer.id, studentId: student.id, monthlyFee, isActive: true },
      }),
      goalType ? this.prisma.student.update({
        where: { id: student.id },
        data: { goalType: goalType as any },
      }) : null,
    ]);

    return { message: 'Aluno adicionado', studentId: student.id };
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

  async sendAnamneseLink(userId: string, studentUserId: string) {
    const trainer = await this.getTrainer(userId);

    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
      include: { user: { include: { profile: true } }, anamnesis: true },
    });

    if (!student) throw new NotFoundException('Aluno não encontrado');

    const studentName =
      `${student.user.profile?.firstName ?? ''} ${student.user.profile?.lastName ?? ''}`.trim() ||
      student.user.email;
    const trainerName =
      `${trainer.user.profile?.firstName ?? ''} ${trainer.user.profile?.lastName ?? ''}`.trim() ||
      trainer.user.email;

    if (!student.user.email) throw new NotFoundException('Aluno não possui email cadastrado');

    const result = await this.emailService.sendAnamneseLink({
      to: student.user.email,
      studentName,
      trainerName,
      studentUserId: student.userId,
    });

    return result;
  }

  async getAnalytics(userId: string) {
    const trainer = await this.getTrainer(userId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    // Buscar todos os dados em paralelo
    const [
      allStudents,
      totalWorkouts,
      recentLogs,
      weeklyLogs,
      monthlyLogs,
    ] = await Promise.all([
      // Todos os alunos (ativos e inativos)
      this.prisma.trainerStudent.findMany({
        where: { trainerId: trainer.id },
        include: {
          student: {
            select: {
              id: true,
              streak: true,
              points: true,
              goalType: true,
              user: {
                select: {
                  createdAt: true,
                  profile: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.workout.count({
        where: { trainerId: trainer.id, NOT: { tags: { has: '__personalized' } } },
      }),
      // Logs dos últimos 7 dias (para calcular alunos ativos na semana)
      this.prisma.workoutLog.findMany({
        where: {
          workoutPlan: { workout: { trainerId: trainer.id } },
          completedAt: { gte: sevenDaysAgo },
        },
        select: { studentId: true, completedAt: true, status: true, feeling: true },
      }),
      // Weekly checkins
      this.prisma.workoutLog.findMany({
        where: {
          workoutPlan: { workout: { trainerId: trainer.id } },
          completedAt: { gte: sevenDaysAgo },
        },
        select: { completedAt: true },
      }),
      // Monthly logs para tendências
      this.prisma.workoutLog.findMany({
        where: {
          workoutPlan: { workout: { trainerId: trainer.id } },
          completedAt: { gte: thirtyDaysAgo },
        },
        select: { studentId: true, completedAt: true },
      }),
    ]);

    // ─── Métricas calculadas ──────────────────────────────────────────

    // Total de alunos
    const totalStudents = allStudents.length;
    const activeStudents = allStudents.filter((s) => s.isActive).length;

    // Alunos ativos nos últimos 7 dias (treinaram pelo menos 1x)
    const activeStudentsThisWeek = new Set(recentLogs.map((l) => l.studentId)).size;

    // Alunos EM RISCO (não treinaram nos últimos 7 dias, mas estão ativos)
    const activeStudentIds = new Set(allStudents.filter((s) => s.isActive).map((s) => s.student.id));
    const trainedStudentIds = new Set(recentLogs.map((l) => l.studentId));
    const atRiskStudents = [...activeStudentIds].filter((id) => !trainedStudentIds.has(id)).length;
    const atRiskList = allStudents
      .filter((s) => s.isActive && !trainedStudentIds.has(s.student.id))
      .slice(0, 10)
      .map((s) => ({
        studentId: s.studentId,
        name: `${s.student.user?.profile?.firstName ?? ''} ${s.student.user?.profile?.lastName ?? ''}`.trim() || 'Aluno',
        streak: s.student.streak,
        goalType: s.student.goalType,
      }));

    // Taxa de conclusão (logs completos vs incompletos)
    const completedLogs = recentLogs.filter((l) => l.status === 'COMPLETED').length;
    const completionRate = recentLogs.length > 0
      ? Math.round((completedLogs / recentLogs.length) * 100)
      : 0;

    // Streak médio
    const avgStreak = activeStudents > 0
      ? Math.round(allStudents.filter((s) => s.isActive).reduce((sum, s) => sum + (s.student.streak || 0), 0) / activeStudents)
      : 0;

    // Sentimento dos treinos
    const feelingCounts: Record<string, number> = { GREAT: 0, GOOD: 0, AVERAGE: 0, BAD: 0, TERRIBLE: 0 };
    recentLogs.forEach((l) => { if (l.feeling) feelingCounts[l.feeling] = (feelingCounts[l.feeling] || 0) + 1; });
    const positiveFeelings = (feelingCounts.GREAT || 0) + (feelingCounts.GOOD || 0);
    const sentiments = recentLogs.length > 0
      ? Math.round((positiveFeelings / recentLogs.length) * 100)
      : 0;

    // Total de checkins (mês e semana)
    const totalCheckinsMonth = monthlyLogs.length;
    const totalCheckinsWeek = weeklyLogs.length;
    const avgCheckinsPerStudentWeek = activeStudents > 0
      ? (totalCheckinsWeek / activeStudents).toFixed(1)
      : '0';

    // Tendência de checkins diários (30 dias)
    const dailyMap: Record<string, number> = {};
    monthlyLogs.forEach((l) => {
      const key = this.toBRDate(l.completedAt);
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    });
    const dailyTrend: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = this.toBRDate(d);
      dailyTrend.push({ date: key, count: dailyMap[key] || 0 });
    }

    // Tendência semanal (comparação com semana anterior)
    const previousWeekLogs = await this.prisma.workoutLog.count({
      where: {
        workoutPlan: { workout: { trainerId: trainer.id } },
        completedAt: { gte: new Date(Date.now() - 14 * 86400000), lt: sevenDaysAgo },
      },
    });
    const weekGrowth = previousWeekLogs > 0
      ? Math.round(((totalCheckinsWeek - previousWeekLogs) / previousWeekLogs) * 100)
      : 0;

    // Receita mensal
    const fees = allStudents
      .filter((s) => s.isActive)
      .reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

    // Retenção (alunos que entraram há mais de 30 dias e ainda estão ativos)
    const joinedLongAgo = allStudents.filter((s) =>
      s.isActive && new Date(s.student.user.createdAt) < thirtyDaysAgo,
    ).length;
    const retentionRate = allStudents.length > 0
      ? Math.round((joinedLongAgo / allStudents.length) * 100)
      : 100;

    return {
      totalStudents,
      activeStudents,
      activeStudentsThisWeek,
      atRiskStudents,
      atRiskList,
      completionRate,
      avgStreak,
      sentiments,
      totalCheckinsMonth,
      totalCheckinsWeek,
      avgCheckinsPerStudentWeek,
      weekGrowth,
      revenue: fees,
      totalWorkouts,
      retentionRate,
      dailyTrend,
      feelingBreakdown: feelingCounts,
    };
  }

  async getStudentReport(userId: string, studentId: string) {
    const trainer = await this.getTrainer(userId);

    // Verifica que o aluno pertence a este trainer
    const relation = await this.prisma.trainerStudent.findFirst({
      where: { trainerId: trainer.id, studentId },
      include: {
        student: {
          include: {
            user: { include: { profile: true } },
            anamnesis: true,
          },
        },
      },
    });
    if (!relation) throw new NotFoundException('Aluno não encontrado ou não pertence a este trainer');

    const student = relation.student;

    // Medições (progress photos + measurements)
    const [measurements, assessments, photos, workoutPlans, workoutLogs] = await Promise.all([
      this.prisma.bodyMeasurement.findMany({
        where: { studentId: student.id },
        orderBy: { measuredAt: 'desc' },
        take: 20,
      }),
      this.prisma.physicalAssessment.findMany({
        where: { studentId: student.id },
        orderBy: { assessedAt: 'desc' },
        take: 5,
      }),
      this.prisma.progressPhoto.findMany({
        where: { studentId: student.id },
        orderBy: { takenAt: 'desc' },
        take: 8,
      }),
      this.prisma.workoutPlan.findMany({
        where: { studentId: student.id, isActive: true },
        include: {
          workout: {
            include: {
              exercises: { include: { exercise: true }, orderBy: { order: 'asc' } },
            },
          },
        },
        orderBy: { order: 'asc' },
      }),
      this.prisma.workoutLog.findMany({
        where: { studentId: student.id },
        orderBy: { completedAt: 'desc' },
        take: 50,
      }),
    ]);

    // Últimos 30 dias de logs
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const recentLogs = workoutLogs.filter((l) => new Date(l.completedAt) >= thirtyDaysAgo);
    const totalPlans = workoutPlans.length;
    const completedThisMonth = recentLogs.length;
    const adherenceRate = totalPlans > 0
      ? Math.round((completedThisMonth / (totalPlans * 4.3)) * 100) // ~4.3 semanas/mês
      : 0;

    // Tendência de peso
    const weightTrend = measurements
      .filter((m) => m.weight != null)
      .slice(0, 10)
      .reverse()
      .map((m) => ({
        date: this.toBRDate(m.measuredAt),
        weight: m.weight,
        bodyFat: m.bodyFat,
        muscleMass: m.muscleMass,
      }));

    // Progressão de cargas — disponível quando exerciseLogs é populado (workoutLog.exerciseLogs)
    // Os logs retornados aqui não incluem exerciseLogs (performance), mas o campo é suportado no schema
    const exerciseProgress: Record<string, { name: string; weights: { date: string; weight: number }[] }> = {};

    return {
      student: {
        name: [student.user.profile?.firstName, student.user.profile?.lastName].filter(Boolean).join(' ') || student.user.email,
        email: student.user.email,
        phone: student.user.profile?.phone,
        avatarUrl: student.user.profile?.avatarUrl,
        birthDate: student.user.profile?.birthDate,
        goals: student.anamnesis?.mainGoal ? [student.anamnesis.mainGoal] : [],
        activityLevel: (student.anamnesis as any)?.activityLevel,
        streak: student.streak,
        points: student.points,
        level: student.level,
        since: student.createdAt,
      },
      summary: {
        totalWorkouts: workoutLogs.length,
        completedThisMonth,
        adherenceRate,
        streak: student.streak,
        points: student.points,
      },
      weightTrend,
      measurements: measurements.slice(0, 10).map((m) => ({
        date: this.toBRDate(m.measuredAt),
        weight: m.weight,
        bodyFat: m.bodyFat,
        muscleMass: m.muscleMass,
        waist: m.waist,
        hip: m.hip,
        chest: m.chest,
        arm: m.arm,
        thigh: m.thigh,
        notes: m.notes,
      })),
      assessments: assessments.map((a) => ({
        date: this.toBRDate(a.assessedAt),
        weight: a.weight,
        height: a.height,
        bmi: a.bmi,
        bodyFatPercent: a.bodyFatPercent,
        muscleMassKg: a.muscleMassKg,
        waistCm: a.waistCm,
        hipCm: a.hipCm,
        chestCm: a.chestCm,
        rightArmCm: a.rightArmCm,
        rightThighCm: a.rightThighCm,
        rightCalfCm: a.rightCalfCm,
        notes: a.notes,
      })),
      photos: photos.map((p) => ({
        url: p.photoUrl,
        angle: p.angle,
        date: this.toBRDate(p.takenAt),
      })),
      currentPlans: workoutPlans.map((p) => ({
        name: p.workout.name,
        division: p.division,
        duration: p.workout.duration,
        dayOfWeek: p.dayOfWeek,
        exercises: p.workout.exercises.map((ex) => ({
          name: ex.exercise.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restSeconds: ex.restSeconds,
        })),
      })),
      recentLogs: workoutLogs.slice(0, 10).map((l) => ({
        date: this.toBRDate(l.completedAt),
        duration: l.duration,
        status: l.status,
        feeling: l.feeling,
        notes: l.notes,
      })),
    };
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

