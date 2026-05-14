import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DietsService } from './diets.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  nutritionist: { findUnique: jest.fn() },
  diet: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  dietPlan: { create: jest.fn(), updateMany: jest.fn() },
  student: { findUnique: jest.fn() },
};

const mockNutritionist = { id: 'nutri-1', userId: 'user-nutri' };
const mockDiet = {
  id: 'diet-1',
  name: 'Dieta Low Carb',
  nutritionistId: 'nutri-1',
  meals: [],
};

describe('DietsService', () => {
  let service: DietsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DietsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DietsService>(DietsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve retornar dietas do nutricionista', async () => {
      mockPrisma.nutritionist.findUnique.mockResolvedValue(mockNutritionist);
      mockPrisma.diet.findMany.mockResolvedValue([mockDiet]);

      const result = await service.findAll('user-nutri');

      expect(mockPrisma.nutritionist.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-nutri' } });
      expect(mockPrisma.diet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { nutritionistId: 'nutri-1' } }),
      );
      expect(result).toHaveLength(1);
    });

    it('deve lançar ForbiddenException para não-nutricionista', async () => {
      mockPrisma.nutritionist.findUnique.mockResolvedValue(null);
      await expect(service.findAll('user-invalido')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('deve retornar a dieta pelo id', async () => {
      mockPrisma.nutritionist.findUnique.mockResolvedValue(mockNutritionist);
      mockPrisma.diet.findUnique.mockResolvedValue(mockDiet);

      const result = await service.findOne('diet-1', 'user-nutri');
      expect(result.id).toBe('diet-1');
    });

    it('deve lançar NotFoundException para dieta inexistente', async () => {
      mockPrisma.nutritionist.findUnique.mockResolvedValue(mockNutritionist);
      mockPrisma.diet.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nao-existe', 'user-nutri')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException para dieta de outro nutricionista', async () => {
      mockPrisma.nutritionist.findUnique.mockResolvedValue(mockNutritionist);
      mockPrisma.diet.findUnique.mockResolvedValue({ ...mockDiet, nutritionistId: 'nutri-outro' });
      await expect(service.findOne('diet-1', 'user-nutri')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('deve criar uma dieta', async () => {
      mockPrisma.nutritionist.findUnique.mockResolvedValue(mockNutritionist);
      mockPrisma.diet.create.mockResolvedValue(mockDiet);

      const result = await service.create('user-nutri', { name: 'Dieta Low Carb', totalCalories: 1800 });

      expect(mockPrisma.diet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ nutritionistId: 'nutri-1', name: 'Dieta Low Carb' }),
        }),
      );
      expect(result.name).toBe('Dieta Low Carb');
    });

    it('deve lançar ForbiddenException para não-nutricionista', async () => {
      mockPrisma.nutritionist.findUnique.mockResolvedValue(null);
      await expect(service.create('user-x', { name: 'X' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('deve deletar a dieta', async () => {
      mockPrisma.nutritionist.findUnique.mockResolvedValue(mockNutritionist);
      mockPrisma.diet.findUnique.mockResolvedValue(mockDiet);
      mockPrisma.diet.delete.mockResolvedValue(mockDiet);

      await service.remove('user-nutri', 'diet-1');
      expect(mockPrisma.diet.delete).toHaveBeenCalledWith({ where: { id: 'diet-1' } });
    });

    it('deve lançar ForbiddenException para dieta de outro nutricionista', async () => {
      mockPrisma.nutritionist.findUnique.mockResolvedValue(mockNutritionist);
      mockPrisma.diet.findUnique.mockResolvedValue({ ...mockDiet, nutritionistId: 'nutri-outro' });
      await expect(service.remove('user-nutri', 'diet-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('deve atualizar a dieta', async () => {
      mockPrisma.nutritionist.findUnique.mockResolvedValue(mockNutritionist);
      mockPrisma.diet.findUnique.mockResolvedValue(mockDiet);
      mockPrisma.diet.update.mockResolvedValue({ ...mockDiet, name: 'Nova Dieta' });

      const result = await service.update('user-nutri', 'diet-1', { name: 'Nova Dieta' });
      expect(result.name).toBe('Nova Dieta');
    });

    it('deve lançar ForbiddenException para dieta de outro', async () => {
      mockPrisma.nutritionist.findUnique.mockResolvedValue(mockNutritionist);
      mockPrisma.diet.findUnique.mockResolvedValue({ ...mockDiet, nutritionistId: 'outro' });
      await expect(service.update('user-nutri', 'diet-1', {})).rejects.toThrow(ForbiddenException);
    });
  });
});
