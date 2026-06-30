import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

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
      const v = raw.replace(/^['"](.*)['"]$/, '$1');
      process.env[k] = v;
    }
  }
}
loadEnv();

const prisma = new PrismaClient();

const API_BASE = process.env.MUSCLEWIKI_API_BASE ?? 'https://api.musclewiki.com';
const API_KEY = process.env.MUSCLEWIKI_API_KEY;
const CONCURRENCY = Number(process.env.MUSCLEWIKI_CONCURRENCY ?? 5);
const LIMIT_OVERRIDE = process.env.MUSCLEWIKI_LIMIT ? Number(process.env.MUSCLEWIKI_LIMIT) : undefined;
const PREFERRED_GENDER = (process.env.MUSCLEWIKI_GENDER ?? 'male').toLowerCase();
const PREFERRED_ANGLE = (process.env.MUSCLEWIKI_ANGLE ?? 'front').toLowerCase();

if (!API_KEY) {
  console.error('Missing MUSCLEWIKI_API_KEY env var');
  process.exit(1);
}

type MWVideo = { url?: string; angle?: string; gender?: string; og_image?: string };
type MWListItem = { id: number | string; name: string };
type MWListResponse = { total: number; limit: number; offset: number; count: number; results: MWListItem[] };
type MWExerciseDetail = {
  id: number | string;
  name: string;
  primary_muscles?: string[];
  category?: string;
  force?: string;
  mechanic?: string;
  difficulty?: string;
  steps?: string[];
  videos?: MWVideo[];
};

const MUSCLE_TO_CATEGORY: Record<string, string> = {
  chest: 'CHEST',
  pectoralis: 'CHEST',
  back: 'BACK',
  lats: 'BACK',
  latissimus: 'BACK',
  traps: 'BACK',
  trapezius: 'BACK',
  rhomboids: 'BACK',
  'middle back': 'BACK',
  'lower back': 'BACK',
  shoulders: 'SHOULDERS',
  deltoid: 'SHOULDERS',
  delts: 'SHOULDERS',
  biceps: 'BICEPS',
  triceps: 'TRICEPS',
  forearms: 'BICEPS',
  quadriceps: 'LEGS',
  quads: 'LEGS',
  hamstrings: 'LEGS',
  calves: 'LEGS',
  adductors: 'LEGS',
  abductors: 'LEGS',
  glutes: 'GLUTES',
  abs: 'CORE',
  abdominals: 'CORE',
  obliques: 'CORE',
  core: 'CORE',
  cardio: 'CARDIO',
  'full body': 'FULL_BODY',
  neck: 'MOBILITY',
};

const MUSCLE_TO_ENUM: Record<string, string> = {
  chest: 'PECTORALIS_MAJOR',
  pectoralis: 'PECTORALIS_MAJOR',
  'upper chest': 'PECTORALIS_MAJOR',
  'lower chest': 'PECTORALIS_MAJOR',
  back: 'LATISSIMUS_DORSI',
  lats: 'LATISSIMUS_DORSI',
  latissimus: 'LATISSIMUS_DORSI',
  'middle back': 'RHOMBOIDS',
  rhomboids: 'RHOMBOIDS',
  traps: 'TRAPEZIUS',
  trapezius: 'TRAPEZIUS',
  shoulders: 'DELTOID',
  deltoid: 'DELTOID',
  delts: 'DELTOID',
  biceps: 'BICEPS_BRACHII',
  triceps: 'TRICEPS_BRACHII',
  forearms: 'FOREARMS',
  quadriceps: 'QUADRICEPS',
  quads: 'QUADRICEPS',
  hamstrings: 'HAMSTRINGS',
  calves: 'CALVES',
  glutes: 'GLUTES',
  abs: 'ABS',
  abdominals: 'ABS',
  obliques: 'OBLIQUES',
  'lower back': 'LOWER_BACK',
  'hip flexors': 'HIP_FLEXORS',
};

const DIFFICULTY_MAP: Record<string, number> = {
  novice: 1,
  beginner: 2,
  intermediate: 3,
  advanced: 4,
  expert: 5,
};

const normalize = (s?: string) => (s ?? '').toLowerCase().trim();

function mapCategory(primaryMuscles?: string[], category?: string): string {
  for (const m of primaryMuscles ?? []) {
    const c = MUSCLE_TO_CATEGORY[normalize(m)];
    if (c) return c;
  }
  if (normalize(category) === 'cardio') return 'CARDIO';
  return 'FULL_BODY';
}

function mapMuscleGroups(primaryMuscles?: string[]): string[] {
  const out = new Set<string>();
  for (const m of primaryMuscles ?? []) {
    const v = MUSCLE_TO_ENUM[normalize(m)];
    if (v) out.add(v);
  }
  return Array.from(out);
}

function mapDifficulty(d?: string): number {
  return DIFFICULTY_MAP[normalize(d)] ?? 2;
}

function pickVideoUrl(videos?: MWVideo[]): string | null {
  if (!videos?.length) return null;
  const score = (v: MWVideo) =>
    (normalize(v.gender) === PREFERRED_GENDER ? 2 : 0) +
    (normalize(v.angle) === PREFERRED_ANGLE ? 1 : 0);
  const best = [...videos].sort((a, b) => score(b) - score(a))[0];
  return best?.url ?? null;
}

async function apiGet<T>(path: string, attempt = 1): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'X-API-Key': API_KEY!, Accept: 'application/json' },
  });
  if (res.status === 429 && attempt <= 5) {
    const retryAfter = Number(res.headers.get('retry-after') ?? 2);
    console.warn(`429 rate limited, sleeping ${retryAfter}s (attempt ${attempt})`);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return apiGet<T>(path, attempt + 1);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MuscleWiki ${res.status} ${res.statusText} on ${path}: ${text}`);
  }
  return (await res.json()) as T;
}

async function fetchAllIds(): Promise<MWListItem[]> {
  const limit = 100;
  let offset = 0;
  let total = Infinity;
  const all: MWListItem[] = [];
  while (offset < total) {
    const page = await apiGet<MWListResponse>(`/exercises?limit=${limit}&offset=${offset}`);
    total = page.total;
    all.push(...page.results);
    console.log(`List page offset=${offset} got=${page.results.length} total=${total}`);
    offset += limit;
    if (LIMIT_OVERRIDE && all.length >= LIMIT_OVERRIDE) break;
  }
  return LIMIT_OVERRIDE ? all.slice(0, LIMIT_OVERRIDE) : all;
}

async function processOne(item: MWListItem, counters: { imported: number; skipped: number; withVideo: number; errors: number }) {
  try {
    const existing = await prisma.exercise.findFirst({
      where: { name: item.name, trainerId: null, isPublic: true },
      select: { id: true },
    });
    if (existing) {
      counters.skipped++;
      return;
    }
    const ex = await apiGet<MWExerciseDetail>(`/exercises/${item.id}`);
    const videoUrl = pickVideoUrl(ex.videos);
    const description = ex.steps?.join('\n') ?? null;
    await prisma.exercise.create({
      data: {
        name: ex.name,
        description: description ?? undefined,
        instructions: description ?? undefined,
        category: mapCategory(ex.primary_muscles, ex.category) as any,
        muscleGroups: mapMuscleGroups(ex.primary_muscles) as any,
        equipment: ex.category ? [ex.category] : [],
        difficulty: mapDifficulty(ex.difficulty),
        videoUrl: videoUrl ?? undefined,
        isPublic: true,
        isAIGenerated: false,
      },
    });
    counters.imported++;
    if (videoUrl) counters.withVideo++;
  } catch (e: any) {
    counters.errors++;
    console.error(`Failed for ${item.id} ${item.name}: ${e.message}`);
  }
}

async function runConcurrent<T>(items: T[], n: number, worker: (item: T, i: number) => Promise<void>) {
  let i = 0;
  const next = async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
      if (idx % 25 === 0) console.log(`Progress ${idx + 1}/${items.length}`);
    }
  };
  await Promise.all(Array.from({ length: n }, next));
}

async function main() {
  console.log(`Starting MuscleWiki import (concurrency=${CONCURRENCY}${LIMIT_OVERRIDE ? `, limit=${LIMIT_OVERRIDE}` : ''})`);
  const ids = await fetchAllIds();
  console.log(`Collected ${ids.length} exercise IDs`);

  const counters = { imported: 0, skipped: 0, withVideo: 0, errors: 0 };
  await runConcurrent(ids, CONCURRENCY, (item) => processOne(item, counters));
  console.log(`Done. imported=${counters.imported} skipped=${counters.skipped} withVideo=${counters.withVideo} errors=${counters.errors}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
