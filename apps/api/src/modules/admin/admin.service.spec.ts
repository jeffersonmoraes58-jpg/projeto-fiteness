import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  tenant: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  user: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  student: { count: jest.fn() },
  trainer: { count: jest.fn() },
  nutritionist: { count: jest.fn() },
  tenantSubscription: { count: jest.fn(), findMany: jest.fn() },
  workout: { count: jest.fn() },
  workoutLog: { count: jest.fn() },
  $queryRaw: jest.fn(),
};

const mockConfig = { get: jest.fn() };

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('deve retornar estatísticas da plataforma com MRR e plan breakdown', async () => {
      mockPrisma.tenant.count.mockResolvedValue(5);
      mockPrisma.user.count.mockResolvedValue(120);
      mockPrisma.student.count.mockResolvedValue(80);
      mockPrisma.trainer.count.mockResolvedValue(25);
      mockPrisma.nutritionist.count.mockResolvedValue(15);
      mockPrisma.workout.count.mockResolvedValue(42);
      // tenantSubscription.count: 1ª chamada = activeTenants (ACTIVE+TRIAL), 2ª = canceledLast30
      mockPrisma.tenantSubscription.count
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(1);
      // findMany: 1ª = subscriptions (plan+status), 2ª = computeMrrHistory (active só)
      mockPrisma.tenantSubscription.findMany
        .mockResolvedValueOnce([
          { plan: 'PRO', status: 'ACTIVE' },
          { plan: 'BASIC', status: 'ACTIVE' },
          { plan: 'ENTERPRISE', status: 'ACTIVE' },
          { plan: 'FREE', status: 'TRIAL' },
        ])
        .mockResolvedValueOnce([
          { plan: 'PRO', createdAt: new Date('2020-01-01') },
          { plan: 'BASIC', createdAt: new Date('2020-01-01') },
          { plan: 'ENTERPRISE', createdAt: new Date('2020-01-01') },
        ]);

      const result = await service.getStats();

      expect(result.totalTenants).toBe(5);
      expect(result.totalUsers).toBe(120);
      expect(result.activeTenants).toBe(4);
      expect(result.totalWorkouts).toBe(42);
      expect(result.activeSubscriptions).toBe(3); // só ACTIVE
      expect(result.mrr).toBe(55 + 35 + 95); // PRO+BASIC+ENTERPRISE
      expect(result.proCount).toBe(1);
      expect(result.basicCount).toBe(1);
      expect(result.enterpriseCount).toBe(1);
      expect(result.freeCount).toBe(1);
      expect(result.proRevenue).toBe(55);
      expect(result.churnRate).toBeCloseTo(25); // 1 / (3 + 1) = 25%
      expect(result.mrrHistory).toHaveLength(12);
      expect(result.mrrHistory[11]).toBe(55 + 35 + 95);
    });
  });

  describe('getHealth', () => {
    it('deve reportar healthy quando DB e Redis respondem e ANTHROPIC_API_KEY existe', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockConfig.get.mockImplementation((key: string, def?: any) => {
        if (key === 'ANTHROPIC_API_KEY') return 'sk-test';
        return def;
      });
      jest.spyOn(service as any, 'checkRedis').mockResolvedValue('healthy');

      const result = await service.getHealth();
      expect(result.api).toBe('healthy');
      expect(result.database).toBe('healthy');
      expect(result.redis).toBe('healthy');
      expect(result.queue).toBe('healthy');
      expect(result.storage).toBe('healthy');
      expect(result.ai).toBe('healthy');
    });

    it('deve reportar database down e ai degraded quando faltam', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('conn refused'));
      mockConfig.get.mockImplementation((key: string, def?: any) => def);
      jest.spyOn(service as any, 'checkRedis').mockResolvedValue('down');

      const result = await service.getHealth();
      expect(result.database).toBe('down');
      expect(result.redis).toBe('down');
      expect(result.ai).toBe('degraded');
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
