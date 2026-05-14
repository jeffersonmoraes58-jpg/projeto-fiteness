import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async createOrGetDirectChat(userId1: string, userId2: string) {
    const existingChat = await this.prisma.chat.findFirst({
      where: {
        type: 'DIRECT',
        participants: {
          every: { userId: { in: [userId1, userId2] } },
        },
      },
      include: {
        participants: { include: { user: { include: { profile: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existingChat) return existingChat;

    return this.prisma.chat.create({
      data: {
        type: 'DIRECT',
        participants: {
          create: [{ userId: userId1 }, { userId: userId2 }],
        },
      },
      include: {
        participants: { include: { user: { include: { profile: true } } } },
        messages: { take: 0 },
      },
    });
  }

  async getUserChats(userId: string) {
    return this.prisma.chat.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: { user: { include: { profile: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getChatMessages(chatId: string, userId: string, page = 1, limit = 50) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    if (!participant) throw new ForbiddenException('Você não faz parte deste chat');

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { chatId, deletedAt: null },
        include: { sender: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.message.count({ where: { chatId, deletedAt: null } }),
    ]);

    return {
      messages: messages.reverse(),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async sendMessage(
    senderId: string,
    chatId: string,
    data: { content?: string; type?: MessageType; fileUrl?: string },
  ) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId: senderId } },
    });

    if (!participant) throw new ForbiddenException('Você não faz parte deste chat');

    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId,
        content: data.content,
        type: data.type || MessageType.TEXT,
        fileUrl: data.fileUrl,
      },
      include: { sender: { include: { profile: true } } },
    });

    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async markAsRead(userId: string, chatId: string) {
    await this.prisma.chatParticipant.updateMany({
      where: { chatId, userId },
      data: { lastRead: new Date() },
    });

    await this.prisma.message.updateMany({
      where: { chatId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    const participants = await this.prisma.chatParticipant.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            messages: {
              where: { senderId: { not: userId }, isRead: false },
            },
          },
        },
      },
    });

    return participants.reduce((acc, p) => acc + p.chat.messages.length, 0);
  }
}
