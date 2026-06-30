import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TRANSLATIONS: Record<string, string> = {
  Dumbbells: 'Halteres',
  Dumbbell: 'Halteres',
  Barbell: 'Barra',
  Cables: 'Polia',
  Cable: 'Polia',
  Kettlebells: 'Kettlebell',
  Kettlebell: 'Kettlebell',
  Yoga: 'Yoga',
  Bodyweight: 'Peso corporal',
  Plate: 'Anilha',
  Plates: 'Anilha',
  Band: 'Elástico',
  Bands: 'Elástico',
  Stretches: 'Alongamento',
  'Smith-Machine': 'Smith',
  'Smith Machine': 'Smith',
  'Bosu-Ball': 'Bosu',
  'Bosu Ball': 'Bosu',
  'Medicine-Ball': 'Medicine ball',
  'Medicine Ball': 'Medicine ball',
  TRX: 'TRX',
  Vitruvian: 'Vitruvian',
  Machine: 'Máquina',
  Cardio: 'Cardio',
};

async function main() {
  const all = await prisma.exercise.findMany({
    where: { isPublic: true, trainerId: null },
    select: { id: true, equipment: true },
  });

  let touched = 0;
  let skipped = 0;
  const unknownSet = new Set<string>();

  for (const ex of all) {
    if (!ex.equipment || ex.equipment.length === 0) {
      skipped++;
      continue;
    }
    const translated = ex.equipment.map((e) => {
      if (TRANSLATIONS[e]) return TRANSLATIONS[e];
      unknownSet.add(e);
      return e;
    });
    const changed = translated.some((v, i) => v !== ex.equipment[i]);
    if (!changed) {
      skipped++;
      continue;
    }
    await prisma.exercise.update({
      where: { id: ex.id },
      data: { equipment: translated },
    });
    touched++;
  }

  console.log(`Translated equipment on ${touched} exercises (skipped ${skipped} unchanged).`);
  if (unknownSet.size > 0) {
    console.log('Unknown equipment values left untouched:', Array.from(unknownSet));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
