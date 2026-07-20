const bcrypt = require("/app/node_modules/bcryptjs");
const { PrismaClient } = require("/app/node_modules/@prisma/client");
const prisma = new PrismaClient();

// Uso: TARGET_EMAIL=xxx NEW_PASSWORD=xxx node reset-password.js
const TARGET_EMAIL = process.env.TARGET_EMAIL;
const NEW_PASSWORD = process.env.NEW_PASSWORD;

async function main() {
  if (!TARGET_EMAIL || !NEW_PASSWORD) {
    console.error("Defina TARGET_EMAIL e NEW_PASSWORD via variáveis de ambiente.");
    console.error("Exemplo: TARGET_EMAIL=user@example.com NEW_PASSWORD=NewPass123 node reset-password.js");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({ where: { email: TARGET_EMAIL } });

  if (!user) {
    console.log("ERRO: Usuário não encontrado:", TARGET_EMAIL);
    console.log("\nListando todos os usuários cadastrados:");
    const all = await prisma.user.findMany({ select: { email: true, role: true, isActive: true, tenantId: true } });
    console.table(all);
    return;
  }

  console.log("Usuário encontrado:");
  console.log("  ID:", user.id);
  console.log("  Email:", user.email);
  console.log("  Role:", user.role);
  console.log("  isActive:", user.isActive);
  console.log("  emailVerified:", user.emailVerified);

  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hash,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log("\nSenha resetada com sucesso!");
  console.log("  Email:", TARGET_EMAIL);
}

main()
  .catch((e) => { console.error("Erro:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
