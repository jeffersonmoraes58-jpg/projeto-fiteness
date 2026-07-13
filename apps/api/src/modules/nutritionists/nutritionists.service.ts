import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class NutritionistsService {
  constructor(private prisma: PrismaService) {}

  private async getNutritionist(userId: string) {
    const n = await this.prisma.nutritionist.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });
    if (!n) throw new NotFoundException('Nutricionista não encontrado');
    return n;
  }

  async getDashboard(userId: string) {
    const n = await this.getNutritionist(userId);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 86400000);

    const [totalPatients, activeDiets, todayConsultations, upcoming, recentPatients, complianceData] = await Promise.all([
      this.prisma.nutritionistPatient.count({ where: { nutritionistId: n.id, isActive: true } }),
      this.prisma.diet.count({ where: { nutritionistId: n.id, status: 'ACTIVE' } }),
      this.prisma.nutritionalConsultation.count({
        where: { nutritionistId: n.id, scheduledAt: { gte: todayStart } },
      }),
      this.prisma.nutritionalConsultation.findMany({
        where: { nutritionistId: n.id, scheduledAt: { gte: now } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
      (async () => {
        const relations = await this.prisma.nutritionistPatient.findMany({
          where: { nutritionistId: n.id, isActive: true },
          include: {
            student: {
              include: { user: { include: { profile: true } } },
            },
          },
          take: 6,
          orderBy: { startedAt: 'desc' },
        });
        return relations.map((r) => ({
          id: r.student.id,
          userId: r.student.userId,
          isActive: r.isActive,
          monthlyFee: r.monthlyFee,
          startedAt: r.startedAt,
          goalType: r.student.goalType || null,
          user: {
            email: r.student.user?.email || '',
            profile: {
              firstName: r.student.user?.profile?.firstName || '',
              lastName: r.student.user?.profile?.lastName || '',
              phone: r.student.user?.profile?.phone || null,
              avatarUrl: r.student.user?.profile?.avatarUrl || null,
            },
          },
        }));
      })(),
      (async () => {
        // Calcular adesão dos últimos 7 dias com base em meal logs vs refeições planejadas
        const activePlans = await this.prisma.dietPlan.findMany({
          where: {
            student: { nutritionists: { some: { nutritionistId: n.id } } },
            isActive: true,
          },
          include: { diet: { include: { meals: true } } },
        });

        const planIds = activePlans.map((p) => p.id);
        const totalPlannedMealsPerDay = activePlans.reduce((sum, plan) => sum + plan.diet.meals.length, 0);

        const byDay: Record<string, { planned: number; logged: number }> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(todayStart.getTime() - i * 86400000);
          const key = d.toISOString().slice(0, 10);
          byDay[key] = { planned: totalPlannedMealsPerDay, logged: 0 };
        }

        const dailyLogs = await this.prisma.mealLog.findMany({
          where: {
            dietPlanId: { in: planIds },
            loggedAt: { gte: sevenDaysAgo },
          },
          select: { loggedAt: true },
        });

        for (const log of dailyLogs) {
          const key = log.loggedAt.toISOString().slice(0, 10);
          if (byDay[key]) {
            byDay[key].logged++;
          }
        }

        const weeklyCompliance = Object.values(byDay).map((d) =>
          d.planned > 0 ? Math.round((d.logged / d.planned) * 100) : 0,
        );
        const avgCompliance = weeklyCompliance.length > 0
          ? Math.round(weeklyCompliance.reduce((a, b) => a + b, 0) / weeklyCompliance.length)
          : 0;
        return { weeklyCompliance, avgCompliance };
      })(),
    ]);
    return {
      nutritionist: n,
      stats: {
        patients: totalPatients,
        diets: activeDiets,
        consultationsToday: todayConsultations,
        avgCompliance: complianceData.avgCompliance,
        weeklyCompliance: complianceData.weeklyCompliance,
      },
      recentPatients,
      todayConsultations: upcoming,
    };
  }

  async getPatients(userId: string, search?: string) {
    const n = await this.getNutritionist(userId);
    const relations = await this.prisma.nutritionistPatient.findMany({
      where: { nutritionistId: n.id, isActive: true },
      include: { student: { include: { user: { include: { profile: true } } } } },
    });
    const results = relations.map((r) => ({
      id: r.student.id,
      userId: r.student.userId,
      isActive: r.isActive,
      monthlyFee: r.monthlyFee,
      startedAt: r.startedAt,
      goalType: r.student.goalType || null,
      user: {
        email: r.student.user?.email || '',
        profile: {
          firstName: r.student.user?.profile?.firstName || '',
          lastName: r.student.user?.profile?.lastName || '',
          phone: r.student.user?.profile?.phone || null,
          avatarUrl: r.student.user?.profile?.avatarUrl || null,
        },
      },
    }));
    if (!search) return results;
    const q = search.toLowerCase();
    return results.filter((s) => {
      const name = `${s.user?.profile?.firstName} ${s.user?.profile?.lastName} ${s.user?.email}`.toLowerCase();
      return name.includes(q);
    });
  }

  async searchStudents(userId: string, search: string) {
    await this.getNutritionist(userId);
    const q = search.trim();
    const students = await this.prisma.student.findMany({
      where: {
        user: {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { profile: { firstName: { contains: q, mode: 'insensitive' } } },
            { profile: { lastName: { contains: q, mode: 'insensitive' } } },
          ],
        },
      },
      include: { user: { include: { profile: true } } },
      take: 20,
    });
    return students.map((s) => ({
      id: s.userId,
      studentId: s.id,
      email: s.user?.email,
      profile: s.user?.profile,
    }));
  }

  async createPatientUser(userId: string, data: { firstName: string; lastName: string; email: string; phone?: string; monthlyFee?: number }) {
    const n = await this.getNutritionist(userId);
    const existing = await this.prisma.user.findFirst({ where: { tenantId: n.user.tenantId, email: data.email } });
    if (existing) throw new ConflictException('Já existe um usuário com este e-mail');
    const tempPassword = `Fit@${Math.random().toString(36).slice(-6).toUpperCase()}1`;
    const hashed = await bcrypt.hash(tempPassword, 12);
    const newUser = await this.prisma.user.create({
      data: {
        tenantId: n.user.tenantId,
        email: data.email,
        password: hashed,
        role: 'STUDENT',
        profile: { create: { firstName: data.firstName, lastName: data.lastName, phone: data.phone } },
        student: { create: {} },
      },
      include: { profile: true, student: true },
    });
    await this.prisma.nutritionistPatient.create({
      data: { nutritionistId: n.id, studentId: newUser.student!.id, isActive: true, monthlyFee: data.monthlyFee },
    });
    return { ...newUser, tempPassword };
  }

  async addPatient(userId: string, studentUserId: string, monthlyFee?: number) {
    const n = await this.getNutritionist(userId);
    const student = await this.prisma.student.findUnique({ where: { userId: studentUserId } });
    if (!student) throw new NotFoundException('Aluno não encontrado');
    return this.prisma.nutritionistPatient.upsert({
      where: { nutritionistId_studentId: { nutritionistId: n.id, studentId: student.id } },
      update: { isActive: true, monthlyFee },
      create: { nutritionistId: n.id, studentId: student.id, monthlyFee, isActive: true },
    });
  }

  async getConsultations(userId: string) {
    const n = await this.getNutritionist(userId);
    return this.prisma.nutritionalConsultation.findMany({
      where: { nutritionistId: n.id },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async createConsultation(userId: string, data: any) {
    const n = await this.getNutritionist(userId);
    return this.prisma.nutritionalConsultation.create({ data: { nutritionistId: n.id, ...data } });
  }

  async getFoodDatabase(userId: string, search?: string, category?: string) {
    const n = await this.getNutritionist(userId);
    return this.prisma.foodDatabase.findMany({
      where: {
        OR: [{ nutritionistId: n.id }, { isPublic: true }],
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
        ...(category && { category }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async addFood(userId: string, data: any) {
    const n = await this.getNutritionist(userId);
    return this.prisma.foodDatabase.create({ data: { nutritionistId: n.id, ...data } });
  }

  async updateFood(userId: string, foodId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const food = await this.prisma.foodDatabase.findUnique({ where: { id: foodId } });
    if (!food) throw new NotFoundException('Alimento não encontrado');
    if (food.nutritionistId !== n.id) throw new ForbiddenException('Sem permissão para editar este alimento');
    return this.prisma.foodDatabase.update({ where: { id: foodId }, data });
  }

  async deleteFood(userId: string, foodId: string) {
    const n = await this.getNutritionist(userId);
    const food = await this.prisma.foodDatabase.findUnique({ where: { id: foodId } });
    if (!food) throw new NotFoundException('Alimento não encontrado');
    if (food.nutritionistId !== n.id) throw new ForbiddenException('Sem permissão para excluir este alimento');
    await this.prisma.foodDatabase.delete({ where: { id: foodId } });
    return { deleted: true };
  }

  async getReports(userId: string) {
    const n = await this.getNutritionist(userId);
    const since = new Date(Date.now() - 30 * 86400000);
    const [totalPatients, activePatients, consultations] = await Promise.all([
      this.prisma.nutritionistPatient.count({ where: { nutritionistId: n.id } }),
      this.prisma.nutritionistPatient.count({ where: { nutritionistId: n.id, isActive: true } }),
      this.prisma.nutritionalConsultation.count({ where: { nutritionistId: n.id, scheduledAt: { gte: since } } }),
    ]);
    return { summary: { totalPatients, activePatients, consultationsLast30Days: consultations } };
  }

  async getPatientExams(userId: string, studentId: string) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({ where: { nutritionistId: n.id, studentId } });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.patientExam.findMany({
      where: { studentId, nutritionistId: n.id },
      orderBy: { examDate: 'desc' },
    });
  }

  async addPatientExam(userId: string, studentId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({ where: { nutritionistId: n.id, studentId } });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.patientExam.create({ data: { studentId, nutritionistId: n.id, ...data } });
  }

  async deletePatientExam(userId: string, studentId: string, examId: string) {
    const n = await this.getNutritionist(userId);
    await this.prisma.patientExam.deleteMany({ where: { id: examId, studentId, nutritionistId: n.id } });
    return { deleted: true };
  }

  async update(userId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const { profile, ...nData } = data;
    const [updated] = await Promise.all([
      Object.keys(nData).length ? this.prisma.nutritionist.update({ where: { id: n.id }, data: nData }) : n,
      profile ? this.prisma.profile.update({ where: { userId }, data: profile }) : null,
    ]);
    return updated;
  }

  async getAnamnesis(userId: string, studentId: string) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.anamnesis.findUnique({ where: { studentId } });
  }

  async upsertAnamnesis(userId: string, studentId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.anamnesis.upsert({
      where: { studentId },
      update: { ...data, updatedAt: new Date() },
      create: { studentId, ...data },
    });
  }

  async getNutritionalAssessments(userId: string, studentId: string) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.nutritionalAssessment.findMany({
      where: { studentId },
      orderBy: { assessedAt: 'desc' },
    });
  }

  async createNutritionalAssessment(userId: string, studentId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.nutritionalAssessment.create({
      data: { studentId, nutritionistId: n.id, ...data },
    });
  }

  async getPhysicalAssessments(userId: string, studentId: string) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.physicalAssessment.findMany({
      where: { studentId },
      orderBy: { assessedAt: 'desc' },
    });
  }

  async createPhysicalAssessment(userId: string, studentId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.physicalAssessment.create({
      data: { studentId, ...data },
    });
  }

  async getClinicalNotes(userId: string, studentId: string) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.clinicalNote.findMany({
      where: { studentId, nutritionistId: n.id },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createClinicalNote(userId: string, studentId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.clinicalNote.create({
      data: { studentId, nutritionistId: n.id, ...data },
    });
  }

  async updateClinicalNote(userId: string, noteId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id: noteId, nutritionistId: n.id },
    });
    if (!note) throw new NotFoundException('Nota não encontrada');
    return this.prisma.clinicalNote.update({ where: { id: noteId }, data });
  }

  async deleteClinicalNote(userId: string, noteId: string) {
    const n = await this.getNutritionist(userId);
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id: noteId, nutritionistId: n.id },
    });
    if (!note) throw new NotFoundException('Nota não encontrada');
    await this.prisma.clinicalNote.delete({ where: { id: noteId } });
    return { deleted: true };
  }

  async getPatientDietHistory(userId: string, studentId: string) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    const plans = await this.prisma.dietPlan.findMany({
      where: { studentId },
      include: {
        diet: {
          select: {
            id: true, name: true, description: true, status: true,
            totalCalories: true, totalProtein: true, totalCarbs: true,
            totalFat: true, tags: true,
          },
        },
        _count: { select: { mealLogs: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return plans;
  }

  async updateDietPlan(userId: string, planId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const plan = await this.prisma.dietPlan.findFirst({
      where: { id: planId, student: { nutritionists: { some: { nutritionistId: n.id } } } },
    });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    return this.prisma.dietPlan.update({ where: { id: planId }, data });
  }

  async getPatientGoals(userId: string, studentId: string) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.goal.findMany({
      where: { studentId },
      orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createPatientGoal(userId: string, studentId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.goal.create({ data: { studentId, ...data } });
  }

  async updatePatientGoal(userId: string, goalId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, student: { nutritionists: { some: { nutritionistId: n.id } } } },
    });
    if (!goal) throw new NotFoundException('Meta não encontrada');
    const update: any = { ...data };
    if (data.isCompleted && !goal.completedAt) update.completedAt = new Date();
    if (data.isCompleted === false) update.completedAt = null;
    return this.prisma.goal.update({ where: { id: goalId }, data: update });
  }

  async deletePatientGoal(userId: string, goalId: string) {
    const n = await this.getNutritionist(userId);
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, student: { nutritionists: { some: { nutritionistId: n.id } } } },
    });
    if (!goal) throw new NotFoundException('Meta não encontrada');
    await this.prisma.goal.delete({ where: { id: goalId } });
    return { deleted: true };
  }

  async getProgressPhotos(userId: string, studentId: string) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.progressPhoto.findMany({
      where: { studentId },
      orderBy: { takenAt: 'desc' },
    });
  }

  async addProgressPhoto(userId: string, studentId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.progressPhoto.create({ data: { studentId, ...data } });
  }

  async deleteProgressPhoto(userId: string, studentId: string, photoId: string) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    const photo = await this.prisma.progressPhoto.findFirst({ where: { id: photoId, studentId } });
    if (!photo) throw new NotFoundException('Foto não encontrada');
    await this.prisma.progressPhoto.delete({ where: { id: photoId } });
    return { deleted: true, photoUrl: photo.photoUrl };
  }

  async getDailyWeightLog(userId: string, studentId: string) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.bodyMeasurement.findMany({
      where: { studentId },
      orderBy: { measuredAt: 'desc' },
      take: 90,
    });
  }

  async addDailyWeight(userId: string, studentId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.bodyMeasurement.create({
      data: { studentId, ...data },
    });
  }

  async getPatientEvolution(userId: string, studentId: string) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    const [physical, nutritional] = await Promise.all([
      this.prisma.physicalAssessment.findMany({
        where: { studentId },
        orderBy: { assessedAt: 'asc' },
        select: {
          assessedAt: true, weight: true, height: true, bmi: true,
          bodyFatPercent: true, muscleMassKg: true, waterPercent: true,
          waistCm: true, hipCm: true, abdomenCm: true,
          rightArmCm: true, rightThighCm: true,
        },
      }),
      this.prisma.nutritionalAssessment.findMany({
        where: { studentId },
        orderBy: { assessedAt: 'asc' },
        select: { assessedAt: true, weight: true, bmi: true, get: true, tmb: true },
      }),
    ]);
    return { physical, nutritional };
  }

  async getPatientConsultations(userId: string, studentId: string) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.nutritionalConsultation.findMany({
      where: { nutritionistId: n.id, studentId },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async createPatientConsultation(userId: string, studentId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.nutritionalConsultation.create({
      data: { nutritionistId: n.id, studentId, ...data },
    });
  }

  async updateConsultation(userId: string, consultationId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const consultation = await this.prisma.nutritionalConsultation.findFirst({
      where: { id: consultationId, nutritionistId: n.id },
    });
    if (!consultation) throw new NotFoundException('Consulta não encontrada');
    return this.prisma.nutritionalConsultation.update({
      where: { id: consultationId },
      data,
    });
  }

  async getSupplementationPlans(userId: string, studentId: string) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.supplementationPlan.findMany({
      where: { studentId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSupplementationPlan(userId: string, studentId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const relation = await this.prisma.nutritionistPatient.findFirst({
      where: { nutritionistId: n.id, studentId },
    });
    if (!relation) throw new NotFoundException('Paciente não encontrado');
    const { items, ...planData } = data;
    return this.prisma.supplementationPlan.create({
      data: {
        studentId,
        nutritionistId: n.id,
        ...planData,
        items: items?.length ? { create: items } : undefined,
      },
      include: { items: true },
    });
  }

  // ── Calculadora TMB/GET + Macros ─────────────────────────

  async calculateTMB(params: {
    weight: number;
    height: number;
    age: number;
    gender: string;
    activityLevel: string;
    goal: string;
    formula?: string;
  }) {
    const { weight, height, age, gender, activityLevel, goal, formula = 'mifflin' } = params;

    // Fatores de atividade
    const activityFactors: Record<string, number> = {
      SEDENTARY: 1.2,
      LIGHTLY_ACTIVE: 1.375,
      MODERATELY_ACTIVE: 1.55,
      VERY_ACTIVE: 1.725,
      EXTRA_ACTIVE: 1.9,
    };

    const factor = activityFactors[activityLevel] || 1.55;

    // Cálculo TMB
    let tmb: number;
    if (formula === 'harris') {
      tmb = gender === 'MALE'
        ? 88.36 + (13.4 * weight) + (4.8 * height) - (5.7 * age)
        : 447.6 + (9.2 * weight) + (3.1 * height) - (4.3 * age);
    } else if (formula === 'fao') {
      tmb = gender === 'MALE'
        ? (15.3 * weight) + 679
        : (14.7 * weight) + 496;
    } else {
      // Mifflin-St Jeor (default)
      tmb = gender === 'MALE'
        ? (10 * weight) + (6.25 * height) - (5 * age) + 5
        : (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    const get = Math.round(tmb * factor);

    // Ajuste calórico por objetivo
    let targetCalories: number;
    let proteinPerKg: number;
    let fatPct: number;

    switch (goal) {
      case 'LOSE_WEIGHT':
        targetCalories = Math.round(get * 0.8); // déficit 20%
        proteinPerKg = 2.0; // alta proteína pra preservar massa
        fatPct = 0.25;
        break;
      case 'GAIN_MUSCLE':
        targetCalories = Math.round(get * 1.15); // superávit 15%
        proteinPerKg = 1.8;
        fatPct = 0.25;
        break;
      case 'MAINTAIN_WEIGHT':
        targetCalories = get;
        proteinPerKg = 1.6;
        fatPct = 0.25;
        break;
      default:
        targetCalories = get;
        proteinPerKg = 1.6;
        fatPct = 0.25;
    }

    const proteinGrams = Math.round(weight * proteinPerKg);
    const proteinKcal = proteinGrams * 4;
    const fatKcal = Math.round(targetCalories * fatPct);
    const fatGrams = Math.round(fatKcal / 9);
    const carbsKcal = targetCalories - proteinKcal - fatKcal;
    const carbsGrams = Math.round(carbsKcal / 4);

    return {
      tmb: Math.round(tmb),
      get,
      targetCalories,
      macros: {
        protein: { grams: proteinGrams, kcal: proteinKcal, pct: Math.round((proteinKcal / targetCalories) * 100) },
        carbs: { grams: carbsGrams, kcal: carbsKcal, pct: Math.round((carbsKcal / targetCalories) * 100) },
        fat: { grams: fatGrams, kcal: fatKcal, pct: Math.round((fatKcal / targetCalories) * 100) },
      },
      formula,
      activityFactor: factor,
    };
  }

  async updateSupplementationPlan(userId: string, planId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const plan = await this.prisma.supplementationPlan.findFirst({
      where: { id: planId, nutritionistId: n.id },
    });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    const { items, ...planData } = data;
    if (items) {
      await this.prisma.supplementationPlanItem.deleteMany({ where: { planId } });
    }
    return this.prisma.supplementationPlan.update({
      where: { id: planId },
      data: {
        ...planData,
        ...(items && { items: { create: items } }),
      },
      include: { items: true },
    });
  }
}

