import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SubscriptionPlan, SubscriptionStatus, NotificationType, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_PRICES, PLAN_PRICES_ANNUAL } from '../../common/plan-limits';
import { BillingInterval } from '@prisma/client';

/** Converte preço anual em MRR mensal equivalente. */
function getMonthlyMrr(plan: SubscriptionPlan, cycle?: BillingInterval | null): number {
  if (cycle === 'ANNUAL') {
    return Math.round(PLAN_PRICES_ANNUAL[plan] / 12);
  }
  return PLAN_PRICES[plan];
}

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
      this.prisma.tenantSubscription.findMany({ select: { plan: true, status: true, billingCycle: true } }),
      this.prisma.tenantSubscription.count({
        where: { status: SubscriptionStatus.CANCELED, updatedAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    const planCounts: Record<SubscriptionPlan, number> = { FREE: 0, BASIC: 0, PRO: 0, ENTERPRISE: 0 };
    let mrr = 0;
    for (const s of subscriptions) {
      planCounts[s.plan] = (planCounts[s.plan] || 0) + 1;
      if (s.status === SubscriptionStatus.ACTIVE) mrr += getMonthlyMrr(s.plan, s.billingCycle);
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

  async getAnalytics(period?: string) {
    const now = new Date();
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '12m' ? 365 : 30;
    const periodStart = new Date(now.getTime() - days * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

    const [
      totalUsers,
      newUsersInPeriod,
      newUsersLast30,
      newUsersPrev30,
      newTenantsLast30,
      newTenantsPrev30,
      activeUsersLast30,
      subscriptions,
      workoutLogsCount,
      mealLogsCount,
      messagesCount,
      appointmentsCount,
      userAchievementsCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: periodStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { updatedAt: { gte: thirtyDaysAgo } } }),
      this.prisma.tenantSubscription.findMany({ select: { plan: true, status: true, billingCycle: true } }),
      this.safeCount(() => this.prisma.workoutLog.count({ where: { completedAt: { gte: periodStart } } })),
      this.safeCount(() => (this.prisma as any).mealLog?.count({ where: { createdAt: { gte: periodStart } } })),
      this.safeCount(() => (this.prisma as any).message?.count({ where: { createdAt: { gte: periodStart } } })),
      this.safeCount(() => (this.prisma as any).appointment?.count({ where: { createdAt: { gte: periodStart } } })),
      this.safeCount(() => (this.prisma as any).userAchievement?.count({ where: { earnedAt: { gte: periodStart } } })),
    ]);

    const planBreakdown = subscriptions.reduce((acc: Record<string, number>, s) => {
      acc[s.plan] = (acc[s.plan] || 0) + 1;
      return acc;
    }, {});

    const activeSubs = subscriptions.filter((s) => s.status === SubscriptionStatus.ACTIVE);
    const mrr = activeSubs.reduce((sum, s) => sum + getMonthlyMrr(s.plan, s.billingCycle), 0);
    const activeTenants = subscriptions.filter((s) =>
      s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.TRIAL,
    ).length;

    const userGrowthPct = newUsersPrev30 > 0 ? ((newUsersLast30 - newUsersPrev30) / newUsersPrev30) * 100 : 100;
    const tenantGrowthPct =
      newTenantsPrev30 > 0 ? ((newTenantsLast30 - newTenantsPrev30) / newTenantsPrev30) * 100 : 100;
    const retentionRate = totalUsers > 0 ? Math.round((activeUsersLast30 / totalUsers) * 100) : 0;

    const growth = await this.computeGrowth();
    const topTenants = await this.computeTopTenants();
    const featureUsage = [
      { name: 'Treinos', count: workoutLogsCount, color: 'bg-purple-500' },
      { name: 'Dietas', count: mealLogsCount, color: 'bg-emerald-500' },
      { name: 'Chat', count: messagesCount, color: 'bg-blue-500' },
      { name: 'Agenda', count: appointmentsCount, color: 'bg-cyan-500' },
      { name: 'Gamificação', count: userAchievementsCount, color: 'bg-pink-500' },
    ];

    return {
      stats: {
        totalUsers,
        mrr,
        activeTenants,
        retentionRate,
        newUsersInPeriod,
      },
      newUsersLast30,
      userGrowthPct: Math.round(userGrowthPct * 10) / 10,
      newTenantsLast30,
      tenantGrowthPct: Math.round(tenantGrowthPct * 10) / 10,
      workoutLogsLast30: workoutLogsCount,
      planBreakdown,
      growth,
      topTenants,
      featureUsage,
      cohort: [], // não implementado — UI mostra estado vazio
    };
  }

  private async safeCount(fn: () => Promise<number> | undefined): Promise<number> {
    try {
      const r = await fn();
      return typeof r === 'number' ? r : 0;
    } catch {
      return 0;
    }
  }

  private async computeGrowth(): Promise<Array<{ label: string; users: number; revenue: number }>> {
    const now = new Date();
    const months: { start: Date; end: Date; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = start.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      months.push({ start, end, label });
    }

    const [users, subs] = await Promise.all([
      this.prisma.user.findMany({ select: { createdAt: true } }),
      this.prisma.tenantSubscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        select: { plan: true, billingCycle: true, createdAt: true },
      }),
    ]);

    return months.map(({ end, label }) => ({
      label,
      users: users.filter((u) => u.createdAt < end).length,
      revenue: subs
        .filter((s) => s.createdAt < end)
        .reduce((sum, s) => sum + getMonthlyMrr(s.plan, s.billingCycle), 0),
    }));
  }

  private async computeTopTenants() {
    const tenants = await this.prisma.tenant.findMany({
      take: 5,
      include: {
        subscription: { select: { plan: true } },
        _count: { select: { users: true } },
      },
      orderBy: { users: { _count: 'desc' } },
    });

    return tenants.map((t) => {
      const plan = t.subscription?.plan ?? SubscriptionPlan.FREE;
      return {
        name: t.name,
        plan,
        users: t._count.users,
        mrr: PLAN_PRICES[plan] || 0,
        growth: 0, // sem histórico por tenant — placeholder
      };
    });
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
          subscription: { select: { plan: true, status: true, billingCycle: true, currentPeriodEnd: true, trialEndsAt: true } },
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

  async updateTenantSubscription(id: string, data: { plan?: string; status?: string }) {
    const tenant = await this.getTenant(id);
    if (!tenant.subscription) {
      throw new NotFoundException('Tenant não possui assinatura');
    }
    const update: any = {};
    if (data.plan) update.plan = data.plan;
    if (data.status) update.status = data.status;
    return this.prisma.tenantSubscription.update({
      where: { id: tenant.subscription.id },
      data: update,
    });
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

  async createUser(
    input: { email: string; password: string; firstName: string; lastName: string; role: string },
    tenantId?: string,
  ) {
    // Se tenantId não informado, usa o tenant do próprio admin (primeiro tenant)
    const tid = tenantId || (await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } }))?.id;
    if (!tid) throw new NotFoundException('Nenhum tenant disponível para criar usuário');

    const existing = await this.prisma.user.findFirst({
      where: { email: input.email, tenantId: tid },
    });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const role = (input.role as UserRole) || UserRole.STUDENT;
    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        role,
        tenantId: tid,
        isActive: true,
        emailVerified: true,
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
          },
        },
      },
      include: { profile: true },
    });

    return user;
  }

  async updateUser(id: string, data: { isActive?: boolean; role?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.prisma.user.update({ where: { id }, data: data as any });
  }

  async updateUserPlanOverride(id: string, planOverride: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    const plan = planOverride ? (planOverride as SubscriptionPlan) : null;
    if (planOverride && !Object.values(SubscriptionPlan).includes(plan!)) {
      throw new NotFoundException(`Plano inválido: ${planOverride}`);
    }
    return this.prisma.user.update({
      where: { id },
      data: { planOverride: plan },
    });
  }

  // ── Notificações em massa (admin platform-wide) ─────────────

  async listBroadcasts() {
    const rows = await this.prisma.notification.findMany({
      where: { type: NotificationType.SYSTEM },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    type Group = {
      id: string;
      title: string;
      body: string;
      type: string;
      targetRole: string | null;
      sentAt: Date;
      totalCount: number;
      readCount: number;
    };
    const map = new Map<string, Group>();
    for (const n of rows) {
      const meta = (n.data as any) ?? {};
      const bid = meta.broadcastId;
      if (!bid) continue;
      let g = map.get(bid);
      if (!g) {
        g = {
          id: bid,
          title: n.title,
          body: n.body,
          type: meta.broadcastType ?? 'INFO',
          targetRole: meta.targetRole ?? null,
          sentAt: n.sentAt ?? n.createdAt,
          totalCount: 0,
          readCount: 0,
        };
        map.set(bid, g);
      }
      g.totalCount++;
      if (n.isRead) g.readCount++;
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    );
  }

  async broadcast(input: {
    title: string;
    body: string;
    type?: 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT';
    targetRole?: string | null;
  }) {
    if (!input.title?.trim() || !input.body?.trim()) {
      throw new NotFoundException('Título e mensagem são obrigatórios');
    }
    const broadcastId = randomUUID();
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(input.targetRole ? { role: input.targetRole as any } : {}),
      },
      select: { id: true },
    });

    if (users.length === 0) return { broadcastId, sent: 0 };

    const now = new Date();
    const payload = users.map((u) => ({
      userId: u.id,
      type: NotificationType.SYSTEM,
      title: input.title,
      body: input.body,
      sentAt: now,
      data: {
        broadcastId,
        broadcastType: input.type ?? 'INFO',
        targetRole: input.targetRole ?? null,
      } as Prisma.InputJsonValue,
    }));

    await this.prisma.notification.createMany({ data: payload });
    return { broadcastId, sent: users.length };
  }

  // ── Platform settings ─────────────────────────────────────

  async getSettings() {
    const row = await this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });
    const features = (row.features as any) ?? {};
    const limits = (row.limits as any) ?? {};
    const email = (row.email as any) ?? {};
    return {
      aiEnabled: features.aiEnabled ?? true,
      chatEnabled: features.chatEnabled ?? true,
      gamificationEnabled: features.gamificationEnabled ?? true,
      videoEnabled: features.videoEnabled ?? false,
      nutritionEnabled: features.nutritionEnabled ?? true,
      notificationsEnabled: features.notificationsEnabled ?? true,
      maxStudentsPerTrainer: limits.maxStudentsPerTrainer ?? 50,
      maxPatientsPerNutritionist: limits.maxPatientsPerNutritionist ?? 40,
      maxStorageGb: limits.maxStorageGb ?? 10,
      aiRequestsPerDay: limits.aiRequestsPerDay ?? 100,
      emailFromName: email.fromName ?? 'Fitlynutri',
      emailFromAddress: email.fromAddress ?? 'noreply@fitlynutri.com.br',
      smtpHost: email.smtpHost ?? '',
      smtpPort: email.smtpPort ?? '',
      updatedAt: row.updatedAt,
    };
  }

  async updateSettings(input: { features?: any; limits?: any; email?: any }) {
    const current = await this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });
    const merged: any = {};
    if (input.features) merged.features = { ...((current.features as any) ?? {}), ...input.features };
    if (input.limits) merged.limits = { ...((current.limits as any) ?? {}), ...input.limits };
    if (input.email) merged.email = { ...((current.email as any) ?? {}), ...input.email };

    await this.prisma.platformSettings.update({
      where: { id: 'singleton' },
      data: merged,
    });
    return this.getSettings();
  }

  async deleteBroadcast(broadcastId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: {
        data: {
          path: ['broadcastId'],
          equals: broadcastId,
        },
      },
    });
    if (result.count === 0) throw new NotFoundException('Broadcast não encontrado');
    return { deleted: result.count };
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
