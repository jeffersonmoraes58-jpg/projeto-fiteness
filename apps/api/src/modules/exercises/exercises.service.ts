import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, tenantId: string, category?: string, search?: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });
    return this.prisma.exercise.findMany({
      where: {
        OR: [{ isPublic: true }, { trainerId: trainer?.id ?? undefined }],
        ...(category && { category: category as any }),
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } });
    if (!exercise) throw new NotFoundException('Exercício não encontrado');
    return exercise;
  }

  async create(userId: string, data: any) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });
    if (!trainer) throw new ForbiddenException('Apenas trainers podem criar exercícios');
    return this.prisma.exercise.create({
      data: { trainerId: trainer.id, ...data },
    });
  }

  async update(userId: string, id: string, data: any) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });
    const exercise = await this.findOne(id);
    if (exercise.trainerId && exercise.trainerId !== trainer?.id) {
      throw new ForbiddenException('Sem permissão para editar este exercício');
    }
    return this.prisma.exercise.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });
    const exercise = await this.findOne(id);
    if (exercise.trainerId !== trainer?.id) throw new ForbiddenException('Sem permissão');
    return this.prisma.exercise.delete({ where: { id } });
  }
}

