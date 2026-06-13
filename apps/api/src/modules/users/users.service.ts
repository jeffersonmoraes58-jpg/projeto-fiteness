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
    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.birthDate !== undefined) updateData.birthDate = new Date(data.birthDate);
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    return this.prisma.profile.upsert({
      where: { userId },
      update: updateData,
      create: { userId, firstName: '', ...updateData },
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
