import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const LEVEL_XP_BASE = 200;
const LEVEL_MULTIPLIER = 1.5;

const ACHIEVEMENT_DEFINITIONS = [
  // Workout count
  { count: 1,   title: 'Primeiro Treino',      description: 'Completou o primeiro treino!',                points: 50,   category: 'treino' },
  { count: 5,   title: '5 Treinos',             description: 'Completou 5 treinos!',                       points: 75,   category: 'treino' },
  { count: 10,  title: '10 Treinos',            description: 'Completou 10 treinos!',                      points: 100,  category: 'treino' },
  { count: 25,  title: '25 Treinos',            description: 'Completou 25 treinos!',                      points: 200,  category: 'treino' },
  { count: 50,  title: '50 Treinos',            description: 'Completou 50 treinos!',                      points: 300,  category: 'treino' },
  { count: 100, title: '100 Treinos',           description: 'Completou 100 treinos!',                     points: 500,  category: 'treino' },
  { count: 200, title: '200 Treinos',           description: 'Completou 200 treinos!',                     points: 1000, category: 'treino' },
  { count: 500, title: '500 Treinos',           description: 'Completou 500 treinos!',                     points: 2500, category: 'treino' },

  // Streak
  { streak: 3,   title: '3 dias seguidos',   description: 'Treinou 3 dias consecutivos!',    points: 30,   category: 'sequencia' },
  { streak: 7,   title: '7 dias seguidos',   description: 'Treinou 7 dias consecutivos!',    points: 150,  category: 'sequencia' },
  { streak: 14,  title: '14 dias seguidos',  description: 'Treinou 14 dias consecutivos!',   points: 300,  category: 'sequencia' },
  { streak: 21,  title: '21 dias seguidos',  description: 'Treinou 21 dias consecutivos!',   points: 400,  category: 'sequencia' },
  { streak: 30,  title: '30 dias seguidos',  description: 'Treinou 30 dias consecutivos!',   points: 500,  category: 'sequencia' },
  { streak: 60,  title: '60 dias seguidos',  description: 'Treinou 60 dias consecutivos!',   points: 750,  category: 'sequencia' },
  { streak: 90,  title: '90 dias seguidos',  description: 'Treinou 90 dias consecutivos!',   points: 1000, category: 'sequencia' },
  { streak: 180, title: '180 dias seguidos', description: 'Treinou 180 dias consecutivos!',  points: 2000, category: 'sequencia' },
  { streak: 365, title: '365 dias seguidos', description: 'Treinou 365 dias consecutivos!',  points: 5000, category: 'sequencia' },

  // Weekly
  { weekLogs: 5, title: 'Beast Mode',       description: 'Treinou 5x em uma semana!',       points: 200, category: 'semanal' },
  { weekLogs: 7, title: 'Semana Perfeita',  description: 'Treinou todos os dias da semana!', points: 500, category: 'semanal' },

  // Levels
  { level: 5,  title: 'Nível 5',   description: 'Alcançou o nível 5!',   points: 250,  category: 'nivel' },
  { level: 10, title: 'Nível 10',  description: 'Alcançou o nível 10!',  points: 500,  category: 'nivel' },
  { level: 15, title: 'Nível 15',  description: 'Alcançou o nível 15!',  points: 750,  category: 'nivel' },
  { level: 25, title: 'Nível 25',  description: 'Alcançou o nível 25!',  points: 1000, category: 'nivel' },
  { level: 50, title: 'Nível 50',  description: 'Alcançou o nível 50!',  points: 2500, category: 'nivel' },

  // Points milestones
  { totalPoints: 1000,  title: '1.000 Pontos',   description: 'Acumulou 1.000 pontos!',    points: 100,  category: 'pontos' },
  { totalPoints: 5000,  title: '5.000 Pontos',   description: 'Acumulou 5.000 pontos!',    points: 250,  category: 'pontos' },
  { totalPoints: 10000, title: '10.000 Pontos',  description: 'Acumulou 10.000 pontos!',   points: 500,  category: 'pontos' },
  { totalPoints: 50000, title: '50.000 Pontos',  description: 'Acumulou 50.000 pontos!',   points: 1000, category: 'pontos' },
];

@Injectable()
export class GamificationService {
  constructor(private prisma: PrismaService) {}

  calculateLevel(points: number): number {
    let level = 1;
    let required = LEVEL_XP_BASE;
    let accumulated = 0;
    while (accumulated + required <= points) {
      accumulated += required;
      level++;
      required = Math.floor(required * LEVEL_MULTIPLIER);
    }
    return level;
  }

  calculateXpForNextLevel(points: number): { current: number; required: number; progress: number } {
    let level = 1;
    let required = LEVEL_XP_BASE;
    let accumulated = 0;
    while (accumulated + required <= points) {
      accumulated += required;
      level++;
      required = Math.floor(required * LEVEL_MULTIPLIER);
    }
    const current = points - accumulated;
    const progress = Math.min(100, Math.round((current / required) * 100));
    return { current, required, progress };
  }

  calculateStreak(lastWorkoutDate: Date | null): number {
    if (!lastWorkoutDate) return 0;
    const now = new Date();
    const last = new Date(lastWorkoutDate);
    const diffMs = now.getTime() - last.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays <= 1) return 1;
    return 0;
  }

  async recordXp(studentId: string, amount: number, source: string, sourceId?: string, description?: string) {
    return this.prisma.xpLog.create({
      data: { studentId, amount, source, sourceId, description },
    });
  }

  async awardWorkoutXp(studentId: string, workoutLogId: string): Promise<{ xp: number; levelUp: boolean; newLevel: number }> {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Aluno não encontrado');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDate = student.lastWorkoutDate ? new Date(student.lastWorkoutDate) : null;
    lastDate?.setHours(0, 0, 0, 0);

    const diffDays = lastDate ? Math.floor((today.getTime() - lastDate.getTime()) / 86400000) : -1;

    let streakBonus = 0;
    let newStreak = 1;

    if (diffDays === 0) {
      newStreak = student.streak || 1;
      streakBonus = 0;
    } else if (diffDays === 1) {
      newStreak = (student.streak || 0) + 1;
      streakBonus = Math.min(newStreak, 30) * 2;
    } else {
      newStreak = 1;
      streakBonus = 0;
    }

    const baseXp = 10;
    const totalXp = baseXp + streakBonus;
    const oldLevel = this.calculateLevel(student.points || 0);
    const newLevel = this.calculateLevel((student.points || 0) + totalXp);
    const levelUp = newLevel > oldLevel;
    const longestStreak = Math.max(student.longestStreak || 0, newStreak);

    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        points: { increment: totalXp },
        streak: newStreak,
        longestStreak,
        level: newLevel,
        lastWorkoutDate: today,
      },
    });

    await this.recordXp(studentId, baseXp, 'workout', workoutLogId, 'Treino completo');
    if (streakBonus > 0) {
      await this.recordXp(studentId, streakBonus, 'streak', workoutLogId, `Bônus de ${newStreak} dias seguidos`);
    }

    await this.checkAndAwardAchievements(studentId);

    return { xp: totalXp, levelUp, newLevel };
  }

  async checkAndAwardAchievements(studentId: string): Promise<string[]> {
    const [student, totalLogs, weekLogs, existing] = await Promise.all([
      this.prisma.student.findUnique({ where: { id: studentId } }),
      this.prisma.workoutLog.count({ where: { studentId } }),
      this.prisma.workoutLog.count({
        where: { studentId, completedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
      this.prisma.achievement.findMany({ where: { studentId }, select: { title: true } }),
    ]);

    if (!student) return [];

    const earned = new Set(existing.map((a) => a.title));
    const toCreate: Array<{ title: string; description: string; points: number; category: string }> = [];

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (earned.has(def.title)) continue;

      let qualifies = false;
      if ('count' in def && def.count !== undefined && totalLogs >= def.count) qualifies = true;
      if ('streak' in def && def.streak !== undefined && (student.streak || 0) >= def.streak) qualifies = true;
      if ('weekLogs' in def && def.weekLogs !== undefined && weekLogs >= def.weekLogs) qualifies = true;
      if ('level' in def && def.level !== undefined && (student.level || 0) >= def.level) qualifies = true;
      if ('totalPoints' in def && def.totalPoints !== undefined && (student.points || 0) >= def.totalPoints) qualifies = true;

      if (qualifies) {
        toCreate.push({
          title: def.title,
          description: def.description,
          points: def.points,
          category: def.category,
        });
      }
    }

    if (toCreate.length === 0) return [];

    const bonusPoints = toCreate.reduce((sum, a) => sum + a.points, 0);
    const newLevel = this.calculateLevel((student.points || 0) + bonusPoints);

    await Promise.all([
      this.prisma.achievement.createMany({
        data: toCreate.map((a) => ({ ...a, studentId })),
      }),
      this.prisma.student.update({
        where: { id: studentId },
        data: { points: { increment: bonusPoints }, level: newLevel },
      }),
    ]);

    for (const a of toCreate) {
      await this.recordXp(studentId, a.points, 'achievement', null, `Conquista: ${a.title}`);
    }

    return toCreate.map((a) => a.title);
  }

  async getDashboard(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });
    if (!student) throw new NotFoundException('Aluno não encontrado');

    const xpInfo = this.calculateXpForNextLevel(student.points || 0);
    const recentAchievements = await this.prisma.achievement.findMany({
      where: { studentId: student.id },
      orderBy: { earnedAt: 'desc' },
      take: 5,
    });

    const totalAchievements = await this.prisma.achievement.count({
      where: { studentId: student.id },
    });

    const xpHistory = await this.prisma.xpLog.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      points: student.points || 0,
      streak: student.streak || 0,
      longestStreak: student.longestStreak || 0,
      level: student.level || 1,
      xpToNextLevel: xpInfo.required,
      xpCurrentLevel: xpInfo.current,
      xpProgress: xpInfo.progress,
      recentAchievements,
      totalAchievements,
      xpHistory,
    };
  }

  async getLeaderboard(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException('Aluno não encontrado');

    const relation = await this.prisma.trainerStudent.findFirst({
      where: { studentId: student.id },
    });
    if (!relation) return { leaderboard: [], myRank: null };

    const siblings = await this.prisma.trainerStudent.findMany({
      where: { trainerId: relation.trainerId },
      include: {
        student: {
          include: { user: { include: { profile: true } } },
        },
      },
    });

    const leaderboard = siblings
      .map((s) => ({
        studentId: s.student.id,
        userId: s.student.userId,
        studentName: [
          s.student.user.profile?.firstName,
          s.student.user.profile?.lastName,
        ].filter(Boolean).join(' ') || s.student.user.email,
        avatarUrl: s.student.user.profile?.avatarUrl,
        points: s.student.points || 0,
        streak: s.student.streak || 0,
        level: s.student.level || 1,
        isMe: s.student.id === student.id,
      }))
      .sort((a, b) => b.points - a.points)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

    const myRank = leaderboard.find((e) => e.isMe) ?? null;

    return { leaderboard, myRank };
  }

  async getXpHistory(userId: string, limit = 30) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException('Aluno não encontrado');

    return this.prisma.xpLog.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
