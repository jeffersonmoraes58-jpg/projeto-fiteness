import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  private async getStudent(userId: string) {
    const s = await this.prisma.student.findUnique({ where: { userId } });
    if (!s) throw new NotFoundException('Aluno não encontrado');
    return s;
  }

  async findAll(userId: string) {
    const student = await this.getStudent(userId);
    return this.prisma.goal.findMany({
      where: { studentId: student.id },
      orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, data: any) {
    const student = await this.getStudent(userId);
    return this.prisma.goal.create({ data: { studentId: student.id, ...data } });
  }

  async update(userId: string, id: string, data: any) {
    const student = await this.getStudent(userId);
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal || goal.studentId !== student.id) throw new ForbiddenException();
    return this.prisma.goal.update({ where: { id }, data });
  }

  async complete(userId: string, id: string) {
    const student = await this.getStudent(userId);
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal || goal.studentId !== student.id) throw new ForbiddenException();
    const updated = await this.prisma.goal.update({
      where: { id },
      data: { isCompleted: true, completedAt: new Date(), currentValue: goal.targetValue },
    });
    await this.prisma.student.update({ where: { id: student.id }, data: { points: { increment: 50 } } });
    return updated;
  }

  async remove(userId: string, id: string) {
    const student = await this.getStudent(userId);
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal || goal.studentId !== student.id) throw new ForbiddenException();
    return this.prisma.goal.delete({ where: { id } });
  }
}

