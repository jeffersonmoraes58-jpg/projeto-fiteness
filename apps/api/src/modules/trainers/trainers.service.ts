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

  async addStudent(userId: string, studentUserId: string, monthlyFee?: number) {
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
    const prevSince = new Date(since.getTime() - days * 86400000);
    const oneYearAgo = new Date(Date.now() - 365 * 86400000);

    const [currentLogs, prevLogs, allRelations, totalWorkouts, prevTotalWorkouts, platformAgg] = await Promise.all([
      this.prisma.workoutLog.findMany({
        where: { workoutPlan: { workout: { trainerId: trainer.id } }, completedAt: { gte: since } },
        select: { completedAt: true, studentId: true },
      }),
      this.prisma.workoutLog.findMany({
        where: { workoutPlan: { workout: { trainerId: trainer.id } }, completedAt: { gte: prevSince, lt: since } },
        select: { completedAt: true, studentId: true },
      }),
      this.prisma.trainerStudent.findMany({
        where: { trainerId: trainer.id },
        include: {
          student: {
            include: {
              user: { include: { profile: true } },
              workoutLogs: {
                where: { workoutPlan: { workout: { trainerId: trainer.id } } },
                select: { completedAt: true },
                orderBy: { completedAt: 'desc' },
              },
            },
          },
        },
      }),
      this.prisma.workout.count({ where: { trainerId: trainer.id, createdAt: { gte: since }, NOT: { tags: { has: '__personalized' } } } }),
      this.prisma.workout.count({ where: { trainerId: trainer.id, createdAt: { gte: prevSince, lt: since }, NOT: { tags: { has: '__personalized' } } } }),
      this.getPlatformBenchmarks(),
    ]);

    const activeRelations = allRelations.filter((r) => r.isActive);
    const activeStudents = activeRelations.length;
    const totalStudents = allRelations.length;
    const totalCheckins = currentLogs.length;
    const prevTotalCheckins = prevLogs.length;

    const avgStreak = this.periodStreak(currentLogs);
    const prevAvgStreak = this.periodStreak(prevLogs);

    const prevActiveStudents = new Set(prevLogs.map((l) => l.studentId)).size;

    const dailyMap: Record<string, number> = {};
    currentLogs.forEach((log) => { dailyMap[this.toBRDate(log.completedAt)] = (dailyMap[this.toBRDate(log.completedAt)] || 0) + 1; });
    const dailyCheckins: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      dailyCheckins.push(dailyMap[this.toBRDate(d)] || 0);
    }

    const weeklyTrend: { label: string; count: number }[] = [];
    const weekCount = Math.min(Math.ceil(days / 7), 26);
    for (let w = weekCount - 1; w >= 0; w--) {
      const weekStart = new Date(Date.now() - (w + 1) * 7 * 86400000);
      const weekEnd = new Date(Date.now() - w * 7 * 86400000);
      const count = currentLogs.filter((l) => {
        const d = new Date(l.completedAt);
        return d >= weekStart && d < weekEnd;
      }).length;
      const label = weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      weeklyTrend.push({ label, count });
    }

    const dayOfWeekNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayOfWeekCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
    const dayOfWeekTotals: number[] = [0, 0, 0, 0, 0, 0, 0];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dow = d.getDay();
      dayOfWeekTotals[dow]++;
    }
    currentLogs.forEach((l) => { dayOfWeekCounts[new Date(l.completedAt).getDay()]++; });
    const peakDays = dayOfWeekNames.map((day, i) => ({
      day,
      count: dayOfWeekCounts[i],
      avg: dayOfWeekTotals[i] > 0 ? Math.round((dayOfWeekCounts[i] / dayOfWeekTotals[i]) * 10) / 10 : 0,
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const studentsWithDetails = activeRelations.map((r) => {
      const studentLogs = r.student.workoutLogs;
      const lastLog = studentLogs.length > 0 ? new Date(studentLogs[0].completedAt) : null;
      const daysSinceLast = lastLog ? Math.floor((today.getTime() - lastLog.getTime()) / 86400000) : 999;
      const recentLogs30d = studentLogs.filter((l) => new Date(l.completedAt) >= since);
      const prevLogs30d = studentLogs.filter((l) => new Date(l.completedAt) >= prevSince && new Date(l.completedAt) < since);
      const recentCount = recentLogs30d.length;
      const prevCount = prevLogs30d.length;
      const expectedPerWeek = 3;
      const expectedTotal = Math.ceil((days / 7) * expectedPerWeek);
      const checkinFrequency = days > 0 ? Math.round((recentCount / (days / 7)) * 10) / 10 : 0;
      const consistency = expectedTotal > 0 ? Math.min(100, Math.round((recentCount / expectedTotal) * 100)) : 0;
      const streakScore = Math.min(100, (r.student.streak || 0) * 5);
      const recencyScore = daysSinceLast <= 1 ? 100 : daysSinceLast <= 3 ? 70 : daysSinceLast <= 7 ? 40 : daysSinceLast <= 14 ? 15 : 0;
      const engagementScore = Math.round(consistency * 0.4 + streakScore * 0.3 + recencyScore * 0.3);
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (prevCount > 0 && recentCount > prevCount * 1.2) trend = 'improving';
      else if (prevCount > 0 && recentCount < prevCount * 0.7) trend = 'declining';
      else if (prevCount === 0 && recentCount > 0) trend = 'improving';
      else if (recentCount === 0 && prevCount > 0) trend = 'declining';

      const riskLevel = daysSinceLast > 14 ? 'critical' : daysSinceLast > 7 ? 'warning' : null;
      const monthlyFee = r.monthlyFee || 0;
      const monthsActive = Math.max(1, Math.floor((today.getTime() - new Date(r.createdAt).getTime()) / (30 * 86400000)));
      const ltv = monthlyFee * monthsActive;

      return {
        id: r.studentId,
        name: `${r.student.user.profile?.firstName ?? ''} ${r.student.user.profile?.lastName ?? ''}`.trim() || r.student.user.email,
        email: r.student.user.email,
        avatarUrl: r.student.user.profile?.avatarUrl,
        streak: r.student.streak || 0,
        level: r.student.level || 1,
        points: r.student.points || 0,
        goalType: r.student.goalType,
        isActive: r.isActive,
        lastCheckinAt: lastLog?.toISOString() || null,
        engagementScore,
        checkinFrequency,
        consistency,
        daysSinceLastCheckin: daysSinceLast,
        trend,
        riskLevel,
        monthlyFee,
        monthsActive,
        ltv,
        recentCheckins: recentCount,
        prevCheckins: prevCount,
      };
    });

    const atRiskStudents = studentsWithDetails
      .filter((s) => s.riskLevel)
      .sort((a, b) => b.daysSinceLastCheckin - a.daysSinceLastCheckin);

    const cohortRetention = this.calculateCohortRetention(allRelations);

    const revenue = {
      mrr: activeRelations.reduce((sum, r) => sum + (r.monthlyFee || 0), 0),
      avgRevenuePerStudent: activeStudents > 0 ? Math.round(activeRelations.reduce((sum, r) => sum + (r.monthlyFee || 0), 0) / activeStudents) : 0,
      totalLTV: studentsWithDetails.reduce((sum, s) => sum + s.ltv, 0),
      studentsWithFee: activeRelations.filter((r) => (r.monthlyFee || 0) > 0).length,
    };

    const recentActive = studentsWithDetails.filter((s) => s.daysSinceLastCheckin <= 7).length;
    const churnPrediction = studentsWithDetails.filter((s) => s.trend === 'declining');

    return {
      activeStudents,
      totalStudents,
      totalCheckins,
      totalWorkouts,
      avgStreak,
      dailyCheckins,
      weeklyTrend,
      peakDays,
      previous: { activeStudents: prevActiveStudents, totalCheckins: prevTotalCheckins, totalWorkouts: prevTotalWorkouts, avgStreak: prevAvgStreak },
      atRiskStudents,
      cohortRetention,
      benchmark: platformAgg,
      revenue,
      recentActive,
      churnPrediction: churnPrediction.length,
      students: studentsWithDetails,
      days,
    };
  }

  private periodStreak(logs: { studentId: string; completedAt: Date | string }[]): number {
    const byStudent: Record<string, Date[]> = {};
    for (const l of logs) {
      const d = new Date(l.completedAt);
      d.setHours(0, 0, 0, 0);
      if (!byStudent[l.studentId]) byStudent[l.studentId] = [];
      byStudent[l.studentId].push(d);
    }
    let sum = 0;
    let count = 0;
    for (const dates of Object.values(byStudent)) {
      const unique = [...new Set(dates.map((d) => d.getTime()))].sort((a, b) => a - b);
      let best = 1;
      let run = 1;
      for (let i = 1; i < unique.length; i++) {
        run = unique[i] - unique[i - 1] === 86400000 ? run + 1 : 1;
        if (run > best) best = run;
      }
      sum += best;
      count++;
    }
    return count > 0 ? Math.round(sum / count) : 0;
  }

  private calculateCohortRetention(relations: any[]) {
    const now = new Date();
    const buckets = { d30: { joined: 0, active: 0 }, d60: { joined: 0, active: 0 }, d90: { joined: 0, active: 0 }, d180: { joined: 0, active: 0 } };
    const thresholds = [30, 60, 90, 180];
    const keys = ['d30', 'd60', 'd90', 'd180'] as const;

    for (const r of relations) {
      const joined = new Date(r.createdAt);
      const daysSinceJoin = Math.floor((now.getTime() - joined.getTime()) / 86400000);
      for (let i = 0; i < thresholds.length; i++) {
        if (daysSinceJoin >= thresholds[i]) {
          buckets[keys[i]].joined++;
          if (r.isActive) buckets[keys[i]].active++;
        }
      }
    }

    return {
      d30: buckets.d30.joined > 0 ? Math.round((buckets.d30.active / buckets.d30.joined) * 100) : 100,
      d60: buckets.d60.joined > 0 ? Math.round((buckets.d60.active / buckets.d60.joined) * 100) : 100,
      d90: buckets.d90.joined > 0 ? Math.round((buckets.d90.active / buckets.d90.joined) * 100) : 100,
      d180: buckets.d180.joined > 0 ? Math.round((buckets.d180.active / buckets.d180.joined) * 100) : 100,
    };
  }

  private async getPlatformBenchmarks() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [totalTrainers, activeRelations, allLogs] = await Promise.all([
      this.prisma.trainer.count(),
      this.prisma.trainerStudent.findMany({ where: { isActive: true }, select: { studentId: true, trainerId: true } }),
      this.prisma.workoutLog.findMany({
        where: { completedAt: { gte: thirtyDaysAgo } },
        select: { studentId: true, completedAt: true },
      }),
    ]);

    const trainerIds = [...new Set(activeRelations.map((r) => r.trainerId))];
    const trainerStudentCounts: Record<string, number> = {};
    activeRelations.forEach((r) => { trainerStudentCounts[r.trainerId] = (trainerStudentCounts[r.trainerId] || 0) + 1; });
    const avgStudentsPerTrainer = trainerIds.length > 0
      ? Math.round(Object.values(trainerStudentCounts).reduce((s, v) => s + v, 0) / trainerIds.length * 10) / 10
      : 0;

    const studentCheckinCounts: Record<string, number> = {};
    allLogs.forEach((l) => { studentCheckinCounts[l.studentId] = (studentCheckinCounts[l.studentId] || 0) + 1; });
    const activeStudentIds = activeRelations.map((r) => r.studentId);
    const activeStudentCheckins = activeStudentIds.map((id) => studentCheckinCounts[id] || 0).filter((c) => c > 0);
    const avgCheckinsPerStudent = activeStudentCheckins.length > 0
      ? Math.round(activeStudentCheckins.reduce((s, v) => s + v, 0) / activeStudentCheckins.length * 10) / 10
      : 0;

    return {
      avgStudentsPerTrainer,
      avgCheckinsPerStudent,
      totalTrainers,
    };
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

  async getStudentCheckins(trainerUserId: string, studentId: string, limit = 12) {
    const trainer = await this.getTrainer(trainerUserId);
    const relation = await this.prisma.trainerStudent.findFirst({
      where: { trainerId: trainer.id, studentId, isActive: true },
    });
    if (!relation) throw new NotFoundException('Aluno não encontrado');

    return this.prisma.weeklyCheckin.findMany({
      where: { studentId },
      orderBy: { weekStart: 'desc' },
      take: limit,
    });
  }

  async updateCheckinTrainerNote(trainerUserId: string, studentId: string, checkinId: string, trainerNotes: string) {
    const trainer = await this.getTrainer(trainerUserId);
    const relation = await this.prisma.trainerStudent.findFirst({
      where: { trainerId: trainer.id, studentId, isActive: true },
    });
    if (!relation) throw new NotFoundException('Aluno não encontrado');

    return this.prisma.weeklyCheckin.update({
      where: { id: checkinId },
      data: { trainerNotes },
    });
  }

  async getStudentCompliance(trainerUserId: string, studentId: string, weeks = 4) {
    const trainer = await this.getTrainer(trainerUserId);
    const relation = await this.prisma.trainerStudent.findFirst({
      where: { trainerId: trainer.id, studentId, isActive: true },
    });
    if (!relation) throw new NotFoundException('Aluno não encontrado');

    const since = new Date(Date.now() - weeks * 7 * 86400000);

    const [plans, logs] = await Promise.all([
      this.prisma.workoutPlan.findMany({
        where: { studentId, isActive: true },
        select: { dayOfWeek: true },
      }),
      this.prisma.workoutLog.findMany({
        where: { studentId, startedAt: { gte: since } },
        select: { startedAt: true, completedAt: true },
      }),
    ]);

    const daysPerWeek = plans.reduce((sum, p) => sum + (p.dayOfWeek?.length || 0), 0);
    const totalExpected = Math.max(daysPerWeek * weeks, 1);
    const totalCompleted = logs.filter((l) => l.completedAt).length;
    const score = Math.min(100, Math.round((totalCompleted / totalExpected) * 100));

    const weeklyBreakdown: { week: string; completed: number; expected: number }[] = [];
    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(Date.now() - (w + 1) * 7 * 86400000);
      const weekEnd = new Date(Date.now() - w * 7 * 86400000);
      const weekLogs = logs.filter((l) => {
        const d = new Date(l.startedAt);
        return d >= weekStart && d < weekEnd && l.completedAt;
      });
      weeklyBreakdown.unshift({
        week: this.toBRDate(weekStart),
        completed: weekLogs.length,
        expected: daysPerWeek,
      });
    }

    return { score, totalCompleted, totalExpected, daysPerWeek, weeks, weeklyBreakdown };
  }
}

