import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChallengesService {
  constructor(private prisma: PrismaService) {}

  private async getStudent(userId: string) {
    const s = await this.prisma.student.findUnique({ where: { userId } });
    if (!s) throw new NotFoundException('Aluno não encontrado');
    return s;
  }

  async findAvailable(userId: string, tenantId: string) {
    const student = await this.getStudent(userId);
    const joined = await this.prisma.studentChallenge.findMany({
      where: { studentId: student.id },
      select: { challengeId: true },
    });
    const joinedIds = joined.map((j) => j.challengeId);
    return this.prisma.challenge.findMany({
      where: {
        isActive: true,
        id: { notIn: joinedIds },
        endDate: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(userId: string) {
    const student = await this.getStudent(userId);
    return this.prisma.studentChallenge.findMany({
      where: { studentId: student.id, isCompleted: false },
      include: { challenge: true },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async findCompleted(userId: string) {
    const student = await this.getStudent(userId);
    return this.prisma.studentChallenge.findMany({
      where: { studentId: student.id, isCompleted: true },
      include: { challenge: true },
      orderBy: { completedAt: 'desc' },
    });
  }

  async join(userId: string, challengeId: string) {
    const student = await this.getStudent(userId);
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');
    const existing = await this.prisma.studentChallenge.findFirst({
      where: { studentId: student.id, challengeId },
    });
    if (existing) throw new ConflictException('Já participando deste desafio');
    return this.prisma.studentChallenge.create({
      data: { studentId: student.id, challengeId, joinedAt: new Date() },
      include: { challenge: true },
    });
  }

  async updateProgress(userId: string, challengeId: string, progress: number) {
    const student = await this.getStudent(userId);
    const sc = await this.prisma.studentChallenge.findFirst({
      where: { studentId: student.id, challengeId },
      include: { challenge: true },
    });
    if (!sc) throw new NotFoundException('Participação não encontrada');
    const isCompleted = progress >= (sc.challenge.targetValue ?? 100);
    const updated = await this.prisma.studentChallenge.update({
      where: { id: sc.id },
      data: {
        progress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });
    if (isCompleted && !sc.isCompleted) {
      await this.prisma.student.update({
        where: { id: student.id },
        data: { points: { increment: sc.challenge.points ?? 100 } },
      });
    }
    return updated;
  }
}

