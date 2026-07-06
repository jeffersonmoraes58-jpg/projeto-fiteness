-- Atualizar URLs de vídeo para usar o proxy interno
UPDATE exercises 
SET "videoUrl" = REPLACE("videoUrl", 'https://api.musclewiki.com/stream/videos/', '/api/v1/musclewiki/stream/')
WHERE "videoUrl" LIKE '%api.musclewiki.com%';

-- Verificar resultado
SELECT COUNT(*) as total_atualizados FROM exercises WHERE "videoUrl" LIKE '/api/v1/musclewiki/stream/%';
