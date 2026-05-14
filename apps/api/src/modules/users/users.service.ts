import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, student: true, trainer: true, nutritionist: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    const { password, ...rest } = user;
    return rest;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email }, include: { profile: true } });
  }

  async updateProfile(userId: string, data: any) {
    return this.prisma.profile.update({
      where: { userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        bio: data.bio,
        gender: data.gender,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        city: data.city,
        state: data.state,
        country: data.country,
        avatarUrl: data.avatarUrl,
      },
    });
  }

  async searchUsers(tenantId: string, query: string, role?: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(role && { role: role as any }),
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { profile: { firstName: { contains: query, mode: 'insensitive' } } },
          { profile: { lastName: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: { profile: true },
      take: 20,
    });
  }

  async deactivate(id: string) {
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }
}
