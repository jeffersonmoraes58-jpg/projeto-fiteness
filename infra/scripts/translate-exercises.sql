-- ============================================
-- TRADUÇÃO DE EXERCÍCIOS PARA PORTUGUÊS-BR
-- ============================================
-- Este script traduz nomes e descrições dos exercícios
-- usando substituições em cadeia (REPLACE aninhados)
-- ============================================

-- Primeiro, vamos criar uma função auxiliar para aplicar múltiplas substituições
CREATE OR REPLACE FUNCTION translate_exercise_name(name text) RETURNS text AS $$
DECLARE
  result text := name;
BEGIN
  -- Equipamentos/prefixos comuns
  result := REPLACE(result, 'Barbell ', 'Barra ');
  result := REPLACE(result, 'Dumbbell ', 'Halter ');
  result := REPLACE(result, 'Dumbbells ', 'Halteres ');
  result := REPLACE(result, 'Cable ', 'Polia ');
  result := REPLACE(result, 'Kettlebell ', 'Kettlebell ');
  result := REPLACE(result, 'Machine ', 'Máquina ');
  result := REPLACE(result, 'Smith Machine ', 'Smith ');
  result := REPLACE(result, 'Bench ', 'Banco ');
  result := REPLACE(result, 'Box ', 'Caixa ');
  result := REPLACE(result, 'Band ', 'Elástico ');
  result := REPLACE(result, 'Mini Band ', 'Mini Elástico ');
  result := REPLACE(result, 'Resistance Band ', 'Elástico de Resistência ');
  result := REPLACE(result, 'Medicine Ball ', 'Medicine Ball ');
  result := REPLACE(result, 'Bosu Ball ', 'Bosu ');
  result := REPLACE(result, 'TRX ', 'TRX ');
  result := REPLACE(result, 'Ez Bar ', 'Barra W ');
  result := REPLACE(result, 'Trap Bar ', 'Barra Hexagonal ');
  result := REPLACE(result, 'Vitruvian ', 'Vitruviano ');

  -- Verbos/ações principais
  result := REPLACE(result, ' Press', ' Pressão');
  result := REPLACE(result, 'Bench Press', 'Supino');
  result := REPLACE(result, 'Incline Bench Press', 'Supino Inclinado');
  result := REPLACE(result, 'Decline Bench Press', 'Supino Declinado');
  result := REPLACE(result, 'Overhead Press', 'Desenvolvimento');
  result := REPLACE(result, 'Shoulder Press', 'Desenvolvimento de Ombros');
  result := REPLACE(result, 'Arnold Press', 'Arnold Press');
  result := REPLACE(result, 'Military Press', 'Desenvolvimento Militar');
  result := REPLACE(result, 'Floor Press', 'Supino no Chão');

  result := REPLACE(result, ' Curl', ' Rosca');
  result := REPLACE(result, 'Hammer Curl', 'Rosca Martelo');
  result := REPLACE(result, 'Bayesian Curl', 'Rosca Bayesiana');
  result := REPLACE(result, 'Spider Curl', 'Rosca Spider');
  result := REPLACE(result, 'Preacher Curl', 'Rosca Scott');
  result := REPLACE(result, 'Concentration Curl', 'Rosca Concentrada');
  result := REPLACE(result, 'Incline Curl', 'Rosca Inclinada');
  result := REPLACE(result, 'Reverse Curl', 'Rosca Inversa');
  result := REPLACE(result, 'Zottman Curl', 'Rosca Zottman');
  result := REPLACE(result, 'Drag Curl', 'Rosca Drag');
  result := REPLACE(result, 'Cross Body Curl', 'Rosca Cruzada');

  result := REPLACE(result, ' Row', ' Remada');
  result := REPLACE(result, 'Bent Over Row', 'Remada Curvada');
  result := REPLACE(result, 'Seated Row', 'Remada Sentada');
  result := REPLACE(result, 'Upright Row', 'Remada Alta');
  result := REPLACE(result, 'T Bar Row', 'Remada T');
  result := REPLACE(result, 'Pendlay Row', 'Remada Pendlay');
  result := REPLACE(result, 'Meadows Row', 'Remada Meadows');
  result := REPLACE(result, 'Chest Supported Row', 'Remada Apoiada');

  result := REPLACE(result, ' Squat', ' Agachamento');
  result := REPLACE(result, 'Front Squat', 'Agachamento Frontal');
  result := REPLACE(result, 'Back Squat', 'Agachamento Costas');
  result := REPLACE(result, 'Goblet Squat', 'Agachamento Goblet');
  result := REPLACE(result, 'Bulgarian Split Squat', 'Agachamento Búlgaro');
  result := REPLACE(result, 'Hack Squat', 'Agachamento Hack');
  result := REPLACE(result, 'Zercher Squat', 'Agachamento Zercher');
  result := REPLACE(result, 'Pistol Squat', 'Agachamento Pistol');
  result := REPLACE(result, 'Overhead Squat', 'Agachamento com Barra Acima');

  result := REPLACE(result, ' Lunge', ' Afundo');
  result := REPLACE(result, 'Reverse Lunge', 'Afundo Reverso');
  result := REPLACE(result, 'Walking Lunge', 'Afundo Andando');
  result := REPLACE(result, 'Side Lunge', 'Afundo Lateral');
  result := REPLACE(result, 'Curtsy Lunge', 'Afundo Curtsy');
  result := REPLACE(result, 'Lateral Lunge', 'Afundo Lateral');

  result := REPLACE(result, 'Deadlift', 'Levantamento Terra');
  result := REPLACE(result, 'Romanian Deadlift', 'Levantamento Terra Romeno');
  result := REPLACE(result, 'Stiff Leg Deadlift', 'Levantamento Terra Perna Rígida');
  result := REPLACE(result, 'Sumo Deadlift', 'Levantamento Terra Sumô');
  result := REPLACE(result, 'Single Leg Deadlift', 'Levantamento Terra Unilateral');
  result := REPLACE(result, 'Trap Bar Deadlift', 'Levantamento Terra Barra Hexagonal');
  result := REPLACE(result, 'Rack Pull', 'Puxada do Rack');
  result := REPLACE(result, 'Snatch Grip Deadlift', 'Levantamento Terra Pegada Arranco');

  result := REPLACE(result, ' Pull Down', ' Puxada');
  result := REPLACE(result, 'Lat Pulldown', 'Puxada Alta');
  result := REPLACE(result, 'Pull Up', 'Barra Fixa');
  result := REPLACE(result, 'Chin Up', 'Barra Fixa Inversa');
  result := REPLACE(result, 'Pull Down', 'Puxada');
  result := REPLACE(result, 'Face Pull', 'Puxada Facial');

  result := REPLACE(result, ' Push Down', ' Tríceps');
  result := REPLACE(result, 'Push Down', 'Tríceps Polia');
  result := REPLACE(result, 'Push Up', 'Flexão');
  result := REPLACE(result, 'Pushups', 'Flexões');
  result := REPLACE(result, 'Dip', 'Mergulho');
  result := REPLACE(result, 'Dips', 'Mergulhos');

  result := REPLACE(result, ' Raise', ' Elevação');
  result := REPLACE(result, 'Lateral Raise', 'Elevação Lateral');
  result := REPLACE(result, 'Front Raise', 'Elevação Frontal');
  result := REPLACE(result, 'Rear Delt Raise', 'Elevação Posterior');
  result := REPLACE(result, 'Side Raise', 'Elevação Lateral');
  result := REPLACE(result, 'Calf Raise', 'Elevação de Panturrilha');
  result := REPLACE(result, 'Standing Calf Raise', 'Elevação de Panturrilha em Pé');
  result := REPLACE(result, 'Seated Calf Raise', 'Elevação de Panturrilha Sentado');
  result := REPLACE(result, 'Leg Raise', 'Elevação de Perna');

  result := REPLACE(result, ' Fly', ' Crucifixo');
  result := REPLACE(result, 'Flys', 'Crucifixo');
  result := REPLACE(result, 'Chest Fly', 'Crucifixo');
  result := REPLACE(result, 'Pec Fly', 'Crucifixo');
  result := REPLACE(result, 'Incline Fly', 'Crucifixo Inclinado');
  result := REPLACE(result, 'Decline Fly', 'Crucifixo Declinado');
  result := REPLACE(result, 'Reverse Fly', 'Crucifixo Inverso');

  result := REPLACE(result, ' Extension', ' Extensão');
  result := REPLACE(result, 'Tricep Extension', 'Extensão de Tríceps');
  result := REPLACE(result, 'Leg Extension', 'Extensão de Perna');
  result := REPLACE(result, 'Overhead Extension', 'Extensão por cima');
  result := REPLACE(result, 'Skull Crusher', 'Tríceps Testa');

  result := REPLACE(result, ' Crunch', ' Abdominal');
  result := REPLACE(result, 'Crunches', 'Abdominais');
  result := REPLACE(result, 'Reverse Crunch', 'Abdominal Reverso');
  result := REPLACE(result, 'Cable Crunch', 'Abdominal na Polia');
  result := REPLACE(result, 'Decline Crunch', 'Abdominal Declinado');

  result := REPLACE(result, ' Plank', ' Prancheta');
  result := REPLACE(result, 'Side Plank', 'Prancheta Lateral');
  result := REPLACE(result, 'Forearm Plank', 'Prancheta com Antebraço');

  result := REPLACE(result, ' Bridge', ' Ponte');
  result := REPLACE(result, 'Glute Bridge', 'Ponte de Glúteo');
  result := REPLACE(result, 'Hip Thrust', 'Elevação Pélvica');
  result := REPLACE(result, 'Single Leg Bridge', 'Ponte Unilateral');

  result := REPLACE(result, ' Kickback', ' Extensão');
  result := REPLACE(result, 'Tricep Kickback', 'Tríceps Coice');

  result := REPLACE(result, ' Shrug', ' Encolhimento');
  result := REPLACE(result, 'Dumbbell Shrug', 'Encolhimento com Halteres');
  result := REPLACE(result, 'Barbell Shrug', 'Encolhimento com Barra');

  result := REPLACE(result, ' Leg Curl', ' Flexão de Perna');
  result := REPLACE(result, 'Leg Curl', 'Flexão de Perna');
  result := REPLACE(result, 'Lying Leg Curl', 'Flexão de Perna Deitado');
  result := REPLACE(result, 'Seated Leg Curl', 'Flexão de Perna Sentado');

  result := REPLACE(result, ' Leg Press', ' Leg Press');
  result := REPLACE(result, 'Leg Press', 'Leg Press');

  result := REPLACE(result, ' Hip Abduction', ' Abdução de Quadril');
  result := REPLACE(result, 'Hip Abduction', 'Abdução de Quadril');
  result := REPLACE(result, 'Hip Adduction', 'Adução de Quadril');
  result := REPLACE(result, 'Hip Flexion', 'Flexão de Quadril');
  result := REPLACE(result, 'Hip Extension', 'Extensão de Quadril');

  result := REPLACE(result, 'Abductor', 'Abdutor');
  result := REPLACE(result, 'Adductor', 'Adutor');

  -- Partes do corpo
  result := REPLACE(result, 'Chest', 'Peito');
  result := REPLACE(result, 'Shoulder', 'Ombro');
  result := REPLACE(result, 'Shoulders', 'Ombros');
  result := REPLACE(result, 'Back', 'Costas');
  result := REPLACE(result, 'Leg', 'Perna');
  result := REPLACE(result, 'Legs', 'Pernas');
  result := REPLACE(result, 'Arm', 'Braço');
  result := REPLACE(result, 'Arms', 'Braços');
  result := REPLACE(result, 'Bicep', 'Bíceps');
  result := REPLACE(result, 'Biceps', 'Bíceps');
  result := REPLACE(result, 'Tricep', 'Tríceps');
  result := REPLACE(result, 'Triceps', 'Tríceps');
  result := REPLACE(result, 'Forearm', 'Antebraço');
  result := REPLACE(result, 'Forearms', 'Antebraços');
  result := REPLACE(result, 'Glute', 'Glúteo');
  result := REPLACE(result, 'Glutes', 'Glúteos');
  result := REPLACE(result, 'Hamstring', 'Posterior');
  result := REPLACE(result, 'Hamstrings', 'Posteriores');
  result := REPLACE(result, 'Quadriceps', 'Quadríceps');
  result := REPLACE(result, 'Quad', 'Quadríceps');
  result := REPLACE(result, 'Quads', 'Quadríceps');
  result := REPLACE(result, 'Calf', 'Panturrilha');
  result := REPLACE(result, 'Calves', 'Panturrilhas');
  result := REPLACE(result, 'Ab', 'Abdominal');
  result := REPLACE(result, 'Abs', 'Abdominais');
  result := REPLACE(result, 'Abdominal', 'Abdominal');
  result := REPLACE(result, 'Abdominals', 'Abdominais');
  result := REPLACE(result, 'Oblique', 'Oblíquo');
  result := REPLACE(result, 'Obliques', 'Oblíquos');
  result := REPLACE(result, 'Lat', 'Latíssimo');
  result := REPLACE(result, 'Lats', 'Latíssimos');
  result := REPLACE(result, 'Trap', 'Trapézio');
  result := REPLACE(result, 'Traps', 'Trapézios');
  result := REPLACE(result, 'Deltoid', 'Deltóide');
  result := REPLACE(result, 'Pec', 'Peitoral');
  result := REPLACE(result, 'Pectoralis', 'Peitoral');

  -- Outros termos comuns
  result := REPLACE(result, 'Stretch', 'Alongamento');
  result := REPLACE(result, 'Stretching', 'Alongamento');
  result := REPLACE(result, 'Warm Up', 'Aquecimento');
  result := REPLACE(result, 'Cool Down', 'Desaquecimento');
  result := REPLACE(result, 'Mobility', 'Mobilidade');
  result := REPLACE(result, 'Flexibility', 'Flexibilidade');
  result := REPLACE(result, 'Recovery', 'Recuperação');
  result := REPLACE(result, 'Foam Rolling', 'Liberação Miofascial');
  result := REPLACE(result, 'Massage', 'Massagem');
  result := REPLACE(result, 'Yoga', 'Yoga');
  result := REPLACE(result, 'Pilates', 'Pilates');
  result := REPLACE(result, 'Cardio', 'Cardio');
  result := REPLACE(result, 'Jump', 'Salto');
  result := REPLACE(result, 'Jumping', 'Saltando');
  result := REPLACE(result, 'Hop', 'Pulo');
  result := REPLACE(result, 'Skip', 'Skip');
  result := REPLACE(result, 'Sprint', 'Sprint');
  result := REPLACE(result, 'Run', 'Corrida');
  result := REPLACE(result, 'Running', 'Corrida');
  result := REPLACE(result, 'Walk', 'Caminhada');
  result := REPLACE(result, 'Walking', 'Caminhando');
  result := REPLACE(result, 'March', 'Marcha');
  result := REPLACE(result, 'Step', 'Passo');
  result := REPLACE(result, 'Step Up', 'Subida');
  result := REPLACE(result, 'Step Down', 'Descida');
  result := REPLACE(result, 'Climb', 'Escalada');
  result := REPLACE(result, 'Climber', 'Escalador');
  result := REPLACE(result, 'Twist', 'Torção');
  result := REPLACE(result, 'Rotation', 'Rotação');
  result := REPLACE(result, 'Rotate', 'Rotacionar');
  result := REPLACE(result, 'Swing', 'Balanço');
  result := REPLACE(result, 'Throw', 'Arremesso');
  result := REPLACE(result, 'Toss', 'Lançamento');
  result := REPLACE(result, 'Slam', 'Batida');
  result := REPLACE(result, 'Chop', 'Corte');
  result := REPLACE(result, 'Wood Chop', 'Corte de Lenha');
  result := REPLACE(result, 'Hold', 'Isometria');
  result := REPLACE(result, 'Static', 'Estático');
  result := REPLACE(result, 'Isometric', 'Isométrico');
  result := REPLACE(result, 'Alternating', 'Alternado');
  result := REPLACE(result, 'Single Leg', 'Unilateral');
  result := REPLACE(result, 'Single Arm', 'Unilateral');
  result := REPLACE(result, 'One Arm', 'Um Braço');
  result := REPLACE(result, 'One Leg', 'Uma Perna');
  result := REPLACE(result, 'Double', 'Duplo');
  result := REPLACE(result, 'Triple', 'Triplo');
  result := REPLACE(result, 'Lying', 'Deitado');
  result := REPLACE(result, 'Seated', 'Sentado');
  result := REPLACE(result, 'Standing', 'Em Pé');
  result := REPLACE(result, 'Kneeling', 'Ajoelhado');
  result := REPLACE(result, 'Prone', 'Pronado');
  result := REPLACE(result, 'Supine', 'Supino');
  result := REPLACE(result, 'Side Lying', 'Deitado Lateral');
  result := REPLACE(result, 'Four Point', 'Quadrúpede');
  result := REPLACE(result, 'All Fours', 'Quadrúpede');
  result := REPLACE(result, 'Incline', 'Inclinado');
  result := REPLACE(result, 'Decline', 'Declinado');
  result := REPLACE(result, 'Flat', 'Reto');
  result := REPLACE(result, 'Vertical', 'Vertical');
  result := REPLACE(result, 'Horizontal', 'Horizontal');
  result := REPLACE(result, 'Diagonal', 'Diagonal');
  result := REPLACE(result, 'Narrow', 'Estreito');
  result := REPLACE(result, 'Wide', 'Largo');
  result := REPLACE(result, 'Close Grip', 'Pega Fechada');
  result := REPLACE(result, 'Wide Grip', 'Pega Larga');
  result := REPLACE(result, 'Reverse Grip', 'Pega Inversa');
  result := REPLACE(result, 'Neutral Grip', 'Pega Neutra');
  result := REPLACE(result, 'Underhand', 'Supinada');
  result := REPLACE(result, 'Overhand', 'Pronada');
  result := REPLACE(result, 'Palm', 'Palma');
  result := REPLACE(result, 'Facing', 'Virado');
  result := REPLACE(result, 'Forward', 'Frente');
  result := REPLACE(result, 'Backward', 'Trás');
  result := REPLACE(result, 'Upward', 'Cima');
  result := REPLACE(result, 'Downward', 'Baixo');
  result := REPLACE(result, 'Front', 'Frente');
  result := REPLACE(result, 'Rear', 'Posterior');
  result := REPLACE(result, 'Side', 'Lateral');
  result := REPLACE(result, 'Lateral', 'Lateral');
  result := REPLACE(result, 'Medial', 'Medial');
  result := REPLACE(result, 'Internal', 'Interno');
  result := REPLACE(result, 'External', 'Externo');
  result := REPLACE(result, 'Inner', 'Interno');
  result := REPLACE(result, 'Outer', 'Externo');
  result := REPLACE(result, 'Upper', 'Superior');
  result := REPLACE(result, 'Lower', 'Inferior');
  result := REPLACE(result, 'Top', 'Topo');
  result := REPLACE(result, 'Bottom', 'Fundo');
  result := REPLACE(result, 'Mid', 'Médio');
  result := REPLACE(result, 'Middle', 'Médio');
  result := REPLACE(result, 'Center', 'Centro');
  result := REPLACE(result, 'Straight', 'Reto');
  result := REPLACE(result, 'Bent', 'Curvado');
  result := REPLACE(result, 'Flexed', 'Flexionado');
  result := REPLACE(result, 'Extended', 'Estendido');
  result := REPLACE(result, 'Bend', 'Curvar');
  result := REPLACE(result, 'Lean', 'Inclinar');
  result := REPLACE(result, 'Tilt', 'Inclinar');
  result := REPLACE(result, 'Rotate', 'Girar');
  result := REPLACE(result, 'Turn', 'Virar');
  result := REPLACE(result, 'Lift', 'Levantar');
  result := REPLACE(result, 'Lower', 'Abaixar');
  result := REPLACE(result, 'Raise', 'Elevar');
  result := REPLACE(result, 'Drop', 'Soltar');
  result := REPLACE(result, 'Push', 'Empurrar');
  result := REPLACE(result, 'Pull', 'Puxar');
  result := REPLACE(result, 'Press', 'Pressionar');
  result := REPLACE(result, 'Squeeze', 'Contrair');
  result := REPLACE(result, 'Contract', 'Contrair');
  result := REPLACE(result, 'Relax', 'Relaxar');
  result := REPLACE(result, 'Breathe', 'Respirar');
  result := REPLACE(result, 'Exhale', 'Expirar');
  result := REPLACE(result, 'Inhale', 'Inspirar');
  result := REPLACE(result, 'Slowly', 'Lentamente');
  result := REPLACE(result, 'Quickly', 'Rapidamente');
  result := REPLACE(result, 'Fast', 'Rápido');
  result := REPLACE(result, 'Slow', 'Lento');
  result := REPLACE(result, 'Controlled', 'Controlado');
  result := REPLACE(result, 'Explosive', 'Explosivo');
  result := REPLACE(result, 'Power', 'Potência');
  result := REPLACE(result, 'Strength', 'Força');
  result := REPLACE(result, 'Endurance', 'Resistência');
  result := REPLACE(result, 'Balance', 'Equilíbrio');
  result := REPLACE(result, 'Stability', 'Estabilidade');
  result := REPLACE(result, 'Coordination', 'Coordenação');
  result := REPLACE(result, 'Agility', 'Agilidade');
  result := REPLACE(result, 'Speed', 'Velocidade');
  result := REPLACE(result, 'Plyometric', 'Pliométrico');
  result := REPLACE(result, 'Isometric', 'Isométrico');
  result := REPLACE(result, 'Concentric', 'Concêntrico');
  result := REPLACE(result, 'Eccentric', 'Excêntrico');
  result := REPLACE(result, 'Tempo', 'Tempo');
  result := REPLACE(result, 'Pause', 'Pausa');
  result := REPLACE(result, 'Rest', 'Descanso');
  result := REPLACE(result, 'Circuit', 'Circuito');
  result := REPLACE(result, 'Set', 'Série');
  result := REPLACE(result, 'Rep', 'Repetição');
  result := REPLACE(result, 'Reps', 'Repetições');
  result := REPLACE(result, 'Max', 'Máximo');
  result := REPLACE(result, 'Minimum', 'Mínimo');
  result := REPLACE(result, 'Average', 'Médio');
  result := REPLACE(result, 'Total', 'Total');
  result := REPLACE(result, 'Partial', 'Parcial');
  result := REPLACE(result, 'Full', 'Completo');
  result := REPLACE(result, 'Range', 'Amplitude');
  result := REPLACE(result, 'Motion', 'Movimento');
  result := REPLACE(result, 'Movement', 'Movimento');
  result := REPLACE(result, 'Position', 'Posição');
  result := REPLACE(result, 'Angle', 'Ângulo');
  result := REPLACE(result, 'Height', 'Altura');
  result := REPLACE(result, 'Depth', 'Profundidade');
  result := REPLACE(result, 'Width', 'Largura');
  result := REPLACE(result, 'Length', 'Comprimento');
  result := REPLACE(result, 'Distance', 'Distância');
  result := REPLACE(result, 'Direction', 'Direção');
  result := REPLACE(result, 'Pattern', 'Padrão');
  result := REPLACE(result, 'Form', 'Forma');
  result := REPLACE(result, 'Technique', 'Técnica');
  result := REPLACE(result, 'Style', 'Estilo');
  result := REPLACE(result, 'Method', 'Método');
  result := REPLACE(result, 'Way', 'Modo');
  result := REPLACE(result, 'Type', 'Tipo');
  result := REPLACE(result, 'Variation', 'Variação');
  result := REPLACE(result, 'Version', 'Versão');
  result := REPLACE(result, 'Alternative', 'Alternativa');
  result := REPLACE(result, 'Option', 'Opção');
  result := REPLACE(result, 'Beginner', 'Iniciante');
  result := REPLACE(result, 'Intermediate', 'Intermediário');
  result := REPLACE(result, 'Advanced', 'Avançado');
  result := REPLACE(result, 'Expert', 'Expert');
  result := REPLACE(result, 'Novice', 'Novato');
  result := REPLACE(result, 'Pro', 'Profissional');
  result := REPLACE(result, 'Basic', 'Básico');
  result := REPLACE(result, 'Simple', 'Simples');
  result := REPLACE(result, 'Complex', 'Complexo');
  result := REPLACE(result, 'Easy', 'Fácil');
  result := REPLACE(result, 'Hard', 'Difícil');
  result := REPLACE(result, 'Heavy', 'Pesado');
  result := REPLACE(result, 'Light', 'Leve');
  result := REPLACE(result, 'Moderate', 'Moderado');
  result := REPLACE(result, 'Intense', 'Intenso');
  result := REPLACE(result, 'Gentle', 'Suave');
  result := REPLACE(result, 'Dynamic', 'Dinâmico');
  result := REPLACE(result, 'Static', 'Estático');
  result := REPLACE(result, 'Active', 'Ativo');
  result := REPLACE(result, 'Passive', 'Passivo');
  result := REPLACE(result, 'Assisted', 'Assistido');
  result := REPLACE(result, 'Unassisted', 'Sem Assistência');
  result := REPLACE(result, 'Supported', 'Apoiado');
  result := REPLACE(result, 'Unsupported', 'Sem Apoio');
  result := REPLACE(result, 'Weighted', 'Com Peso');
  result := REPLACE(result, 'Unweighted', 'Sem Peso');
  result := REPLACE(result, 'Loaded', 'Carregado');
  result := REPLACE(result, 'Unloaded', 'Descarregado');
  result := REPLACE(result, 'Bodyweight', 'Peso Corporal');
  result := REPLACE(result, 'Free Weight', 'Peso Livre');
  result := REPLACE(result, 'Plate Loaded', 'Com Anilhas');
  result := REPLACE(result, 'Selectorized', 'Selecionado');
  result := REPLACE(result, 'Lever', 'Alavanca');
  result := REPLACE(result, 'Pulley', 'Polia');
  result := REPLACE(result, 'Chain', 'Corrente');
  result := REPLACE(result, 'Rope', 'Corda');
  result := REPLACE(result, 'Handle', 'Pega');
  result := REPLACE(result, 'Bar', 'Barra');
  result := REPLACE(result, 'V Bar', 'Barra V');
  result := REPLACE(result, 'Straight Bar', 'Barra Reta');
  result := REPLACE(result, 'EZ Bar', 'Barra W');
  result := REPLACE(result, 'Swiss Bar', 'Barra Suíça');
  result := REPLACE(result, 'Trap Bar', 'Barra Hexagonal');
  result := REPLACE(result, 'Safety Bar', 'Barra de Segurança');
  result := REPLACE(result, 'Cambered Bar', 'Barra Curvada');
  result := REPLACE(result, 'Axle Bar', 'Barra Eixo');
  result := REPLACE(result, 'Log', 'Tora');
  result := REPLACE(result, 'Sled', 'Sled');
  result := REPLACE(result, 'Prowler', 'Prowler');
  result := REPLACE(result, 'Tire', 'Pneu');
  result := REPLACE(result, 'Sledgehammer', 'Marreta');
  result := REPLACE(result, 'Sandbag', 'Saco de Areia');
  result := REPLACE(result, 'Bag', 'Saco');
  result := REPLACE(result, 'Ball', 'Bola');
  result := REPLACE(result, 'Wall Ball', 'Wall Ball');
  result := REPLACE(result, 'Stability Ball', 'Bola Suíça');
  result := REPLACE(result, 'Swiss Ball', 'Bola Suíça');
  result := REPLACE(result, 'Exercise Ball', 'Bola de Exercício');
  result := REPLACE(result, 'Physioball', 'Bola Suíça');
  result := REPLACE(result, 'Foam Roller', 'Rolo de Liberação');
  result := REPLACE(result, 'Massage Ball', 'Bola de Massagem');
  result := REPLACE(result, 'Lacrosse Ball', 'Bola de Lacrosse');
  result := REPLACE(result, 'Tennis Ball', 'Bola de Tênis');
  result := REPLACE(result, 'Step', 'Step');
  result := REPLACE(result, 'Box', 'Caixa');
  result := REPLACE(result, 'Plyo Box', 'Caixa Pliométrica');
  result := REPLACE(result, 'Bench', 'Banco');
  result := REPLACE(result, 'Chair', 'Cadeira');
  result := REPLACE(result, 'Stool', 'Banco');
  result := REPLACE(result, 'Table', 'Mesa');
  result := REPLACE(result, 'Wall', 'Parede');
  result := REPLACE(result, 'Floor', 'Chão');
  result := REPLACE(result, 'Ground', 'Solo');
  result := REPLACE(result, 'Mat', 'Tapete');
  result := REPLACE(result, 'Towel', 'Toalha');
  result := REPLACE(result, 'Pad', 'Almofada');
  result := REPLACE(result, 'Cushion', 'Almofada');
  result := REPLACE(result, 'Pillow', 'Travesseiro');
  result := REPLACE(result, 'Block', 'Bloco');
  result := REPLACE(result, 'Plate', 'Anilha');
  result := REPLACE(result, 'Weight', 'Peso');
  result := REPLACE(result, 'Weights', 'Pesos');
  result := REPLACE(result, 'Load', 'Carga');
  result := REPLACE(result, 'Resistance', 'Resistência');
  result := REPLACE(result, 'Tension', 'Tensão');
  result := REPLACE(result, 'Force', 'Força');
  result := REPLACE(result, 'Torque', 'Torque');
  result := REPLACE(result, 'Momentum', 'Momentum');
  result := REPLACE(result, 'Inertia', 'Inércia');
  result := REPLACE(result, 'Gravity', 'Gravidade');
  result := REPLACE(result, 'Leverage', 'Alavancagem');
  result := REPLACE(result, 'Mechanical Advantage', 'Vantagem Mecânica');

  -- Frog, Bear, Crab, etc (animais/poses)
  result := REPLACE(result, 'Frog', 'Sapo');
  result := REPLACE(result, 'Bear', 'Urso');
  result := REPLACE(result, 'Crab', 'Caranguejo');
  result := REPLACE(result, 'Bird', 'Pássaro');
  result := REPLACE(result, 'Dog', 'Cachorro');
  result := REPLACE(result, 'Cat', 'Gato');
  result := REPLACE(result, 'Cow', 'Vaca');
  result := REPLACE(result, 'Horse', 'Cavalo');
  result := REPLACE(result, 'Donkey', 'Burro');
  result := REPLACE(result, 'Monkey', 'Macaco');
  result := REPLACE(result, 'Gorilla', 'Gorila');
  result := REPLACE(result, 'Chimpanzee', 'Chimpanzé');
  result := REPLACE(result, 'Spider', 'Aranha');
  result := REPLACE(result, 'Scorpion', 'Escorpião');
  result := REPLACE(result, 'Snake', 'Cobra');
  result := REPLACE(result, 'Dragon', 'Dragão');
  result := REPLACE(result, 'Tiger', 'Tigre');
  result := REPLACE(result, 'Lion', 'Leão');
  result := REPLACE(result, 'Elephant', 'Elefante');
  result := REPLACE(result, 'Giraffe', 'Girafa');
  result := REPLACE(result, 'Kangaroo', 'Canguru');
  result := REPLACE(result, 'Penguin', 'Pinguim');
  result := REPLACE(result, 'Duck', 'Pato');
  result := REPLACE(result, 'Eagle', 'Águia');
  result := REPLACE(result, 'Hawk', 'Falcão');
  result := REPLACE(result, 'Crow', 'Corvo');
  result := REPLACE(result, 'Flamingo', 'Flamingo');
  result := REPLACE(result, 'Peacock', 'Pavão');

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- APLICAR TRADUÇÃO AOS NOMES DOS EXERCÍCIOS
-- ============================================

-- Atualizar nomes
UPDATE exercises 
SET name = translate_exercise_name(name)
WHERE isPublic = true AND trainerId IS NULL;

-- Atualizar descrições (substituições básicas)
UPDATE exercises
SET description = REPLACE(description, 'Lay on', 'Deite-se em')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Stand upright', 'Fique em pé')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Stand with', 'Fique com')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Sit on', 'Sente-se em')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Kneel on', 'Ajoelhe-se em')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Lie on', 'Deite-se em')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Lie face', 'Deite-se de')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Place your', 'Coloque sua(s)')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Keep your', 'Mantenha sua(s)')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Hold for', 'Segure por')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Repeat for', 'Repita por')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Repeat on', 'Repita do')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Return to', 'Retorne à')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Slowly', 'Lentamente')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Gently', 'Suavemente')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Firmly', 'Firmemente')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Breathe', 'Respire')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Exhale', 'Expire')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Inhale', 'Inspire')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'your feet', 'seus pés')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'your hands', 'suas mãos')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'your arms', 'seus braços')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'your legs', 'suas pernas')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'your knees', 'seus joelhos')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'your hips', 'seus quadris')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'your back', 'suas costas')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'your head', 'sua cabeça')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'your shoulders', 'seus ombros')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'your elbows', 'seus cotovelos')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'your wrists', 'seus punhos')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'your chest', 'seu peito')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'your core', 'seu core')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'the floor', 'o chão')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'the ground', 'o solo')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'the wall', 'a parede')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'the bench', 'o banco')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'the starting position', 'a posição inicial')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'the desired', 'a quantidade desejada')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Repeat', 'Repita')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Switch sides', 'Troque de lado')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Switch legs', 'Troque de perna')
WHERE isPublic = true AND trainerId IS NULL;

UPDATE exercises
SET description = REPLACE(description, 'Switch arms', 'Troque de braço')
WHERE isPublic = true AND trainerId IS NULL;

-- Copiar descrição para instructions
UPDATE exercises
SET instructions = description
WHERE isPublic = true AND trainerId IS NULL;

-- ============================================
-- VERIFICAR RESULTADO
-- ============================================
SELECT 'Tradução concluída!' as status;
SELECT COUNT(*) as total_exercises_traduzidos FROM exercises WHERE isPublic = true AND trainerId IS NULL;
SELECT name FROM exercises LIMIT 10;
 