import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DietsService {
  constructor(private prisma: PrismaService) {}

  private async getNutritionist(userId: string) {
    const n = await this.prisma.nutritionist.findUnique({ where: { userId } });
    if (!n) throw new ForbiddenException('Apenas nutricionistas podem gerenciar dietas');
    return n;
  }

  async findAll(userId: string) {
    const n = await this.getNutritionist(userId);
    return this.prisma.diet.findMany({
      where: { nutritionistId: n.id },
      include: { meals: { include: { foods: true }, orderBy: { order: 'asc' } }, _count: { select: { plans: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const n = await this.getNutritionist(userId);
    const diet = await this.prisma.diet.findUnique({
      where: { id },
      include: { meals: { include: { foods: true }, orderBy: { order: 'asc' } } },
    });
    if (!diet) throw new NotFoundException('Dieta não encontrada');
    if (diet.nutritionistId !== n.id) throw new ForbiddenException();
    return diet;
  }

  async create(userId: string, data: any) {
    const n = await this.getNutritionist(userId);
    const { meals, ...dietData } = data;
    return this.prisma.diet.create({
      data: {
        nutritionistId: n.id,
        ...dietData,
        ...(meals && {
          meals: {
            create: meals.map((m: any, i: number) => ({
              ...m,
              order: i,
              foods: m.foods ? { create: m.foods } : undefined,
            })),
          },
        }),
      },
      include: { meals: { include: { foods: true } } },
    });
  }

  async update(userId: string, id: string, data: any) {
    const n = await this.getNutritionist(userId);
    const diet = await this.prisma.diet.findUnique({ where: { id } });
    if (!diet || diet.nutritionistId !== n.id) throw new ForbiddenException();
    const { meals, ...dietData } = data;

    if (meals !== undefined) {
      await this.prisma.dietMeal.deleteMany({ where: { dietId: id } });
    }

    return this.prisma.diet.update({
      where: { id },
      data: {
        ...dietData,
        ...(meals !== undefined && {
          meals: {
            create: meals.map((m: any, i: number) => ({
              name: m.name,
              type: m.type,
              order: i,
              time: m.time ?? null,
              calories: m.calories ?? null,
              protein: m.protein ?? null,
              carbs: m.carbs ?? null,
              fat: m.fat ?? null,
              notes: m.notes ?? null,
            })),
          },
        }),
      },
      include: { meals: { include: { foods: true }, orderBy: { order: 'asc' } } },
    });
  }

  async removePlan(planId: string) {
    await this.prisma.dietPlan.delete({ where: { id: planId } });
    return { message: 'Plano de dieta removido com sucesso' };
  }

  async remove(userId: string, id: string) {
    const n = await this.getNutritionist(userId);
    const diet = await this.prisma.diet.findUnique({ where: { id } });
    if (!diet || diet.nutritionistId !== n.id) throw new ForbiddenException();
    return this.prisma.diet.delete({ where: { id } });
  }

  async assignToStudent(userId: string, dietId: string, studentUserId: string) {
    const n = await this.getNutritionist(userId);
    const diet = await this.prisma.diet.findUnique({ where: { id: dietId } });
    if (!diet || diet.nutritionistId !== n.id) throw new ForbiddenException();
    const student = await this.prisma.student.findUnique({ where: { userId: studentUserId } });
    if (!student) throw new NotFoundException('Aluno não encontrado');
    await this.prisma.dietPlan.updateMany({ where: { studentId: student.id, isActive: true }, data: { isActive: false } });
    return this.prisma.dietPlan.create({ data: { studentId: student.id, dietId, isActive: true, startDate: new Date() } });
  }
}

