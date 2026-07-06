const bcrypt = require("/app/node_modules/bcryptjs");
const { PrismaClient } = require("/app/node_modules/@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");

  let tenant = await prisma.tenant.findUnique({ where: { slug: "demo-studio" } });
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: "Demo Studio", slug: "demo-studio", isActive: true } });
    await prisma.tenantSubscription.create({ data: { tenantId: tenant.id, plan: "PRO", status: "ACTIVE" } });
  }

  const h = (pw) => bcrypt.hash(pw, 10);

  async function upsert(email, password, role, firstName, lastName) {
    const ex = await prisma.user.findFirst({ where: { email, tenantId: tenant.id } });
    if (ex) { console.log("ja existe:", email); return ex; }
    const u = await prisma.user.create({ data: {
      email, password: await h(password), role, tenantId: tenant.id,
      isActive: true, emailVerified: true,
      profile: { create: { firstName, lastName } }
    }});
    console.log("criado:", email);
    return u;
  }

  await upsert("admin@fitsaas.com", "Admin@123", "ADMIN", "Admin", "FitSaaS");

  const trainerUser = await upsert("trainer@demo.com", "Trainer@123", "TRAINER", "Joao", "Trainer");
  await prisma.trainer.upsert({ where: { userId: trainerUser.id }, update: {}, create: { userId: trainerUser.id, specialties: ["Musculacao", "Funcional"] } });

  const nutriUser = await upsert("nutri@demo.com", "Nutri@123", "NUTRITIONIST", "Maria", "Nutricionista");
  await prisma.nutritionist.upsert({ where: { userId: nutriUser.id }, update: {}, create: { userId: nutriUser.id, specialties: ["Nutricao Esportiva"] } });

  const studentUser = await upsert("student@demo.com", "Student@123", "STUDENT", "Pedro", "Aluno");
  const student = await prisma.student.upsert({ where: { userId: studentUser.id }, update: {}, create: { userId: studentUser.id, points: 120, streak: 5, level: 2 } });

  const trainer = await prisma.trainer.findUnique({ where: { userId: trainerUser.id } });
  const nutri = await prisma.nutritionist.findUnique({ where: { userId: nutriUser.id } });

  if (trainer) {
    await prisma.trainerStudent.upsert({
      where: { trainerId_studentId: { trainerId: trainer.id, studentId: student.id } },
      update: {}, create: { trainerId: trainer.id, studentId: student.id, monthlyFee: 300 }
    });
  }
  if (nutri) {
    await prisma.nutritionistPatient.upsert({
      where: { nutritionistId_studentId: { nutritionistId: nutri.id, studentId: student.id } },
      update: {}, create: { nutritionistId: nutri.id, studentId: student.id, monthlyFee: 200 }
    });
  }

  const exercises = [
    { name: "Supino Reto", category: "CHEST", muscleGroups: ["PECTORALIS_MAJOR"], equipment: ["Barra","Banco"], difficulty: 2, videoUrl: "https://www.youtube.com/watch?v=4Y2ZdHCOXok" },
    { name: "Crucifixo", category: "CHEST", muscleGroups: ["PECTORALIS_MAJOR"], equipment: ["Halteres","Banco"], difficulty: 2, videoUrl: "https://www.youtube.com/watch?v=eozdVDA78K0" },
    { name: "Flexao de Braco", category: "CHEST", muscleGroups: ["PECTORALIS_MAJOR","TRICEPS_BRACHII"], equipment: ["Peso Corporal"], difficulty: 1, videoUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4" },
    { name: "Puxada Frontal", category: "BACK", muscleGroups: ["LATISSIMUS_DORSI"], equipment: ["Polia","Barra"], difficulty: 2, videoUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc" },
    { name: "Remada Curvada", category: "BACK", muscleGroups: ["LATISSIMUS_DORSI","RHOMBOIDS"], equipment: ["Barra"], difficulty: 3, videoUrl: "https://www.youtube.com/watch?v=9efgcAjQe7E" },
    { name: "Barra Fixa", category: "BACK", muscleGroups: ["LATISSIMUS_DORSI","BICEPS_BRACHII"], equipment: ["Barra Fixa"], difficulty: 3, videoUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g" },
    { name: "Elevacao Lateral", category: "SHOULDERS", muscleGroups: ["DELTOID"], equipment: ["Halteres"], difficulty: 1, videoUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo" },
    { name: "Rosca Direta", category: "BICEPS", muscleGroups: ["BICEPS_BRACHII"], equipment: ["Barra"], difficulty: 1, videoUrl: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo" },
    { name: "Rosca Alternada", category: "BICEPS", muscleGroups: ["BICEPS_BRACHII"], equipment: ["Halteres"], difficulty: 1, videoUrl: "https://www.youtube.com/watch?v=sAq_ocpRh_I" },
    { name: "Triceps Corda", category: "TRICEPS", muscleGroups: ["TRICEPS_BRACHII"], equipment: ["Cabo"], difficulty: 1, videoUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU" },
    { name: "Agachamento Livre", category: "LEGS", muscleGroups: ["QUADRICEPS","GLUTES"], equipment: ["Barra"], difficulty: 3, videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8" },
    { name: "Leg Press 45", category: "LEGS", muscleGroups: ["QUADRICEPS","GLUTES"], equipment: ["Maquina"], difficulty: 2, videoUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ" },
    { name: "Stiff", category: "LEGS", muscleGroups: ["HAMSTRINGS","GLUTES"], equipment: ["Barra"], difficulty: 2, videoUrl: null },
    { name: "Cadeira Extensora", category: "LEGS", muscleGroups: ["QUADRICEPS"], equipment: ["Maquina"], difficulty: 1, videoUrl: null },
    { name: "Prancha", category: "CORE", muscleGroups: ["ABS","OBLIQUES"], equipment: ["Peso Corporal"], difficulty: 1, videoUrl: "https://www.youtube.com/watch?v=pSHjTRCQxIw" },
    { name: "Abdomen Crunch", category: "CORE", muscleGroups: ["ABS"], equipment: ["Peso Corporal"], difficulty: 1, videoUrl: null },
    { name: "Esteira", category: "CARDIO", muscleGroups: [], equipment: ["Esteira"], difficulty: 1, videoUrl: null },
  ];

  for (const ex of exercises) {
    const { videoUrl, ...data } = ex;
    const exists = await prisma.exercise.findFirst({ where: { name: ex.name, trainerId: null } });
    if (!exists) {
      await prisma.exercise.create({ data: { ...data, isPublic: true, videoUrl } });
      console.log("exercicio criado:", ex.name);
    }
  }

  console.log("Seed concluido!");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
