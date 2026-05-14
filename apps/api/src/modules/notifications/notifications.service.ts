import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markAsRead(userId: string, id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!n) throw new NotFoundException('Notificação não encontrada');
    return this.prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async create(data: { userId: string; title: string; body: string; type: string; data?: any }) {
    return this.prisma.notification.create({ data: data as any });
  }

  async broadcast(tenantId: string, title: string, body: string, type: string, targetRole?: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, ...(targetRole && { role: targetRole as any }), isActive: true },
      select: { id: true },
    });
    const data = users.map((u) => ({ userId: u.id, title, body, type: type as any }));
    await this.prisma.notification.createMany({ data });
    return { sent: users.length };
  }

  async delete(userId: string, id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!n) throw new NotFoundException('Notificação não encontrada');
    return this.prisma.notification.delete({ where: { id } });
  }
}

