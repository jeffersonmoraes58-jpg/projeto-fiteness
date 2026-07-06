/**
 * Script: sync-cloudinary-gifs.js
 *
 * Sincroniza automaticamente os GIFs do Cloudinary com o banco de dados!
 *
 * Como sua estrutura no Cloudinary é:
 *   278 exercícios musculação/
 *     ├── Peito/       → supino-reto.gif, supino-inclinado.gif, ...
 *     ├── Costas/      → puxada-frontal.gif, remada-curvada.gif, ...
 *     ├── Ombros/      → desenvolvimento-com-barra.gif, ...
 *     ├── Bíceps/      → rosca-direta.gif, rosca-alternada.gif, ...
 *     ├── Tríceps/     → triceps-corda.gif, triceps-testa.gif, ...
 *     ├── Pernas/      → agachamento-livre.gif, leg-press.gif, ...
 *     ├── Core/        → abdomen-crunch.gif, prancha.gif, ...
 *     └── Cardio/      → esteira.gif, bicicleta-ergometrica.gif, ...
 *
 * O script vai:
 * 1. Listar todos os recursos do Cloudinary da pasta "278 exercícios musculação"
 * 2. Mapear cada GIF pelo nome com o exercício no banco
 * 3. Atualizar o gifUrl automaticamente
 *
 * COMO USAR:
 *   node infra/scripts/sync-cloudinary-gifs.js
 *
 * PRÉ-REQUISITOS:
 *   - .env configurado com CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *   - Banco de dados rodando
 *   - Exercícios já criados no banco
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;

const prisma = new PrismaClient();

// Configura Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Pasta principal no Cloudinary
const CLOUDINARY_FOLDER = '278 exercícios musculação';

/**
 * Mapeamento de nomes de pastas → categorias de exercícios
 */
const FOLDER_TO_CATEGORY = {
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
 * Normaliza o nome do arquivo para comparar com o nome do exercício no banco
 * Ex: "supino-reto.gif" → "Supino Reto"
 * Ex: "desenvolvimento-com-barra.gif" → "Desenvolvimento Com Barra"
 */
function normalizeFileName(fileName) {
  return fileName
    .replace(/\.(gif|mp4|webm|jpg|png)$/i, '') // remove extensão
    .split(/[-_]+/) // separa por hífen ou underscore
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // capitaliza
    .join(' '); // junta com espaço
}

/**
 * Lista todos os recursos do Cloudinary de uma pasta (recursivamente)
 */
function listCloudinaryResources(folder) {
  return new Promise((resolve, reject) => {
    const resources = [];

    function fetch(nextCursor) {
      const options = {
        type: 'upload',
        prefix: folder + '/',
        max_results: 500,
        context: true,
      };
      if (nextCursor) options.next_cursor = nextCursor;

      cloudinary.api.resources(options, (error, result) => {
        if (error) return reject(error);

        if (result.resources) {
          resources.push(...result.resources);
        }

        if (result.next_cursor) {
          fetch(result.next_cursor);
        } else {
          resolve(resources);
        }
      });
    }

    fetch();
  });
}

async function main() {
  console.log('');
  console.log('🚀 SINCRONIZANDO GIFs DO CLOUDINARY');
  console.log('═════════════════════════════════════');
  console.log('');

  // Verifica se Cloudinary está configurado
  if (!process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Cloudinary não configurado!');
    console.error('   Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no .env');
    process.exit(1);
  }

  console.log(`📋 Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`📋 Pasta: "${CLOUDINARY_FOLDER}"`);
  console.log('');

  // Lista todos os recursos do Cloudinary
  console.log('🔍 Listando recursos do Cloudinary...');
  let allResources;
  try {
    allResources = await listCloudinaryResources(CLOUDINARY_FOLDER);
  } catch (err) {
    console.error(`❌ Erro ao listar Cloudinary: ${err.message}`);
    console.error('   Verifique se as credenciais estão corretas no .env');
    process.exit(1);
  }

  console.log(`   Encontrados ${allResources.length} recursos\n`);

  // Agrupa por pasta
  const byFolder = {};
  for (const res of allResources) {
    const pathParts = res.public_id.split('/');
    const folder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : '';
    const fileName = pathParts[pathParts.length - 1];

    if (!byFolder[folder]) byFolder[folder] = [];
    byFolder[folder].push({ fileName, url: res.secure_url, publicId: res.public_id });
  }

  console.log('📂 Pastas encontradas:');
  for (const [folder, files] of Object.entries(byFolder)) {
    const category = FOLDER_TO_CATEGORY[folder] || 'OUTROS';
    console.log(`   📁 ${folder}/ (${category}) → ${files.length} arquivos`);
  }
  console.log('');

  // Para cada arquivo, tenta encontrar o exercício correspondente no banco
  let updated = 0;
  let notFound = 0;
  let matched = 0;
  let errors = 0;

  for (const [folder, files] of Object.entries(byFolder)) {
    const category = FOLDER_TO_CATEGORY[folder] || null;

    for (const file of files) {
      const exerciseName = normalizeFileName(file.fileName);

      try {
        // Tenta encontrar o exercício pelo nome
        const exercise = await prisma.exercise.findFirst({
          where: {
            name: { contains: exerciseName, mode: 'insensitive' },
            trainerId: null,
          },
        });

        if (exercise) {
          // Verifica se o nome corresponde exatamente (ignorando acentos e maiúsculas)
          const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (normalize(exercise.name) === normalize(exerciseName)) {
            await prisma.exercise.update({
              where: { id: exercise.id },
              data: { gifUrl: file.url },
            });
            console.log(`  ✅ "${exercise.name}" ← ${file.url}`);
            updated++;
          } else {
            // Match aproximado - mostra pra conferir
            console.log(`  🔶 "${exerciseName}" → match aproximado com "${exercise.name}" (pulei)`);
            matched++;
          }
        } else {
          console.log(`  ⚠️  "${exerciseName}" → nenhum exercício encontrado no banco`);
          notFound++;
        }
      } catch (err) {
        console.error(`  ❌ Erro ao processar "${exerciseName}": ${err.message}`);
        errors++;
      }
    }
  }

  // Estatísticas finais
  const total = await prisma.exercise.count({ where: { isPublic: true } });
  const comGif = await prisma.exercise.count({ where: { isPublic: true, gifUrl: { not: null } } });

  console.log('');
  console.log('═════════════════════════════════════');
  console.log('📊 RESUMO FINAL:');
  console.log(`  ✅ ${updated} exercícios atualizados com GIFs do Cloudinary`);
  console.log(`  🔶 ${matched} matches aproximados (não atualizados automagicamente)`);
  console.log(`  ⚠️  ${notFound} GIFs sem exercício correspondente no banco`);
  console.log(`  ❌ ${errors} erros`);
  console.log('');
  console.log('📈 ESTATÍSTICAS DO BANCO:');
  console.log(`  Total de exercícios públicos: ${total}`);
  console.log(`  Com GIF no Cloudinary: ${comGif}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
