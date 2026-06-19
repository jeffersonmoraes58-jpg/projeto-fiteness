import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan } from '@prisma/client';
import { PLAN_LIMITS, PLAN_DISPLAY_NAMES, PlanFeature } from '../../common/plan-limits';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getTenantPlan(tenantId: string): Promise<SubscriptionPlan> {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      select: { plan: true },
    });
    return sub?.plan ?? SubscriptionPlan.FREE;
  }

  async getMyPlan(tenantId: string) {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });
    const plan = sub?.plan ?? SubscriptionPlan.FREE;
    const limits = PLAN_LIMITS[plan];
    const displayName = PLAN_DISPLAY_NAMES[plan];
    return { plan, displayName, limits, subscription: sub };
  }

  async checkFeature(tenantId: string, feature: PlanFeature): Promise<void> {
    const plan = await this.getTenantPlan(tenantId);
    if (!PLAN_LIMITS[plan][feature]) {
      throw new ForbiddenException(
        `A funcionalidade "${feature}" não está disponível no plano ${PLAN_DISPLAY_NAMES[plan]}. Faça upgrade para continuar.`,
      );
    }
  }

  async checkStudentLimit(tenantId: string, trainerId: string): Promise<void> {
    const plan = await this.getTenantPlan(tenantId);
    const maxStudents = PLAN_LIMITS[plan].maxStudents;
    if (maxStudents === -1) return;

    const currentCount = await this.prisma.trainerStudent.count({
      where: { trainerId, isActive: true },
    });

    if (currentCount >= maxStudents) {
      throw new ForbiddenException(
        `Limite de ${maxStudents} aluno(s) atingido no plano ${PLAN_DISPLAY_NAMES[plan]}. Faça upgrade para adicionar mais alunos.`,
      );
    }
  }
}
