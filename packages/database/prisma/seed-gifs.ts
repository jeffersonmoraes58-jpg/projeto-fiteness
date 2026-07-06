/**
 * Seed GIFs para Exercícios
 *
 * Este script adiciona URLs de GIFs (hospedados no Google Drive / Cloudinary)
 * aos exercícios públicos existentes no banco de dados.
 *
 * Uso: npx ts-node packages/database/prisma/seed-gifs.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Mapeamento de exercícios → URLs de GIFs
 *
 * Formato: "Nome do Exercício" → "URL do GIF"
 *
 * Os GIFs podem estar hospedados em:
 * - Google Drive (compartilhar como "qualquer um com link pode ver")
 * - Cloudinary
 * - Imgur
 * - Qualquer CDN
 *
 * Para Google Drive, use o formato:
 * https://drive.google.com/uc?export=view&id=FILE_ID
 *
 * Onde FILE_ID é o ID do arquivo na URL de compartilhamento:
 * https://drive.google.com/file/d/FILE_ID/view
 */
const EXERCISE_GIFS: Record<string, string> = {
  // === PEITO (CHEST) ===
  'Supino Reto':          'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Supino Inclinado':     'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Crucifixo':            'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Crossover':            'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Flexão de Braço':      'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',

  // === COSTAS (BACK) ===
  'Puxada Frontal':       'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Remada Curvada':       'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Remada Unilateral':    'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Barra Fixa':           'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',

  // === OMBROS (SHOULDERS) ===
  'Desenvolvimento com Barra': 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Elevação Lateral':     'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Elevação Frontal':     'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',

  // === BÍCEPS ===
  'Rosca Direta':         'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Rosca Alternada':      'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Rosca Martelo':        'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',

  // === TRÍCEPS ===
  'Tríceps Corda':        'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Tríceps Testa':        'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Mergulho (Tríceps)':   'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',

  // === PERNAS (LEGS) ===
  'Agachamento Livre':    'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Leg Press 45°':        'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Cadeira Extensora':    'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Cadeira Flexora':      'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Stiff':                'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Panturrilha em Pé':    'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',

  // === CORE ===
  'Abdômen Crunch':       'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Prancha':              'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',

  // === CARDIO ===
  'Esteira':              'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Bicicleta Ergométrica':'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
};

async function main() {
  console.log('🎯 Iniciando seed de GIFs para exercícios...\n');

  let updated = 0;
  let notFound = 0;

  for (const [name, gifUrl] of Object.entries(EXERCISE_GIFS)) {
    const exercise = await prisma.exercise.findFirst({
      where: { name, trainerId: null },
    });

    if (!exercise) {
      console.log(`  ⚠️  Exercício não encontrado: "${name}"`);
      notFound++;
      continue;
    }

    await prisma.exercise.update({
      where: { id: exercise.id },
      data: { gifUrl },
    });

    console.log(`  ✅ "${name}" → GIF atualizado`);
    updated++;
  }

  console.log(`\n📊 Resumo:`);
  console.log(`  ✅ ${updated} exercícios atualizados com GIFs`);
  console.log(`  ⚠️  ${notFound} exercícios não encontrados`);

  // Estatísticas
  const total = await prisma.exercise.count({ where: { isPublic: true } });
  const comGif = await prisma.exercise.count({ where: { isPublic: true, gifUrl: { not: null } } });
  const comVideo = await prisma.exercise.count({ where: { isPublic: true, videoUrl: { not: null } } });

  console.log(`\n📈 Estatísticas:`);
  console.log(`  Total de exercícios públicos: ${total}`);
  console.log(`  Com GIF: ${comGif}`);
  console.log(`  Com Vídeo: ${comVideo}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
