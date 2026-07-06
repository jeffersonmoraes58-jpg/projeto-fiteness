const bcrypt = require('/app/node_modules/bcryptjs');
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst({ where: { email: 'jeffersonmoraes58@gmail.com' } }).then(async function(u) {
  if (!u) { console.log('Usuario nao encontrado'); return; }
  console.log('Hash no banco:', u.password);
  const ok = await bcrypt.compare('Admin@123456', u.password);
  console.log('Senha Admin@123456 bate?', ok);
  await prisma.$disconnect();
}).catch(function(e) { console.error(e.message); process.exit(1); });
