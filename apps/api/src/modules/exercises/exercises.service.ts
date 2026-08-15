import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, tenantId: string, category?: string, search?: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });
    return this.prisma.exercise.findMany({
      where: {
        OR: [
          { isPublic: true, trainerId: null },
          { trainerId: trainer?.id ?? undefined },
        ],
        ...(category && { category: category as any }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            ...(this.isValidCategory(search) ? [{ category: this.normalizeSearch(search) as any }] : []),
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });
  }

  private readonly validCategories = new Set([
    'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS',
    'LEGS', 'GLUTES', 'CORE', 'CARDIO', 'FULL_BODY', 'MOBILITY',
  ]);

  private normalizeSearch(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  }

  private isValidCategory(value: string): boolean {
    return this.validCategories.has(this.normalizeSearch(value));
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
    return this.prisma.$transaction(async (tx) => {
      const refs = await tx.workoutExercise.findMany({
        where: { exerciseId: id },
        select: { id: true },
      });
      if (refs.length) {
        await tx.workoutExerciseLog.deleteMany({
          where: { workoutExerciseId: { in: refs.map((r) => r.id) } },
        });
        await tx.workoutExercise.deleteMany({ where: { exerciseId: id } });
      }
      return tx.exercise.delete({ where: { id } });
    });
  }
}

