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
}

