// Cálculo de % de gordura corporal a partir de dobras cutâneas (mm).
// Protocolos mais usados em consultório de nutrição no Brasil.

export type SkinfoldProtocol = 'pollock3' | 'pollock7' | 'guedes3' | 'faulkner';
export type Sex = 'MALE' | 'FEMALE';

export interface Skinfolds {
  triceps?: number | null;
  subscapular?: number | null;
  chest?: number | null;       // peitoral / tórax
  midaxillary?: number | null; // axilar média
  suprailiac?: number | null;
  abdominal?: number | null;
  thigh?: number | null;       // coxa
}

export const PROTOCOL_LABELS: Record<SkinfoldProtocol, string> = {
  pollock3: 'Pollock 3 dobras',
  pollock7: 'Pollock 7 dobras',
  guedes3: 'Guedes 3 dobras',
  faulkner: 'Faulkner 4 dobras',
};

// Quais dobras cada protocolo exige (por sexo quando aplicável)
export function requiredSkinfolds(protocol: SkinfoldProtocol, sex: Sex): (keyof Skinfolds)[] {
  switch (protocol) {
    case 'pollock3':
      return sex === 'MALE'
        ? ['chest', 'abdominal', 'thigh']
        : ['triceps', 'suprailiac', 'thigh'];
    case 'pollock7':
      return ['chest', 'midaxillary', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh'];
    case 'guedes3':
      return sex === 'MALE'
        ? ['triceps', 'suprailiac', 'abdominal']
        : ['subscapular', 'suprailiac', 'thigh'];
    case 'faulkner':
      return ['triceps', 'subscapular', 'suprailiac', 'abdominal'];
  }
}

function siri(density: number): number {
  return 495 / density - 450;
}

/**
 * Retorna { fatPercent, sum } ou null se faltar dobra / idade / sexo.
 */
export function calcBodyFat(
  protocol: SkinfoldProtocol,
  sex: Sex,
  age: number | null | undefined,
  sf: Skinfolds,
): { fatPercent: number; sum: number } | null {
  const needed = requiredSkinfolds(protocol, sex);
  const raw = needed.map((k) => sf[k]);
  if (raw.some((v) => v === null || v === undefined || Number.isNaN(Number(v)) || Number(v) <= 0)) {
    return null;
  }
  const vals: number[] = raw.map((v) => Number(v));
  const sum: number = vals.reduce((acc, v) => acc + v, 0);

  if (protocol === 'faulkner') {
    // % gordura direto (não usa densidade nem idade)
    const fatPercent = sum * 0.153 + 5.783;
    return { fatPercent: round(fatPercent), sum: round(sum) };
  }

  if (age === null || age === undefined || Number.isNaN(Number(age))) return null;
  const a = Number(age);
  let density: number;

  if (protocol === 'pollock3') {
    density = sex === 'MALE'
      ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * a
      : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * a;
  } else if (protocol === 'pollock7') {
    density = sex === 'MALE'
      ? 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * a
      : 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * a;
  } else {
    // guedes3 — usa log10 do somatório
    const log = Math.log10(sum);
    density = sex === 'MALE'
      ? 1.1714 - 0.0671 * log
      : 1.1665 - 0.0706 * log;
  }

  return { fatPercent: round(siri(density)), sum: round(sum) };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

// Classificação simples (referência Pollock & Wilmore) para exibir junto do valor
export function classifyBodyFat(fatPercent: number, sex: Sex): string {
  const p = fatPercent;
  if (sex === 'MALE') {
    if (p < 6) return 'Muito baixo';
    if (p < 14) return 'Atlético';
    if (p < 18) return 'Bom';
    if (p < 25) return 'Aceitável';
    return 'Acima do recomendado';
  }
  if (p < 14) return 'Muito baixo';
  if (p < 21) return 'Atlético';
  if (p < 25) return 'Bom';
  if (p < 32) return 'Aceitável';
  return 'Acima do recomendado';
}
