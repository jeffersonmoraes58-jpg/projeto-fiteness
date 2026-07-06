/**
 * Script: sync-gifs-from-drive.ts
 *
 * Sincroniza GIFs de exercícios do Google Drive para o banco de dados.
 *
 * Como usar:
 * 1. Instale a dependência: npm install googleapis @googleapis/drive
 * 2. Crie uma credencial OAuth2 ou Service Account no Google Cloud Console
 * 3. Configure as variáveis de ambiente:
 *    - GOOGLE_DRIVE_FOLDER_ID (ID da pasta principal)
 *    - GOOGLE_SERVICE_ACCOUNT_EMAIL (email da service account)
 *    - GOOGLE_PRIVATE_KEY (chave privada da service account)
 *
 * Ou use o modo público (sem autenticação):
 *    Basta compartilhar a pasta como "Qualquer um com o link pode ver"
 *    e o script usará o formato de URL direta do Google Drive.
 *
 * Uso: npx ts-node infra/scripts/sync-gifs-from-drive.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ID da pasta principal no Google Drive
const DRIVE_FOLDER_ID = '1tB4WtGS746tVQfoUVTTNRouhByU1mCYM';

/**
 * Mapeamento de nomes de pastas → categorias de exercícios
 * As pastas no Google Drive estão em português
 */
const FOLDER_TO_CATEGORY: Record<string, string> = {
  'Peito': 'CHEST',
  'Costas': 'BACK',
  'Ombros': 'SHOULDERS',
  'Bíceps': 'BICEPS',
  'Tríceps': 'TRICEPS',
  'Pernas': 'LEGS',
  'Quadríceps': 'LEGS',
  'Posterior': 'LEGS',
  'Glúteos': 'GLUTES',
  'Abdômen': 'CORE',
  'Core': 'CORE',
  'Cardio': 'CARDIO',
  'Alongamento': 'MOBILITY',
  'Mobilidade': 'MOBILITY',
};

/**
 * Lista arquivos/pastas do Google Drive usando a API pública
 * 
 * Como o Google Drive não tem uma API pública simples,
 * vamos usar o formato de URL direta:
 * https://drive.google.com/uc?export=view&id=FILE_ID
 * 
 * E para listar os arquivos de uma pasta, usamos:
 * https://drive.google.com/drive/folders/FOLDER_ID
 * 
 * Mas como não temos acesso programático à listagem sem autenticação,
 * vamos criar um arquivo de configuração manual com os IDs dos GIFs.
 * 
 * ALTERNATIVA: Você pode simplesmente:
 * 1. Abrir a pasta no Google Drive
 * 2. Para cada GIF, clicar com botão direito → "Compartilhar" → "Qualquer um com o link"
 * 3. Copiar o ID do arquivo da URL
 * 4. Colocar no arquivo exercise-gifs-config.json
 */

interface GifConfig {
  /** Nome do exercício (deve corresponder exatamente ao nome no banco) */
  exerciseName: string;
  /** ID do arquivo no Google Drive */
  fileId: string;
  /** Categoria do exercício */
  category: string;
}

/**
 * CONFIGURAÇÃO DOS GIFs
 * 
 * Preencha abaixo com os IDs dos seus GIFs no Google Drive.
 * 
 * Para obter o ID:
 * 1. Abra o GIF no Google Drive
 * 2. Clique com botão direito → "Compartilhar" → "Qualquer um com o link pode ver"
 * 3. A URL será algo como: https://drive.google.com/file/d/SEU_ID_AQUI/view
 * 4. Copie o SEU_ID_AQUI e cole abaixo
 * 
 * Exemplo:
 * { exerciseName: 'Supino Reto', fileId: '1abc123def456', category: 'CHEST' }
 */
const EXERCISE_GIFS: GifConfig[] = [
  // === PEITO (CHEST) ===
  // Substitua 'SEU_ID_AQUI' pelos IDs reais dos seus GIFs
  { exerciseName: 'Supino Reto',          fileId: 'SEU_ID_AQUI', category: 'CHEST' },
  { exerciseName: 'Supino Inclinado',     fileId: 'SEU_ID_AQUI', category: 'CHEST' },
  { exerciseName: 'Crucifixo',            fileId: 'SEU_ID_AQUI', category: 'CHEST' },
  { exerciseName: 'Crossover',            fileId: 'SEU_ID_AQUI', category: 'CHEST' },
  { exerciseName: 'Flexão de Braço',      fileId: 'SEU_ID_AQUI', category: 'CHEST' },

  // === COSTAS (BACK) ===
  { exerciseName: 'Puxada Frontal',       fileId: 'SEU_ID_AQUI', category: 'BACK' },
  { exerciseName: 'Remada Curvada',       fileId: 'SEU_ID_AQUI', category: 'BACK' },
  { exerciseName: 'Remada Unilateral',    fileId: 'SEU_ID_AQUI', category: 'BACK' },
  { exerciseName: 'Barra Fixa',           fileId: 'SEU_ID_AQUI', category: 'BACK' },

  // === OMBROS (SHOULDERS) ===
  { exerciseName: 'Desenvolvimento com Barra', fileId: 'SEU_ID_AQUI', category: 'SHOULDERS' },
  { exerciseName: 'Elevação Lateral',     fileId: 'SEU_ID_AQUI', category: 'SHOULDERS' },
  { exerciseName: 'Elevação Frontal',     fileId: 'SEU_ID_AQUI', category: 'SHOULDERS' },

  // === BÍCEPS ===
  { exerciseName: 'Rosca Direta',         fileId: 'SEU_ID_AQUI', category: 'BICEPS' },
  { exerciseName: 'Rosca Alternada',      fileId: 'SEU_ID_AQUI', category: 'BICEPS' },
  { exerciseName: 'Rosca Martelo',        fileId: 'SEU_ID_AQUI', category: 'BICEPS' },

  // === TRÍCEPS ===
  { exerciseName: 'Tríceps Corda',        fileId: 'SEU_ID_AQUI', category: 'TRICEPS' },
  { exerciseName: 'Tríceps Testa',        fileId: 'SEU_ID_AQUI', category: 'TRICEPS' },
  { exerciseName: 'Mergulho (Tríceps)',   fileId: 'SEU_ID_AQUI', category: 'TRICEPS' },

  // === PERNAS (LEGS) ===
  { exerciseName: 'Agachamento Livre',    fileId: 'SEU_ID_AQUI', category: 'LEGS' },
  { exerciseName: 'Leg Press 45°',        fileId: 'SEU_ID_AQUI', category: 'LEGS' },
  { exerciseName: 'Cadeira Extensora',    fileId: 'SEU_ID_AQUI', category: 'LEGS' },
  { exerciseName: 'Cadeira Flexora',      fileId: 'SEU_ID_AQUI', category: 'LEGS' },
  { exerciseName: 'Stiff',                fileId: 'SEU_ID_AQUI', category: 'LEGS' },
  { exerciseName: 'Panturrilha em Pé',    fileId: 'SEU_ID_AQUI', category: 'LEGS' },

  // === CORE ===
  { exerciseName: 'Abdômen Crunch',       fileId: 'SEU_ID_AQUI', category: 'CORE' },
  { exerciseName: 'Prancha',              fileId: 'SEU_ID_AQUI', category: 'CORE' },

  // === CARDIO ===
  { exerciseName: 'Esteira',              fileId: 'SEU_ID_AQUI', category: 'CARDIO' },
  { exerciseName: 'Bicicleta Ergométrica',fileId: 'SEU_ID_AQUI', category: 'CARDIO' },
];

/**
 * Converte um fileId do Google Drive em URL direta para embed
 */
function driveFileIdToUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

async function main() {
  console.log('🎯 Sincronizando GIFs do Google Drive...\n');

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const gif of EXERCISE_GIFS) {
    if (gif.fileId === 'SEU_ID_AQUI') {
      console.log(`  ⏭️  "${gif.exerciseName}" → ID não configurado (pulei)`);
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

      const gifUrl = driveFileIdToUrl(gif.fileId);

      await prisma.exercise.update({
        where: { id: exercise.id },
        data: { gifUrl },
      });

      console.log(`  ✅ "${gif.exerciseName}" → GIF atualizado`);
      updated++;
    } catch (err: any) {
      console.error(`  ❌ Erro ao atualizar "${gif.exerciseName}": ${err.message}`);
      errors++;
    }
  }

  // Estatísticas finais
  const total = await prisma.exercise.count({ where: { isPublic: true } });
  const comGif = await prisma.exercise.count({ where: { isPublic: true, gifUrl: { not: null } } });
  const comVideo = await prisma.exercise.count({ where: { isPublic: true, videoUrl: { not: null } } });

  console.log(`\n📊 Resumo:`);
  console.log(`  ✅ ${updated} exercícios atualizados com GIFs`);
  console.log(`  ⚠️  ${notFound} exercícios não encontrados no banco`);
  console.log(`  ❌ ${errors} erros`);
  console.log(`\n📈 Estatísticas do banco:`);
  console.log(`  Total de exercícios públicos: ${total}`);
  console.log(`  Com GIF: ${comGif}`);
  console.log(`  Com Vídeo: ${comVideo}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
