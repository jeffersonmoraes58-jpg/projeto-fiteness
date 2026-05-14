import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [totalTenants, totalUsers, totalStudents, totalTrainers, totalNutritionists, activeSubscriptions] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.user.count(),
        this.prisma.student.count(),
        this.prisma.trainer.count(),
        this.prisma.nutritionist.count(),
        this.prisma.tenantSubscription.count({ where: { status: 'ACTIVE' } }),
      ]);
    return { totalTenants, totalUsers, totalStudents, totalTrainers, totalNutritionists, activeSubscriptions };
  }

  async getAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

    const [
      newUsersLast30,
      newUsersPrev30,
      newTenantsLast30,
      newTenantsPrev30,
      workoutLogsLast30,
      subscriptions,
    ] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      this.prisma.workoutLog.count({ where: { completedAt: { gte: thirtyDaysAgo } } }),
      this.prisma.tenantSubscription.findMany({ select: { plan: true, status: true } }),
    ]);

    const planBreakdown = subscriptions.reduce((acc: Record<string, number>, s) => {
      acc[s.plan] = (acc[s.plan] || 0) + 1;
      return acc;
    }, {});

    const userGrowthPct = newUsersPrev30 > 0 ? ((newUsersLast30 - newUsersPrev30) / newUsersPrev30) * 100 : 100;
    const tenantGrowthPct =
      newTenantsPrev30 > 0 ? ((newTenantsLast30 - newTenantsPrev30) / newTenantsPrev30) * 100 : 100;

    return {
      newUsersLast30,
      userGrowthPct: Math.round(userGrowthPct * 10) / 10,
      newTenantsLast30,
      tenantGrowthPct: Math.round(tenantGrowthPct * 10) / 10,
      workoutLogsLast30,
      planBreakdown,
    };
  }

  async getTenants(search?: string, page = 1, limit = 20) {
    const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {};
    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: { select: { plan: true, status: true } },
          _count: { select: { users: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return { tenants, total, page, limit };
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: true,
        settings: true,
        _count: { select: { users: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  async updateTenant(id: string, data: any) {
    await this.getTenant(id);
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async getUsers(search?: string, role?: string, page = 1, limit = 20) {
    const where: any = {
      ...(role && { role: role as any }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { profile: { firstName: { contains: search, mode: 'insensitive' } } },
          { profile: { lastName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { profile: true, tenant: { select: { id: true, name: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total, page, limit };
  }

  async updateUser(id: string, data: { isActive?: boolean; role?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.prisma.user.update({ where: { id }, data: data as any });
  }

  async getDashboard() {
    const [stats, analytics, recentTenants, recentUsers] = await Promise.all([
      this.getStats(),
      this.getAnalytics(),
      this.prisma.tenant.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { subscription: { select: { plan: true, status: true } }, _count: { select: { users: true } } },
      }),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { profile: true, tenant: { select: { name: true } } },
      }),
    ]);
    return { stats, analytics, recentTenants, recentUsers };
  }
}
