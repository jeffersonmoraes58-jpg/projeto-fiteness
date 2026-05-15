import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { AssignWorkoutDto } from './dto/assign-workout.dto';
import { WorkoutStatus } from '@prisma/client';

@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkoutDto, userId: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });
    if (!trainer) throw new ForbiddenException('Usuário não é trainer');

    return this.prisma.workout.create({
      data: {
        ...dto,
        trainerId: trainer.id,
        exercises: dto.exercises
          ? {
              create: dto.exercises.map((ex, index) => ({
                exerciseId: ex.exerciseId,
                order: index,
                sets: ex.sets,
                reps: ex.reps,
                weight: ex.weight,
                restSeconds: ex.restSeconds,
                tempo: ex.tempo,
                notes: ex.notes,
                isDropSet: ex.isDropSet,
                isSuperSet: ex.isSuperSet,
                superSetGroupId: ex.superSetGroupId,
              })),
            }
          : undefined,
      },
      include: {
        exercises: { include: { exercise: true }, orderBy: { order: 'asc' } },
      },
    });
  }

  async findAll(userId: string, search?: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });
    if (!trainer) throw new ForbiddenException('Usuário não é trainer');

    return this.prisma.workout.findMany({
      where: {
        trainerId: trainer.id,
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
      },
      include: {
        exercises: { include: { exercise: true }, orderBy: { order: 'asc' } },
        _count: { select: { plans: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplates(search?: string) {
    return this.prisma.workout.findMany({
      where: {
        isTemplate: true,
        status: WorkoutStatus.ACTIVE,
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
      },
      include: {
        exercises: { include: { exercise: true }, orderBy: { order: 'asc' } },
      },
    });
  }

  async findOne(id: string) {
    const workout = await this.prisma.workout.findUnique({
      where: { id },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
        trainer: { include: { user: { include: { profile: true } } } },
      },
    });

    if (!workout) throw new NotFoundException('Treino não encontrado');
    return workout;
  }

  async update(id: string, dto: UpdateWorkoutDto) {
    await this.findOne(id);

    if (dto.exercises !== undefined) {
      await this.prisma.workoutExercise.deleteMany({ where: { workoutId: id } });

      // Persist videoUrl on the Exercise entity for any exercise that has it set
      for (const ex of dto.exercises) {
        if (ex.videoUrl !== undefined) {
          await this.prisma.exercise.update({
            where: { id: ex.exerciseId },
            data: { videoUrl: ex.videoUrl || null },
          });
        }
      }
    }

    return this.prisma.workout.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        level: dto.level,
        duration: dto.duration,
        tags: dto.tags,
        ...(dto.exercises !== undefined && {
          exercises: {
            create: dto.exercises.map((ex, index) => ({
              exerciseId: ex.exerciseId,
              order: index,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight,
              restSeconds: ex.restSeconds,
              tempo: ex.tempo,
              notes: ex.notes,
              isDropSet: ex.isDropSet,
              isSuperSet: ex.isSuperSet,
              superSetGroupId: ex.superSetGroupId,
            })),
          },
        }),
      },
      include: {
        exercises: { include: { exercise: true }, orderBy: { order: 'asc' } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.workout.delete({ where: { id } });
    return { message: 'Treino deletado com sucesso' };
  }

  async assignToStudent(workoutId: string, dto: AssignWorkoutDto) {
    const workout = await this.findOne(workoutId);

    return this.prisma.workoutPlan.create({
      data: {
        studentId: dto.studentId,
        workoutId,
        division: dto.division,
        dayOfWeek: dto.dayOfWeek,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        notes: dto.notes,
      },
      include: { workout: true, student: { include: { user: { include: { profile: true } } } } },
    });
  }

  async removePlan(planId: string) {
    await this.prisma.workoutPlan.delete({ where: { id: planId } });
    return { message: 'Plano removido com sucesso' };
  }

  async getStudentWorkouts(studentId: string) {
    return this.prisma.workoutPlan.findMany({
      where: { studentId, isActive: true },
      include: {
        workout: {
          include: {
            exercises: { include: { exercise: true }, orderBy: { order: 'asc' } },
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async getTodayWorkout(studentId: string) {
    const dayOfWeek = new Date().getDay();

    return this.prisma.workoutPlan.findFirst({
      where: {
        studentId,
        isActive: true,
        dayOfWeek: { has: dayOfWeek },
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      include: {
        workout: {
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  async logWorkout(data: any, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new ForbiddenException('Usuário não é aluno');

    const log = await this.prisma.workoutLog.create({
      data: {
        studentId: student.id,
        workoutPlanId: data.workoutPlanId,
        startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
        completedAt: data.completedAt ? new Date(data.completedAt) : new Date(),
        duration: data.duration,
        status: data.status,
        notes: data.notes,
        feeling: data.feeling,
        exerciseLogs: {
          create: (data.exerciseLogs || []).map((el: any) => ({
            workoutExerciseId: el.workoutExerciseId,
            setNumber: el.setNumber,
            reps: el.reps,
            weight: el.weight,
            duration: el.duration,
            notes: el.notes,
          })),
        },
      },
    });

    // Update student streak and points
    await this.updateStudentStreak(student.id);

    return log;
  }

  private async updateStudentStreak(studentId: string) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayLog = await this.prisma.workoutLog.findFirst({
      where: {
        studentId,
        completedAt: { gte: yesterday, lt: todayStart },
      },
    });

    const student = await this.prisma.student.findUnique({ where: { id: studentId } });

    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        streak: yesterdayLog ? (student?.streak || 0) + 1 : 1,
        points: { increment: 10 },
      },
    });
  }
}
