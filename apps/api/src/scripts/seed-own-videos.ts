import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../../../.env'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, k, raw] = m;
      if (process.env[k]) continue;
      process.env[k] = raw.replace(/^['"](.*)['"]$/, '$1');
    }
  }
}
loadEnv();

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

function normalizeKey(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function inferCategory(name: string): string | null {
  const lower = normalizeKey(name);
  for (const [keywords, category] of CATEGORY_KEYWORDS) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category;
    }
  }
  return null;
}

function stripCloudinarySuffix(filename: string): string {
  const m = filename.match(/^(.*)_([a-z0-9]{6})$/i);
  return m ? m[1] : filename;
}

function cleanName(filename: string): string {
  let name = stripCloudinarySuffix(filename);
  name = name.replace(/\.[a-z0-9]+$/i, '');
  name = name.replace(/[-_]+/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();
  return name
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

async function listRootVideos(): Promise<{ name: string; secure_url: string; public_id: string }[]> {
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

function videoThumbnail(publicId: string): string {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [{ width: 640, height: 480, crop: 'fill' }],
  });
}

async function importVideos(opts: { dryRun: boolean; limit?: number }) {
  const result = { imported: 0, updated: 0, skipped: 0, errors: 0, noCategory: [] as string[] };
  const files = await listRootVideos();
  let processed = 0;

  for (const file of files) {
    if (opts.limit && processed >= opts.limit) break;
    processed++;

    const name = cleanName(file.name);
    if (!name) { result.skipped++; continue; }

    const category = inferCategory(name);
    if (!category) {
      result.errors++;
      result.noCategory.push(name);
      console.log(`  [ERRO] Categoria não identificada: ${name}`);
      continue;
    }

    const thumbnailUrl = videoThumbnail(file.public_id);

    try {
      const existing = await prisma.exercise.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        select: { id: true },
      });

      if (existing) {
        if (!opts.dryRun) {
          await prisma.exercise.update({
            where: { id: existing.id },
            data: { videoUrl: file.secure_url, thumbnailUrl },
          });
        }
        result.updated++;
      } else {
        if (!opts.dryRun) {
          await prisma.exercise.create({
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
      console.log(`  [ERRO] ${name}: ${e?.message ?? e}`);
    }
  }

  console.log(
    `Vídeos: importados=${result.imported} atualizados=${result.updated} pulados=${result.skipped} erros=${result.errors}`,
  );
  if (result.noCategory.length) console.log('  Sem categoria:', result.noCategory.join(', '));
  return result;
}

async function cleanMuscleWiki(opts: { dryRun: boolean }) {
  const target = await prisma.exercise.findMany({
    where: {
      OR: [
        { videoUrl: { startsWith: '/api/v1/musclewiki/' } },
        { videoUrl: { contains: 'api.musclewiki.com' } },
      ],
    },
    select: { id: true, name: true },
  });

  const referenced = await prisma.workoutExercise.findMany({
    where: { exerciseId: { in: target.map((e) => e.id) } },
    select: { exerciseId: true },
    distinct: ['exerciseId'],
  });
  const referencedIds = new Set(referenced.map((r) => r.exerciseId));

  let deleted = 0;
  let cleared = 0;
  for (const ex of target) {
    if (referencedIds.has(ex.id)) {
      if (!opts.dryRun) {
        await prisma.exercise.update({ where: { id: ex.id }, data: { videoUrl: null, thumbnailUrl: null } });
      }
      cleared++;
    } else {
      if (!opts.dryRun) {
        await prisma.exercise.delete({ where: { id: ex.id } });
      }
      deleted++;
    }
  }

  console.log(`MuscleWiki: total=${target.length} deletados=${deleted} mídia_removida(usados)=${cleared}${opts.dryRun ? ' (DRY RUN)' : ''}`);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limit = parseArgInt('--limit');
  const clean = process.argv.includes('--clean-musclewiki');

  console.log(`Origem: raiz da conta Cloudinary (vídeos flat)${dryRun ? ' (DRY RUN)' : ''}`);

  if (clean) await cleanMuscleWiki({ dryRun });
  await importVideos({ dryRun, limit });
}

main()
  .catch((e) => {
    console.error('Erro fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

function parseArgInt(name: string): number | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  const v = parseInt(process.argv[idx + 1], 10);
  return Number.isNaN(v) ? undefined : v;
}
