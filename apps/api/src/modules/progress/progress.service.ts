import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  private async getStudent(userId: string) {
    const s = await this.prisma.student.findUnique({ where: { userId } });
    if (!s) throw new NotFoundException('Aluno não encontrado');
    return s;
  }

  async getProgress(userId: string) {
    const student = await this.getStudent(userId);
    const [measurements, photos, assessments] = await Promise.all([
      this.prisma.bodyMeasurement.findMany({ where: { studentId: student.id }, orderBy: { measuredAt: 'desc' }, take: 60 }),
      this.prisma.progressPhoto.findMany({ where: { studentId: student.id }, orderBy: { takenAt: 'desc' }, take: 30 }),
      this.prisma.physicalAssessment.findMany({ where: { studentId: student.id }, orderBy: { assessedAt: 'desc' }, take: 20 }),
    ]);

    const latest = assessments[0];
    const previous = assessments[1];

    return {
      measurements,
      photos,
      assessments,
      latest,
      deltas: latest && previous ? {
        weight: latest.weight - previous.weight,
        bodyFat: (latest.bodyFatPercent ?? 0) - (previous.bodyFatPercent ?? 0),
        muscleMass: (latest.muscleMassKg ?? 0) - (previous.muscleMassKg ?? 0),
      } : null,
    };
  }

  async addMeasurement(userId: string, data: any) {
    const student = await this.getStudent(userId);
    return this.prisma.bodyMeasurement.create({ data: { studentId: student.id, ...data } });
  }

  async addPhoto(userId: string, data: { photoUrl: string; angle: string; weight?: number; notes?: string }) {
    const student = await this.getStudent(userId);
    return this.prisma.progressPhoto.create({ data: { studentId: student.id, ...data } });
  }

  async deletePhoto(userId: string, id: string) {
    const student = await this.getStudent(userId);
    const photo = await this.prisma.progressPhoto.findFirst({ where: { id, studentId: student.id } });
    if (!photo) throw new NotFoundException('Foto não encontrada');
    return this.prisma.progressPhoto.delete({ where: { id } });
  }

  async addAssessment(userId: string, trainerId: string, data: any) {
    const student = await this.getStudent(userId);
    return this.prisma.physicalAssessment.create({ data: { studentId: student.id, trainerId, ...data } });
  }

  async getCharts(userId: string) {
    const student = await this.getStudent(userId);
    const measurements = await this.prisma.bodyMeasurement.findMany({
      where: { studentId: student.id },
      orderBy: { measuredAt: 'asc' },
      take: 30,
      select: { measuredAt: true, weight: true, bodyFat: true, muscleMass: true, waist: true },
    });
    return { weightChart: measurements.map((m) => ({ date: m.measuredAt, value: m.weight })) };
  }
}

