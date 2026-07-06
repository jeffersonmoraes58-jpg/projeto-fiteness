/**
 * Script: sync-gifs.js
 *
 * Sincroniza GIFs de exercícios do Google Drive para o banco de dados.
 *
 * COMO USAR:
 * 1. Abra sua pasta do Google Drive: https://drive.google.com/drive/folders/1tB4WtGS746tVQfoUVTTNRouhByU1mCYM
 * 2. Para cada GIF, clique com botão direito → "Compartilhar" → "Qualquer um com o link pode ver"
 * 3. Copie o ID do arquivo da URL (ex: https://drive.google.com/file/d/SEU_ID_AQUI/view)
 * 4. Cole o ID no array EXERCISE_GIFS abaixo, substituindo 'SEU_ID_AQUI'
 * 5. Execute: node infra/scripts/sync-gifs.js
 *
 * PRÉ-REQUISITOS:
 * - Ter o banco de dados rodando
 * - Ter os exercícios já criados no banco (seed já executado)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🎯 COLE AQUI OS IDs DOS SEUS GIFs DO GOOGLE DRIVE
 *
 * Para cada exercício, substitua 'SEU_ID_AQUI' pelo ID real do arquivo.
 *
 * Como encontrar o ID:
 * 1. Abra o GIF no Google Drive
 * 2. Clique com botão direito → "Compartilhar" → "Qualquer um com o link pode ver"
 * 3. A URL será: https://drive.google.com/file/d/SEU_ID_AQUI/view
 * 4. Copie o SEU_ID_AQUI e cole abaixo
 *
 * Exemplo real:
 * { exerciseName: 'Supino Reto', fileId: '1abc123def456GHI789', category: 'CHEST' }
 */
const EXERCISE_GIFS = [
  // ═══ PEITO (CHEST) ═══
  { exerciseName: 'Supino Reto',          fileId: 'SEU_ID_AQUI', category: 'CHEST' },
  { exerciseName: 'Supino Inclinado',     fileId: 'SEU_ID_AQUI', category: 'CHEST' },
  { exerciseName: 'Crucifixo',            fileId: 'SEU_ID_AQUI', category: 'CHEST' },
  { exerciseName: 'Crossover',            fileId: 'SEU_ID_AQUI', category: 'CHEST' },
  { exerciseName: 'Flexão de Braço',      fileId: 'SEU_ID_AQUI', category: 'CHEST' },

  // ═══ COSTAS (BACK) ═══
  { exerciseName: 'Puxada Frontal',       fileId: 'SEU_ID_AQUI', category: 'BACK' },
  { exerciseName: 'Remada Curvada',       fileId: 'SEU_ID_AQUI', category: 'BACK' },
  { exerciseName: 'Remada Unilateral',    fileId: 'SEU_ID_AQUI', category: 'BACK' },
  { exerciseName: 'Barra Fixa',           fileId: 'SEU_ID_AQUI', category: 'BACK' },

  // ═══ OMBROS (SHOULDERS) ═══
  { exerciseName: 'Desenvolvimento com Barra', fileId: 'SEU_ID_AQUI', category: 'SHOULDERS' },
  { exerciseName: 'Elevação Lateral',     fileId: 'SEU_ID_AQUI', category: 'SHOULDERS' },
  { exerciseName: 'Elevação Frontal',     fileId: 'SEU_ID_AQUI', category: 'SHOULDERS' },

  // ═══ BÍCEPS ═══
  { exerciseName: 'Rosca Direta',         fileId: 'SEU_ID_AQUI', category: 'BICEPS' },
  { exerciseName: 'Rosca Alternada',      fileId: 'SEU_ID_AQUI', category: 'BICEPS' },
  { exerciseName: 'Rosca Martelo',        fileId: 'SEU_ID_AQUI', category: 'BICEPS' },

  // ═══ TRÍCEPS ═══
  { exerciseName: 'Tríceps Corda',        fileId: 'SEU_ID_AQUI', category: 'TRICEPS' },
  { exerciseName: 'Tríceps Testa',        fileId: 'SEU_ID_AQUI', category: 'TRICEPS' },
  { exerciseName: 'Mergulho (Tríceps)',   fileId: 'SEU_ID_AQUI', category: 'TRICEPS' },

  // ═══ PERNAS (LEGS) ═══
  { exerciseName: 'Agachamento Livre',    fileId: 'SEU_ID_AQUI', category: 'LEGS' },
  { exerciseName: 'Leg Press 45°',        fileId: 'SEU_ID_AQUI', category: 'LEGS' },
  { exerciseName: 'Cadeira Extensora',    fileId: 'SEU_ID_AQUI', category: 'LEGS' },
  { exerciseName: 'Cadeira Flexora',      fileId: 'SEU_ID_AQUI', category: 'LEGS' },
  { exerciseName: 'Stiff',                fileId: 'SEU_ID_AQUI', category: 'LEGS' },
  { exerciseName: 'Panturrilha em Pé',    fileId: 'SEU_ID_AQUI', category: 'LEGS' },

  // ═══ CORE ═══
  { exerciseName: 'Abdômen Crunch',       fileId: 'SEU_ID_AQUI', category: 'CORE' },
  { exerciseName: 'Prancha',              fileId: 'SEU_ID_AQUI', category: 'CORE' },

  // ═══ CARDIO ═══
  { exerciseName: 'Esteira',              fileId: 'SEU_ID_AQUI', category: 'CARDIO' },
  { exerciseName: 'Bicicleta Ergométrica',fileId: 'SEU_ID_AQUI', category: 'CARDIO' },
];

async function main() {
  console.log('');
  console.log('🎯 Sincronizando GIFs do Google Drive...');
  console.log('');

  let updated = 0;
  let notFound = 0;
  let skipped = 0;
  let errors = 0;

  for (const gif of EXERCISE_GIFS) {
    if (gif.fileId === 'SEU_ID_AQUI') {
      console.log(`  ⏭️  "${gif.exerciseName}" → ID não configurado (pulei)`);
      skipped++;
      continue;
    }

    try {
      const exercise = await prisma.exercise.findFirst({
        where: { name: gif.exerciseName, trainerId: null },
      });

      if (!exercise) {
        console.log(`  ⚠️  Exercício não encontrado: "${gif.exerciseName}"`);
        notFound++;
        continue;
      }

      const gifUrl = `https://drive.google.com/uc?export=view&id=${gif.fileId}`;

      await prisma.exercise.update({
        where: { id: exercise.id },
        data: { gifUrl },
      });

      console.log(`  ✅ "${gif.exerciseName}" → GIF atualizado`);
      updated++;
    } catch (err) {
      console.error(`  ❌ Erro ao atualizar "${gif.exerciseName}": ${err.message}`);
      errors++;
    }
  }

  // Estatísticas finais
  const total = await prisma.exercise.count({ where: { isPublic: true } });
  const comGif = await prisma.exercise.count({ where: { isPublic: true, gifUrl: { not: null } } });
  const comVideo = await prisma.exercise.count({ where: { isPublic: true, videoUrl: { not: null } } });

  console.log('');
  console.log('📊 RESUMO:');
  console.log(`  ✅ ${updated} exercícios atualizados com GIFs`);
  console.log(`  ⏭️  ${skipped} exercícios com ID pendente`);
  console.log(`  ⚠️  ${notFound} exercícios não encontrados no banco`);
  console.log(`  ❌ ${errors} erros`);
  console.log('');
  console.log('📈 ESTATÍSTICAS DO BANCO:');
  console.log(`  Total de exercícios públicos: ${total}`);
  console.log(`  Com GIF: ${comGif}`);
  console.log(`  Com Vídeo: ${comVideo}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
