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
      process.env[k] = raw.replace(/^['"](.*)['"]$/, '$1');
    }
  }
}
loadEnv();

// Lazy import after env loaded
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Anthropic = require('@anthropic-ai/sdk').default ?? require('@anthropic-ai/sdk');

const prisma = new PrismaClient();

const API_BASE = process.env.MUSCLEWIKI_API_BASE ?? 'https://api.musclewiki.com';
const API_KEY = process.env.MUSCLEWIKI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const CONCURRENCY = Number(process.env.MUSCLEWIKI_CONCURRENCY ?? 4);
const LIMIT_OVERRIDE = process.env.MUSCLEWIKI_LIMIT ? Number(process.env.MUSCLEWIKI_LIMIT) : undefined;
const PREFERRED_GENDER = (process.env.MUSCLEWIKI_GENDER ?? 'male').toLowerCase();
const PREFERRED_ANGLE = (process.env.MUSCLEWIKI_ANGLE ?? 'front').toLowerCase();
const CLEAN = process.env.MUSCLEWIKI_CLEAN === '1';
const TRANSLATE = process.env.MUSCLEWIKI_TRANSLATE !== '0';
const TRANSLATION_CACHE = path.resolve(__dirname, '.musclewiki-translations.json');

if (!API_KEY) {
  console.error('Missing MUSCLEWIKI_API_KEY env var');
  process.exit(1);
}
if (TRANSLATE && !ANTHROPIC_KEY) {
  console.error('Missing ANTHROPIC_API_KEY (set MUSCLEWIKI_TRANSLATE=0 to skip translation)');
  process.exit(1);
}

const anthropic = TRANSLATE ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : null;

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

const DIFFICULTY_MAP: Record<string, number> = { novice: 1, beginner: 2, intermediate: 3, advanced: 4, expert: 5 };

const EQUIPMENT_TRANSLATIONS: Record<string, string> = {
  dumbbells: 'Halteres',
  dumbbell: 'Halteres',
  barbell: 'Barra',
  cables: 'Polia',
  cable: 'Polia',
  kettlebells: 'Kettlebell',
  kettlebell: 'Kettlebell',
  yoga: 'Yoga',
  bodyweight: 'Peso corporal',
  plate: 'Anilha',
  plates: 'Anilha',
  band: 'Elástico',
  bands: 'Elástico',
  stretches: 'Alongamento',
  'smith-machine': 'Smith',
  'smith machine': 'Smith',
  'bosu-ball': 'Bosu',
  'bosu ball': 'Bosu',
  'medicine-ball': 'Medicine ball',
  'medicine ball': 'Medicine ball',
  trx: 'TRX',
  vitruvian: 'Vitruvian',
  machine: 'Máquina',
  cardio: 'Cardio',
};

const normalize = (s?: string) => (s ?? '').toLowerCase().trim();
const translateEquipment = (raw?: string): string | null => {
  const n = normalize(raw);
  if (!n) return null;
  return EQUIPMENT_TRANSLATIONS[n] ?? raw ?? null;
};

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

const mapDifficulty = (d?: string) => DIFFICULTY_MAP[normalize(d)] ?? 2;

function pickVideo(videos?: MWVideo[]): MWVideo | null {
  if (!videos?.length) return null;
  const score = (v: MWVideo) =>
    (normalize(v.gender) === PREFERRED_GENDER ? 2 : 0) +
    (normalize(v.angle) === PREFERRED_ANGLE ? 1 : 0);
  return [...videos].sort((a, b) => score(b) - score(a))[0];
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
  if (!res.ok) throw new Error(`MuscleWiki ${res.status} on ${path}: ${await res.text()}`);
  return (await res.json()) as T;
}

// ─── Translation with file cache ────────────────────────────────────────────
type TranslationEntry = { name: string; description: string };
let translationCache: Record<string, TranslationEntry> = {};

function loadTranslationCache() {
  if (fs.existsSync(TRANSLATION_CACHE)) {
    try { translationCache = JSON.parse(fs.readFileSync(TRANSLATION_CACHE, 'utf8')); } catch { translationCache = {}; }
  }
}

function saveTranslationCache() {
  fs.writeFileSync(TRANSLATION_CACHE, JSON.stringify(translationCache, null, 2));
}

async function translate(name: string, steps: string[]): Promise<TranslationEntry> {
  const key = name;
  if (translationCache[key]) return translationCache[key];
  if (!TRANSLATE) return { name, description: steps.join('\n') };

  const prompt = `Traduza o nome e os passos deste exercício de musculação para português brasileiro. Use termos técnicos corretos de academia (ex: "Barbell Curl" → "Rosca Direta com Barra"). Retorne APENAS JSON válido no formato {"name":"...","description":"..."} onde description é os passos numerados juntados em uma única string com quebras de linha.

Nome: ${name}
Passos:
${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = resp.content[0]?.type === 'text' ? resp.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Translation failed for "${name}": no JSON in response`);
  const parsed = JSON.parse(match[0]) as TranslationEntry;
  translationCache[key] = parsed;
  return parsed;
}

// ─── Cleanup of public exercises (cascading workout_exercises) ──────────────
async function cleanPublicExercises() {
  console.log('Cleaning existing public exercises...');
  const publicExercises = await prisma.exercise.findMany({
    where: { isPublic: true, trainerId: null },
    select: { id: true },
  });
  const ids = publicExercises.map((e) => e.id);
  if (ids.length === 0) {
    console.log('No public exercises to clean.');
    return;
  }
  const workoutExercises = await prisma.workoutExercise.findMany({
    where: { exerciseId: { in: ids } },
    select: { id: true },
  });
  const weIds = workoutExercises.map((w) => w.id);

  const deletedLogs = weIds.length
    ? await prisma.workoutExerciseLog.deleteMany({ where: { workoutExerciseId: { in: weIds } } })
    : { count: 0 };
  const deletedWE = weIds.length
    ? await prisma.workoutExercise.deleteMany({ where: { id: { in: weIds } } })
    : { count: 0 };
  const deletedEx = await prisma.exercise.deleteMany({ where: { id: { in: ids } } });

  console.log(`Cleaned: ${deletedEx.count} exercises, ${deletedWE.count} workout_exercises, ${deletedLogs.count} logs`);
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
    console.log(`List offset=${offset} got=${page.results.length} total=${total}`);
    offset += limit;
    if (LIMIT_OVERRIDE && all.length >= LIMIT_OVERRIDE) break;
  }
  return LIMIT_OVERRIDE ? all.slice(0, LIMIT_OVERRIDE) : all;
}

async function processOne(item: MWListItem, counters: { imported: number; skipped: number; withVideo: number; withImage: number; errors: number }) {
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
    const video = pickVideo(ex.videos);
    const videoUrl = video?.url ?? null;
    const thumbnailUrl = video?.og_image ?? null;
    const englishSteps = ex.steps ?? [];

    let nameFinal = ex.name;
    let descriptionFinal = englishSteps.join('\n');

    if (TRANSLATE && englishSteps.length > 0) {
      try {
        const t = await translate(ex.name, englishSteps);
        nameFinal = t.name || ex.name;
        descriptionFinal = t.description || descriptionFinal;
        saveTranslationCache();
      } catch (e: any) {
        console.warn(`Translation skipped for ${ex.name}: ${e.message}`);
      }
    }

    await prisma.exercise.create({
      data: {
        name: nameFinal,
        description: descriptionFinal || undefined,
        instructions: descriptionFinal || undefined,
        category: mapCategory(ex.primary_muscles, ex.category) as any,
        muscleGroups: mapMuscleGroups(ex.primary_muscles) as any,
        equipment: (() => { const t = translateEquipment(ex.category); return t ? [t] : []; })(),
        difficulty: mapDifficulty(ex.difficulty),
        videoUrl: videoUrl ?? undefined,
        thumbnailUrl: thumbnailUrl ?? undefined,
        isPublic: true,
        isAIGenerated: false,
      },
    });
    counters.imported++;
    if (videoUrl) counters.withVideo++;
    if (thumbnailUrl) counters.withImage++;
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
      if ((idx + 1) % 25 === 0) console.log(`Progress ${idx + 1}/${items.length}`);
    }
  };
  await Promise.all(Array.from({ length: n }, next));
}

async function main() {
  loadTranslationCache();
  console.log(
    `Starting import (concurrency=${CONCURRENCY}, translate=${TRANSLATE}, clean=${CLEAN}${LIMIT_OVERRIDE ? `, limit=${LIMIT_OVERRIDE}` : ''})`,
  );

  if (CLEAN) await cleanPublicExercises();

  const ids = await fetchAllIds();
  console.log(`Collected ${ids.length} exercise IDs`);

  const counters = { imported: 0, skipped: 0, withVideo: 0, withImage: 0, errors: 0 };
  await runConcurrent(ids, CONCURRENCY, (item) => processOne(item, counters));
  saveTranslationCache();
  console.log(
    `Done. imported=${counters.imported} skipped=${counters.skipped} withVideo=${counters.withVideo} withImage=${counters.withImage} errors=${counters.errors}`,
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
