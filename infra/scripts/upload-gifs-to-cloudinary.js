/**
 * Script: upload-gifs-to-cloudinary.js
 *
 * Baixa os GIFs do Google Drive e faz upload para o Cloudinary automaticamente!
 *
 * COMO USAR:
 * 1. Certifique-se de que suas credenciais Cloudinary estão no .env
 * 2. Execute: node infra/scripts/upload-gifs-to-cloudinary.js
 *
 * O script vai:
 * 1. Baixar cada GIF do Google Drive
 * 2. Fazer upload para o Cloudinary
 * 3. Atualizar o banco com a URL do Cloudinary
 *
 * PRÉ-REQUISITOS:
 * - .env configurado com CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * - Banco de dados rodando
 * - Exercícios já criados no banco
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const prisma = new PrismaClient();

// Configura Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

/**
 * Baixa um arquivo do Google Drive
 */
function downloadFromDrive(fileId) {
  return new Promise((resolve, reject) => {
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const tempFile = path.join(os.tmpdir(), `exercise_${fileId}.gif`);
    const file = fs.createWriteStream(tempFile);

    console.log(`  📥 Baixando...`);

    https.get(url, (response) => {
      // O Google Drive pode redirecionar para confirmação de download
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Segue o redirecionamento
        https.get(response.headers.location, (res2) => {
          res2.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(tempFile);
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(tempFile);
        });
      }
    }).on('error', (err) => {
      // Tenta com export=view como fallback
      const fallbackUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      const fallbackFile = fs.createWriteStream(tempFile);
      https.get(fallbackUrl, (res2) => {
        res2.pipe(fallbackFile);
        fallbackFile.on('finish', () => {
          fallbackFile.close();
          resolve(tempFile);
        });
      }).on('error', reject);
    });
  });
}

/**
 * Faz upload de um arquivo para o Cloudinary
 */
function uploadToCloudinary(filePath, exerciseName) {
  return new Promise((resolve, reject) => {
    const publicId = `exercises/${exerciseName
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9]+/g, '-') // substitui espaços/caracteres especiais por -
      .replace(/^-|-$/g, '')}`; // remove traços no início/fim

    console.log(`  ☁️  Enviando para Cloudinary...`);

    cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      resource_type: 'image',
      folder: 'exercises',
      overwrite: true,
      format: 'gif',
    }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result.secure_url);
      }
    });
  });
}

async function main() {
  console.log('');
  console.log('🚀 UPLOAD DE GIFs PARA CLOUDINARY');
  console.log('═══════════════════════════════════');
  console.log('');

  // Verifica se Cloudinary está configurado
  if (!process.env.CLOUDINARY_CLOUD_NAME || 
      !process.env.CLOUDINARY_API_KEY || 
      !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Cloudinary não configurado!');
    console.error('   Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no .env');
    process.exit(1);
  }

  console.log(`📋 Cloudinary configurado: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`📋 Total de exercícios para processar: ${EXERCISE_GIFS.length}`);
  console.log('');

  let uploaded = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  for (const gif of EXERCISE_GIFS) {
    if (gif.fileId === 'SEU_ID_AQUI') {
      console.log(`⏭️  "${gif.exerciseName}" → ID não configurado (pulei)`);
      skipped++;
      continue;
    }

    console.log(`\n🎯 "${gif.exerciseName}" (${gif.category})`);

    try {
      // Verifica se o exercício existe no banco
      const exercise = await prisma.exercise.findFirst({
        where: { name: gif.exerciseName, trainerId: null },
      });

      if (!exercise) {
        console.log(`  ⚠️  Exercício não encontrado no banco!`);
        notFound++;
        continue;
      }

      // Baixa o GIF do Google Drive
      const tempFile = await downloadFromDrive(gif.fileId);

      // Faz upload para o Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(tempFile, gif.exerciseName);

      // Atualiza o banco
      await prisma.exercise.update({
        where: { id: exercise.id },
        data: { gifUrl: cloudinaryUrl },
      });

      // Limpa arquivo temporário
      try { fs.unlinkSync(tempFile); } catch (e) {}

      console.log(`  ✅ URL: ${cloudinaryUrl}`);
      uploaded++;
    } catch (err) {
      console.error(`  ❌ Erro: ${err.message}`);
      errors++;
    }
  }

  // Estatísticas finais
  const total = await prisma.exercise.count({ where: { isPublic: true } });
  const comGif = await prisma.exercise.count({ where: { isPublic: true, gifUrl: { not: null } } });

  console.log('');
  console.log('═══════════════════════════════════');
  console.log('📊 RESUMO FINAL:');
  console.log(`  ✅ ${uploaded} GIFs enviados para o Cloudinary`);
  console.log(`  ⏭️  ${skipped} IDs pendentes (substitua 'SEU_ID_AQUI')`);
  console.log(`  ⚠️  ${notFound} exercícios não encontrados`);
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
