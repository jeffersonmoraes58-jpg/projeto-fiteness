import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { GoalType, ActivityLevel } from '@prisma/client';

@Injectable()
export class AiService {
  private anthropic: Anthropic;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: config.get('ANTHROPIC_API_KEY'),
    });
  }

  private get model(): string {
    return this.config.get('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001');
  }

  private async complete(prompt: string, maxTokens = 1500): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  }

  async generateWorkout(description: string, userId: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });
    if (!trainer) throw new ForbiddenException('Apenas trainers podem gerar treinos');

    const exercises = await this.prisma.exercise.findMany({
      where: { OR: [{ isPublic: true }, { trainerId: trainer.id }] },
      select: { id: true, name: true, category: true },
      take: 60,
      orderBy: { name: 'asc' },
    });

    const exerciseList = exercises.map((e) => e.name).join(', ');

    const prompt = `Você é personal trainer expert. Crie um treino baseado na descrição: "${description}"

Exercícios disponíveis (use nomes exatos): ${exerciseList}

Responda APENAS com JSON válido, sem texto extra:
{"name":"nome do treino","description":"descrição breve","level":2,"duration":60,"tags":["tag1"],"exercises":[{"name":"Nome Exato","sets":3,"reps":"10-12","restSeconds":60,"notes":null}],"tips":["dica1"]}

Escolha 5 a 8 exercícios da lista. Adapte séries e repetições ao objetivo.`;

    const content = (await this.complete(prompt)).replace(/```json|```/g, '').trim();
    const generated = JSON.parse(content);

    const workout = await this.prisma.workout.create({
      data: {
        name: generated.name || 'Treino gerado por IA',
        description: generated.description,
        level: Math.min(Math.max(generated.level || 1, 1), 5),
        duration: generated.duration || 60,
        tags: generated.tags || [],
        status: 'DRAFT',
        trainerId: trainer.id,
      },
    });

    const exerciseMap = new Map(exercises.map((e) => [e.name.toLowerCase().trim(), e.id]));

    const workoutExercises = (generated.exercises || [])
      .map((ex: any, idx: number) => {
        const exerciseId = exerciseMap.get((ex.name || '').toLowerCase().trim());
        if (!exerciseId) return null;
        return {
          workoutId: workout.id,
          exerciseId,
          sets: Number(ex.sets) || 3,
          reps: String(ex.reps || '10'),
          restSeconds: Number(ex.restSeconds) || 60,
          order: idx,
          notes: ex.notes || null,
        };
      })
      .filter(Boolean);

    if (workoutExercises.length > 0) {
      await this.prisma.workoutExercise.createMany({ data: workoutExercises });
    }

    return {
      workoutId: workout.id,
      name: workout.name,
      exercisesAdded: workoutExercises.length,
      tips: generated.tips || [],
    };
  }

  async suggestWorkout(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { include: { profile: true } },
        anamnesis: true,
        physicalAssessments: { orderBy: { assessedAt: 'desc' }, take: 1 },
        workoutLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    const prompt = `Você é um personal trainer especialista. Sugira um treino para o seguinte aluno:

Nome: ${student?.user.profile?.firstName}
Objetivo: ${student?.goalType}
Nível de atividade: ${student?.activityLevel}
Histórico de lesões: ${student?.anamnesis?.previousInjuries || 'Nenhum'}
Condições médicas: ${student?.anamnesis?.cardiovascularIssues ? 'Problemas cardiovasculares' : 'Saudável'}

Retorne APENAS JSON válido:
{"name":"nome do treino","description":"descrição","exercises":[{"name":"nome","sets":3,"reps":"8-12","rest":60,"notes":"obs","muscleGroup":"grupo"}],"tips":["dica1"],"duration":60}`;

    const content = (await this.complete(prompt, 2000)).replace(/```json|```/g, '').trim();
    return JSON.parse(content);
  }

  async suggestDiet(studentId: string) {
    const assessment = await this.prisma.nutritionalAssessment.findFirst({
      where: { studentId },
      orderBy: { assessedAt: 'desc' },
      include: { student: { include: { user: { include: { profile: true } } } } },
    });

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { anamnesis: true },
    });

    const prompt = `Você é nutricionista especialista em fitness. Crie um plano alimentar para:

Objetivo: ${student?.goalType}
IMC: ${assessment?.bmi || 'N/A'}
TMB: ${assessment?.tmb || 'N/A'} kcal
GET: ${assessment?.get || 'N/A'} kcal
Proteína alvo: ${assessment?.proteinTarget || 'N/A'}g
Carboidrato alvo: ${assessment?.carbsTarget || 'N/A'}g
Gordura alvo: ${assessment?.fatTarget || 'N/A'}g
Restrições: ${assessment?.dietaryRestrictions?.join(', ') || 'Nenhuma'}
Alergias: ${assessment?.foodAllergies?.join(', ') || 'Nenhuma'}

Retorne APENAS JSON válido:
{"name":"nome do plano","totalCalories":2000,"meals":[{"name":"Café da manhã","time":"07:00","calories":400,"foods":[{"name":"Aveia","quantity":80,"unit":"g","calories":300,"protein":10,"carbs":55,"fat":5}]}],"tips":["dica1"],"shoppingList":["item1"]}`;

    const content = (await this.complete(prompt, 3000)).replace(/```json|```/g, '').trim();
    return JSON.parse(content);
  }

  async getMotivationalMessage(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { include: { profile: true } },
        workoutLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    const prompt = `Gere uma mensagem motivacional curta e personalizada (máximo 2 frases) para ${student?.user.profile?.firstName}, que tem ${student?.streak} dias consecutivos de treino e está buscando ${student?.goalType}. Seja encorajador e específico. Responda em português brasileiro.`;

    const message = await this.complete(prompt, 150);
    return { message };
  }

  async suggestExerciseAlternative(exerciseName: string, reason: string) {
    const prompt = `Sugira 3 exercícios alternativos para "${exerciseName}" considerando: ${reason}.

Retorne APENAS JSON válido:
{"alternatives":[{"name":"nome","description":"por que é boa alternativa","difficulty":3,"equipment":["equipamento"]}]}`;

    const content = (await this.complete(prompt, 1000)).replace(/```json|```/g, '').trim();
    return JSON.parse(content);
  }

  async chatWithAssistant(userId: string, message: string, chatHistory: any[] = [], context?: string) {
    const basePrompt = `Você é um assistente de nutrição especializado da plataforma Fitlynutri.
Responda sempre em português brasileiro de forma clara e baseada em evidências científicas.
Se a pergunta envolver condição médica grave, oriente consultar um profissional de saúde.`;

    const systemPrompt = context
      ? `${basePrompt}

ATENÇÃO: As configurações abaixo foram definidas pelo nutricionista responsável e DEVEM ser seguidas rigorosamente em TODAS as respostas, sem exceção. Ignore essas regras somente se houver risco de saúde iminente.

${context}

Resumo do que foi configurado acima: adapte 100% das suas respostas ao perfil, tom e foco definidos. Não responda de forma genérica — seja específico para o contexto configurado.`
      : basePrompt;

    const messages = [
      ...chatHistory.slice(-10),
      { role: 'user' as const, content: message },
    ];

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 1200,
      system: systemPrompt,
      messages,
    });

    const block = response.content[0];
    return {
      reply: block.type === 'text' ? block.text : '',
      usage: response.usage,
    };
  }

  async analyzeProgressPhoto(photoUrl: string) {
    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: photoUrl },
            },
            {
              type: 'text',
              text: 'Analise esta foto de progresso fitness. Identifique melhorias visíveis e dê feedback construtivo e motivacional. Responda em português.',
            },
          ],
        },
      ],
    });

    const block = response.content[0];
    return { analysis: block.type === 'text' ? block.text : '' };
  }

  calculateTMB(weight: number, height: number, age: number, gender: string): number {
    if (gender === 'MALE') {
      return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
    }
    return 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
  }

  calculateGET(tmb: number, activityLevel: ActivityLevel): number {
    const factors: Record<ActivityLevel, number> = {
      SEDENTARY: 1.2,
      LIGHTLY_ACTIVE: 1.375,
      MODERATELY_ACTIVE: 1.55,
      VERY_ACTIVE: 1.725,
      EXTRA_ACTIVE: 1.9,
    };
    return tmb * factors[activityLevel];
  }

  calculateMacros(
    calories: number,
    goal: GoalType,
    weight: number,
  ): { protein: number; carbs: number; fat: number } {
    const proteinPerKg: Record<string, number> = {
      GAIN_MUSCLE: 2.2,
      LOSE_WEIGHT: 2.0,
      MAINTAIN_WEIGHT: 1.8,
      IMPROVE_ENDURANCE: 1.6,
      INCREASE_FLEXIBILITY: 1.4,
      ATHLETIC_PERFORMANCE: 2.0,
      REHABILITATION: 1.8,
    };

    const proteinGrams = weight * (proteinPerKg[goal] || 1.8);
    const proteinCalories = proteinGrams * 4;

    const fatCalories = calories * 0.25;
    const fatGrams = fatCalories / 9;

    const carbCalories = calories - proteinCalories - fatCalories;
    const carbGrams = carbCalories / 4;

    return {
      protein: Math.round(proteinGrams),
      carbs: Math.round(carbGrams),
      fat: Math.round(fatGrams),
    };
  }
}
