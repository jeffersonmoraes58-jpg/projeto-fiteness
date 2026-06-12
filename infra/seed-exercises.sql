-- Update existing exercises missing videoUrl
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=XxWcirHIwVo' WHERE name = 'Supino Inclinado' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=ZnIBNqmfJZM' WHERE name = 'Crossover' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=kjH4fVbkgXc' WHERE name = 'Desenvolvimento com Barra' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=vn3nuYGzBJc' WHERE name = 'Elevação Frontal' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=av7-8igSXTs' WHERE name = 'Rosca Martelo' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=SjlBjdq9kFI' WHERE name = 'Tríceps Testa' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=k5-BqnNaGso' WHERE name = 'Mergulho' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=6GqCQFO68A8' WHERE name = 'Remada Unilateral' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=QcTsqSFQy8E' WHERE name = 'Cadeira Extensora' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=FCHiVEyW_GE' WHERE name = 'Cadeira Flexora' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=3mHDSBFR2Q4' WHERE name = 'Stiff' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=V5gexoXbOIs' WHERE name = 'Panturrilha em Pé' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=nQZvVAqPxdY' WHERE name = 'Abdômen Crunch' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=fz15_q_Tpzw' WHERE name = 'Esteira' AND "videoUrl" IS NULL;
UPDATE exercises SET "videoUrl" = 'https://www.youtube.com/watch?v=Ng8xM5n71jE' WHERE name = 'Bicicleta Ergométrica' AND "videoUrl" IS NULL;

-- Insert new exercises (skip if name already exists)
INSERT INTO exercises (id, "trainerId", name, description, category, "muscleGroups", equipment, difficulty, "videoUrl", "isPublic", "isAIGenerated", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, NULL, name, description, category::"ExerciseCategory", "muscleGroups"::"MuscleGroup"[], equipment::text[], difficulty, video_url, true, false, NOW(), NOW()
FROM (VALUES
  ('Hip Thrust','Exercicio principal para gluteos. Excelente para hipertrofia e forca do gluteo maximo.','GLUTES','{"GLUTES","HAMSTRINGS"}','{"Barra","Banco"}',2,'https://www.youtube.com/watch?v=mvwCxANvaLs'),
  ('Elevacao Pelvica','Versao com peso corporal do hip thrust. Otima para iniciantes ativarem os gluteos.','GLUTES','{"GLUTES","HAMSTRINGS"}','{"Haltere"}',1,'https://www.youtube.com/watch?v=k5-BqnNaGso'),
  ('Abducao de Quadril na Maquina','Isolamento dos abdutores e gluteo medio. Essencial para estabilidade do quadril.','GLUTES','{"GLUTES"}','{"Maquina"}',1,'https://www.youtube.com/watch?v=e5TP7Vnn1Ho'),
  ('Agachamento Sumo','Agachamento com postura larga. Maior recrutamento de adutores e gluteos.','GLUTES','{"GLUTES","QUADRICEPS"}','{"Haltere","Barra"}',2,'https://www.youtube.com/watch?v=kNRr7yqnhJs'),
  ('Coice Gluteo no Cabo','Isolamento do gluteo maximo com cabo para tensao constante.','GLUTES','{"GLUTES"}','{"Cabo","Tornozeleira"}',2,'https://www.youtube.com/watch?v=dtFbClH3lp4'),
  ('Avanco (Afundo)','Exercicio unilateral para quadriceps, gluteos e equilibrio.','LEGS','{"QUADRICEPS","GLUTES","HAMSTRINGS"}','{"Halteres","Barra"}',2,'https://www.youtube.com/watch?v=QOVaHwm-Q6U'),
  ('Agachamento Bulgaro','Agachamento unilateral com pe elevado. Excelente para hipertrofia de quadriceps.','LEGS','{"QUADRICEPS","GLUTES","HAMSTRINGS"}','{"Halteres","Banco"}',3,'https://www.youtube.com/watch?v=2C-uNgKwPLE'),
  ('Hack Squat','Agachamento na maquina hack. Otimo para vasto lateral e medial do quadriceps.','LEGS','{"QUADRICEPS","GLUTES"}','{"Maquina"}',2,'https://www.youtube.com/watch?v=EdtfNR-KSg0'),
  ('Levantamento Terra Romeno','Foco nos isquiotibiais e gluteos com pernas praticamente estendidas.','LEGS','{"HAMSTRINGS","GLUTES","LOWER_BACK"}','{"Barra","Halteres"}',2,'https://www.youtube.com/watch?v=2SHsk9AzdjA'),
  ('Panturrilha Sentado','Isola o musculo soleo, diferente da panturrilha em pe que recruta mais o gastrocnemio.','LEGS','{"CALVES"}','{"Maquina"}',1,'https://www.youtube.com/watch?v=k0VuHHkFBuU'),
  ('Supino Reto com Halteres','Versao com halteres permite maior amplitude e corrige desequilibrios entre os lados.','CHEST','{"PECTORALIS_MAJOR","TRICEPS_BRACHII","DELTOID"}','{"Halteres","Banco"}',2,'https://www.youtube.com/watch?v=VmB1G1K7v94'),
  ('Supino Declinado','Enfase na porcao inferior do peitoral. Feito com barra ou halteres.','CHEST','{"PECTORALIS_MAJOR"}','{"Barra","Banco"}',2,'https://www.youtube.com/watch?v=OR8UeGcLaFY'),
  ('Crucifixo Inclinado','Isolamento do peitoral superior com halteres no banco inclinado.','CHEST','{"PECTORALIS_MAJOR"}','{"Halteres","Banco"}',2,'https://www.youtube.com/watch?v=eozdVDA78K0'),
  ('Pullover com Haltere','Trabalha peitoral e dorsal simultaneamente. Classico para expandir a caixa toracica.','CHEST','{"PECTORALIS_MAJOR","LATISSIMUS_DORSI"}','{"Haltere","Banco"}',2,'https://www.youtube.com/watch?v=FK4rHfGiMVQ'),
  ('Levantamento Terra','Exercicio composto principal. Recruta toda a cadeia posterior.','BACK','{"LATISSIMUS_DORSI","GLUTES","HAMSTRINGS","LOWER_BACK","TRAPEZIUS"}','{"Barra"}',3,'https://www.youtube.com/watch?v=op9kVnSso6Q'),
  ('Remada Sentada na Polia','Excelente para espessura de costas com tensao constante.','BACK','{"LATISSIMUS_DORSI","RHOMBOIDS","TRAPEZIUS"}','{"Cabo","Polia"}',1,'https://www.youtube.com/watch?v=UCXxvVItLoM'),
  ('Pulldown Triangulo','Puxada no cabo com triangulo. Enfatiza a parte inferior do latissimo do dorso.','BACK','{"LATISSIMUS_DORSI","BICEPS_BRACHII"}','{"Cabo","Triangulo"}',2,'https://www.youtube.com/watch?v=CAwf7n6Luuc'),
  ('Hiperextensao','Fortalece os eretores da espinha e lombar. Otimo para saude postural.','BACK','{"LOWER_BACK","GLUTES","HAMSTRINGS"}','{"Banco Romano"}',1,'https://www.youtube.com/watch?v=ph3pddpKzzw'),
  ('Remada Alta com Barra','Trabalha trapezio, deltoides posteriores e biceps.','BACK','{"TRAPEZIUS","DELTOID"}','{"Barra"}',2,'https://www.youtube.com/watch?v=oCiAhXBkNpA'),
  ('Desenvolvimento com Halteres','Permite maior amplitude que o desenvolvimento com barra. Trabalha os tres feixes do deltoide.','SHOULDERS','{"DELTOID"}','{"Halteres"}',2,'https://www.youtube.com/watch?v=qEwKCR5JCog'),
  ('Arnold Press','Variacao do desenvolvimento com rotacao do punho. Maior recrutamento do ombro.','SHOULDERS','{"DELTOID"}','{"Halteres"}',2,'https://www.youtube.com/watch?v=3ml7BH7mNwQ'),
  ('Encolhimento com Barra','Isolamento do trapezio superior. Fundamental para construcao da parte superior das costas.','SHOULDERS','{"TRAPEZIUS"}','{"Barra","Halteres"}',1,'https://www.youtube.com/watch?v=cJRVVxmytaM'),
  ('Elevacao Lateral no Cabo','Versao com cabo mantem tensao constante no deltoide lateral.','SHOULDERS','{"DELTOID"}','{"Cabo"}',2,'https://www.youtube.com/watch?v=3VcKaXpzqRo'),
  ('Rosca Concentrada','Isolamento maximo do biceps com cotovelo apoiado na coxa.','BICEPS','{"BICEPS_BRACHII"}','{"Haltere"}',1,'https://www.youtube.com/watch?v=Jvj2wV0vOYU'),
  ('Rosca na Polia','Tensao constante no biceps em todo o arco de movimento.','BICEPS','{"BICEPS_BRACHII"}','{"Cabo","Polia"}',1,'https://www.youtube.com/watch?v=NFzTWp2qpiE'),
  ('Rosca 21','Tecnica de alto volume: 7 reps metade inferior, 7 metade superior, 7 completas.','BICEPS','{"BICEPS_BRACHII"}','{"Barra"}',2,'https://www.youtube.com/watch?v=ykJmrZ5v0Oo'),
  ('Rosca com Barra W','A barra W reduz stress no pulso e permite pegada mais confortavel.','BICEPS','{"BICEPS_BRACHII","FOREARMS"}','{"Barra W"}',1,'https://www.youtube.com/watch?v=sAq_ocpRh_I'),
  ('Triceps Frances com Haltere','Isolamento da cabeca longa do triceps feito sentado ou deitado.','TRICEPS','{"TRICEPS_BRACHII"}','{"Haltere"}',2,'https://www.youtube.com/watch?v=SjlBjdq9kFI'),
  ('Triceps Coice (Kickback)','Extensao de triceps com haltere em flexao de tronco. Otimo para isolamento.','TRICEPS','{"TRICEPS_BRACHII"}','{"Haltere"}',1,'https://www.youtube.com/watch?v=6SS6K3lAwZ8'),
  ('Triceps no Banco','Usando o peso corporal entre dois bancos. Classico para volume de triceps.','TRICEPS','{"TRICEPS_BRACHII"}','{"Banco"}',1,'https://www.youtube.com/watch?v=0326dy_-CzM'),
  ('Abdominal Bicicleta','Um dos abdominais mais eficientes. Trabalha reto e obliquos com rotacao.','CORE','{"ABS","OBLIQUES"}','{}',1,'https://www.youtube.com/watch?v=9FGilxCbdz8'),
  ('Russian Twist','Rotacao de tronco que trabalha intensamente os obliquos.','CORE','{"ABS","OBLIQUES"}','{"Peso"}',2,'https://www.youtube.com/watch?v=DJQGX2j4IXo'),
  ('Elevacao de Pernas','Trabalha o reto abdominal inferior e flexores do quadril.','CORE','{"ABS","HIP_FLEXORS"}','{}',2,'https://www.youtube.com/watch?v=JB2oyawG9KI'),
  ('Prancha Lateral','Variacao da prancha com foco nos obliquos e quadrado lombar.','CORE','{"OBLIQUES","ABS"}','{}',2,'https://www.youtube.com/watch?v=pSHjTRCQxIw'),
  ('Abdominal Roda (Ab Wheel)','Um dos mais desafiadores para o core. Exige grande ativacao de todo o tronco.','CORE','{"ABS","OBLIQUES"}','{"Roda Abdominal"}',3,'https://www.youtube.com/watch?v=bWBJAhGMVAo'),
  ('Polichinelo','Exercicio cardio de baixo impacto. Perfeito para aquecimento ou circuito.','CARDIO','{}','{}',1,'https://www.youtube.com/watch?v=iSSAk4XCsRA'),
  ('Burpee','Exercicio de corpo inteiro de alta intensidade. Combina agachamento, flexao e salto.','CARDIO','{"GLUTES","QUADRICEPS","PECTORALIS_MAJOR","ABS"}','{}',3,'https://www.youtube.com/watch?v=dZgVxmf6jkA'),
  ('Corda Naval','Treino de alta intensidade para membros superiores e core. Excelente condicionamento.','CARDIO','{"DELTOID","TRAPEZIUS","ABS"}','{"Corda Naval"}',3,'https://www.youtube.com/watch?v=ypJ7kPCzLkM'),
  ('Agachamento com Press','Composto: agachamento mais desenvolvimento overhead. Pernas, core e ombros.','FULL_BODY','{"QUADRICEPS","DELTOID","GLUTES"}','{"Barra","Halteres"}',2,'https://www.youtube.com/watch?v=ultWZbUMPL8'),
  ('Thruster','Agachamento frontal mais desenvolvimento. Exercicio olimpico de potencia total.','FULL_BODY','{"QUADRICEPS","DELTOID","GLUTES","TRICEPS_BRACHII"}','{"Barra","Halteres"}',3,'https://www.youtube.com/watch?v=L219ltL15zk'),
  ('Swing com Kettlebell','Movimento explosivo de quadril. Treina cadeia posterior e condicionamento.','FULL_BODY','{"GLUTES","HAMSTRINGS","LOWER_BACK"}','{"Kettlebell"}',2,'https://www.youtube.com/watch?v=sSESeQAir2M'),
  ('Alongamento de Isquiotibiais','Essencial para flexibilidade posterior da coxa. Melhora postura e previne dores lombares.','MOBILITY','{"HAMSTRINGS"}','{}',1,NULL),
  ('Mobilizacao de Quadril','Movimentos circulares para soltar o quadril. Fundamental antes de treinos de pernas.','MOBILITY','{"HIP_FLEXORS","GLUTES"}','{}',1,NULL)
) AS t(name, description, category, "muscleGroups", equipment, difficulty, video_url)
WHERE NOT EXISTS (SELECT 1 FROM exercises e2 WHERE lower(e2.name) = lower(t.name));

SELECT COUNT(*) as total, SUM(CASE WHEN "isPublic" THEN 1 ELSE 0 END) as sistema FROM exercises;
