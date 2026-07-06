import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MW_API_BASE = process.env.MUSCLEWIKI_API_BASE ?? 'https://api.musclewiki.com';
const MW_API_KEY = process.env.MUSCLEWIKI_API_KEY;

interface MWVideo {
  url?: string;
  angle?: string;
  gender?: string;
  og_image?: string;
}

interface MWListItem {
  id: number | string;
  name: string;
}

interface MWListResponse {
  total: number;
  limit: number;
  offset: number;
  count: number;
  results: MWListItem[];
}

interface MWExerciseDetail {
  id: number | string;
  name: string;
  primary_muscles?: string[];
  category?: string;
  force?: string;
  mechanic?: string;
  difficulty?: string;
  steps?: string[];
  videos?: MWVideo[];
}

const MUSCLE_TO_CATEGORY: Record<string, string> = {
  chest: 'CHEST', pectoralis: 'CHEST',
  back: 'BACK', lats: 'BACK', latissimus: 'BACK', traps: 'BACK', trapezius: 'BACK',
  rhomboids: 'BACK', 'middle back': 'BACK', 'lower back': 'BACK',
  shoulders: 'SHOULDERS', deltoid: 'SHOULDERS', delts: 'SHOULDERS',
  biceps: 'BICEPS', triceps: 'TRICEPS', forearms: 'BICEPS',
  quadriceps: 'LEGS', quads: 'LEGS', hamstrings: 'LEGS', calves: 'LEGS', adductors: 'LEGS', abductors: 'LEGS',
  glutes: 'GLUTES',
  abs: 'CORE', abdominals: 'CORE', obliques: 'CORE', core: 'CORE',
  cardio: 'CARDIO',
  'full body': 'FULL_BODY',
  neck: 'MOBILITY',
};

const MUSCLE_TO_ENUM: Record<string, string> = {
  chest: 'PECTORALIS_MAJOR', pectoralis: 'PECTORALIS_MAJOR',
  back: 'LATISSIMUS_DORSI', lats: 'LATISSIMUS_DORSI', latissimus: 'LATISSIMUS_DORSI',
  'middle back': 'RHOMBOIDS', rhomboids: 'RHOMBOIDS',
  traps: 'TRAPEZIUS', trapezius: 'TRAPEZIUS',
  shoulders: 'DELTOID', deltoid: 'DELTOID', delts: 'DELTOID',
  biceps: 'BICEPS_BRACHII', triceps: 'TRICEPS_BRACHII', forearms: 'FOREARMS',
  quadriceps: 'QUADRICEPS', quads: 'QUADRICEPS',
  hamstrings: 'HAMSTRINGS', calves: 'CALVES', glutes: 'GLUTES',
  abs: 'ABS', abdominals: 'ABS', obliques: 'OBLIQUES',
  'lower back': 'LOWER_BACK', 'hip flexors': 'HIP_FLEXORS',
};

const DIFFICULTY_MAP: Record<string, number> = {
  novice: 1, beginner: 2, intermediate: 3, advanced: 4, expert: 5,
};

const EQUIPMENT_TRANSLATIONS: Record<string, string> = {
  dumbbells: 'Halteres', dumbbell: 'Halteres',
  barbell: 'Barra', cables: 'Polia', cable: 'Polia',
  kettlebells: 'Kettlebell', kettlebell: 'Kettlebell',
  yoga: 'Yoga', bodyweight: 'Peso corporal',
  plate: 'Anilha', plates: 'Anilha',
  band: 'Elástico', bands: 'Elástico',
  stretches: 'Alongamento', 'smith-machine': 'Smith', 'smith machine': 'Smith',
  'bosu-ball': 'Bosu', 'bosu ball': 'Bosu',
  'medicine-ball': 'Medicine ball', 'medicine ball': 'Medicine ball',
  trx: 'TRX', vitruvian: 'Vitruvian',
  machine: 'Máquina', cardio: 'Cardio',
};

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  CHEST: 'Peito',
  BACK: 'Costas',
  SHOULDERS: 'Ombros',
  BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps',
  LEGS: 'Pernas',
  GLUTES: 'Glúteos',
  CORE: 'Abdômen',
  CARDIO: 'Cardio',
  FULL_BODY: 'Corpo Inteiro',
  MOBILITY: 'Mobilidade',
};

@Injectable()
export class MuscleWikiSyncService {
  private readonly logger = new Logger(MuscleWikiSyncService.name);

  constructor(private prisma: PrismaService) {}

  private normalize(s?: string): string {
    return (s ?? '').toLowerCase().trim();
  }

  private mapCategory(primaryMuscles?: string[], category?: string): string {
    for (const m of primaryMuscles ?? []) {
      const c = MUSCLE_TO_CATEGORY[this.normalize(m)];
      if (c) return c;
    }
    if (this.normalize(category) === 'cardio') return 'CARDIO';
    return 'FULL_BODY';
  }

  private mapMuscleGroups(primaryMuscles?: string[]): string[] {
    const out = new Set<string>();
    for (const m of primaryMuscles ?? []) {
      const v = MUSCLE_TO_ENUM[this.normalize(m)];
      if (v) out.add(v);
    }
    return Array.from(out);
  }

  private mapDifficulty(d?: string): number {
    return DIFFICULTY_MAP[this.normalize(d)] ?? 2;
  }

  private translateEquipment(raw?: string): string | null {
    const n = this.normalize(raw);
    if (!n) return null;
    return EQUIPMENT_TRANSLATIONS[n] ?? raw ?? null;
  }

  private pickVideo(videos?: MWVideo[]): MWVideo | null {
    if (!videos?.length) return null;
    const preferredGender = (process.env.MUSCLEWIKI_GENDER ?? 'male').toLowerCase();
    const preferredAngle = (process.env.MUSCLEWIKI_ANGLE ?? 'front').toLowerCase();
    const score = (v: MWVideo) =>
      (this.normalize(v.gender) === preferredGender ? 2 : 0) +
      (this.normalize(v.angle) === preferredAngle ? 1 : 0);
    return [...videos].sort((a, b) => score(b) - score(a))[0];
  }

  private async apiGet<T>(path: string, attempt = 1): Promise<T> {
    const res = await fetch(`${MW_API_BASE}${path}`, {
      headers: { 'X-API-Key': MW_API_KEY!, Accept: 'application/json' },
    });
    if (res.status === 429 && attempt <= 5) {
      const retryAfter = Number(res.headers.get('retry-after') ?? 2);
      this.logger.warn(`429 rate limited, sleeping ${retryAfter}s (attempt ${attempt})`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return this.apiGet<T>(path, attempt + 1);
    }
    if (!res.ok) throw new Error(`MuscleWiki ${res.status} on ${path}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  async syncExercises(options: { clean?: boolean; limit?: number } = {}): Promise<{
    imported: number;
    skipped: number;
    withVideo: number;
    errors: number;
    total: number;
  }> {
    if (!MW_API_KEY) {
      throw new Error('MUSCLEWIKI_API_KEY não configurada');
    }

    this.logger.log('Iniciando sincronização com MuscleWiki...');

    // Limpar exercícios públicos existentes se solicitado
    if (options.clean) {
      this.logger.log('Limpando exercícios públicos existentes...');
      const publicExercises = await this.prisma.exercise.findMany({
        where: { isPublic: true, trainerId: null },
        select: { id: true },
      });
      const ids = publicExercises.map((e) => e.id);
      if (ids.length > 0) {
        const workoutExercises = await this.prisma.workoutExercise.findMany({
          where: { exerciseId: { in: ids } },
          select: { id: true },
        });
        const weIds = workoutExercises.map((w) => w.id);
        if (weIds.length > 0) {
          await this.prisma.workoutExerciseLog.deleteMany({ where: { workoutExerciseId: { in: weIds } } });
          await this.prisma.workoutExercise.deleteMany({ where: { id: { in: weIds } } });
        }
        await this.prisma.exercise.deleteMany({ where: { id: { in: ids } } });
        this.logger.log(`${ids.length} exercícios públicos removidos`);
      }
    }

    // Buscar todos os IDs de exercícios
    const allIds = await this.fetchAllIds(options.limit);
    this.logger.log(`Total de exercícios encontrados: ${allIds.length}`);

    const counters = { imported: 0, skipped: 0, withVideo: 0, errors: 0 };

    // Processar em lotes de 5 para não sobrecarregar a API
    const batchSize = 5;
    for (let i = 0; i < allIds.length; i += batchSize) {
      const batch = allIds.slice(i, i + batchSize);
      await Promise.all(
        batch.map((item) => this.processExercise(item, counters)),
      );
      if ((i + batchSize) % 50 === 0 || i + batchSize >= allIds.length) {
        this.logger.log(`Progresso: ${Math.min(i + batchSize, allIds.length)}/${allIds.length} (importados: ${counters.imported}, vídeos: ${counters.withVideo})`);
      }
    }

    this.logger.log(
      `Sincronização concluída! Importados: ${counters.imported}, Pulados: ${counters.skipped}, Com vídeo: ${counters.withVideo}, Erros: ${counters.errors}`,
    );

    return {
      imported: counters.imported,
      skipped: counters.skipped,
      withVideo: counters.withVideo,
      errors: counters.errors,
      total: allIds.length,
    };
  }

  private async fetchAllIds(limit?: number): Promise<MWListItem[]> {
    const pageSize = 100;
    let offset = 0;
    let total = Infinity;
    const all: MWListItem[] = [];

    while (offset < total) {
      const page = await this.apiGet<MWListResponse>(`/exercises?limit=${pageSize}&offset=${offset}`);
      total = page.total;
      all.push(...page.results);
      this.logger.log(`Lista offset=${offset} recebeu=${page.results.length} total=${total}`);
      offset += pageSize;
      if (limit && all.length >= limit) break;
    }

    return limit ? all.slice(0, limit) : all;
  }

  private async processExercise(
    item: MWListItem,
    counters: { imported: number; skipped: number; withVideo: number; errors: number },
  ): Promise<void> {
    try {
      // Verificar se já existe
      const existing = await this.prisma.exercise.findFirst({
        where: { name: item.name, trainerId: null, isPublic: true },
        select: { id: true },
      });
      if (existing) {
        counters.skipped++;
        return;
      }

      // Buscar detalhes do exercício
      const ex = await this.apiGet<MWExerciseDetail>(`/exercises/${item.id}`);
      const video = this.pickVideo(ex.videos);
      const videoUrl = video?.url ?? null;
      const thumbnailUrl = video?.og_image ?? null;

      // Construir URL do proxy para o vídeo
      let finalVideoUrl: string | undefined;
      if (videoUrl) {
        // A MuscleWiki retorna URLs como:
        // https://api.musclewiki.com/stream/videos/branded/filename.mp4
        // https://api.musclewiki.com/stream/videos/unbranded/filename.mp4
        // Extrair o tipo (branded/unbranded) e o filename
        const urlParts = videoUrl.split('/');
        const filename = urlParts.pop();
        const kind = urlParts.pop(); // 'branded' ou 'unbranded'
        if (filename && (kind === 'branded' || kind === 'unbranded')) {
          finalVideoUrl = `/api/v1/musclewiki/stream/${kind}/${filename}`;
        } else if (filename) {
          // Fallback: tenta unbranded primeiro
          finalVideoUrl = `/api/v1/musclewiki/stream/unbranded/${filename}`;
        }
      }

      // Construir descrição
      const steps = ex.steps ?? [];
      const description = steps.length > 0
        ? steps.map((s, i) => `${i + 1}. ${s}`).join('\n')
        : undefined;

      await this.prisma.exercise.create({
        data: {
          name: ex.name,
          description: description || undefined,
          instructions: description || undefined,
          category: this.mapCategory(ex.primary_muscles, ex.category) as any,
          muscleGroups: this.mapMuscleGroups(ex.primary_muscles) as any,
          equipment: (() => {
            const t = this.translateEquipment(ex.category);
            return t ? [t] : [];
          })(),
          difficulty: this.mapDifficulty(ex.difficulty),
          videoUrl: finalVideoUrl,
          thumbnailUrl: thumbnailUrl ?? undefined,
          isPublic: true,
          isAIGenerated: false,
        },
      });

      counters.imported++;
      if (finalVideoUrl) counters.withVideo++;
    } catch (e: any) {
      counters.errors++;
      this.logger.error(`Falha ao importar ${item.id} ${item.name}: ${e.message}`);
    }
  }

  /**
   * Retorna estatísticas dos exercícios no banco
   */
  async getStats() {
    const total = await this.prisma.exercise.count({ where: { isPublic: true } });
    const byCategory = await this.prisma.exercise.groupBy({
      by: ['category'],
      where: { isPublic: true },
      _count: true,
    });
    const withVideo = await this.prisma.exercise.count({
      where: { isPublic: true, videoUrl: { not: null } },
    });

    return {
      total,
      withVideo,
      byCategory: byCategory.map((c) => ({
        category: c.category,
        categoryPt: CATEGORY_TRANSLATIONS[c.category] ?? c.category,
        count: c._count,
      })),
    };
  }
}
