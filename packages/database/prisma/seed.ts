import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// GIF URLs for public exercises (Google Drive / CDN)
// Substitua 'SEU_ID_AQUI' pelos IDs reais dos seus GIFs
const EXERCISE_GIFS: Record<string, string> = {
  'Supino Reto':          'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Supino Inclinado':     'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Crucifixo':            'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Crossover':            'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Flexão de Braço':      'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Puxada Frontal':       'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Remada Curvada':       'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Remada Unilateral':    'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Barra Fixa':           'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Desenvolvimento com Barra': 'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Elevação Lateral':     'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Elevação Frontal':     'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Rosca Direta':         'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Rosca Alternada':      'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Rosca Martelo':        'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Tríceps Corda':        'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Tríceps Testa':        'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Mergulho (Tríceps)':   'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Agachamento Livre':    'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Leg Press 45°':        'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Cadeira Extensora':    'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Cadeira Flexora':      'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Stiff':                'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Panturrilha em Pé':    'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Abdômen Crunch':       'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Prancha':              'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Esteira':              'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
  'Bicicleta Ergométrica':'https://drive.google.com/uc?export=view&id=SEU_ID_AQUI',
};


async function main() {
  console.log('Seeding database...');

  // Create demo tenant
  let tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-studio' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: 'Demo Studio', slug: 'demo-studio', isActive: true },
    });
    await prisma.tenantSubscription.create({
      data: { tenantId: tenant.id, plan: 'PRO', status: 'ACTIVE' },
    });
  }

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  async function upsertUser(email: string, password: string, role: any, firstName: string, lastName: string) {
    const existing = await prisma.user.findFirst({ where: { email, tenantId: tenant!.id } });
    if (existing) return existing;
    return prisma.user.create({
      data: {
        email,
        password: await hash(password),
        role,
        tenantId: tenant!.id,
        isActive: true,
        emailVerified: true,
        profile: { create: { firstName, lastName } },
      },
    });
  }

  // Admin
  const admin = await upsertUser('admin@fitsaas.com', 'Admin@123', 'ADMIN', 'Admin', 'FitSaaS');

  // Trainer
  const trainerUser = await upsertUser('trainer@demo.com', 'Trainer@123', 'TRAINER', 'João', 'Trainer');
  await prisma.trainer.upsert({
    where: { userId: trainerUser.id },
    update: {},
    create: { userId: trainerUser.id, specialties: ['Musculação', 'Funcional'] },
  });

  // Nutritionist
  const nutriUser = await upsertUser('nutri@demo.com', 'Nutri@123', 'NUTRITIONIST', 'Maria', 'Nutricionista');
  await prisma.nutritionist.upsert({
    where: { userId: nutriUser.id },
    update: {},
    create: { userId: nutriUser.id, specialties: ['Nutrição Esportiva', 'Emagrecimento'] },
  });

  // Student
  const studentUser = await upsertUser('student@demo.com', 'Student@123', 'STUDENT', 'Pedro', 'Aluno');
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: { userId: studentUser.id, points: 120, streak: 5, level: 2 },
  });

  const trainer = await prisma.trainer.findUnique({ where: { userId: trainerUser.id } });
  const nutri = await prisma.nutritionist.findUnique({ where: { userId: nutriUser.id } });

  if (trainer) {
    await prisma.trainerStudent.upsert({
      where: { trainerId_studentId: { trainerId: trainer.id, studentId: student.id } },
      update: {},
      create: { trainerId: trainer.id, studentId: student.id, monthlyFee: 300 },
    });
  }
  if (nutri) {
    await prisma.nutritionistPatient.upsert({
      where: { nutritionistId_studentId: { nutritionistId: nutri.id, studentId: student.id } },
      update: {},
      create: { nutritionistId: nutri.id, studentId: student.id, monthlyFee: 200 },
    });
  }

  // ─── Exercises (public) ───────────────────────────────────────────────────────
  const exercisesData = [
    { name: 'Supino Reto',          category: 'CHEST' as any,     muscleGroups: ['PECTORALIS_MAJOR' as any],                                    equipment: ['Barra', 'Banco'],           difficulty: 2 },
    { name: 'Supino Inclinado',     category: 'CHEST' as any,     muscleGroups: ['PECTORALIS_MAJOR' as any],                                    equipment: ['Barra', 'Banco Inclinado'], difficulty: 2 },
    { name: 'Crucifixo',            category: 'CHEST' as any,     muscleGroups: ['PECTORALIS_MAJOR' as any],                                    equipment: ['Halteres', 'Banco'],        difficulty: 2 },
    { name: 'Crossover',            category: 'CHEST' as any,     muscleGroups: ['PECTORALIS_MAJOR' as any],                                    equipment: ['Cabo'],                     difficulty: 1 },
    { name: 'Flexão de Braço',      category: 'CHEST' as any,     muscleGroups: ['PECTORALIS_MAJOR' as any, 'TRICEPS_BRACHII' as any],          equipment: ['Peso Corporal'],            difficulty: 1 },
    { name: 'Puxada Frontal',       category: 'BACK' as any,      muscleGroups: ['LATISSIMUS_DORSI' as any],                                    equipment: ['Polia', 'Barra'],           difficulty: 2 },
    { name: 'Remada Curvada',       category: 'BACK' as any,      muscleGroups: ['LATISSIMUS_DORSI' as any, 'RHOMBOIDS' as any],                equipment: ['Barra'],                    difficulty: 3 },
    { name: 'Remada Unilateral',    category: 'BACK' as any,      muscleGroups: ['LATISSIMUS_DORSI' as any],                                    equipment: ['Halter', 'Banco'],          difficulty: 2 },
    { name: 'Barra Fixa',           category: 'BACK' as any,      muscleGroups: ['LATISSIMUS_DORSI' as any, 'BICEPS_BRACHII' as any],           equipment: ['Barra Fixa'],               difficulty: 3 },
    { name: 'Development com Barra',category: 'SHOULDERS' as any, muscleGroups: ['DELTOID' as any],                                             equipment: ['Barra'],                    difficulty: 3 },
    { name: 'Elevação Lateral',     category: 'SHOULDERS' as any, muscleGroups: ['DELTOID' as any],                                             equipment: ['Halteres'],                 difficulty: 1 },
    { name: 'Elevação Frontal',     category: 'SHOULDERS' as any, muscleGroups: ['DELTOID' as any],                                             equipment: ['Halteres'],                 difficulty: 1 },
    { name: 'Rosca Direta',         category: 'BICEPS' as any,    muscleGroups: ['BICEPS_BRACHII' as any],                                      equipment: ['Barra'],                    difficulty: 1 },
    { name: 'Rosca Alternada',      category: 'BICEPS' as any,    muscleGroups: ['BICEPS_BRACHII' as any],                                      equipment: ['Halteres'],                 difficulty: 1 },
    { name: 'Rosca Martelo',        category: 'BICEPS' as any,    muscleGroups: ['BICEPS_BRACHII' as any, 'FOREARMS' as any],                   equipment: ['Halteres'],                 difficulty: 1 },
    { name: 'Tríceps Corda',        category: 'TRICEPS' as any,   muscleGroups: ['TRICEPS_BRACHII' as any],                                     equipment: ['Cabo'],                     difficulty: 1 },
    { name: 'Tríceps Testa',        category: 'TRICEPS' as any,   muscleGroups: ['TRICEPS_BRACHII' as any],                                     equipment: ['Barra', 'Banco'],           difficulty: 2 },
    { name: 'Mergulho (Tríceps)',   category: 'TRICEPS' as any,   muscleGroups: ['TRICEPS_BRACHII' as any],                                     equipment: ['Barras Paralelas'],         difficulty: 2 },
    { name: 'Agachamento Livre',    category: 'LEGS' as any,      muscleGroups: ['QUADRICEPS' as any, 'GLUTES' as any],                         equipment: ['Barra'],                    difficulty: 3 },
    { name: 'Leg Press 45°',        category: 'LEGS' as any,      muscleGroups: ['QUADRICEPS' as any, 'GLUTES' as any],                         equipment: ['Máquina'],                  difficulty: 2 },
    { name: 'Cadeira Extensora',    category: 'LEGS' as any,      muscleGroups: ['QUADRICEPS' as any],                                          equipment: ['Máquina'],                  difficulty: 1 },
    { name: 'Cadeira Flexora',      category: 'LEGS' as any,      muscleGroups: ['HAMSTRINGS' as any],                                          equipment: ['Máquina'],                  difficulty: 1 },
    { name: 'Stiff',                category: 'LEGS' as any,      muscleGroups: ['HAMSTRINGS' as any, 'GLUTES' as any],                         equipment: ['Barra'],                    difficulty: 2 },
    { name: 'Panturrilha em Pé',    category: 'LEGS' as any,      muscleGroups: ['CALVES' as any],                                              equipment: ['Máquina'],                  difficulty: 1 },
    { name: 'Abdômen Crunch',       category: 'CORE' as any,      muscleGroups: ['ABS' as any],                                                 equipment: ['Peso Corporal'],            difficulty: 1 },
    { name: 'Prancha',              category: 'CORE' as any,      muscleGroups: ['ABS' as any, 'OBLIQUES' as any],                              equipment: ['Peso Corporal'],            difficulty: 1 },
    { name: 'Esteira',              category: 'CARDIO' as any,    muscleGroups: [],                                                             equipment: ['Esteira'],                  difficulty: 1 },
    { name: 'Bicicleta Ergométrica',category: 'CARDIO' as any,    muscleGroups: [],                                                             equipment: ['Bicicleta'],                difficulty: 1 },
  ];

  for (const ex of exercisesData) {
    const exists = await prisma.exercise.findFirst({ where: { name: ex.name, trainerId: null } });
    const gifUrl = EXERCISE_GIFS[ex.name] ?? null;
    if (!exists) {
      await prisma.exercise.create({ data: { ...ex, isPublic: true, gifUrl } });
    } else if (gifUrl && !exists.gifUrl) {
      await prisma.exercise.update({ where: { id: exists.id }, data: { gifUrl } });
    }
  }


  // ─── Demo workout plans (only if student has none yet) ────────────────────────
  const existingPlan = await prisma.workoutPlan.findFirst({
    where: { studentId: student.id, isActive: true },
  });

  if (!existingPlan && trainer) {
    const ex = (name: string) =>
      prisma.exercise.findFirst({ where: { name, trainerId: null } });

    // Treino A – Peito & Bíceps  (Seg, Qua, Sex)
    const workoutA = await prisma.workout.create({
      data: {
        trainerId: trainer.id,
        name: 'Treino A – Peito & Bíceps',
        status: 'ACTIVE' as any,
        level: 2,
        duration: 60,
      },
    });

    const [supino, crucifixo, rosca, roscaAlt] = await Promise.all([
      ex('Supino Reto'), ex('Crucifixo'), ex('Rosca Direta'), ex('Rosca Alternada'),
    ]);

    let order = 1;
    for (const [exercise, reps, sets, rest] of [
      [supino,   '8-10', 4, 90],
      [crucifixo,'12',   3, 60],
      [rosca,    '10',   4, 60],
      [roscaAlt, '12',   3, 60],
    ] as [any, string, number, number][]) {
      if (exercise) {
        await prisma.workoutExercise.create({
          data: { workoutId: workoutA.id, exerciseId: exercise.id, order: order++, sets, reps, restSeconds: rest },
        });
      }
    }

    await prisma.workoutPlan.create({
      data: {
        studentId: student.id,
        workoutId: workoutA.id,
        division: 'A',
        dayOfWeek: [1, 3, 5],
        startDate: new Date(),
        isActive: true,
        order: 1,
      },
    });

    // Treino B – Costas & Tríceps  (Ter, Qui)
    const workoutB = await prisma.workout.create({
      data: {
        trainerId: trainer.id,
        name: 'Treino B – Costas & Tríceps',
        status: 'ACTIVE' as any,
        level: 2,
        duration: 60,
      },
    });

    const [puxada, remada, tricepsCorda, tricepsTesta] = await Promise.all([
      ex('Puxada Frontal'), ex('Remada Curvada'), ex('Tríceps Corda'), ex('Tríceps Testa'),
    ]);

    order = 1;
    for (const [exercise, reps, sets, rest] of [
      [puxada,       '10',   4, 90],
      [remada,       '10',   4, 90],
      [tricepsCorda, '12',   4, 60],
      [tricepsTesta, '10',   3, 60],
    ] as [any, string, number, number][]) {
      if (exercise) {
        await prisma.workoutExercise.create({
          data: { workoutId: workoutB.id, exerciseId: exercise.id, order: order++, sets, reps, restSeconds: rest },
        });
      }
    }

    await prisma.workoutPlan.create({
      data: {
        studentId: student.id,
        workoutId: workoutB.id,
        division: 'B',
        dayOfWeek: [2, 4],
        startDate: new Date(),
        isActive: true,
        order: 2,
      },
    });

    console.log('  → Demo workout plans created (Treino A + B)');
  }

  console.log('\nSeed completed!');
  console.log('\nDemo accounts:');
  console.log('  Admin:        admin@fitsaas.com  / Admin@123');
  console.log('  Trainer:      trainer@demo.com   / Trainer@123');
  console.log('  Nutritionist: nutri@demo.com     / Nutri@123');
  console.log('  Student:      student@demo.com   / Student@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
