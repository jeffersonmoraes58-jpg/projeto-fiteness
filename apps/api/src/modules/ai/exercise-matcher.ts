// Motor de matching inteligente de exercícios.
// Busca em TODO o catálogo (públicos + do trainer), normalizando nomes,
// reconhecendo sinônimos PT/EN e usando fuzzy para erros de digitação/OCR.

export interface ExerciseLike {
  id: string;
  name: string;
  category: string;
  muscleGroups?: string[] | null;
  gifUrl?: string | null;
  videoUrl?: string | null;
  equipment?: string[] | null;
}

export interface MatchResult {
  exercise: ExerciseLike;
  score: number;
  matchedBy: string;
}

// Palavras de ligação removidas na comparação por tokens
const STOPWORDS = new Set([
  'com', 'na', 'no', 'de', 'da', 'do', 'em', 'para', 'a', 'o', 'e',
  'os', 'as', 'um', 'uma', 'e', 'ou', 'com', 'nem',
]);

// Sinônimos comuns (PT-BR ↔ EN e variações). Usado para expandir a busca.
const SYNONYM_GROUPS: Record<string, string[]> = {
  supino: ['supino', 'bench press', 'bench', 'press deitado', 'supine'],
  desenvolvimento: ['desenvolvimento', 'overhead press', 'shoulder press', 'military press', 'ombro press'],
  puxada: ['puxada', 'pulldown', 'pull down', 'lat pulldown', 'lat pull down'],
  rosca: ['rosca', 'curl', 'bicep curl', 'preacher curl'],
  elevacao: ['elevacao', 'raise', 'lateral raise', 'frontal raise'],
  remada: ['remada', 'row', 'seated row', 'bent over row'],
  crucifixo: ['crucifixo', 'fly', 'pec fly', 'pec deck', 'chest fly', 'peck deck', 'voador', 'voador na maquina', 'maquina voador'],
  voador: ['voador', 'fly', 'pec fly', 'reverse fly', 'rear delt fly', 'crucifixo'],
  crossover: ['crossover', 'cable crossover', 'cross over'],
  agachamento: ['agachamento', 'squat', 'back squat', 'front squat', 'goblet squat'],
  afundo: ['afundo', 'lunge', 'lunges'],
  'leg press': ['leg press', 'legpress', 'leg press 45'],
  extensora: ['extensora', 'leg extension', 'leg extensions'],
  flexora: ['flexora', 'leg curl', 'leg curls'],
  adutora: ['adutora', 'adductor', 'hip adduction', 'adduction machine'],
  abdutora: ['abdutora', 'abductor', 'hip abduction', 'abduction machine'],
  panturrilha: ['panturrilha', 'calf', 'calf raise', 'calf raises'],
  prancha: ['prancha', 'plank', 'front plank'],
  abdominal: ['abdominal', 'abdominais', 'crunch', 'abs', 'sit up', 'situp', 'situps'],
  'barra fixa': ['barra fixa', 'pull up', 'pullup', 'pull ups', 'chin up', 'chinup'],
  mergulho: ['mergulho', 'dips', 'dip', 'parallel bar dips', 'triceps dips'],
  stiff: ['stiff', 'romanian deadlift', 'rdl', 'stiff leg deadlift', 'stiff-legged deadlift'],
  terra: ['levantamento terra', 'deadlift', 'terra', 'conventional deadlift'],
  coice: ['coice', 'kickback', 'glute kickback', 'cable kickback'],
  encolhimento: ['encolhimento', 'shrug', 'shrugs', 'dumbbell shrug'],
  'rosca inversa': ['rosca inversa', 'reverse curl', 'reverse grip curl'],
  'rosca martelo': ['rosca martelo', 'hammer curl', 'hammer curls'],
  'triceps frances': ['triceps frances', 'french press', 'skull crusher', 'skullcrusher'],
  'triceps corda': ['triceps corda', 'rope pushdown', 'cable pushdown', 'pushdown', 'push down'],
  'elevacao de quadril': ['elevacao de quadril', 'hip thrust', 'hip thrusts', 'barbell hip thrust'],
  ponte: ['ponte', 'bridge', 'glute bridge'],
  esteira: ['esteira', 'treadmill', 'running'],
  bicicleta: ['bicicleta', 'bike', 'cycling', 'stationary bike'],
  polichinelo: ['polichinelo', 'jumping jack', 'jumping jacks'],
  'pular corda': ['pular corda', 'jump rope', 'skipping rope'],
  burpee: ['burpee', 'burpees'],
  'puxada frontal': ['puxada frontal', 'front pulldown', 'lat pulldown'],
  'puxada atras': ['puxada atras', 'behind neck pulldown'],
  'remada baixa': ['remada baixa', 'seated cable row', 'low row', 'cable row'],
  'remada alta': ['remada alta', 'upright row', 'high row'],
  'remada curvada': ['remada curvada', 'bent over row', 'barbell row'],
  'remada unilateral': ['remada unilateral', 'one arm row', 'single arm row', 'dumbbell row'],
  'posterior de ombro': ['posterior de ombro', 'rear delt', 'reverse fly', 'rear delt fly'],
  'elevacao frontal': ['elevacao frontal', 'front raise'],
  'elevacao lateral': ['elevacao lateral', 'lateral raise', 'side raise'],
  'desenvolvimento militar': ['desenvolvimento militar', 'military press'],
  'desenvolvimento com barra': ['desenvolvimento com barra', 'overhead press', 'barbell press'],
  'desenvolvimento com halteres': ['desenvolvimento com halteres', 'dumbbell shoulder press', 'seated db press'],
  'supino inclinado': ['supino inclinado', 'incline bench press', 'incline press'],
  'supino declinado': ['supino declinado', 'decline bench press', 'decline press'],
  'supino com halteres': ['supino com halteres', 'dumbbell bench press'],
  'cadeira flexora': ['cadeira flexora', 'leg curl'],
  'cadeira extensora': ['cadeira extensora', 'leg extension'],
  'leg press 45': ['leg press 45', 'leg press'],
  'agachamento livre': ['agachamento livre', 'barbell squat'],
  'agachamento smith': ['agachamento smith', 'smith squat', 'smith machine squat'],
  'agachamento hack': ['agachamento hack', 'hack squat'],
  'agachamento bulgaro': ['agachamento bulgaro', 'bulgarian split squat'],
  'cadeira abdutora': ['cadeira abdutora', 'hip abduction'],
  'cadeira adutora': ['cadeira adutora', 'hip adduction'],
  'manguito rotador': ['manguito rotador', 'rotator cuff', 'external rotation'],
  'elevacao de ombro': ['elevacao de ombro', 'shrug'],
};

function isStopword(token: string): boolean {
  return STOPWORDS.has(token);
}

/** Normaliza texto: minúsculas, sem acentos/pontuação, espaços limpos. */
export function normalizeName(raw?: string | null): string {
  return (raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(raw?: string | null): string[] {
  return normalizeName(raw)
    .split(' ')
    .filter(Boolean)
    .filter((t) => !isStopword(t));
}

/**
 * Verifica compatibilidade de equipamento: exercícios sem dado de equipamento
 * são compatíveis; com lista de equipamentos informada, exige ao menos UM item
 * em comum (sobreposição por substring, ex.: "banco" cobre "banco inclinado").
 * Exercícios com zero sobreposição são considerados incompatíveis (ex.: exige
 * barra quando o treino informa só halteres) e saem das opções — a IA cria
 * uma variante compatível.
 */
export function isEquipmentCompatible(
  exercise: Pick<ExerciseLike, 'equipment'> | null | undefined,
  equipment?: string[] | null,
): boolean {
  const available = (equipment ?? []).map(normalizeName).filter(Boolean);
  if (available.length === 0) return true;
  const needs = (exercise?.equipment ?? []).map(normalizeName).filter(Boolean);
  if (needs.length === 0) return true;
  return needs.some((n) =>
    available.some(
      (a) =>
        a === n ||
        (a.length >= 3 && n.length >= 3 && (a.includes(n) || n.includes(a))),
    ),
  );
}

/** Expande um nome com sinônimos conhecidos (frases e tokens). */
export function expandName(raw?: string | null): string[] {
  const norm = normalizeName(raw);
  const tokens = tokenize(raw);
  const out = new Set<string>([norm]);

  for (const key of Object.keys(SYNONYM_GROUPS)) {
    const keyN = normalizeName(key);
    const hasKeyPhrase = norm.includes(keyN) || keyN.includes(norm);
    const hasKeyToken = tokens.some((t) => keyN.includes(t) || t.includes(keyN));
    if (hasKeyPhrase || hasKeyToken) {
      for (const syn of SYNONYM_GROUPS[key]) out.add(normalizeName(syn));
    }
  }
  return Array.from(out).filter(Boolean);
}

/** Distância de Levenshtein para fuzzy matching (typos/OCR). */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function fuzzyRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  const ratio = 1 - levenshtein(a, b) / maxLen;
  return ratio < 0.45 ? 0 : ratio;
}

export interface MatchOptions {
  /** Categoria esperada (enum) para bônus e filtro de candidatos. */
  category?: string | null;
  /** Grupo muscular esperado (nome livre, ex.: "Legs", "Quadriceps"). */
  muscleGroup?: string | null;
  /** Equipamentos disponíveis — bônus para quem só usa os disponíveis, penalidade para quem exige outros. */
  equipment?: string[] | null;
  /** Pontuação mínima para considerar um "match bom" (default 62). */
  acceptThreshold?: number;
  /** Quantos candidatos retornar (default 5). */
  topK?: number;
}

/** Pontua a similaridade entre uma busca e um exercício do catálogo. */
export function scoreMatch(query: string, candidate: ExerciseLike, opts: MatchOptions = {}): number {
  const ctx = buildQueryContext(query);
  if (!ctx) return 0;
  return computeScore(ctx, candidate, opts).score;
}

interface ScoreDetail {
  score: number;
  matchedBy: string;
}

interface QueryContext {
  nq: string;
  qTokens: string[];
  qExpanded: string[];
}

/** Pré-computa a busca (token/expansão) uma única vez, evitando recalcular por candidato. */
function buildQueryContext(query: string): QueryContext | null {
  const nq = normalizeName(query);
  if (!nq) return null;
  return { nq, qTokens: tokenize(query), qExpanded: expandName(query) };
}

function computeScore(ctx: QueryContext, candidate: ExerciseLike, opts: MatchOptions = {}): ScoreDetail {
  const { nq, qTokens, qExpanded } = ctx;
  const nc = normalizeName(candidate.name);
  if (!nc) return { score: 0, matchedBy: 'none' };

  const cTokens = tokenize(candidate.name);
  const presentTokens = qTokens.filter((t) => cTokens.includes(t)).length;
  const tokenRatio = qTokens.length > 0 ? presentTokens / qTokens.length : 0;

  let score = 0;
  let matchedBy = 'none';

  // 1. Igualdade normalizada
  if (nq === nc) {
    score = 100;
    matchedBy = 'exact';
  } else {
    // 2. Sinônimos
    const cExpanded = expandName(candidate.name);
    const aliasExact = qExpanded.some((e) => e === nc) || cExpanded.some((e) => e === nq);
    const aliasSubstr =
      qExpanded.some((e) => e.length >= 4 && (nc.includes(e) || e.includes(nc))) ||
      cExpanded.some((e) => e.length >= 4 && (nq.includes(e) || e.includes(nq)));
    if (aliasExact) {
      score = 80;
      matchedBy = 'alias';
    } else if (aliasSubstr) {
      score = 72;
      matchedBy = 'alias';
    }
  }

  if (score < 72) {
    // 3. Substring (nome encurtado ou com detalhe extra)
    const minLen = Math.min(nq.length, nc.length);
    if (minLen >= 4 && (nc.includes(nq) || nq.includes(nc))) {
      const diffPenalty = Math.min(Math.abs(nq.length - nc.length), 10);
      const s = 68 - diffPenalty;
      if (s > score) {
        score = s;
        matchedBy = 'substring';
      }
    }
  }

  // 4. Bônus de cobertura de tokens: quanto mais palavras da busca o candidato
  // cobre, maior a confiança (resolve empates entre alias/substring).
  if (score > 0 && tokenRatio > 0) {
    score = Math.min(100, score + Math.round(20 * tokenRatio));
  }

  // 5. Sem base de nome, mas com tokens em comum → pontuação por tokens
  if (score === 0 && tokenRatio > 0) {
    score = 30 + Math.round(40 * tokenRatio);
    matchedBy = 'tokens';
  }

  // 6. Fuzzy (typos / OCR)
  if (score < 60) {
    const fr = fuzzyRatio(nq, nc);
    if (fr > 0) {
      const fuzzyScore = 20 + Math.round(40 * fr);
      if (fuzzyScore > score) {
        score = fuzzyScore;
        matchedBy = 'fuzzy';
      }
    }
  }

  // 7. Bônus por mídia demonstrativa (GIFs/vídeos em primeiro lugar)
  const hasGif = !!candidate.gifUrl;
  const hasVideo = !!candidate.videoUrl;
  if (hasGif) score += 8;
  else if (hasVideo) score += 5;

  // 8. Bônus por categoria coerente
  const expectedCat = normalizeEnumCategory(opts.category);
  if (expectedCat && candidate.category === expectedCat) score += 6;

  // 9. Equipamento disponível: bônus se tudo que o exercício exige está
  // disponível; forte penalidade se exige equipamento fora da lista — com
  // equipamento informado, opção incompatível praticamente não é selecionada
  // (cai abaixo do threshold e vai para substituição/criação via IA).
  const available = (opts.equipment ?? []).map(normalizeName).filter(Boolean);
  const needs = (candidate.equipment ?? []).map(normalizeName).filter(Boolean);
  if (available.length > 0 && needs.length > 0) {
    const covered = needs.filter((n) => available.includes(n)).length;
    if (covered === needs.length) score += 6;
    else if (covered === 0) score -= 40;
    else score += 2;
  }

  return { score: Math.round(score), matchedBy };
}

/** Normaliza uma categoria livre ("Peito", "chest") para o enum. */
export function normalizeEnumCategory(category?: string | null): string | null {
  const norm = normalizeName(category);
  if (!norm) return null;
  const map: Record<string, string> = {
    chest: 'CHEST', peito: 'CHEST', peitoral: 'CHEST',
    back: 'BACK', costas: 'BACK', dorsal: 'BACK',
    shoulders: 'SHOULDERS', ombros: 'SHOULDERS', deltoides: 'SHOULDERS',
    biceps: 'BICEPS',
    triceps: 'TRICEPS',
    legs: 'LEGS', pernas: 'LEGS', inferiores: 'LEGS', coxa: 'LEGS',
    glutes: 'GLUTES', gluteos: 'GLUTES',
    core: 'CORE', abdomen: 'CORE', abdominais: 'CORE', abdome: 'CORE', abs: 'CORE',
    cardio: 'CARDIO',
    full_body: 'FULL_BODY', 'corpo inteiro': 'FULL_BODY', 'full body': 'FULL_BODY',
    mobility: 'MOBILITY', mobilidade: 'MOBILITY', alongamento: 'MOBILITY',
  };
  return map[norm] ?? null;
}

const VALID_CATEGORIES = new Set([
  'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'LEGS', 'GLUTES', 'CORE', 'CARDIO', 'FULL_BODY', 'MOBILITY',
]);

export const VALID_MUSCLES = new Set([
  'PECTORALIS_MAJOR', 'PECTORALIS_MINOR', 'LATISSIMUS_DORSI', 'TRAPEZIUS', 'RHOMBOIDS', 'DELTOID',
  'BICEPS_BRACHII', 'TRICEPS_BRACHII', 'FOREARMS', 'QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES',
  'ABS', 'OBLIQUES', 'LOWER_BACK', 'HIP_FLEXORS',
]);

export function isCategoryValid(category?: string | null): category is string {
  return !!category && VALID_CATEGORIES.has(category);
}

/** Infere a categoria enum a partir de músculos/grupos informados. */
export function guessCategoryFromMuscles(muscles: string[], category?: string | null): string {
  const fromCat = normalizeEnumCategory(category);
  if (fromCat) return fromCat;
  const normMuscles = muscles.map(normalizeName);
  const muscleMap: Record<string, string> = {
    peitoral: 'CHEST', peito: 'CHEST', pectoralis: 'CHEST', chest: 'CHEST',
    dorsal: 'BACK', costas: 'BACK', latissimus: 'BACK', trapezio: 'BACK', rhomboid: 'BACK', back: 'BACK',
    deltoide: 'SHOULDERS', ombros: 'SHOULDERS', shoulder: 'SHOULDERS', deltoid: 'SHOULDERS',
    biceps: 'BICEPS', bicep: 'BICEPS',
    triceps: 'TRICEPS', tricep: 'TRICEPS',
    quadriceps: 'LEGS', quadricep: 'LEGS', coxa: 'LEGS', perna: 'LEGS', hamstring: 'LEGS', panturrilha: 'LEGS', calf: 'LEGS', pernas: 'LEGS',
    gluteo: 'GLUTES', gluteos: 'GLUTES', glutes: 'GLUTES',
    abdominal: 'CORE', abs: 'CORE', core: 'CORE', obliquo: 'CORE',
    cardio: 'CARDIO',
  };
  for (const m of normMuscles) {
    for (const [key, cat] of Object.entries(muscleMap)) {
      if (m.includes(key)) return cat;
    }
  }
  return 'FULL_BODY';
}

/**
 * Encontra os melhores candidatos para uma busca, percorrendo TODO o catálogo.
 * O catálogo deve ser pré-filtrado (públicos + do trainer) por quem chama.
 */
export function findBestMatches(
  query: string,
  catalog: ExerciseLike[],
  opts: MatchOptions = {},
): MatchResult[] {
  const acceptThreshold = opts.acceptThreshold ?? 62;
  const topK = opts.topK ?? 5;

  const ctx = buildQueryContext(query);
  if (!ctx) return [];

  const scored = catalog
    .map((candidate) => ({ ...computeScore(ctx, candidate, opts), exercise: candidate }))
    .filter((r) => r.score > 0);

  // Com equipamentos informados, exclui exercícios incompatíveis (zero
  // sobreposição) — mantém os de sobreposição parcial e os sem dado.
  const results =
    (opts.equipment ?? []).some((e) => normalizeName(e))
      ? scored.filter((r) => isEquipmentCompatible(r.exercise, opts.equipment))
      : scored;

  results.sort((a, b) => b.score - a.score);

  return results.map((r) => ({
    exercise: r.exercise,
    score: r.score,
    matchedBy: r.matchedBy,
  })).slice(0, topK);
}

/**
 * Encontra o melhor match "bom" (acima do threshold) ou null.
 * Retorna também os demais candidatos para sugerir como substituição.
 */
export function matchExercise(
  query: string,
  catalog: ExerciseLike[],
  opts: MatchOptions = {},
): { best: MatchResult | null; candidates: MatchResult[] } {
  const top = findBestMatches(query, catalog, { ...opts, topK: 8 });
  const best = top.find((r) => r.score >= (opts.acceptThreshold ?? 62)) ?? null;
  return { best, candidates: top };
}
