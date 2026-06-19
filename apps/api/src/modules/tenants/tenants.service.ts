import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const [trainers, nutritionists, students, subscription] = await Promise.all([
      this.prisma.user.count({ where: { tenantId, role: 'TRAINER', isActive: true } }),
      this.prisma.user.count({ where: { tenantId, role: 'NUTRITIONIST', isActive: true } }),
      this.prisma.user.count({ where: { tenantId, role: 'STUDENT', isActive: true } }),
      this.prisma.tenantSubscription.findUnique({ where: { tenantId } }),
    ]);

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    return { tenant, trainers, nutritionists, students, subscription };
  }

  async getMembers(tenantId: string, role?: string) {
    const where: any = { tenantId, isActive: true };
    if (role) where.role = role;

    const users = await this.prisma.user.findMany({
      where,
      include: {
        profile: true,
        trainer: {
          include: {
            _count: { select: { students: { where: { isActive: true } } } },
          },
        },
        nutritionist: {
          include: {
            _count: { select: { patients: { where: {} } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      firstName: u.profile?.firstName,
      lastName: u.profile?.lastName,
      avatarUrl: u.profile?.avatarUrl,
      phone: u.profile?.phone,
      createdAt: u.createdAt,
      studentsCount: u.trainer?._count?.students ?? null,
      patientsCount: u.nutritionist?._count?.patients ?? null,
    }));
  }

  async removeMember(tenantId: string, userId: string) {
    await this.prisma.user.update({
      where: { id: userId, tenantId },
      data: { isActive: false },
    });
  }
}
