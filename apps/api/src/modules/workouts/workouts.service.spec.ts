import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  trainer: { findUnique: jest.fn() },
  workout: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  workoutPlan: { create: jest.fn() },
};

const mockTrainer = { id: 'trainer-1', userId: 'user-1' };
const mockWorkout = {
  id: 'workout-1',
  name: 'Treino A',
  trainerId: 'trainer-1',
  exercises: [],
  _count: { plans: 0 },
};

describe('WorkoutsService', () => {
  let service: WorkoutsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorkoutsService>(WorkoutsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar um treino para um trainer válido', async () => {
      mockPrisma.trainer.findUnique.mockResolvedValue(mockTrainer);
      mockPrisma.workout.create.mockResolvedValue(mockWorkout);

      const result = await service.create(
        { name: 'Treino A', description: 'desc', level: 1, duration: 60 } as any,
        'user-1',
      );

      expect(mockPrisma.trainer.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(mockPrisma.workout.create).toHaveBeenCalled();
      expect(result).toEqual(mockWorkout);
    });

    it('deve lançar ForbiddenException se o usuário não for trainer', async () => {
      mockPrisma.trainer.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ name: 'X' } as any, 'user-sem-trainer'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('deve retornar a lista de treinos do trainer', async () => {
      mockPrisma.trainer.findUnique.mockResolvedValue(mockTrainer);
      mockPrisma.workout.findMany.mockResolvedValue([mockWorkout]);

      const result = await service.findAll('user-1');

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { trainerId: 'trainer-1' } }),
      );
      expect(result).toHaveLength(1);
    });

    it('deve lançar ForbiddenException se não for trainer', async () => {
      mockPrisma.trainer.findUnique.mockResolvedValue(null);
      await expect(service.findAll('user-x')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('deve retornar o treino pelo id', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(mockWorkout);

      const result = await service.findOne('workout-1');

      expect(mockPrisma.workout.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'workout-1' } }),
      );
      expect(result.id).toBe('workout-1');
    });

    it('deve lançar NotFoundException para id inexistente', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deve deletar o treino', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(mockWorkout);
      mockPrisma.workout.delete.mockResolvedValue(mockWorkout);

      const result = await service.remove('workout-1');

      expect(mockPrisma.workout.delete).toHaveBeenCalledWith({ where: { id: 'workout-1' } });
      expect(result).toEqual({ message: 'Treino deletado com sucesso' });
    });

    it('deve lançar NotFoundException para treino inexistente', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(null);
      await expect(service.remove('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignToStudent', () => {
    it('deve atribuir treino ao aluno', async () => {
      const mockPlan = { id: 'plan-1', workoutId: 'workout-1', studentId: 'student-1' };
      mockPrisma.workout.findUnique.mockResolvedValue(mockWorkout);
      mockPrisma.workoutPlan.create.mockResolvedValue(mockPlan);

      const result = await service.assignToStudent('workout-1', {
        studentId: 'student-1',
        dayOfWeek: [1, 3, 5],
        startDate: '2026-05-13',
      } as any);

      expect(mockPrisma.workoutPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studentId: 'student-1',
            workoutId: 'workout-1',
          }),
        }),
      );
      expect(result).toEqual(mockPlan);
    });

    it('deve lançar NotFoundException se treino não existir', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(null);
      await expect(
        service.assignToStudent('nao-existe', { studentId: 'student-1', dayOfWeek: [1], startDate: '2026-05-13' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
