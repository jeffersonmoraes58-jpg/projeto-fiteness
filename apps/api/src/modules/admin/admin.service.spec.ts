import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  tenant: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  user: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  student: { count: jest.fn() },
  trainer: { count: jest.fn() },
  nutritionist: { count: jest.fn() },
  tenantSubscription: { count: jest.fn(), findMany: jest.fn() },
  workoutLog: { count: jest.fn() },
};

const mockStats = {
  totalTenants: 5,
  totalUsers: 120,
  totalStudents: 80,
  totalTrainers: 25,
  totalNutritionists: 15,
  activeSubscriptions: 4,
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('deve retornar estatísticas da plataforma', async () => {
      mockPrisma.tenant.count.mockResolvedValue(mockStats.totalTenants);
      mockPrisma.user.count.mockResolvedValue(mockStats.totalUsers);
      mockPrisma.student.count.mockResolvedValue(mockStats.totalStudents);
      mockPrisma.trainer.count.mockResolvedValue(mockStats.totalTrainers);
      mockPrisma.nutritionist.count.mockResolvedValue(mockStats.totalNutritionists);
      mockPrisma.tenantSubscription.count.mockResolvedValue(mockStats.activeSubscriptions);

      const result = await service.getStats();

      expect(result.totalTenants).toBe(5);
      expect(result.totalUsers).toBe(120);
      expect(result.activeSubscriptions).toBe(4);
    });
  });

  describe('getTenants', () => {
    it('deve retornar lista paginada de tenants', async () => {
      const mockTenants = [
        { id: 't1', name: 'Academia A', subscription: { plan: 'PRO', status: 'ACTIVE' }, _count: { users: 30 } },
        { id: 't2', name: 'Academia B', subscription: { plan: 'BASIC', status: 'TRIAL' }, _count: { users: 12 } },
      ];
      mockPrisma.tenant.findMany.mockResolvedValue(mockTenants);
      mockPrisma.tenant.count.mockResolvedValue(2);

      const result = await service.getTenants(undefined, 1, 20);

      expect(result.tenants).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('deve filtrar por nome quando search é fornecido', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([]);
      mockPrisma.tenant.count.mockResolvedValue(0);

      await service.getTenants('Academia X', 1, 20);

      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: { contains: 'Academia X', mode: 'insensitive' } },
        }),
      );
    });
  });

  describe('getTenant', () => {
    it('deve retornar um tenant pelo id', async () => {
      const mockTenant = { id: 't1', name: 'Academia A', subscription: null, settings: null, _count: { users: 5 } };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.getTenant('t1');
      expect(result.id).toBe('t1');
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 't1' } }),
      );
    });

    it('deve lançar NotFoundException para tenant inexistente', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.getTenant('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUsers', () => {
    it('deve retornar lista paginada de usuários', async () => {
      const mockUsers = [
        { id: 'u1', email: 'a@a.com', role: 'TRAINER', profile: { firstName: 'João' }, tenant: { name: 'Academia A' } },
        { id: 'u2', email: 'b@b.com', role: 'STUDENT', profile: { firstName: 'Maria' }, tenant: null },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await service.getUsers(undefined, undefined, 1, 20);

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('deve filtrar por role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers(undefined, 'TRAINER', 1, 20);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ role: 'TRAINER' }) }),
      );
    });
  });

  describe('updateUser', () => {
    it('deve atualizar o usuário', async () => {
      const mockUser = { id: 'u1', email: 'a@a.com', isActive: true };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.updateUser('u1', { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('deve lançar NotFoundException para usuário inexistente', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.updateUser('nao-existe', { isActive: false })).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTenant', () => {
    it('deve atualizar o tenant', async () => {
      const mockTenant = { id: 't1', name: 'Academia A', subscription: null, settings: null, _count: { users: 0 } };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.tenant.update.mockResolvedValue({ ...mockTenant, name: 'Academia B' });

      const result = await service.updateTenant('t1', { name: 'Academia B' });
      expect(result.name).toBe('Academia B');
    });

    it('deve lançar NotFoundException para tenant inexistente', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.updateTenant('nao-existe', {})).rejects.toThrow(NotFoundException);
    });
  });
});
