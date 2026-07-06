-- ============================================
-- TRADUÇÃO DE EXERCÍCIOS PARA PORTUGUÊS-BR (v2)
-- ============================================

-- A função já foi criada na execução anterior (CREATE FUNCTION)
-- Vamos executar os updates com as colunas entre aspas duplas

-- Atualizar nomes
UPDATE exercises 
SET name = translate_exercise_name(name)
WHERE "isPublic" = true AND "trainerId" IS NULL;

-- Atualizar descrições
UPDATE exercises SET description = REPLACE(description, 'Lay on', 'Deite-se em') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Stand upright', 'Fique em pé') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Stand with', 'Fique com') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Sit on', 'Sente-se em') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Kneel on', 'Ajoelhe-se em') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Lie on', 'Deite-se em') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Lie face', 'Deite-se de') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Place your', 'Coloque sua(s)') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Keep your', 'Mantenha sua(s)') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Hold for', 'Segure por') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Repeat for', 'Repita por') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Repeat on', 'Repita do') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Return to', 'Retorne à') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Slowly', 'Lentamente') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Gently', 'Suavemente') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Firmly', 'Firmemente') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Breathe', 'Respire') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Exhale', 'Expire') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Inhale', 'Inspire') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'your feet', 'seus pés') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'your hands', 'suas mãos') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'your arms', 'seus braços') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'your legs', 'suas pernas') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'your knees', 'seus joelhos') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'your hips', 'seus quadris') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'your back', 'suas costas') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'your head', 'sua cabeça') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'your shoulders', 'seus ombros') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'your elbows', 'seus cotovelos') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'your wrists', 'seus punhos') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'your chest', 'seu peito') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'your core', 'seu core') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'the floor', 'o chão') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'the ground', 'o solo') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'the wall', 'a parede') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'the bench', 'o banco') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'the starting position', 'a posição inicial') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'the desired', 'a quantidade desejada') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Repeat', 'Repita') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Switch sides', 'Troque de lado') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Switch legs', 'Troque de perna') WHERE "isPublic" = true AND "trainerId" IS NULL;
UPDATE exercises SET description = REPLACE(description, 'Switch arms', 'Troque de braço') WHERE "isPublic" = true AND "trainerId" IS NULL;

-- Copiar descrição para instructions
UPDATE exercises SET instructions = description WHERE "isPublic" = true AND "trainerId" IS NULL;

-- Verificar resultado
SELECT 'Tradução concluída!' as status;
SELECT COUNT(*) as total_exercises_traduzidos FROM exercises WHERE "isPublic" = true AND "trainerId" IS NULL;
SELECT name FROM exercises LIMIT 20;
