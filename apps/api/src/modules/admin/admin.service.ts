import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_PRICES } from '../../common/plan-limits';

type HealthStatus = 'healthy' | 'degraded' | 'down';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async getHealth() {
    const [dbCheck, redisCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const ai: HealthStatus = this.config.get<string>('ANTHROPIC_API_KEY') ? 'healthy' : 'degraded';

    return {
      api: 'healthy' as HealthStatus,
      database: dbCheck,
      redis: redisCheck,
      queue: redisCheck,
      storage: 'healthy' as HealthStatus,
      ai,
    };
  }

  private async checkDatabase(): Promise<HealthStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'healthy';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<HealthStatus> {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    const client = new Redis(url, {
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    try {
      await client.connect();
      const pong = await client.ping();
      return pong === 'PONG' ? 'healthy' : 'degraded';
    } catch {
      return 'down';
    } finally {
      client.disconnect();
    }
  }

  async getStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalStudents,
      totalTrainers,
      totalNutritionists,
      totalWorkouts,
      subscriptions,
      canceledLast30,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenantSubscription.count({
        where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
      }),
      this.prisma.user.count(),
      this.prisma.student.count(),
      this.prisma.trainer.count(),
      this.prisma.nutritionist.count(),
      this.prisma.workout.count(),
      this.prisma.tenantSubscription.findMany({ select: { plan: true, status: true } }),
      this.prisma.tenantSubscription.count({
        where: { status: SubscriptionStatus.CANCELED, updatedAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    const planCounts: Record<SubscriptionPlan, number> = { FREE: 0, BASIC: 0, PRO: 0, ENTERPRISE: 0 };
    let mrr = 0;
    for (const s of subscriptions) {
      planCounts[s.plan] = (planCounts[s.plan] || 0) + 1;
      if (s.status === SubscriptionStatus.ACTIVE) mrr += PLAN_PRICES[s.plan];
    }

    const totalActive = subscriptions.filter((s) => s.status === SubscriptionStatus.ACTIVE).length;
    const churnBase = totalActive + canceledLast30;
    const churnRate = churnBase > 0 ? Math.round((canceledLast30 / churnBase) * 1000) / 10 : 0;

    const mrrHistory = await this.computeMrrHistory();

    return {
      totalTenants,
      activeTenants,
      totalUsers,
      totalStudents,
      totalTrainers,
      totalNutritionists,
      totalWorkouts,
      activeSubscriptions: totalActive,
      mrr,
      churnRate,
      enterpriseCount: planCounts.ENTERPRISE,
      proCount: planCounts.PRO,
      basicCount: planCounts.BASIC,
      freeCount: planCounts.FREE,
      enterpriseRevenue: planCounts.ENTERPRISE * PLAN_PRICES.ENTERPRISE,
      proRevenue: planCounts.PRO * PLAN_PRICES.PRO,
      basicRevenue: planCounts.BASIC * PLAN_PRICES.BASIC,
      mrrHistory,
    };
  }

  private async computeMrrHistory(): Promise<number[]> {
    const now = new Date();
    const months: { start: Date; end: Date }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({ start, end });
    }

    const active = await this.prisma.tenantSubscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      select: { plan: true, createdAt: true },
    });

    return months.map(({ end }) =>
      active
        .filter((s) => s.createdAt < end)
        .reduce((sum, s) => sum + PLAN_PRICES[s.plan], 0),
    );
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
    const [stats, analytics, recentTenants, recentUsers, health] = await Promise.all([
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
      this.getHealth(),
    ]);
    return { stats, analytics, recentTenants, recentUsers, health };
  }
}
