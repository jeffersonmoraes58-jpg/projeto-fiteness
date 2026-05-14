import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { GoalType, ActivityLevel } from '@prisma/client';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
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

    const prompt = `
      Você é um personal trainer especialista. Sugira um treino para o seguinte aluno:

      Nome: ${student?.user.profile?.firstName}
      Objetivo: ${student?.goalType}
      Nível de atividade: ${student?.activityLevel}
      Histórico de lesões: ${student?.anamnesis?.previousInjuries || 'Nenhum'}
      Condições médicas: ${student?.anamnesis?.cardiovascularIssues ? 'Problemas cardiovasculares' : 'Saudável'}

      Retorne um JSON com:
      {
        "name": "nome do treino",
        "description": "descrição",
        "exercises": [
          {
            "name": "nome do exercício",
            "sets": 3,
            "reps": "8-12",
            "rest": 60,
            "notes": "observações",
            "muscleGroup": "grupo muscular"
          }
        ],
        "tips": ["dica 1", "dica 2"],
        "duration": 60
      }
    `;

    const response = await this.openai.chat.completions.create({
      model: this.config.get('OPENAI_MODEL', 'gpt-4o'),
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
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

    const prompt = `
      Você é nutricionista especialista em fitness. Crie um plano alimentar para:

      Objetivo: ${student?.goalType}
      IMC: ${assessment?.bmi || 'N/A'}
      TMB: ${assessment?.tmb || 'N/A'} kcal
      GET: ${assessment?.get || 'N/A'} kcal
      Proteína alvo: ${assessment?.proteinTarget || 'N/A'}g
      Carboidrato alvo: ${assessment?.carbsTarget || 'N/A'}g
      Gordura alvo: ${assessment?.fatTarget || 'N/A'}g
      Restrições: ${assessment?.dietaryRestrictions?.join(', ') || 'Nenhuma'}
      Alergias: ${assessment?.foodAllergies?.join(', ') || 'Nenhuma'}

      Retorne um JSON com:
      {
        "name": "nome do plano",
        "totalCalories": 2000,
        "meals": [
          {
            "name": "Café da manhã",
            "time": "07:00",
            "calories": 400,
            "foods": [
              { "name": "Aveia", "quantity": 80, "unit": "g", "calories": 300, "protein": 10, "carbs": 55, "fat": 5 }
            ]
          }
        ],
        "tips": ["dica 1"],
        "shoppingList": ["item 1", "item 2"]
      }
    `;

    const response = await this.openai.chat.completions.create({
      model: this.config.get('OPENAI_MODEL', 'gpt-4o'),
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  async getMotivationalMessage(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { include: { profile: true } },
        workoutLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    const prompt = `
      Gere uma mensagem motivacional curta e personalizada (máximo 2 frases) para ${student?.user.profile?.firstName},
      que tem ${student?.streak} dias consecutivos de treino e está buscando ${student?.goalType}.
      Seja encorajador e específico. Responda em português brasileiro.
    `;

    const response = await this.openai.chat.completions.create({
      model: this.config.get('OPENAI_MODEL', 'gpt-4o'),
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    });

    return { message: response.choices[0].message.content };
  }

  async suggestExerciseAlternative(exerciseName: string, reason: string) {
    const prompt = `
      Sugira 3 exercícios alternativos para "${exerciseName}" considerando: ${reason}.

      Retorne JSON:
      {
        "alternatives": [
          {
            "name": "nome",
            "description": "por que é uma boa alternativa",
            "difficulty": 1-5,
            "equipment": ["equipamento necessário"]
          }
        ]
      }
    `;

    const response = await this.openai.chat.completions.create({
      model: this.config.get('OPENAI_MODEL', 'gpt-4o'),
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  async chatWithAssistant(userId: string, message: string, chatHistory: any[] = []) {
    const systemPrompt = `
      Você é um assistente fitness inteligente da plataforma FitSaaS.
      Ajude com perguntas sobre treinos, nutrição, saúde e bem-estar.
      Seja preciso, motivador e baseie suas respostas em evidências científicas.
      Responda sempre em português brasileiro.
      Se a pergunta for sobre condições médicas sérias, recomende consultar um profissional de saúde.
    `;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...chatHistory.slice(-10),
      { role: 'user' as const, content: message },
    ];

    const response = await this.openai.chat.completions.create({
      model: this.config.get('OPENAI_MODEL', 'gpt-4o'),
      messages,
      max_tokens: 500,
    });

    return {
      reply: response.choices[0].message.content,
      usage: response.usage,
    };
  }

  async analyzeProgressPhoto(photoUrl: string) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: photoUrl },
            },
            {
              type: 'text',
              text: 'Analise esta foto de progresso fitness. Identifique melhorias visíveis e dê feedback construtivo e motivacional. Responda em português.',
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    return { analysis: response.choices[0].message.content };
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
