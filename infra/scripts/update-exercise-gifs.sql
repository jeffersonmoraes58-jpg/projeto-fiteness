-- ============================================================
-- Script: update-exercise-gifs.sql
-- Descrição: Atualiza os exercícios públicos com URLs de GIFs
-- Uso: psql -U postgres -d fitlynutri -f infra/scripts/update-exercise-gifs.sql
-- ============================================================

-- ATENÇÃO: Substitua 'SEU_ID_AQUI' pelos IDs reais dos seus GIFs no Google Drive
-- Formato da URL: https://drive.google.com/uc?export=view&id=FILE_ID

-- === PEITO (CHEST) ===
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Supino Reto' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Supino Inclinado' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Crucifixo' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Crossover' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Flexão de Braço' AND trainer_id IS NULL;

-- === COSTAS (BACK) ===
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Puxada Frontal' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Remada Curvada' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Remada Unilateral' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Barra Fixa' AND trainer_id IS NULL;

-- === OMBROS (SHOULDERS) ===
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Desenvolvimento com Barra' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Elevação Lateral' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Elevação Frontal' AND trainer_id IS NULL;

-- === BÍCEPS ===
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Rosca Direta' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Rosca Alternada' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Rosca Martelo' AND trainer_id IS NULL;

-- === TRÍCEPS ===
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Tríceps Corda' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Tríceps Testa' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Mergulho (Tríceps)' AND trainer_id IS NULL;

-- === PERNAS (LEGS) ===
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Agachamento Livre' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Leg Press 45°' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Cadeira Extensora' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Cadeira Flexora' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Stiff' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Panturrilha em Pé' AND trainer_id IS NULL;

-- === CORE ===
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Abdômen Crunch' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Prancha' AND trainer_id IS NULL;

-- === CARDIO ===
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Esteira' AND trainer_id IS NULL;
UPDATE exercises SET gif_url = 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI' WHERE name = 'Bicicleta Ergométrica' AND trainer_id IS NULL;

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
SELECT 
  name,
  category,
  CASE WHEN gif_url IS NOT NULL THEN '✅ COM GIF' ELSE '❌ SEM GIF' END as status_gif,
  CASE WHEN video_url IS NOT NULL THEN '✅ COM VIDEO' ELSE '❌ SEM VIDEO' END as status_video
FROM exercises 
WHERE trainer_id IS NULL 
ORDER BY category, name;
