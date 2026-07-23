import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProgressService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private notifications: NotificationsService,
  ) {}

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
    const { studentUserId, ...assessmentData } = data;
    return this.prisma.physicalAssessment.create({ data: { studentId: student.id, trainerId, ...assessmentData } });
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

  async getStudentData(userId: string) {
    const student = await this.getStudent(userId);
    const [measurements, assessments, photos] = await Promise.all([
      this.prisma.bodyMeasurement.findMany({
        where: { studentId: student.id },
        orderBy: { measuredAt: 'desc' },
        take: 20,
      }),
      this.prisma.physicalAssessment.findMany({
        where: { studentId: student.id },
        orderBy: { assessedAt: 'desc' },
        take: 10,
      }),
      this.prisma.progressPhoto.findMany({
        where: { studentId: student.id },
        orderBy: { takenAt: 'desc' },
        take: 12,
      }),
    ]);
    return { measurements, assessments, photos };
  }

  // ═══════════════════════════════════════════════
  // AI INSIGHTS — Análise de evolução do aluno
  // ═══════════════════════════════════════════════

  async generateInsights(studentUserId: string, trainerUserId: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId: trainerUserId } });
    if (!trainer) throw new ForbiddenException('Apenas trainers podem gerar insights');

    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
      include: { user: { include: { profile: true } }, anamnesis: true },
    });
    if (!student) throw new NotFoundException('Aluno não encontrado');

    const [assessments, measurements, workoutLogs, goals] = await Promise.all([
      this.prisma.physicalAssessment.findMany({
        where: { studentId: student.id },
        orderBy: { assessedAt: 'desc' },
        take: 10,
      }),
      this.prisma.bodyMeasurement.findMany({
        where: { studentId: student.id },
        orderBy: { measuredAt: 'desc' },
        take: 20,
      }),
      this.prisma.workoutLog.findMany({
        where: { studentId: student.id, completedAt: { gte: new Date(Date.now() - 90 * 86400000) } },
        orderBy: { completedAt: 'desc' },
        take: 50,
      }),
      this.prisma.trainerStudentGoal.findMany({
        where: { trainerId: trainer.id, studentId: student.id },
      }),
    ]);

    const assessSection = assessments.map(a =>
      `${new Date(a.assessedAt).toLocaleDateString('pt-BR')}: peso ${a.weight}kg, IMC ${a.bmi}, gordura ${a.bodyFatPercent ?? '-'}%, massa ${a.muscleMassKg ?? '-'}kg, cintura ${a.waistCm ?? '-'}cm, quadril ${a.hipCm ?? '-'}cm`
    ).join('\n') || 'Sem avaliações físicas registradas';

    const measSection = measurements.slice(0, 10).map(m =>
      `${new Date(m.measuredAt).toLocaleDateString('pt-BR')}: peso ${m.weight ?? '-'}kg, gordura ${m.bodyFat ?? '-'}%, massa ${m.muscleMass ?? '-'}kg, sensação ${m.feeling ?? '-'}/10`
    ).join('\n') || 'Sem medições corporais';

    const logsSection = `Total de treinos (90 dias): ${workoutLogs.length}\nMédia semanal: ${(workoutLogs.length / (90 / 7)).toFixed(1)}\nTreinos concluídos: ${workoutLogs.filter(l => l.status === 'COMPLETED').length}\nTreinos pulados: ${workoutLogs.filter(l => l.status === 'SKIPPED').length}`;

    const goalsSection = goals.map(g =>
      `${g.title}: meta ${g.targetValue}${g.unit || ''} (${g.direction === 'decrease' ? 'diminuir' : 'aumentar'}) ${g.isCompleted ? '✅ CONCLUÍDO' : `atual: ${g.currentValue ?? '-'}`
      }`
    ).join('\n') || 'Sem metas definidas pelo trainer';

    const prompt = `Você é um PhD em Ciências do Exercício e personal trainer de elite. Analise a evolução deste aluno e forneça insights acionáveis.

## ALUNO
Nome: ${student.user.profile?.firstName} ${student.user.profile?.lastName}
Objetivo: ${student.goalType ?? 'Não definido'} | Atividade: ${student.activityLevel}
Lesões: ${student.anamnesis?.previousInjuries || 'Nenhuma'}

## AVALIAÇÕES FÍSICAS (mais recente primeiro)
${assessSection}

## MEDIÇÕES CORPORAIS
${measSection}

## DESEMPENHO NOS TREINOS
${logsSection}

## METAS DEFINIDAS PELO TRAINER
${goalsSection}

## INSTRUÇÕES
Forneça uma análise completa com:

1. **Resumo Executivo** (2-3 frases): diagnóstico geral da evolução
2. **Destaques Positivos** (até 3): o que está indo bem
3. **Áreas de Atenção** (até 3): pontos que precisam de ajuste
4. **Insights IA** (até 3): observações inteligentes que o trainer pode não ter percebido (ex: "o peso aumentou mas a gordura diminuiu, indicando ganho muscular")
5. **Recomendações** (até 3): ações específicas e acionáveis
6. **Score de Evolução** (0-10): nota geral do progresso

Retorne APENAS JSON:
{
  "summary": "resumo executivo",
  "highlights": ["destaque 1", "destaque 2"],
  "concerns": ["atenção 1", "atenção 2"],
  "insights": ["insight 1", "insight 2"],
  "recommendations": ["recomendação 1", "recomendação 2"],
  "evolutionScore": 7
}`;

    let raw: string;
    try {
      raw = await this.aiService['complete'](prompt, 2000);
    } catch (err) {
      throw new Error(`Falha na chamada à IA: ${(err as Error).message}`);
    }

    let parsed: any;
    try {
      const stripped = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const start = stripped.indexOf('{');
      const end = stripped.lastIndexOf('}');
      parsed = JSON.parse(stripped.slice(start, end + 1));
    } catch {
      console.error('[ProgressService] AI insights JSON parse failed:', raw.slice(0, 500));
      throw new Error('A IA retornou uma resposta inválida. Tente novamente.');
    }

    await this.prisma.evolutionInsight.create({
      data: {
        studentId: student.id,
        trainerId: trainer.id,
        rating: parsed.evolutionScore,
        summary: parsed.summary,
        data: parsed,
      },
    });

    return parsed;
  }

  // ═══════════════════════════════════════════════
  // TRAINER GOALS — Metas configuráveis
  // ═══════════════════════════════════════════════

  async getTrainerGoals(trainerUserId: string, studentUserId: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId: trainerUserId } });
    if (!trainer) throw new ForbiddenException('Apenas trainers podem acessar metas');

    const student = await this.getStudent(studentUserId);
    return this.prisma.trainerStudentGoal.findMany({
      where: { trainerId: trainer.id, studentId: student.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTrainerGoal(trainerUserId: string, data: any) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId: trainerUserId } });
    if (!trainer) throw new ForbiddenException('Apenas trainers podem criar metas');

    const student = await this.getStudent(data.studentUserId);

    return this.prisma.trainerStudentGoal.create({
      data: {
        trainerId: trainer.id,
        studentId: student.id,
        metric: data.metric,
        targetValue: data.targetValue,
        unit: data.unit,
        direction: data.direction || 'decrease',
        title: data.title,
        notes: data.notes,
      },
    });
  }

  async updateTrainerGoal(trainerUserId: string, goalId: string, data: any) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId: trainerUserId } });
    if (!trainer) throw new ForbiddenException('Apenas trainers podem atualizar metas');

    const goal = await this.prisma.trainerStudentGoal.findFirst({
      where: { id: goalId, trainerId: trainer.id },
    });
    if (!goal) throw new NotFoundException('Meta não encontrada');

    return this.prisma.trainerStudentGoal.update({
      where: { id: goalId },
      data: {
        ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
        ...(data.currentValue !== undefined && { currentValue: data.currentValue }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isCompleted !== undefined && {
          isCompleted: data.isCompleted,
          completedAt: data.isCompleted ? new Date() : null,
        }),
      },
    });
  }

  async deleteTrainerGoal(trainerUserId: string, goalId: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId: trainerUserId } });
    if (!trainer) throw new ForbiddenException('Apenas trainers podem remover metas');

    const goal = await this.prisma.trainerStudentGoal.findFirst({
      where: { id: goalId, trainerId: trainer.id },
    });
    if (!goal) throw new NotFoundException('Meta não encontrada');

    return this.prisma.trainerStudentGoal.delete({ where: { id: goalId } });
  }

  // ═══════════════════════════════════════════════
  // EXERCISE EVOLUTION — Evolução de carga por exercício
  // ═══════════════════════════════════════════════

  async getExerciseEvolution(studentUserId: string) {
    const student = await this.getStudent(studentUserId);

    const exerciseLogs = await this.prisma.workoutExerciseLog.findMany({
      where: {
        workoutLog: {
          studentId: student.id,
          completedAt: { not: null },
        },
      },
      include: {
        workoutLog: { select: { completedAt: true } },
        workoutExercise: { include: { exercise: { select: { id: true, name: true } } } },
      },
      orderBy: { workoutLog: { completedAt: 'desc' } },
      take: 500,
    });

    const exerciseMap = new Map<string, { name: string; logs: Array<{ date: string; weight: number | null; reps: number | null; setNumber: number }> }>();

    for (const log of exerciseLogs) {
      const exId = log.workoutExercise.exerciseId;
      const exName = log.workoutExercise.exercise?.name || 'Exercício';
      if (!exerciseMap.has(exId)) {
        exerciseMap.set(exId, { name: exName, logs: [] });
      }
      exerciseMap.get(exId)!.logs.push({
        date: log.workoutLog.completedAt?.toISOString() || log.createdAt.toISOString(),
        weight: log.weight,
        reps: log.reps,
        setNumber: log.setNumber,
      });
    }

    const result = Array.from(exerciseMap.entries()).map(([exerciseId, data]) => {
      const logs = data.logs.reverse();
      const withWeight = logs.filter(l => l.weight != null && l.weight > 0);
      const firstWeight = withWeight.length > 0 ? withWeight[0].weight : null;
      const lastWeight = withWeight.length > 0 ? withWeight[withWeight.length - 1].weight : null;
      const totalSessions = logs.length;

      return {
        exerciseId,
        name: data.name,
        totalSessions,
        firstWeight,
        lastWeight,
        weightDelta: firstWeight != null && lastWeight != null ? lastWeight - firstWeight : null,
        logs: logs.slice(-20),
      };
    });

    return result.filter(e => e.totalSessions >= 2).sort((a, b) => b.totalSessions - a.totalSessions);
  }

  // ═══════════════════════════════════════════════
  // REQUEST CHECK-IN — Solicitar check-in ao aluno
  // ═══════════════════════════════════════════════

  async requestCheckin(trainerUserId: string, studentUserId: string) {
    const trainer = await this.prisma.trainer.findUnique({
      where: { userId: trainerUserId },
      include: { user: { include: { profile: true } } },
    });
    if (!trainer) throw new ForbiddenException('Apenas trainers podem solicitar check-in');

    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
      include: { user: { include: { profile: true } } },
    });
    if (!student) throw new NotFoundException('Aluno não encontrado');

    const trainerName = [trainer.user.profile?.firstName, trainer.user.profile?.lastName].filter(Boolean).join(' ') || 'Seu personal';

    await this.notifications.create({
      userId: studentUserId,
      type: 'WORKOUT_REMINDER',
      title: '📋 Check-in solicitado!',
      body: `${trainerName} está solicitando um check-in rápido. Registre seu peso e como se sente!`,
    });

    return { sent: true };
  }
}
