import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { GoalType, ActivityLevel } from '@prisma/client';
import { PDFParse } from 'pdf-parse';

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

  private extractJson(text: string): string {
    // Strip markdown code fences
    const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    // Find outermost JSON object
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start !== -1 && end > start) return stripped.slice(start, end + 1);
    return stripped;
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

  async analyzeStudent(studentId: string, userId: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });
    if (!trainer) throw new ForbiddenException('Apenas trainers podem analisar alunos');

    const [student, plans, logs, measurements, exerciseLib] = await Promise.all([
      this.prisma.student.findUnique({
        where: { id: studentId },
        include: { user: { include: { profile: true } }, anamnesis: true },
      }),
      this.prisma.workoutPlan.findMany({
        where: { studentId, isActive: true },
        include: {
          workout: {
            include: { exercises: { include: { exercise: true }, orderBy: { order: 'asc' } } },
          },
        },
      }),
      this.prisma.workoutLog.findMany({
        where: { studentId, completedAt: { gte: new Date(Date.now() - 90 * 86400000) } },
        orderBy: { completedAt: 'desc' },
        take: 40,
        select: { completedAt: true, duration: true, status: true, feeling: true, workoutPlanId: true },
      }),
      this.prisma.bodyMeasurement.findMany({
        where: { studentId },
        orderBy: { measuredAt: 'desc' },
        take: 4,
        select: { measuredAt: true, weight: true, bodyFat: true, muscleMass: true },
      }),
      this.prisma.exercise.findMany({
        where: { OR: [{ isPublic: true }, { trainerId: trainer.id }] },
        select: { id: true, name: true, category: true },
        take: 30,
        orderBy: { name: 'asc' },
      }),
    ]);

    if (!student) throw new ForbiddenException('Aluno não encontrado');

    const totalLogs = logs.length;
    const weeks = 90 / 7;
    const avgPerWeek = (totalLogs / weeks).toFixed(1);
    const feelingMap: Record<string, string> = { GREAT: 'ótimo', GOOD: 'bom', AVERAGE: 'médio', BAD: 'ruim', TERRIBLE: 'péssimo' };

    const plansSection = plans.map((p) => {
      const exLines = (p.workout.exercises ?? []).map((we) =>
        `    ID:${we.exerciseId} | ${we.exercise?.name ?? '?'} | ${we.sets}x${we.reps ?? '?'} @ ${we.weight ?? 0}kg | desc ${we.restSeconds ?? 60}s`,
      ).join('\n');
      const days = Array.isArray(p.dayOfWeek) ? (p.dayOfWeek as number[]).join(',') : 'N/A';
      return `Plano ID:${p.id} — "${p.workout.name}" (divisão: ${p.division || 'N/A'}, dias da semana: ${days})\nExercícios:\n${exLines || '  Sem exercícios'}`;
    }).join('\n\n');

    const logsSection = logs.slice(0, 10).map((l) =>
      `${new Date(l.completedAt).toLocaleDateString('pt-BR')} | ${l.duration ?? '?'}min | ${feelingMap[l.feeling ?? ''] ?? '?'} | ${l.status}`,
    ).join('\n');

    const measSection = measurements.map((m) =>
      `${new Date(m.measuredAt).toLocaleDateString('pt-BR')}: peso ${m.weight ?? '?'}kg, gordura ${m.bodyFat ?? '?'}%, massa ${m.muscleMass ?? '?'}kg`,
    ).join('\n') || 'Sem medidas registradas';

    const libSection = exerciseLib.map((e) => `ID:${e.id} | ${e.name} | ${e.category}`).join('\n');

    const prompt = `Você é um personal trainer expert em periodização, análise de desempenho e prescrição de treino. Analise o histórico completo deste aluno e gere um relatório detalhado com sugestões concretas.

## PERFIL DO ALUNO
Nome: ${student.user.profile?.firstName} ${student.user.profile?.lastName}
Objetivo: ${student.goalType ?? 'Não definido'}
Nível de atividade: ${student.activityLevel}
Sequência atual: ${student.streak} dias | Pontos: ${student.points}
Lesões/cirurgias: ${student.anamnesis?.previousInjuries || 'Nenhuma'}
Cardiovascular: ${student.anamnesis?.cardiovascularIssues ? 'Sim' : 'Não'}
Sono: ${student.anamnesis?.sleepHours ? student.anamnesis.sleepHours + 'h/noite' : 'N/A'} | Estresse: ${student.anamnesis?.stressLevel ?? 'N/A'}/10

## PLANOS ATIVOS (${plans.length} plano(s))
${plansSection || 'Nenhum plano ativo'}

## HISTÓRICO DE TREINOS — ÚLTIMOS 90 DIAS
Total de sessões: ${totalLogs} | Média semanal: ${avgPerWeek} treinos/semana
${logsSection || 'Sem histórico'}

## EVOLUÇÃO CORPORAL
${measSection}

## BANCO DE EXERCÍCIOS DISPONÍVEIS (use exatamente estes IDs e nomes para sugestões de adição)
${libSection}

## INSTRUÇÕES
Analise: volume, intensidade, frequência, progressão de carga e adequação ao objetivo.
IMPORTANTE: Seja EXTREMAMENTE conciso. Strings curtas. Máximo 3 itens em cada lista. Máximo 3 exercícios por plano em proposedChanges. Inclua APENAS mudanças prioritárias.
Retorne APENAS JSON válido sem texto extra (sem markdown, sem explicações fora do JSON):
{
  "rating": 7,
  "summary": "2 frases máximo",
  "positives": ["máx 3 itens curtos"],
  "concerns": ["máx 3 itens curtos"],
  "recommendations": ["máx 3 itens curtos"],
  "proposedChanges": [
    {
      "planId": "id_exato_do_plano",
      "planName": "nome do treino",
      "reason": "1 frase",
      "exercises": [
        {
          "exerciseId": "id_exato_ou_null",
          "exerciseName": "nome",
          "action": "update",
          "current": { "sets": 3, "reps": "10", "weight": 80, "rest": 60 },
          "proposed": { "sets": 4, "reps": "8-10", "weight": 90, "rest": 90 },
          "reason": "1 frase curta"
        }
      ]
    }
  ]
}
Para "add" use exerciseId null e current null.`;

    let raw: string;
    try {
      raw = await this.complete(prompt, 6000);
    } catch (err) {
      throw new Error(`Falha na chamada à IA: ${(err as Error).message}`);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(this.extractJson(raw));
    } catch {
      // Log raw for debugging and return a safe fallback
      console.error('[AI analyzeStudent] JSON parse failed. Raw response:', raw.slice(0, 500));
      throw new Error('A IA retornou uma resposta inválida. Tente novamente.');
    }

    parsed._studentName = `${student.user.profile?.firstName ?? ''} ${student.user.profile?.lastName ?? ''}`.trim();
    parsed._plans = plans.map((p) => ({ id: p.id, name: p.workout.name, workoutId: p.workoutId }));
    return parsed;
  }

  async applyStudentChanges(planId: string, exercises: any[], userId: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });
    if (!trainer) throw new ForbiddenException('Apenas trainers podem aplicar mudanças');

    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id: planId },
      include: {
        workout: {
          include: {
            exercises: { orderBy: { order: 'asc' } },
            _count: { select: { plans: true } },
          },
        },
      },
    });
    if (!plan) throw new ForbiddenException('Plano não encontrado');

    let workoutId = plan.workoutId;

    if (plan.workout._count.plans > 1) {
      const w = plan.workout;
      const cloned = await this.prisma.$transaction(async (tx) => {
        const newW = await tx.workout.create({
          data: {
            name: w.name, description: w.description, status: w.status, level: w.level,
            duration: w.duration, tags: [...(w.tags || []), '__personalized'],
            isTemplate: false, trainerId: w.trainerId,
            exercises: {
              create: w.exercises.map((ex) => ({
                exerciseId: ex.exerciseId, order: ex.order, sets: ex.sets,
                reps: ex.reps, weight: ex.weight, restSeconds: ex.restSeconds,
                tempo: ex.tempo, notes: ex.notes, isDropSet: ex.isDropSet,
                isSuperSet: ex.isSuperSet, superSetGroupId: ex.superSetGroupId,
              })),
            },
          },
        });
        await tx.workoutPlan.update({ where: { id: planId }, data: { workoutId: newW.id } });
        return newW;
      });
      workoutId = cloned.id;
    }

    const currentExercises = await this.prisma.workoutExercise.findMany({
      where: { workoutId },
      orderBy: { order: 'asc' },
    });

    const updated: any[] = [];

    for (const change of exercises) {
      if (change.action === 'remove') continue;

      if (change.action === 'add') {
        let exerciseId = change.exerciseId;
        if (!exerciseId && change.exerciseName) {
          const found = await this.prisma.exercise.findFirst({
            where: { name: { contains: change.exerciseName, mode: 'insensitive' } },
          });
          exerciseId = found?.id;
        }
        if (exerciseId) {
          updated.push({
            exerciseId,
            sets: change.proposed?.sets ?? 3,
            reps: change.proposed?.reps ?? '10',
            weight: change.proposed?.weight ?? null,
            restSeconds: change.proposed?.rest ?? 60,
            notes: change.reason ?? null,
            order: updated.length,
          });
        }
        continue;
      }

      const existing = currentExercises.find((e) => e.exerciseId === change.exerciseId);
      if (existing) {
        updated.push({
          exerciseId: existing.exerciseId,
          sets: change.proposed?.sets ?? existing.sets,
          reps: change.proposed?.reps ?? existing.reps,
          weight: change.proposed?.weight ?? existing.weight,
          restSeconds: change.proposed?.rest ?? existing.restSeconds,
          notes: change.reason ?? existing.notes,
          order: updated.length,
        });
      }
    }

    const unchanged = currentExercises.filter(
      (e) => !exercises.find((c) => c.exerciseId === e.exerciseId && c.action !== 'add'),
    );
    const finalExercises = [
      ...unchanged.map((e, i) => ({
        exerciseId: e.exerciseId, sets: e.sets, reps: e.reps, weight: e.weight,
        restSeconds: e.restSeconds, tempo: e.tempo, notes: e.notes,
        isDropSet: e.isDropSet, isSuperSet: e.isSuperSet, order: i,
      })),
      ...updated.map((e, i) => ({ ...e, order: unchanged.length + i })),
    ];

    await this.prisma.workoutExercise.deleteMany({ where: { workoutId } });
    if (finalExercises.length > 0) {
      await this.prisma.workoutExercise.createMany({
        data: finalExercises.map((e) => ({ ...e, workoutId })),
      });
    }

    return { workoutId, exercisesApplied: updated.length, message: 'Alterações aplicadas com sucesso' };
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

  async processPdfWorkout(pdfBuffer: Buffer, fileName: string, userId: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });
    if (!trainer) throw new ForbiddenException('Apenas trainers podem processar PDFs');

    // ─── 1. Extrair texto do PDF ──────────────────────────────────────────────
    let pdfText: string;
    try {
      const parser = new PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      pdfText = result.text;
      await parser.destroy();
      console.log(`[PDF] Texto extraído (${pdfText.length} caracteres) de "${fileName}"`);
    } catch (err) {
      console.error('[PDF] Erro ao extrair texto:', (err as Error).message);
      throw new BadRequestException(`Não foi possível ler o PDF: ${(err as Error).message}`);
    }

    if (!pdfText || pdfText.trim().length < 10) {
      throw new BadRequestException('O PDF está vazio ou não contém texto legível');
    }

    // ─── 2. Buscar TODOS os exercícios disponíveis ────────────────────────────
    const exercises = await this.prisma.exercise.findMany({
      where: { OR: [{ isPublic: true }, { trainerId: trainer.id }] },
      select: { id: true, name: true, category: true, muscleGroups: true, gifUrl: true, videoUrl: true },
      take: 200,
      orderBy: { name: 'asc' },
    });

    const exerciseList = exercises.map((e) =>
      `"${e.name}" | categoria: ${e.category || (e.muscleGroups?.length ? e.muscleGroups[0] : 'geral')}${e.gifUrl ? ' ✅ tem GIF' : ''}${e.videoUrl ? ' ✅ tem vídeo' : ''}`
    ).join('\n');

    // ─── 3. Mandar para IA interpretar o PDF ──────────────────────────────────
    const prompt = `Você é um personal trainer expert especializado em interpretar PDFs de treino.

## CONTEÚDO EXTRAÍDO DO PDF "${fileName}":
${pdfText.slice(0, 10000)}

## BANCO DE EXERCÍCIOS DISPONÍVEIS NO SISTEMA:
${exerciseList}

## INSTRUÇÕES:
1. Analise o PDF e identifique os treinos descritos (nome, divisão, dias da semana)
2. Para CADA exercício mencionado no PDF, encontre o nome MAIS PRÓXIMO na lista disponível
3. Se um exercício do PDF não existir exatamente na lista, escolha o MAIS SIMILAR (mesmo grupo muscular, mesmo tipo de movimento)
4. Adapte séries, repetições, descanso e carga conforme descrito no PDF
5. Se o PDF não especificar algum campo, use valores padrão adequados
6. Inclua dicas de execução e observações relevantes

## FORMATO DE RESPOSTA (APENAS JSON válido, sem texto extra):
{
  "workouts": [
    {
      "name": "Nome do Treino (ex: Treino A - Peito e Tríceps)",
      "description": "Descrição curta do treino e objetivos",
      "level": 2,
      "duration": 60,
      "tags": ["peito", "tríceps", "empurrar"],
      "tips": ["Dica importante 1", "Dica importante 2"],
      "exercises": [
        {
          "name": "Nome Exato do Exercício da lista",
          "sets": 4,
          "reps": "8-12",
          "restSeconds": 60,
          "weight": 0,
          "notes": "Observação sobre execução ou adaptação"
        }
      ]
    }
  ]
}

IMPORTANTE:
- Use APENAS nomes de exercícios que existem na lista disponível
- Se não encontrar correspondência exata, escolha o mais similar
- Máximo 4 treinos
- 4 a 8 exercícios por treino
- level: 1(iniciante), 2(intermediário), 3(avançado)`;

    let raw: string;
    try {
      raw = await this.complete(prompt, 5000);
    } catch (err) {
      console.error('[PDF] Erro na chamada da IA:', (err as Error).message);
      throw new Error(`Falha na chamada à IA: ${(err as Error).message}`);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(this.extractJson(raw));
    } catch {
      console.error('[PDF] JSON parse failed. Raw:', raw.slice(0, 500));
      throw new Error('A IA não conseguiu interpretar o PDF corretamente. Tente novamente com um PDF mais claro.');
    }

    const workouts = parsed.workouts || [];
    if (workouts.length === 0) {
      throw new BadRequestException('A IA não identificou treinos válidos no PDF');
    }

    // ─── 4. Mapear exercícios e criar treinos ─────────────────────────────────
    const exerciseMap = new Map(exercises.map((e) => [e.name.toLowerCase().trim(), e]));
    const createdWorkouts: any[] = [];
    const unmatchedExercises: string[] = [];

    for (const w of workouts) {
      const workout = await this.prisma.workout.create({
        data: {
          name: w.name || `Treino: ${fileName.replace('.pdf', '')}`,
          description: w.description || 'Importado de PDF',
          level: Math.min(Math.max(w.level || 1, 1), 5),
          duration: w.duration || 60,
          tags: [...(w.tags || []), 'pdf-import'],
          status: 'DRAFT',
          trainerId: trainer.id,
        },
      });

      const workoutExercises: any[] = [];

      for (const [idx, ex] of (w.exercises || []).entries()) {
        let matched = exerciseMap.get((ex.name || '').toLowerCase().trim());

        // Se não achou exato, busca aproximada por similaridade
        if (!matched) {
          const searchName = (ex.name || '').toLowerCase().trim();
          // 1. Tenta por includes (parte do nome)
          let found = exercises.find((e) =>
            e.name.toLowerCase().includes(searchName) ||
            searchName.includes(e.name.toLowerCase()),
          );
          // 2. Tenta por palavra-chave (primeira palavra)
          if (!found) {
            const firstWord = searchName.split(/\s+/)[0];
            if (firstWord && firstWord.length > 3) {
              found = exercises.find((e) =>
                e.name.toLowerCase().includes(firstWord),
              );
            }
          }
          // 3. Tenta por grupo muscular (se a IA informou)
          if (!found && ex.muscleGroup) {
            found = exercises.find((e) =>
              e.muscleGroups?.some((mg: string) =>
                mg.toLowerCase().includes((ex.muscleGroup || '').toLowerCase()),
              ),
            );
          }

          if (found) {
            matched = found;
            console.log(`[PDF] Mapeado "${ex.name}" → "${found.name}" (ID: ${found.id})`);
          } else {
            unmatchedExercises.push(ex.name);
            console.log(`[PDF] Exercício não encontrado: "${ex.name}"`);
            continue; // Pula exercícios sem match
          }
        }

        workoutExercises.push({
          workoutId: workout.id,
          exerciseId: matched.id,
          sets: Number(ex.sets) || 3,
          reps: String(ex.reps || '10'),
          weight: ex.weight != null ? Number(ex.weight) : null,
          restSeconds: Number(ex.restSeconds) || 60,
          order: idx,
          notes: ex.notes || null,
        });
      }

      if (workoutExercises.length > 0) {
        await this.prisma.workoutExercise.createMany({ data: workoutExercises });
      }

      createdWorkouts.push({
        workoutId: workout.id,
        name: workout.name,
        exercisesAdded: workoutExercises.length,
        exercisesTotal: (w.exercises || []).length,
        tips: w.tips || [],
      });
    }

    // ─── 5. Montar resposta ───────────────────────────────────────────────────
    const summary = createdWorkouts.map((w) =>
      `✅ **${w.name}** — ${w.exercisesAdded} de ${w.exercisesTotal} exercícios adicionados`,
    ).join('\n');

    const unmatchedSection = unmatchedExercises.length > 0
      ? `\n\n⚠️ **Exercícios não encontrados na base (foram ignorados):**\n${unmatchedExercises.map((n) => `• ${n}`).join('\n')}\n\n_Você pode criar esses exercícios manualmente e adicioná-los ao treino._`
      : '';

    const allTips = createdWorkouts.flatMap((w) => w.tips || []);
    const tipsSection = allTips.length > 0
      ? `\n\n💡 **Dicas da IA:**\n${allTips.map((t: string) => `• ${t}`).join('\n')}`
      : '';

    return {
      reply: `📄 **PDF processado com sucesso!** Encontrei ${createdWorkouts.length} treino(s) no arquivo "${fileName}".\n\n${summary}${unmatchedSection}${tipsSection}\n\nOs treinos foram salvos como **Rascunho**. Você pode revisá-los e ativá-los na seção de Treinos.`,
      workouts: createdWorkouts,
      unmatchedExercises,
    };
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
