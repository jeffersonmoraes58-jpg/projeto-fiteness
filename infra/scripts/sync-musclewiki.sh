#!/bin/bash
# Script para sincronizar exercícios da MuscleWiki no servidor de produção
# Uso: ssh -i ~/.ssh/oracle_key ubuntu@163.176.136.106 'bash -s' < sync-musclewiki.sh

set -e

echo "=== Sincronização MuscleWiki ==="
echo "Iniciando em $(date)"

# 1. Compilar o seed-musclewiki.ts para JS
echo "Compilando seed-musclewiki.ts..."
cd /home/ubuntu/projeto-fiteness
npx tsc packages/database/prisma/seed-musclewiki.ts \
  --outDir /tmp/seed-mw \
  --module commonjs \
  --esModuleInterop \
  --skipLibCheck \
  --target es2020 \
  --resolveJsonModule 2>&1

# 2. Copiar o JS compilado para o container
echo "Copiando seed-musclewiki.js para o container..."
docker cp /tmp/seed-mw/seed-musclewiki.js fitsaas-api:/tmp/seed-musclewiki.js

# 3. Executar o seed dentro do container
echo "Executando seed MuscleWiki..."
docker exec -e NODE_PATH=/app/node_modules \
  -e MUSCLEWIKI_API_KEY=mw_3TJEkjm6mfz7R0HTi1pknhp62SNu8GVnEyZv_t8zvVw \
  -e MUSCLEWIKI_TRANSLATE=0 \
  -e MUSCLEWIKI_CLEAN=1 \
  -e MUSCLEWIKI_CONCURRENCY=4 \
  -e DATABASE_URL='postgresql://postgres:password123@postgres:5432/fitsaas?schema=public' \
  fitsaas-api node /tmp/seed-musclewiki.js

# 4. Atualizar URLs de vídeo para usar o proxy interno
echo "Atualizando URLs de vídeo para o proxy..."
docker exec fitsaas-postgres psql -U postgres -d fitsaas -c "
UPDATE exercises 
SET \"videoUrl\" = REPLACE(\"videoUrl\", 'https://api.musclewiki.com/stream/videos/', '/api/v1/musclewiki/stream/')
WHERE \"videoUrl\" LIKE '%api.musclewiki.com%';
"

echo "=== Sincronização concluída em $(date) ==="
