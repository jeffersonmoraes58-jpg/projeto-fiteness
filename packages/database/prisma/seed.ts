import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

  // Helper: find or create user
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
    create: {
      userId: trainerUser.id,
      specialties: ['Musculação', 'Funcional'],
    },
  });

  // Nutritionist
  const nutriUser = await upsertUser('nutri@demo.com', 'Nutri@123', 'NUTRITIONIST', 'Maria', 'Nutricionista');
  await prisma.nutritionist.upsert({
    where: { userId: nutriUser.id },
    update: {},
    create: {
      userId: nutriUser.id,
      specialties: ['Nutrição Esportiva', 'Emagrecimento'],
    },
  });

  // Student
  const studentUser = await upsertUser('student@demo.com', 'Student@123', 'STUDENT', 'Pedro', 'Aluno');
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: { userId: studentUser.id, points: 120, streak: 5, level: 2 },
  });

  // Link student to trainer
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

  // Exercises (public, no trainer)
  const exercisesData = [
    { name: 'Supino Reto', category: 'CHEST' as any, muscleGroups: ['PECTORALIS_MAJOR' as any], equipment: ['Barra', 'Banco'], difficulty: 2 },
    { name: 'Supino Inclinado', category: 'CHEST' as any, muscleGroups: ['PECTORALIS_MAJOR' as any], equipment: ['Barra', 'Banco Inclinado'], difficulty: 2 },
    { name: 'Crucifixo', category: 'CHEST' as any, muscleGroups: ['PECTORALIS_MAJOR' as any], equipment: ['Halteres', 'Banco'], difficulty: 2 },
    { name: 'Crossover', category: 'CHEST' as any, muscleGroups: ['PECTORALIS_MAJOR' as any], equipment: ['Cabo'], difficulty: 1 },
    { name: 'Flexão de Braço', category: 'CHEST' as any, muscleGroups: ['PECTORALIS_MAJOR' as any, 'TRICEPS_BRACHII' as any], equipment: ['Peso Corporal'], difficulty: 1 },
    { name: 'Puxada Frontal', category: 'BACK' as any, muscleGroups: ['LATISSIMUS_DORSI' as any], equipment: ['Polia', 'Barra'], difficulty: 2 },
    { name: 'Remada Curvada', category: 'BACK' as any, muscleGroups: ['LATISSIMUS_DORSI' as any, 'RHOMBOIDS' as any], equipment: ['Barra'], difficulty: 3 },
    { name: 'Remada Unilateral', category: 'BACK' as any, muscleGroups: ['LATISSIMUS_DORSI' as any], equipment: ['Halter', 'Banco'], difficulty: 2 },
    { name: 'Barra Fixa', category: 'BACK' as any, muscleGroups: ['LATISSIMUS_DORSI' as any, 'BICEPS_BRACHII' as any], equipment: ['Barra Fixa'], difficulty: 3 },
    { name: 'Development com Barra', category: 'SHOULDERS' as any, muscleGroups: ['DELTOID' as any], equipment: ['Barra'], difficulty: 3 },
    { name: 'Elevação Lateral', category: 'SHOULDERS' as any, muscleGroups: ['DELTOID' as any], equipment: ['Halteres'], difficulty: 1 },
    { name: 'Elevação Frontal', category: 'SHOULDERS' as any, muscleGroups: ['DELTOID' as any], equipment: ['Halteres'], difficulty: 1 },
    { name: 'Rosca Direta', category: 'BICEPS' as any, muscleGroups: ['BICEPS_BRACHII' as any], equipment: ['Barra'], difficulty: 1 },
    { name: 'Rosca Alternada', category: 'BICEPS' as any, muscleGroups: ['BICEPS_BRACHII' as any], equipment: ['Halteres'], difficulty: 1 },
    { name: 'Rosca Martelo', category: 'BICEPS' as any, muscleGroups: ['BICEPS_BRACHII' as any, 'FOREARMS' as any], equipment: ['Halteres'], difficulty: 1 },
    { name: 'Tríceps Corda', category: 'TRICEPS' as any, muscleGroups: ['TRICEPS_BRACHII' as any], equipment: ['Cabo'], difficulty: 1 },
    { name: 'Tríceps Testa', category: 'TRICEPS' as any, muscleGroups: ['TRICEPS_BRACHII' as any], equipment: ['Barra', 'Banco'], difficulty: 2 },
    { name: 'Mergulho (Tríceps)', category: 'TRICEPS' as any, muscleGroups: ['TRICEPS_BRACHII' as any], equipment: ['Barras Paralelas'], difficulty: 2 },
    { name: 'Agachamento Livre', category: 'LEGS' as any, muscleGroups: ['QUADRICEPS' as any, 'GLUTES' as any], equipment: ['Barra'], difficulty: 3 },
    { name: 'Leg Press 45°', category: 'LEGS' as any, muscleGroups: ['QUADRICEPS' as any, 'GLUTES' as any], equipment: ['Máquina'], difficulty: 2 },
    { name: 'Cadeira Extensora', category: 'LEGS' as any, muscleGroups: ['QUADRICEPS' as any], equipment: ['Máquina'], difficulty: 1 },
    { name: 'Cadeira Flexora', category: 'LEGS' as any, muscleGroups: ['HAMSTRINGS' as any], equipment: ['Máquina'], difficulty: 1 },
    { name: 'Stiff', category: 'LEGS' as any, muscleGroups: ['HAMSTRINGS' as any, 'GLUTES' as any], equipment: ['Barra'], difficulty: 2 },
    { name: 'Panturrilha em Pé', category: 'LEGS' as any, muscleGroups: ['CALVES' as any], equipment: ['Máquina'], difficulty: 1 },
    { name: 'Abdômen Crunch', category: 'CORE' as any, muscleGroups: ['ABS' as any], equipment: ['Peso Corporal'], difficulty: 1 },
    { name: 'Prancha', category: 'CORE' as any, muscleGroups: ['ABS' as any, 'OBLIQUES' as any], equipment: ['Peso Corporal'], difficulty: 1 },
    { name: 'Esteira', category: 'CARDIO' as any, muscleGroups: [], equipment: ['Esteira'], difficulty: 1 },
    { name: 'Bicicleta Ergométrica', category: 'CARDIO' as any, muscleGroups: [], equipment: ['Bicicleta'], difficulty: 1 },
  ];

  for (const ex of exercisesData) {
    const exists = await prisma.exercise.findFirst({ where: { name: ex.name, trainerId: null } });
    if (!exists) {
      await prisma.exercise.create({ data: { ...ex, isPublic: true } });
    }
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
