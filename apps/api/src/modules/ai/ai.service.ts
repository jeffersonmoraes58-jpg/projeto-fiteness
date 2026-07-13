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

    const prompt = `Você é um personal trainer de elite especializado em prescrição de treinos. Crie um treino baseado na descrição abaixo.

## DESCRIÇÃO DO TRAINER
"${description}"

## EXERCÍCIOS DISPONÍVEIS NO SISTEMA (use APENAS nomes exatos desta lista)
${exerciseList}

## DIRETRIZES DE CRIAÇÃO
1. Interprete a descrição para extrair: objetivo principal, grupo muscular alvo, nível do aluno, frequência semanal, restrições (se houver)
2. Se a descrição não especificar algo, use valores padrão sensatos (nível intermediário, hipertrofia, 60 min)
3. Monte um treino COMPLETO e COESO, seguindo a ordem correta de exercícios:
   - Aquecimento específico (se houver exercícios adequados na lista)
   - Exercícios multiarticulares pesados primeiro (agachamento, supino, levantamento, remada)
   - Exercícios auxiliares multiarticulares (puxadas, desenvolvimento, passada)
   - Exercícios isoladores (rosca, extensão, elevação lateral)
   - Finalizadores / core
4. Volume adequado ao nível:
   - Iniciante: 3 séries, 12-15 reps, descanso 60-90s
   - Intermediário: 3-4 séries, 8-12 reps, descanso 60-90s  
   - Avançado: 4-5 séries, 6-12 reps (variado), descanso 90-120s
5. Inclua 6 a 9 exercícios (nem menos, nem mais)
6. As tags devem refletir o tipo de treino (ex: "hipertrofia", "força", "superiores", "pernas", "empurrar", "puxar")
7. Inclua 3-5 dicas técnicas relevantes para este treino específico

## FORMATO DE RESPOSTA (APENAS JSON válido, sem texto extra, sem markdown):
{"name":"Nome do Treino","description":"Breve descrição do objetivo e metodologia","level":2,"duration":60,"tags":["hipertrofia","superiores"],"exercises":[{"name":"Nome Exato do Exercício","sets":3,"reps":"10-12","restSeconds":90,"notes":"Manter escápulas retraídas"},...],"tips":["Dica 1","Dica 2","Dica 3"]}

IMPORTANTE: Responda APENAS o JSON. Nada de explicações, markdown ou texto extra.`;

    const content = (await this.complete(prompt, 3000)).replace(/```json|```/g, '').trim();
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

    const prompt = `Você é um PhD em Ciências do Exercício e Personal Trainer de elite com 20 anos de experiência. Analise este aluno com profundidade acadêmica mas comunicação prática.

## ALUNO
Nome: ${student.user.profile?.firstName} ${student.user.profile?.lastName}
Objetivo: ${student.goalType ?? 'Não definido'} | Atividade: ${student.activityLevel}
Streak: ${student.streak} dias | Pontos: ${student.points}
Lesões: ${student.anamnesis?.previousInjuries || 'Nenhuma'} | Cardio: ${student.anamnesis?.cardiovascularIssues ? 'Restrição' : 'OK'}
Sono: ${student.anamnesis?.sleepHours ? student.anamnesis.sleepHours + 'h' : 'N/A'} | Estresse: ${student.anamnesis?.stressLevel ?? 'N/A'}/10

## PLANOS ATIVOS (${plans.length})
${plansSection || 'Nenhum plano ativo'}

## LOGS — 90 DIAS (${totalLogs} sessões, ${avgPerWeek}/semana)
${logsSection || 'Sem histórico'}

## MEDIDAS CORPORAIS
${measSection}

## EXERCÍCIOS DISPONÍVEIS (use IDs exatos nas sugestões)
${libSection}

## INSTRUÇÕES DE ANÁLISE
Faça uma análise CIENTÍFICA e ACIONÁVEL. Considere obrigatoriamente:
1. **Volume por grupo muscular** — calcule mentalmente séries semanais por grupo; avalie se está dentro das faixas ótimas (10-20 hipertrofia, 5-10 força, 15-25 resistência)
2. **Simetria e equilíbrio** — há desequilíbrio push/pull? Superiores vs inferiores? Agonista/antagonista?
3. **Progressão de carga** — há evidência de sobrecarga progressiva nos logs? As cargas estão estagnadas?
4. **Frequência e consistência** — a média semanal é adequada ao objetivo? Há padrão de faltas?
5. **Aderência e bem-estar** — quais feelings predominam? Sono e estresse adequados para recuperação?
6. **Adequação ao objetivo** — o treino atual é o melhor para o goal declarado?

Seja CONCISO. Máximo 3 itens por lista. Máximo 3 exercícios alterados por plano. Apenas mudanças realmente impactantes.

Retorne APENAS JSON (sem markdown, sem texto extra):
{
  "rating": 7,
  "summary": "1-2 frases — diagnóstico principal",
  "positives": ["3 acertos MÁXIMO"],
  "concerns": ["3 problemas MÁXIMO"],
  "recommendations": ["3 ações MÁXIMO"],
  "proposedChanges": [
    {
      "planId": "cópia exata do ID do plano",
      "planName": "nome do treino",
      "reason": "1 frase justificando",
      "exercises": [
        {
          "exerciseId": "ID exato do banco para update, null para add",
          "exerciseName": "nome exato do banco",
          "action": "update|add|remove",
          "current": {"sets":3,"reps":"10","weight":80,"rest":60},
          "proposed": {"sets":4,"reps":"8-10","weight":90,"rest":90},
          "reason": "1 frase curta"
        }
      ]
    }
  ]
}`;

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
    // Buscar informações do trainer para personalizar a conversa
    const trainer = await this.prisma.trainer.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });

    const trainerName = trainer?.user?.profile?.firstName || 'Personal Trainer';

    // Buscar TODOS os exercícios disponíveis do sistema para que a IA saiba
    // exatamente quais exercícios existem e possa usá-los pelo nome correto
    const allExercises = await this.prisma.exercise.findMany({
      where: trainer
        ? { OR: [{ isPublic: true }, { trainerId: trainer.id }] }
        : { isPublic: true },
      select: { id: true, name: true, category: true, muscleGroups: true, gifUrl: true, videoUrl: true },
      take: 200,
      orderBy: { name: 'asc' },
    });

    const exerciseLibrary = allExercises.map((e) =>
      `"${e.name}" (${e.category || e.muscleGroups?.join(', ') || 'geral'})${e.gifUrl ? ' ✅GIF' : ''}${e.videoUrl ? ' ✅vídeo' : ''}`
    ).join('\n');

    const basePrompt = `Você é um PERSONAL TRAINER EXPERT de elite internacional da plataforma Fitlynutri.
Seu nome é Fitly IA e você é especialista MÁXIMO em prescrição de treinamento físico, biomecânica, fisiologia do exercício e periodização.

## SUA IDENTIDADE
- Você é um dos melhores personal trainers do mundo, com conhecimento equivalente a um PhD em Ciências do Exercício
- Você tem 20+ anos de experiência prática com atletas de todos os níveis — desde iniciantes sedentários até atletas de elite
- Você domina: periodização (linear, ondulatória, blocos), biomecânica avançada, fisiologia neuromuscular, endocrinologia do exercício, nutrição esportiva básica
- Você fala português brasileiro fluentemente, com tom profissional mas acessível
- Você NUNCA inventa informações — quando não souber algo com certeza, admite e sugere consultar um especialista

## PROTOCOLO DE RESPOSTA
1. **Sempre priorize a segurança do aluno** — se a pergunta envolver condições médicas sérias (cardíacas, neurológicas, lesões agudas, dores incapacitantes), oriente SEMPRE consultar um médico antes de qualquer exercício
2. **Seja específico e acionável** — nunca dê respostas genéricas. Sempre inclua: séries, repetições, % de carga, tempo de descanso, frequência semanal
3. **Justifique com ciência** — explique o "porquê" de cada recomendação com base em fisiologia e biomecânica
4. **Adapte ao nível do aluno** — pergunte sobre nível de experiência se não foi informado, e adapte todas as recomendações
5. **Periodização sempre** — ao criar programas, inclua progressão semanal, deload, variação de estímulo
6. **Formate respostas para leitura rápida** — use listas, marcadores, emojis estratégicos para organizar visualmente
7. **Ofereça alternativas** — sempre dê opções (exercício A ou B, abordagem X ou Y) para diferentes cenários

## ÁREAS DE MAESTRIA
### Criação de Treinos
- Montagem de programas completos por objetivo (hipertrofia, força máxima, potência, resistência muscular, emagrecimento, condicionamento, mobilidade, reabilitação)
- Divisões de treino (full body, upper/lower, push/pull/legs, bro split, 5x5, PHUL, PHAT, etc.)
- Seleção de exercícios baseada em: grupo muscular alvo, perfil de resistência, curva de tensão, estabilidade, equipamento disponível
- Ordem dos exercícios: multiarticulares primeiro, isoladores depois; maiores grupos primeiro; exercícios de habilidade/técnicos antes da fadiga
- Volume de treino: séries semanais por grupo muscular (10-20 para hipertrofia, 5-10 para força, 15-25 para resistência)
- Intensidade: %1RM, RPE/RIR, zonas de repetições máximas
- Densidade: relação volume/tempo de sessão

### Periodização
- Macrociclo (6-12 meses), Mesociclo (3-6 semanas), Microciclo (1 semana)
- Fases: preparação geral → específica → competitiva (peak) → transição (deload)
- Progressão de carga: 2.5-5kg/semana para iniciantes, 1-2.5kg/semana para intermediários, periodização ondulatória para avançados
- Modelos: linear clássico, ondulatório diário/semanal, periodização em blocos, APRE (autoregulatory progressive resistance exercise)
- Overreaching funcional vs overtraining — sinais de alerta e protocolos de recuperação

### Biomecânica e Execução
- Análise de cada exercício: fase concêntrica, excêntrica, isométrica
- Planos de movimento: sagital, frontal, transverso
- Cadeias cinéticas: aberta vs fechada
- Relação comprimento-tensão, curva de força, vantagem mecânica em cada ângulo
- Estabilização escapular, core bracing, valgo dinâmico, compensações posturais comuns
- Correção de execução: dicas verbais, táteis, visuais para cada desvio comum

### Fisiologia Aplicada
- Sistemas energéticos: ATP-CP (1-10s), glicolítico (30-120s), oxidativo (2min+)
- Tipos de fibra: I (lenta), IIa (intermediária), IIx (rápida) — como treinar cada uma
- Respostas hormonais ao treino: testosterona, GH, cortisol, IGF-1
- Adaptações neuromusculares: coordenação intramuscular, intermuscular, frequência de disparo, sincronização de unidades motoras
- Síntese proteica muscular: janela anabólica de 24-48h, refratariedade após estímulo
- Fadiga central vs periférica, mecanismos de recuperação

### Nutrição Esportiva (básico — aprofundamento é com nutricionista)
- Proteína: 1.6-2.2g/kg/dia para hipertrofia
- Timing: 20-40g proteína a cada 3-4h, incluindo pré/pós-treino
- Carboidratos: 3-7g/kg/dia dependendo do volume de treino
- Hidratação: 500ml-1L/hora durante treino, reposição de eletrólitos
- Suplementação baseada em evidência: creatina, whey protein, cafeína, beta-alanina, vitamina D

### Lesões e Reabilitação
- Lesões mais comuns por grupo muscular/articulação
- Exercícios de prevenção: manguito rotador, fortalecimento de glúteo médio, mobilidade torácica
- Critérios de retorno ao treino pós-lesão
- Adaptações para condições específicas: hérnia discal, condromalácia, tendinopatias, síndrome do impacto

### Populações Especiais
- Idosos: foco em potência, equilíbrio, densidade óssea, prevenção de sarcopenia
- Gestantes: adaptações por trimestre, exercícios contraindicados, diástase
- Adolescentes: foco técnico, progressão óssea, cuidados com placa epifisária
- Obesos: baixo impacto articular, progressão gradual de volume, termogênese

## REGRAS ABSOLUTAS
- JAMAIS prescreva dieta completa ou plano alimentar detalhado (isso é papel do nutricionista). Você pode dar orientações nutricionais GERAIS baseadas em evidência, mas sempre com a ressalva: "Procure um nutricionista para um plano individualizado"
- JAMAIS diga que algo é "garantido" ou "100% seguro"
- JAMAIS recomende esteroides anabolizantes, SARMs, hormônios ou qualquer substância ilegal/doping
- JAMAIS ignore sinais de alerta de overtraining, lesão ou condição médica séria
- JAMAIS responda em outro idioma que não português brasileiro (a não ser que o usuário peça explicitamente)
- SEMPRE que criar um treino, inclua: aquecimento específico, séries, repetições, % de carga ou RPE, tempo de descanso, e notas de execução
- SEMPRE pergunte sobre lesões prévias, limitações e equipamento disponível antes de recomendar exercícios
- SEMPRE ofereça progressões e regressões para cada exercício recomendado
- Ao receber contexto de análise de aluno, use esses dados como fonte PRIMÁRIA de verdade para todas as recomendações`;

    const exerciseSection = `## BANCO DE EXERCÍCIOS DO SISTEMA FITLYNUTRI
Estes são TODOS os exercícios cadastrados no sistema. Ao recomendar ou criar treinos, use EXATAMENTE os nomes abaixo. NUNCA invente nomes de exercícios — se não existir na lista, sugira o mais similar ou avise que o exercício precisaria ser cadastrado.

${exerciseLibrary}

IMPORTANTE: ✅GIF e ✅vídeo significam que o exercício tem mídia demonstrativa disponível no app. Priorize exercícios com mídia quando possível.`;

    let systemPrompt: string;

    if (context) {
      systemPrompt = `${basePrompt}

${exerciseSection}

## CONTEXTO DA ANÁLISE DO ALUNO (DADOS REAIS DO SISTEMA)
As informações abaixo foram extraídas diretamente do banco de dados do Fitlynutri. Use esses dados como VERDADE ABSOLUTA ao responder perguntas sobre este aluno específico.

${context}

INSTRUÇÃO CRÍTICA: Você está respondendo perguntas sobre este aluno ESPECÍFICO. Cada resposta deve ser baseada nos dados reais acima. NÃO invente números, pesos, ou exercícios que não constam nos dados. Se o treinador perguntar algo que não está nos dados, responda com base em sua expertise mas alerte que não tem esse dado específico do aluno.`;
    } else {
      systemPrompt = `${basePrompt}

${exerciseSection}

## CONTEXTO ATUAL
Você está conversando com ${trainerName}, um personal trainer cadastrado na plataforma Fitlynutri.
${trainerName} confia em você como seu assistente expert para ajudar na prescrição de treinos e análise de alunos.

Se você não souber algo específico sobre os alunos que ${trainerName} está treinando, peça educadamente que ele compartilhe os dados relevantes (objetivo, nível, histórico de lesões, etc.) para que você possa dar uma recomendação personalizada.`;
    }

    const messages = [
      ...chatHistory.slice(-15),
      { role: 'user' as const, content: message },
    ];

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 2000,
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

    // ─── 3. Log do texto extraído para debug ──────────────────────────────────
    console.log('[PDF] Texto bruto extraído:', pdfText.slice(0, 2000));

    // ─── 4. Mandar para IA interpretar o PDF ──────────────────────────────────
    // Tenta até 2 vezes com prompts diferentes
    let raw: string;
    let parsed: any = null;

    const attemptPrompt = (extraInstructions: string) => {
      return `Você é um personal trainer expert especializado em interpretar PDFs de treino.

## CONTEÚDO EXTRAÍDO DO PDF "${fileName}":
${pdfText.slice(0, 10000)}

## BANCO DE EXERCÍCIOS DISPONÍVEIS NO SISTEMA (use APENAS estes nomes):
${exerciseList}

## INSTRUÇÕES:
1. Analise TODO o conteúdo do PDF e identifique os treinos descritos
2. Para CADA exercício mencionado, encontre o nome MAIS PRÓXIMO na lista disponível
3. Se um exercício do PDF não existir exatamente, escolha o MAIS SIMILAR (mesmo grupo muscular)
4. Adapte séries, repetições, descanso conforme descrito no PDF
5. ${extraInstructions}

## FORMATO DE RESPOSTA (APENAS JSON válido, sem texto extra, sem markdown):
{"workouts":[{"name":"Nome do Treino","description":"Descrição","level":2,"duration":60,"tags":["tag1"],"tips":["dica"],"exercises":[{"name":"Nome Exato do Exercício","sets":3,"reps":"10-12","restSeconds":60,"weight":0,"notes":""}]}]}

REGRAS ABSOLUTAS:
- Retorne APENAS o JSON, nada mais
- workouts DEVE ter pelo menos 1 item
- Cada workout DEVE ter pelo menos 3 exercises
- Use APENAS nomes de exercícios da lista disponível
- NÃO use markdown, NÃO use \`\`\`json, NÃO use explicações
- Apenas o JSON puro`;
    };

    // Primeira tentativa
    try {
      raw = await this.complete(attemptPrompt('Inclua dicas de execução e observações relevantes.'), 5000);
      console.log('[PDF] Resposta bruta da IA (primeira tentativa):', raw.slice(0, 500));
      parsed = JSON.parse(this.extractJson(raw));
    } catch (err) {
      console.log('[PDF] Primeira tentativa falhou, tentando novamente com prompt mais direto...');
    }

    // Segunda tentativa se falhou
    if (!parsed || !parsed.workouts || parsed.workouts.length === 0) {
      try {
        raw = await this.complete(attemptPrompt('Seja extremamente direto. Liste TODOS os exercícios encontrados no PDF, mesmo que o formato esteja confuso. Crie pelo menos 1 treino com no mínimo 3 exercícios.'), 5000);
        console.log('[PDF] Resposta bruta da IA (segunda tentativa):', raw.slice(0, 500));
        parsed = JSON.parse(this.extractJson(raw));
      } catch (err) {
        console.error('[PDF] Segunda tentativa também falhou. Raw:', raw?.slice(0, 500));
        throw new Error('A IA não conseguiu interpretar o PDF corretamente. Tente novamente com um PDF mais claro.');
      }
    }

    const workouts = parsed?.workouts || [];
    if (workouts.length === 0) {
      console.error('[PDF] IA retornou workouts vazio. Resposta completa:', JSON.stringify(parsed).slice(0, 1000));
      throw new BadRequestException('A IA não identificou treinos válidos no PDF. Verifique se o PDF contém descrições de treinos legíveis.');
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

  // ═══════════════════════════════════════════════════
  // NUTRITIONIST AI TOOLS
  // ═══════════════════════════════════════════════════

  async nutritionTool(userId: string, tool: string, patientId?: string, params?: any) {
    const nutritionist = await this.prisma.nutritionist.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } },
    });
    if (!nutritionist) throw new ForbiddenException('Apenas nutricionistas');

    const name = nutritionist.user?.profile?.firstName || 'Nutricionista';
    let ctx = '';
    if (patientId) ctx = await this.buildPatientContext(nutritionist.id, patientId);

    const tools: Record<string, () => Promise<any>> = {
      meal_plan: () => this.genMealPlan(name, ctx, params),
      weekly_menu: () => this.genWeeklyMenu(name, ctx, params),
      food_substitution: () => this.genFoodSub(name, ctx, params),
      diary_analysis: () => this.genDiaryAnalysis(name, ctx, params),
      guidelines: () => this.genGuidelines(name, ctx, params),
    };

    const handler = tools[tool];
    if (!handler) throw new BadRequestException('Ferramenta desconhecida: ' + tool);
    return handler();
  }

  private async buildPatientContext(nId: string, pId: string): Promise<string> {
    const [pat, assess, anam, diets, exams, goals] = await Promise.all([
      this.prisma.nutritionistPatient.findFirst({
        where: { id: pId, nutritionistId: nId },
        include: { student: { include: { user: { include: { profile: true } } } } },
      }),
      this.prisma.nutritionalAssessment.findFirst({ where: { studentId: pId }, orderBy: { assessedAt: 'desc' } }),
      this.prisma.anamnesis.findFirst({ where: { studentId: pId }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.dietPlan.findMany({ where: { studentId: pId }, take: 3, orderBy: { createdAt: 'desc' }, select: { diet: { select: { name: true, status: true, totalCalories: true } } } }),
      this.prisma.patientExam.findMany({ where: { studentId: pId }, take: 5, orderBy: { examDate: 'desc' }, select: { title: true, notes: true, examDate: true } }),
      this.prisma.goal.findMany({ where: { studentId: pId, isCompleted: false }, take: 5, orderBy: { createdAt: 'desc' }, select: { title: true, targetValue: true, currentValue: true, unit: true } }),
    ]);
    if (!pat) return '';
    const s = pat.student;
    const lines = [
      `Nome: ${s.user?.profile?.firstName || ''} ${s.user?.profile?.lastName || ''}`,
      `Objetivo: ${s.goalType || 'Não definido'} | Atividade: ${s.activityLevel || 'N/A'}`,
    ];
    if (assess) {
      lines.push(`IMC: ${assess.bmi || 'N/A'} | TMB: ${assess.tmb || 'N/A'} | GET: ${assess.get || 'N/A'} kcal`);
      lines.push(`Proteína: ${assess.proteinTarget || 'N/A'}g | Carbs: ${assess.carbsTarget || 'N/A'}g | Gordura: ${assess.fatTarget || 'N/A'}g`);
      lines.push(`Restrições: ${assess.dietaryRestrictions?.join(', ') || 'Nenhuma'} | Alergias: ${assess.foodAllergies?.join(', ') || 'Nenhuma'}`);
    }
    if (anam) {
      lines.push(`Lesões: ${anam.previousInjuries || 'Nenhuma'} | Cardio: ${anam.cardiovascularIssues ? 'Sim' : 'Não'}`);
      lines.push(`Sono: ${anam.sleepHours || 'N/A'}h | Estresse: ${anam.stressLevel || 'N/A'}/10`);
    }
    if (diets.length) lines.push('Dietas:\n' + diets.map(d => `- ${d.diet?.name} (${d.diet?.status}, ${d.diet?.totalCalories || '?'} kcal)`).join('\n'));
    if (exams.length) lines.push('Exames:\n' + exams.map(e => `- ${e.title}: ${e.notes || 'N/A'} (${new Date(e.examDate).toLocaleDateString('pt-BR')})`).join('\n'));
    if (goals.length) lines.push('Metas:\n' + goals.map(g => `- ${g.title}: ${g.currentValue || 0}${g.unit || ''} / ${g.targetValue}${g.unit || ''}`).join('\n'));
    return lines.join('\n\n');
  }

  private async genMealPlan(name: string, ctx: string, p?: any) {
    const cal = p?.calories || 'calculada automaticamente';
    const meals = p?.meals || 5;
    const prompt = `Você é assistente IA do nutricionista ${name}. Crie PLANO ALIMENTAR com ${meals} refeições e meta de ${cal} kcal.\n\n## PACIENTE\n${ctx || 'Paciente genérico'}\n\nUse alimentos brasileiros, acessíveis. Respeite restrições. Retorne APENAS JSON:\n{"name":"Plano","totalCalories":2000,"macros":{"protein":150,"carbs":200,"fat":55},"meals":[{"name":"Café","time":"07:00","calories":400,"foods":[{"name":"Ovos","quantity":100,"unit":"g","calories":155,"protein":13,"carbs":1,"fat":11}]}],"tips":["Dica"],"shoppingList":["Item"]}`;
    const raw = await this.complete(prompt, 4000);
    return JSON.parse(this.extractJson(raw.replace(/```json|```/g, '').trim()));
  }

  private async genWeeklyMenu(name: string, ctx: string, p?: any) {
    const cal = p?.calories || 'calculada automaticamente';
    const prompt = `Você é assistente IA do nutricionista ${name}. Crie CARDÁPIO SEMANAL (7 dias) com ${cal} kcal/dia.\n\n## PACIENTE\n${ctx || 'Paciente genérico'}\n\nPara cada dia: café da manhã, almoço, jantar e 2 lanches. Varie alimentos. Retorne APENAS JSON:\n{"name":"Cardápio","dailyCalories":2000,"days":[{"day":"Segunda","meals":[{"meal":"Café da manhã","description":"Descrição do que comer","calories":400}]}],"shoppingList":["Item"],"tips":["Dica"]}`;
    const raw = await this.complete(prompt, 5000);
    return JSON.parse(this.extractJson(raw.replace(/```json|```/g, '').trim()));
  }

  private async genFoodSub(name: string, ctx: string, p?: any) {
    const food = p?.food || 'alimento não especificado';
    const reason = p?.reason || 'substituição saudável';
    const prompt = `Você é assistente IA do nutricionista ${name}. Sugira 5 SUBSTITUIÇÕES ALIMENTARES para "${food}". Motivo: ${reason}.\n\n## PACIENTE\n${ctx || 'Paciente genérico'}\n\nConsidere restrições. Retorne APENAS JSON:\n{"originalFood":"${food}","reason":"${reason}","alternatives":[{"name":"Alimento","explanation":"Por que é boa alternativa","nutritionalNote":"Comparação nutricional","preparation":"Como preparar/usar"}]}`;
    const raw = await this.complete(prompt, 2500);
    return JSON.parse(this.extractJson(raw.replace(/```json|```/g, '').trim()));
  }

  private async genDiaryAnalysis(name: string, ctx: string, p?: any) {
    const diary = p?.diary || '';
    const prompt = `Você é assistente IA do nutricionista ${name}. Analise DIÁRIO ALIMENTAR.\n\n## PACIENTE\n${ctx || 'Paciente genérico'}\n\n## DIÁRIO\n${diary || 'Nenhum registro fornecido'}\n\nAnalise pontos fortes e fracos. Compare com metas se disponíveis. Dê 5 recomendações práticas. Retorne APENAS JSON:\n{"summary":"Resumo em 1-2 frases","positives":["3 pontos fortes"],"concerns":["3 pontos de atenção"],"recommendations":[{"title":"Título curto","detail":"Explicação prática","priority":"high|medium|low"}],"estimatedCalories":2000}`;
    const raw = await this.complete(prompt, 3000);
    return JSON.parse(this.extractJson(raw.replace(/```json|```/g, '').trim()));
  }

  private async genGuidelines(name: string, ctx: string, p?: any) {
    const prompt = `Você é assistente IA do nutricionista ${name}. Gere ORIENTAÇÕES NUTRICIONAIS personalizadas em formato de carta profissional.\n\n## PACIENTE\n${ctx || 'Paciente genérico'}\n\nInclua: objetivo, estratégia, orientações gerais, alimentos recomendados, alimentos a evitar. Tom profissional e acolhedor. Retorne APENAS JSON:\n{"title":"Orientações Nutricionais","patientName":"Nome do Paciente","greeting":"Prezado(a)...","sections":[{"heading":"Objetivo Nutricional","body":"..."},{"heading":"Estratégia Alimentar","body":"..."},{"heading":"Orientações Gerais","body":"..."},{"heading":"Alimentos Recomendados","body":"..."},{"heading":"Alimentos a Evitar ou Moderar","body":"..."}],"closing":"Atenciosamente...","disclaimer":"Estas orientações não substituem consulta presencial."}`;
    const raw = await this.complete(prompt, 3000);
    return JSON.parse(this.extractJson(raw.replace(/```json|```/g, '').trim()));
  }
}
