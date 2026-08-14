#!/bin/bash
# Script para sincronizar vídeos próprios (Cloudinary) no servidor de produção
# Fase 1: importa/atualiza exercícios com vídeos da RAIZ da conta Cloudinary (flat),
#         removendo o sufixo aleatório do public_id e inferindo a categoria por keyword.
# Fase 2: remove exercícios MuscleWiki do banco (--clean-musclewiki)
# Uso: ssh -i ~/.ssh/oracle_key ubuntu@<IP> 'bash -s' < sync-own-videos.sh
# Flags do seed: --dry-run (simular), --limit N (limitar), --clean-musclewiki (limpar MuscleWiki)

set -e

echo "=== Sincronização de Vídeos Próprios ==="
echo "Iniciando em $(date)"

# 1. Compilar o seed-own-videos.ts para JS
echo "Compilando seed-own-videos.ts..."
cd /home/ubuntu/projeto-fiteness
npx tsc apps/api/src/scripts/seed-own-videos.ts \
  --outDir /tmp/seed-own-videos \
  --module commonjs \
  --esModuleInterop \
  --skipLibCheck \
  --target es2020 \
  --resolveJsonModule 2>&1

# 2. Copiar o JS compilado para o container
echo "Copiando seed-own-videos.js para o container..."
docker cp /tmp/seed-own-videos/seed-own-videos.js fitsaas-api:/tmp/seed-own-videos.js

# 3. Executar o seed dentro do container (envs do container, incl. Cloudinary)
echo "Executando seed de vídeos próprios..."
docker exec -e NODE_PATH=/app/node_modules \
  -e DATABASE_URL='postgresql://postgres:password123@postgres:5432/fitsaas?schema=public' \
  fitsaas-api node /tmp/seed-own-videos.js --clean-musclewiki "$@"

echo "=== Sincronização concluída em $(date) ==="
