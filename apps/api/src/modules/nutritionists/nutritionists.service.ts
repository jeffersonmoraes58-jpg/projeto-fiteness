import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    const [totalPatients, activeDiets, todayConsultations, upcoming] = await Promise.all([
      this.prisma.nutritionistPatient.count({ where: { nutritionistId: n.id, isActive: true } }),
      this.prisma.diet.count({ where: { nutritionistId: n.id, status: 'ACTIVE' } }),
      this.prisma.nutritionalConsultation.count({
        where: {
          nutritionistId: n.id,
          scheduledAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.nutritionalConsultation.findMany({
        where: { nutritionistId: n.id, scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
    ]);
    return { nutritionist: n, stats: { totalPatients, activeDiets, todayConsultations }, upcoming };
  }

  async getPatients(userId: string, search?: string) {
    const n = await this.getNutritionist(userId);
    const relations = await this.prisma.nutritionistPatient.findMany({
      where: { nutritionistId: n.id, isActive: true },
      include: { student: { include: { user: { include: { profile: true } } } } },
    });
    const results = relations.map((r) => ({ ...r.student, monthlyFee: r.monthlyFee, startedAt: r.startedAt }));
    if (!search) return results;
    const q = search.toLowerCase();
    return results.filter((s) => {
      const name = `${s.user?.profile?.firstName} ${s.user?.profile?.lastName} ${s.user?.email}`.toLowerCase();
      return name.includes(q);
    });
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

