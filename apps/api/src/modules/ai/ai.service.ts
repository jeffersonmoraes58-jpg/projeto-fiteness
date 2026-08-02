import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { GoalType, ActivityLevel } from '@prisma/client';
import { PDFParse } from 'pdf-parse';
import {
  normalizeName,
  scoreMatch,
  matchExercise,
  guessCategoryFromMuscles,
  isCategoryValid,
  isEquipmentCompatible,
  VALID_MUSCLES,
  ExerciseLike,
  MatchResult,
} from './exercise-matcher';

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

  private async complete(prompt: string, maxTokens = 1500, model?: string): Promise<string> {
    const useModel = model ?? this.model;
    const isOpus47 = useModel === 'claude-opus-4-7';
    const response = await (this.anthropic.messages.create as any)({
      model: useModel,
      max_tokens: maxTokens,
      ...(isOpus47 && { thinking: { type: 'adaptive' } }),
      messages: [{ role: 'user', content: prompt }],
    });
    const textBlock = response.content?.find((b: any) => b.type === 'text');
    return textBlock?.text ?? '';
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

  async generateWorkout(
    userId: string,
    body: { description: string; studentId?: string; equipment?: string[]; feedback?: string },
  ) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });
    if (!trainer) throw new ForbiddenException('Apenas trainers podem gerar treinos');

    const description = String(body?.description ?? '').trim();
    if (!description) throw new BadRequestException('Descrição do treino é obrigatória');
    const equipment = Array.isArray(body?.equipment) ? body.equipment.filter(Boolean).slice(0, 30) : [];

    const catalog = await this.fetchExerciseCatalog(trainer.id);
    const exerciseList = this.buildReferenceList(catalog, 500);

    let studentContext = '';
    if (body?.studentId) {
      studentContext = await this.buildStudentContext(trainer.id, body.studentId);
    }

    const equipSection = equipment.length > 0
      ? `\n## EQUIPAMENTOS DISPONÍVEIS (OBRIGATÓRIO)
Apenas estes equipamentos estão disponíveis: ${equipment.join(', ')}.
- Escolha exercícios cuja execução dependa APENAS desses equipamentos.
- Para exercícios cuja execução exigiria outro equipamento, prefira variações ou substitua por similar compatível.
- Se "catalogName" da lista exigir equipamento indisponível, NÃO use; deixe "catalogName": null para a IA de resolução escolher alternativa compatível.`
      : '';

    const feedbackSection = body?.feedback?.trim()
      ? `\n## AJUSTES SOLICITADOS (sobre uma versão anterior)
${body.feedback.trim()}`
      : '';

    const prompt = `Você é um PERSONAL TRAINER EXPERT com PhD em Ciências do Exercício e 20 anos de experiência internacional. Crie treino(s) COMPLETO(S) e PROFISSIONAL(IS) baseado(s) na solicitação abaixo.

## SOLICITAÇÃO DO PERSONAL TRAINER
"${description}"${studentContext ? `\n\n## ALUNO (dados reais do sistema — use como verdade)
${studentContext}` : ''}${equipSection}${feedbackSection}

## EXERCÍCIOS DISPONÍVEIS NO SISTEMA (referência)
Use estes nomes como REFERÊNCIA. Preencha "catalogName" com o nome EXATO da lista quando reconhecer o exercício. Priorize exercícios com ✅GIF ou ✅VID.

${exerciseList}

## DIRETRIZES CIENTÍFICAS DE PRESCRIÇÃO

### ORDEM DOS EXERCÍCIOS (OBRIGATÓRIO)
1. Multiarticulares pesados (agachamento, supino, levantamento terra, remada, puxada)
2. Auxiliares multiarticulares (hack squat, supino inclinado, remada unilateral, desenvolvimento)
3. Isoladores (rosca, extensão, elevação lateral, crucifixo, fly)
4. Core / finalizadores (prancha, crunch, panturrilha)

### VOLUME E INTENSIDADE POR OBJETIVO
- Hipertrofia: 3-4 séries, 8-12 reps, 60-90s descanso
- Força: 4-5 séries, 4-6 reps, 2-5min descanso
- Emagrecimento/HIIT: 3-4 séries, 15-20 reps, 30-60s descanso, compostos priorizados
- Resistência muscular: 3-4 séries, 15-25 reps, 30-45s descanso
- Iniciante: -1 série do padrão, use reps no limite superior, cargas moderadas
- Avançado: volume máximo, técnicas avançadas quando adequado

### QUANTIDADE DE EXERCÍCIOS POR TREINO
- Full body: 6-9 exercícios
- Grupos musculares específicos (ABC, push/pull/legs): 5-8 exercícios
- Mínimo 5, máximo 10

### TÉCNICAS AVANÇADAS (apenas para intermediários/avançados)
- Superset: par de exercícios com descanso apenas após o par — use "technique":"superset" e "supersetGroup":"A" para indicar qual par
- Drop set: redução de carga e continuação até falha — use "technique":"dropset"
- Normal (maioria): "technique":"normal"

## FORMATO DE RESPOSTA (APENAS JSON puro, sem markdown, sem texto extra):
{"workouts":[{"name":"Nome do Treino","description":"Objetivo e metodologia em 1-2 frases","level":2,"duration":60,"tags":["hipertrofia","peito"],"exercises":[{"name":"Nome do exercício (como descrito na solicitação)","catalogName":"Nome Exato da lista (ou null se não existir na lista)","muscleGroup":"Chest","sets":4,"reps":"8-10","restSeconds":90,"weight":null,"tempo":"2010","technique":"normal","supersetGroup":null,"notes":"Retrair escápulas, cotovelos a 45°"}],"tips":["Dica técnica específica 1","Dica técnica específica 2","Dica técnica específica 3"]}]}

REGRAS ABSOLUTAS:
- Responda APENAS o JSON puro. Zero texto extra, zero markdown.
- "workouts": array com 1 ou mais treinos. Se a solicitação descrever uma divisão (ABC, push/pull/legs, upper/lower, etc.), retorne UM workout por dia/sessão, em ordem. Máximo 6 workouts.
- NO CAMPO "name" mantenha SEMPRE o nome do exercício conforme descrito na solicitação do trainer (não troque por outro nome).
- "catalogName": o nome EXATO da lista de referência quando reconhecer o exercício; caso contrário null.
- "muscleGroup": grupo muscular principal em português ou inglês simples (ex.: "Chest", "Legs", "Back", "Biceps").
- level: 1=Iniciante 2=Básico 3=Intermediário 4=Avançado 5=Elite
- reps pode ser string: "8-10", "12", "até a falha", "30s"
- weight: null se não especificado
- tempo: cadência em segundos como "2010" (negativa, pausa, concêntrica, topo) ou null
- technique: "normal", "superset" ou "dropset"
- supersetGroup: null ou letra ("A", "B") para identificar o par de superset
- notes: dica de execução técnica e específica para este exercício
- tips: 3-5 dicas TÉCNICAS e ESPECÍFICAS para cada treino`;

    let generated: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const raw = await this.complete(prompt, 6000, 'claude-opus-4-7');
        generated = JSON.parse(this.extractJson(raw));
        break;
      } catch (err) {
        console.error(`[AI] generateWorkout tentativa ${attempt} falhou:`, (err as Error).message);
        if (attempt === 2) throw new Error('A IA retornou uma resposta inválida. Tente novamente.');
      }
    }

    // Normaliza resposta: aceita {"workouts":[...]} ou objeto único de treino
    const workouts = Array.isArray(generated?.workouts) && generated.workouts.length > 0
      ? generated.workouts
      : generated?.exercises || generated?.workout
        ? [generated]
        : [];
    if (workouts.length === 0) {
      throw new BadRequestException('A IA não retornou treinos válidos. Tente novamente.');
    }
    const list = workouts.slice(0, 6);

    const allReplaced: any[] = [];
    const allCreated: any[] = [];
    const createdWorkouts: any[] = [];

    for (const w of list) {
      const workout = await this.prisma.workout.create({
        data: {
          name: w.name || 'Treino gerado por IA',
          description: w.description,
          level: Math.min(Math.max(Number(w.level) || 1, 1), 5),
          duration: Number(w.duration) || 60,
          tags: w.tags || [],
          status: 'DRAFT',
          trainerId: trainer.id,
        },
      });

      const resolved = await this.resolveGeneratedExercises(w.exercises || [], catalog, trainer.id, equipment);
      allReplaced.push(...resolved.replaced);
      allCreated.push(...resolved.created);

      const supersetGroupMap = new Map<string, string>();
      const addedExercises: Array<{ name: string; sets: number; reps: string; technique: string | null }> = [];

      const workoutExercises = resolved.items
        .map((item, idx) => {
          const rawEx = (w.exercises || [])[item.index] || {};
          const technique = (rawEx.technique || 'normal').toLowerCase();
          const isSuperSet = technique === 'superset';
          const isDropSet = technique === 'dropset';
          let superSetGroupId: string | null = null;
          if (isSuperSet && rawEx.supersetGroup) {
            if (!supersetGroupMap.has(rawEx.supersetGroup)) {
              supersetGroupMap.set(rawEx.supersetGroup, `sg-${Math.random().toString(36).slice(2, 8)}`);
            }
            superSetGroupId = supersetGroupMap.get(rawEx.supersetGroup) || null;
          }

          addedExercises.push({
            name: item.name,
            sets: item.sets,
            reps: item.reps,
            technique: isSuperSet ? 'superset' : isDropSet ? 'dropset' : null,
          });

          if (!item.exerciseId) return null;

          return {
            workoutId: workout.id,
            exerciseId: item.exerciseId,
            sets: item.sets,
            reps: item.reps,
            restSeconds: item.restSeconds,
            weight: item.weight,
            tempo: typeof rawEx.tempo === 'string' && rawEx.tempo.trim() ? rawEx.tempo.trim().slice(0, 10) : null,
            order: idx,
            notes: item.notes,
            isSuperSet,
            isDropSet,
            superSetGroupId,
          };
        })
        .filter(Boolean);

      if (workoutExercises.length > 0) {
        await this.prisma.workoutExercise.createMany({ data: workoutExercises });
      }

      createdWorkouts.push({
        workoutId: workout.id,
        name: workout.name,
        exercisesAdded: workoutExercises.length,
        exercisesTotal: (w.exercises || []).length,
        tips: w.tips || [],
        exercises: addedExercises,
      });
    }

    return {
      workouts: createdWorkouts,
      replaced: allReplaced,
      created: allCreated,
    };
  }

  /**
   * Busca TODO o catálogo de exercícios disponível para o trainer
   * (públicos + os criados por ele), sem limite — para o matcher
   * pesquisar em toda a base, incluindo exercícios com GIF/vídeo.
   */
  private async fetchExerciseCatalog(trainerId: string): Promise<ExerciseLike[]> {
    return this.prisma.exercise.findMany({
      where: { OR: [{ isPublic: true }, { trainerId }] },
      select: { id: true, name: true, category: true, muscleGroups: true, gifUrl: true, videoUrl: true, equipment: true },
      orderBy: { name: 'asc' },
    });
  }

  /** Monta a lista de referência para o prompt (priorizando mídia, depois nome). */
  private buildReferenceList(catalog: ExerciseLike[], limit: number): string {
    const media = (e: ExerciseLike) => (e.gifUrl ? 2 : e.videoUrl ? 1 : 0);
    const sorted = [...catalog]
      .sort((a, b) => media(b) - media(a) || a.name.localeCompare(b.name))
      .slice(0, limit);
    return sorted
      .map((e) => {
        const cat = e.category || e.muscleGroups?.[0] || 'GERAL';
        const m = e.gifUrl ? ' ✅GIF' : e.videoUrl ? ' ✅VID' : '';
        const eq = Array.isArray(e.equipment) && e.equipment.length > 0 ? ` 🏋️${e.equipment.join('/')}` : '';
        return `"${e.name}" [${cat}]${m}${eq}`;
      })
      .join('\n');
  }

  /**
   * Resolve os exercícios gerados pela IA contra o catálogo completo.
   * 1) catalogName exato → 2) matching inteligente (normalização/sinônimos/fuzzy)
   * 3) não achou: IA decide entre sugerir substituto da base OU criar o exercício.
   */
  private async resolveGeneratedExercises(
    rawExercises: any[],
    catalog: ExerciseLike[],
    trainerId: string,
    equipment?: string[],
  ): Promise<{
    items: Array<{
      index: number;
      name: string;
      exerciseId: string | null;
      sets: number;
      reps: string;
      restSeconds: number;
      weight: number | null;
      notes: string | null;
      status: 'matched' | 'replaced' | 'created' | 'unresolved';
    }>;
    replaced: Array<{ originalName: string; exerciseId: string; substituteName: string; reason: string }>;
    created: Array<{ originalName: string; exerciseId: string; name: string; category: string; description: string | null }>;
    unmatched: string[];
  }> {
    const items: Array<{
      index: number;
      name: string;
      exerciseId: string | null;
      sets: number;
      reps: string;
      restSeconds: number;
      weight: number | null;
      notes: string | null;
      status: 'matched' | 'replaced' | 'created' | 'unresolved';
    }> = [];
    const unresolved: Array<{ index: number; name: string; muscleGroup?: string | null; candidates: MatchResult[] }> = [];

    for (const [idx, ex] of (rawExercises || []).entries()) {
      const name = String(ex?.name ?? '').trim();
      const muscleGroup = ex?.muscleGroup ?? null;
      const hintCategory = guessCategoryFromMuscles(muscleGroup ? [muscleGroup] : [], null);

      const base = {
        index: idx,
        name,
        sets: Number(ex?.sets) || 3,
        reps: String(ex?.reps || '10'),
        restSeconds: Number(ex?.restSeconds) || 60,
        weight: ex?.weight != null ? Number(ex.weight) : null,
        notes: ex?.notes || null,
      };

      let exercise: ExerciseLike | null = null;

      // Camada 1: catalogName exato fornecido pelo modelo
      if (ex?.catalogName) {
        const cn = normalizeName(ex.catalogName);
        if (cn) {
          const exact = catalog.find((c) => normalizeName(c.name) === cn);
          if (
            exact &&
            isEquipmentCompatible(exact, equipment) &&
            (normalizeName(name) === cn || scoreMatch(name, exact) >= 50)
          ) {
            exercise = exact;
          }
        }
      }

      // Camada 2: matching inteligente em TODO o catálogo
      if (!exercise && name) {
        exercise = matchExercise(name, catalog, { category: hintCategory, muscleGroup, equipment }).best?.exercise ?? null;
      }

      if (exercise) {
        items.push({ ...base, exerciseId: exercise.id, status: 'matched' });
        continue;
      }

      // Sem match: guarda candidatos para a IA decidir substituir ou criar
      const { candidates } = matchExercise(name, catalog, { category: hintCategory, muscleGroup, equipment });
      const pool = candidates.filter((c) => c.score >= 25).slice(0, 4);
      unresolved.push({ index: idx, name, muscleGroup, candidates: pool });
      items.push({ ...base, exerciseId: null, status: 'unresolved' });
    }

    const replaced: Array<{ originalName: string; exerciseId: string; substituteName: string; reason: string }> = [];
    const created: Array<{ originalName: string; exerciseId: string; name: string; category: string; description: string | null }> = [];

    if (unresolved.length > 0) {
      const resolutions = await this.resolveUnmatchedViaAI(unresolved);

      for (const item of items) {
        if (item.status !== 'unresolved') continue;

        const res = resolutions.find((r) => r.index === item.index);
        const candidates = unresolved.find((u) => u.index === item.index)?.candidates ?? [];

        const applyFallbackCreate = async (name: string) => {
          const createdEx = await this.ensureExercise(name, null, trainerId);
          item.exerciseId = createdEx.id;
          item.status = createdEx.wasCreated ? 'created' : 'matched';
          created.push({
            originalName: name,
            exerciseId: createdEx.id,
            name: createdEx.name,
            category: createdEx.category,
            description: createdEx.description,
          });
        };

        if (res?.action === 'create') {
          const createdEx = await this.ensureExercise(item.name, res, trainerId);
          item.exerciseId = createdEx.id;
          item.status = createdEx.wasCreated ? 'created' : 'matched';
          created.push({
            originalName: item.name,
            exerciseId: createdEx.id,
            name: createdEx.name,
            category: createdEx.category,
            description: createdEx.description,
          });
          continue;
        }

        // Substituição: candidato escolhido pela IA ou o melhor candidato (fallback)
        const substitute =
          candidates.find((c) => c.exercise.id === res?.exerciseId) ?? candidates[0];

        if (substitute && substitute.score >= 30) {
          item.exerciseId = substitute.exercise.id;
          item.status = 'replaced';
          replaced.push({
            originalName: item.name,
            exerciseId: substitute.exercise.id,
            substituteName: substitute.exercise.name,
            reason:
              res?.reason ||
              `Substituído pelo exercício mais próximo do catálogo (${substitute.matchedBy}, confiança ${substitute.score}%).`,
          });
        } else {
          await applyFallbackCreate(item.name);
        }
      }
    }

    return { items, replaced, created, unmatched: [] };
  }

  /** Pede à IA para decidir, para cada exercício sem match, substituir ou criar. */
  private async resolveUnmatchedViaAI(
    unresolved: Array<{ index: number; name: string; muscleGroup?: string | null; candidates: MatchResult[] }>,
  ): Promise<Array<{
    index: number;
    action: 'substitute' | 'create';
    exerciseId?: string;
    name?: string;
    category?: string;
    muscleGroups?: string[];
    description?: string;
    instructions?: string;
    reason?: string;
  }>> {
    if (unresolved.length === 0) return [];

    const sections = unresolved
      .map((u) => {
        const candidates = u.candidates.length
          ? u.candidates
              .map((c, i) => `  - [${i + 1}] "${c.exercise.name}" (${c.exercise.category})${c.exercise.gifUrl ? ' ✅GIF' : ''}${c.exercise.videoUrl ? ' ✅vídeo' : ''}`)
              .join('\n')
          : '  (nenhum candidato similar na base)';
        return `[${u.index}] Original: "${u.name}"${u.muscleGroup ? ` | Músculos: ${u.muscleGroup}` : ''}\n${candidates}`;
      })
      .join('\n\n');

    const prompt = `Você é um personal trainer expert. Alguns exercícios do treino NÃO existem na base de exercícios do sistema.

Para CADA exercício sem match, decida:
- "substitute": escolher o MELHOR candidato da base (mesmo grupo muscular, priorize ✅GIF/✅vídeo, padrão de movimento mais próximo); OU
- "create": criar o exercício quando NENHUM candidato é realmente equivalente ao original.

## EXERCÍCIOS SEM MATCH
${sections}

## FORMATO DE RESPOSTA (APENAS JSON, sem markdown, sem texto extra):
{"resolutions":[{"index":0,"action":"substitute","exerciseId":"<ID de um candidato>","reason":"frase curta"},{"index":1,"action":"create","name":"Nome do exercício","category":"LEGS","muscleGroups":["QUADRICEPS"],"description":"Descrição em 1 frase","instructions":"Passo a passo em até 4 etapas","reason":"frase curta"}]}

REGRAS ABSOLUTAS:
- Retorne APENAS o JSON.
- Use APENAS IDs de candidatos listados acima na ação substitute.
- Ação "create" APENAS quando nenhum candidato for equivalente.
- category DEVE ser um destes enums: CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, LEGS, GLUTES, CORE, CARDIO, FULL_BODY, MOBILITY
- muscleGroups (opcional) DEVE usar estes enums: PECTORALIS_MAJOR, PECTORALIS_MINOR, LATISSIMUS_DORSI, TRAPEZIUS, RHOMBOIDS, DELTOID, BICEPS_BRACHII, TRICEPS_BRACHII, FOREARMS, QUADRICEPS, HAMSTRINGS, GLUTES, CALVES, ABS, OBLIQUES, LOWER_BACK, HIP_FLEXORS
- description e instructions em português, curtas e técnicas
- Retorne resolução para TODOS os índices listados`;

    try {
      const raw = await this.complete(prompt, 3000);
      const parsed = JSON.parse(this.extractJson(raw));
      const resolutions = Array.isArray(parsed?.resolutions) ? parsed.resolutions : [];
      return resolutions
        .filter((r: any) => typeof r?.index === 'number')
        .map((r: any) => ({
          index: r.index,
          action: r.action === 'create' ? ('create' as const) : ('substitute' as const),
          exerciseId: r.exerciseId ?? undefined,
          name: r.name ?? undefined,
          category: r.category ?? undefined,
          muscleGroups: Array.isArray(r.muscleGroups) ? r.muscleGroups : undefined,
          description: r.description ?? undefined,
          instructions: r.instructions ?? undefined,
          reason: r.reason ?? undefined,
        }));
    } catch (err) {
      console.error('[AI] Falha ao resolver exercícios sem match:', (err as Error).message);
      return []; // fallback (substituto com maior score ou criação) é aplicado pelo chamador
    }
  }

  /**
   * Garante que o exercício exista. Se já houver na base (público ou do trainer),
   * reutiliza; senão cria com isAIGenerated = true, vinculado ao trainer.
   */
  private async ensureExercise(
    name: string,
    res: {
      name?: string;
      category?: string;
      muscleGroups?: string[];
      description?: string;
      instructions?: string;
    } | null,
    trainerId: string,
  ): Promise<{ id: string; name: string; category: string; description: string | null; wasCreated: boolean }> {
    const cleanName = (res?.name || name || 'Exercício').trim().slice(0, 120);
    if (!cleanName) throw new BadRequestException('Nome de exercício inválido');

    const existing = await this.prisma.exercise.findFirst({
      where: {
        name: { equals: cleanName, mode: 'insensitive' },
        OR: [{ trainerId }, { isPublic: true }],
      },
      select: { id: true, name: true, category: true, description: true },
    });
    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        category: existing.category,
        description: existing.description ?? null,
        wasCreated: false,
      };
    }

    const muscleGroups = (res?.muscleGroups ?? []).filter((m) => VALID_MUSCLES.has(m));
    const category = isCategoryValid(res?.category) ? res.category : guessCategoryFromMuscles(muscleGroups, res?.category ?? null);
    const description = res?.description || `Exercício criado automaticamente pela IA a partir de "${name}".`;
    const instructions = res?.instructions || res?.description || null;

    const created = await this.prisma.exercise.create({
      data: {
        trainerId,
        name: cleanName,
        category: category as any,
        muscleGroups: muscleGroups as any,
        description,
        instructions,
        difficulty: 2,
        isPublic: false,
        isAIGenerated: true,
      },
      select: { id: true, name: true, category: true, description: true },
    });

    console.log(`[AI] Exercício criado automaticamente: "${cleanName}" (${category}, ID: ${created.id})`);

    return {
      id: created.id,
      name: created.name,
      category: created.category,
      description: created.description ?? null,
      wasCreated: true,
    };
  }

  /**
   * Monta um contexto conciso do aluno (dados reais do banco) para enriquecer
   * o prompt de geração. Verifica que o aluno pertence ao trainer.
   */
  private async buildStudentContext(trainerId: string, studentId: string): Promise<string> {
    const relation = await this.prisma.trainerStudent.findFirst({
      where: { trainerId, studentId, isActive: true },
      include: {
        student: {
          include: { user: { include: { profile: true } }, anamnesis: true },
        },
      },
    });
    if (!relation) throw new ForbiddenException('Aluno não encontrado entre seus alunos');

    const s = relation.student;
    const lines = [
      `Nome: ${s.user?.profile?.firstName ?? ''} ${s.user?.profile?.lastName ?? ''}`.trim(),
      `Objetivo: ${s.goalType ?? 'Não definido'} | Nível: ${s.level ?? 'N/A'} | Atividade: ${s.activityLevel ?? 'N/A'}`,
    ];
    if (s.anamnesis) {
      if (s.anamnesis.previousInjuries) lines.push(`Lesões: ${s.anamnesis.previousInjuries}`);
      if (s.anamnesis.cardiovascularIssues) lines.push('Restrição cardiovascular presente');
      if (s.anamnesis.sleepHours) lines.push(`Sono: ${s.anamnesis.sleepHours}h`);
      if (s.anamnesis.stressLevel) lines.push(`Estresse: ${s.anamnesis.stressLevel}/10`);
    }
    return lines.join('\n');
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

    // ─── 2. Buscar TODO o catálogo de exercícios ─────────────────────────────
    const catalog = await this.fetchExerciseCatalog(trainer.id);
    const exerciseList = this.buildReferenceList(catalog, 500);

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

## BANCO DE EXERCÍCIOS DO SISTEMA (referência):
${exerciseList}

## INSTRUÇÕES:
1. Analise TODO o conteúdo do PDF e identifique os treinos descritos
2. Preserve SEMPRE o nome do treino EXATAMENTE como está no PDF
3. Para CADA exercício do PDF, preserve o nome ORIGINAL no campo "name" e, se reconhecer na lista de referência, preencha "catalogName" com o nome EXATO da lista
4. "muscleGroup": grupo muscular principal em português/inglês simples (ex.: "Chest", "Legs", "Back")
5. Adapte séries, repetições, descanso conforme descrito no PDF
6. ${extraInstructions}

## FORMATO DE RESPOSTA (APENAS JSON válido, sem texto extra, sem markdown):
{"workouts":[{"name":"Nome do Treino (exatamente como no PDF)","description":"Descrição","level":2,"duration":60,"tags":["tag1"],"tips":["dica"],"exercises":[{"name":"Nome Original do Exercício","catalogName":"Nome exato da lista se reconhecido, senão null","muscleGroup":"Legs","sets":3,"reps":"10-12","restSeconds":60,"weight":0,"notes":""}]}]}

REGRAS ABSOLUTAS:
- Retorne APENAS o JSON, nada mais
- workouts DEVE ter pelo menos 1 item
- Cada workout DEVE ter pelo menos 3 exercises
- NÃO renomeie exercícios: o campo "name" deve conter o nome EXATO lido no PDF
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

    // ─── 5. Mapear exercícios e criar treinos ─────────────────────────────────
    const createdWorkouts: any[] = [];
    const allReplaced: any[] = [];
    const allCreated: any[] = [];

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

      const resolved = await this.resolveGeneratedExercises(w.exercises || [], catalog, trainer.id);
      allReplaced.push(...resolved.replaced);
      allCreated.push(...resolved.created);

      const workoutExercises = resolved.items
        .map((item, idx) => {
          if (!item.exerciseId) return null;
          return {
            workoutId: workout.id,
            exerciseId: item.exerciseId,
            sets: item.sets,
            reps: item.reps,
            weight: item.weight,
            restSeconds: item.restSeconds,
            order: idx,
            notes: item.notes,
          };
        })
        .filter(Boolean);

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

    // ─── 6. Montar resposta ───────────────────────────────────────────────────
    const summary = createdWorkouts.map((w) =>
      `✅ **${w.name}** — ${w.exercisesAdded} de ${w.exercisesTotal} exercícios adicionados`,
    ).join('\n');

    const replacedSection = allReplaced.length > 0
      ? `\n\n🔄 **Exercícios substituídos por similares da base:**\n${allReplaced.map((r) => `• "${r.originalName}" → **${r.substituteName}** ${r.reason ? `(${r.reason})` : ''}`).join('\n')}`
      : '';

    const createdSection = allCreated.length > 0
      ? `\n\n✨ **Exercícios criados automaticamente na base (não existiam):**\n${allCreated.map((c) => `• **${c.name}** (${c.category})`).join('\n')}\n\n_Eles ficaram vinculados ao seu perfil e podem ser reutilizados em outros treinos._`
      : '';

    const allTips = createdWorkouts.flatMap((w) => w.tips || []);
    const tipsSection = allTips.length > 0
      ? `\n\n💡 **Dicas da IA:**\n${allTips.map((t: string) => `• ${t}`).join('\n')}`
      : '';

    return {
      reply: `📄 **PDF processado com sucesso!** Encontrei ${createdWorkouts.length} treino(s) no arquivo "${fileName}".\n\n${summary}${replacedSection}${createdSection}${tipsSection}\n\nOs treinos foram salvos como **Rascunho**. Você pode revisá-los e ativá-los na seção de Treinos.`,
      workouts: createdWorkouts,
      replaced: allReplaced,
      created: allCreated,
      unmatchedExercises: [],
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
