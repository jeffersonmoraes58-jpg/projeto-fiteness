import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service';

const CATEGORY_TO_MUSCLES: Record<string, string[]> = {
  CHEST: ['PECTORALIS_MAJOR'],
  BACK: ['LATISSIMUS_DORSI'],
  SHOULDERS: ['DELTOID'],
  BICEPS: ['BICEPS_BRACHII'],
  TRICEPS: ['TRICEPS_BRACHII'],
  LEGS: ['QUADRICEPS'],
  GLUTES: ['GLUTES'],
  CORE: ['ABS'],
};

// Ordem importa: a primeira keyword que "casar" define a categoria.
const CATEGORY_KEYWORDS: [string[], string][] = [
  [['mobilidade', 'alongamento'], 'MOBILITY'],
  [['esteira', 'bike', 'spinning', 'spinnig', 'elíptico', 'eliptico', 'escada', 'simulador', 'air bike', 'corda naval', 'corrida', 'caminhada'], 'CARDIO'],
  [['tríceps', 'triceps', 'testa', 'francês', 'frances'], 'TRICEPS'],
  [['rosca', 'martelo', 'scott', 'bíceps', 'biceps'], 'BICEPS'],
  [['elevação pélvica', 'elevacao pelvica', 'abdução', 'abducao', 'glúteo', 'gluteo'], 'GLUTES'],
  [['desenvolvimento', 'elevação frontal', 'elevacao frontal', 'elevação lateral', 'elevacao lateral', 'arnold', 'crucifixo inverso', 'face pull', 'elevação', 'elevacao'], 'SHOULDERS'],
  [['supino', 'crucifixo', 'voador', 'pulôver', 'pulover', 'pullover', 'crossover', 'peck'], 'CHEST'],
  [['remada', 'puxada', 'barra fixa', 'dorsal', 'chines', 'terra'], 'BACK'],
  [['agachamento', 'legpres', 'leg press', 'hack', 'stiff', 'búlgaro', 'bulgaro', 'afundo', 'lunge', 'flexora', 'extensora', 'abdutora', 'adutora', 'panturrilha'], 'LEGS'],
  [['abdominal', 'prancha', 'crunch', 'russian twist', 'core'], 'CORE'],
];

export interface OwnVideosSyncResult {
  dryRun: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  noCategory: string[];
  details: string[];
}

@Injectable()
export class OwnVideosSyncService {
  private readonly logger = new Logger(OwnVideosSyncService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async importVideos(options: { dryRun?: boolean; limit?: number } = {}) {
    const dryRun = !!options.dryRun;
    const result: OwnVideosSyncResult = {
      dryRun,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      noCategory: [],
      details: [],
    };

    const files = await this.listRootVideos();
    let processed = 0;

    for (const file of files) {
      if (options.limit && processed >= options.limit) break;
      processed++;

      const name = this.cleanName(file.name);
      if (!name) {
        result.skipped++;
        continue;
      }

      const category = this.inferCategory(name);
      if (!category) {
        result.errors++;
        result.noCategory.push(name);
        result.details.push(`Categoria não identificada: ${name}`);
        continue;
      }

      const thumbnailUrl = this.videoThumbnail(file.public_id);

      try {
        const existing = await this.prisma.exercise.findFirst({
          where: { name: { equals: name, mode: 'insensitive' } },
          select: { id: true },
        });

        if (existing) {
          if (!dryRun) {
            await this.prisma.exercise.update({
              where: { id: existing.id },
              data: { videoUrl: file.secure_url, thumbnailUrl },
            });
          }
          result.updated++;
        } else {
          if (!dryRun) {
            await this.prisma.exercise.create({
              data: {
                name,
                category: category as any,
                muscleGroups: (CATEGORY_TO_MUSCLES[category] ?? []) as any,
                equipment: [],
                difficulty: 1,
                videoUrl: file.secure_url,
                thumbnailUrl,
                isPublic: true,
              },
            });
          }
          result.imported++;
        }
      } catch (e: any) {
        result.errors++;
        result.details.push(`Erro ao processar ${name}: ${e?.message ?? e}`);
      }
    }

    this.logger.log(
      `Sync vídeos: ${result.imported} importados, ${result.updated} atualizados, ${result.errors} erros${dryRun ? ' (DRY RUN)' : ''}`,
    );
    return result;
  }

  async removeMuscleWiki(options: { dryRun?: boolean } = {}) {
    const dryRun = !!options.dryRun;
    const target = await this.prisma.exercise.findMany({
      where: {
        OR: [
          { videoUrl: { startsWith: '/api/v1/musclewiki/' } },
          { videoUrl: { contains: 'api.musclewiki.com' } },
        ],
      },
      select: { id: true, name: true, videoUrl: true },
    });

    const referenced = await this.prisma.workoutExercise.findMany({
      where: { exerciseId: { in: target.map((e) => e.id) } },
      select: { exerciseId: true },
      distinct: ['exerciseId'],
    });
    const referencedIds = new Set(referenced.map((r) => r.exerciseId));

    let deleted = 0;
    let withMediaCleared = 0;

    for (const ex of target) {
      if (referencedIds.has(ex.id)) {
        if (!dryRun) {
          await this.prisma.exercise.update({
            where: { id: ex.id },
            data: { videoUrl: null, thumbnailUrl: null },
          });
        }
        withMediaCleared++;
      } else {
        if (!dryRun) {
          await this.prisma.exercise.delete({ where: { id: ex.id } });
        }
        deleted++;
      }
    }

    this.logger.log(
      `Cleanup MuscleWiki: ${target.length} encontrados, ${deleted} deletados, ${withMediaCleared} com mídia removida${dryRun ? ' (DRY RUN)' : ''}`,
    );
    return { dryRun, total: target.length, deleted, withMediaCleared };
  }

  async getStats() {
    const [ownVideos, musclewiki, total] = await Promise.all([
      this.prisma.exercise.count({
        where: { videoUrl: { contains: 'res.cloudinary.com' } },
      }),
      this.prisma.exercise.count({
        where: {
          OR: [
            { videoUrl: { startsWith: '/api/v1/musclewiki/' } },
            { videoUrl: { contains: 'api.musclewiki.com' } },
          ],
        },
      }),
      this.prisma.exercise.count(),
    ]);
    return { total, ownVideos, musclewiki };
  }

  private normalizeKey(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private inferCategory(name: string): string | null {
    const lower = this.normalizeKey(name);
    for (const [keywords, category] of CATEGORY_KEYWORDS) {
      for (const kw of keywords) {
        if (lower.includes(kw)) return category;
      }
    }
    return null;
  }

  private stripCloudinarySuffix(filename: string): string {
    const m = filename.match(/^(.*)_([a-z0-9]{6})$/i);
    return m ? m[1] : filename;
  }

  private cleanName(filename: string): string {
    let name = this.stripCloudinarySuffix(filename);
    name = name.replace(/\.[a-z0-9]+$/i, '');
    name = name.replace(/[-_]+/g, ' ');
    name = name.replace(/\s+/g, ' ').trim();
    return name
      .toLowerCase()
      .split(' ')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ');
  }

  private async listRootVideos(): Promise<{ name: string; secure_url: string; public_id: string }[]> {
    const all: any[] = [];
    let nextCursor: string | undefined;

    do {
      const res = await cloudinary.api.resources({
        resource_type: 'video',
        type: 'upload',
        max_results: 500,
        next_cursor: nextCursor,
      } as any);
      all.push(...(res.resources ?? []));
      nextCursor = res.next_cursor;
    } while (nextCursor);

    return all
      .filter((r) => typeof r.public_id === 'string' && !r.public_id.includes('/'))
      .map((r) => ({
        name: r.public_id as string,
        secure_url: r.secure_url as string,
        public_id: r.public_id as string,
      }));
  }

  private videoThumbnail(publicId: string): string {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      format: 'jpg',
      transformation: [{ width: 640, height: 480, crop: 'fill' }],
    });
  }
}
