import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
await prisma.$connect();

const conf = await prisma.usuarioCadastroConfirmacao.findUnique({
  where: { email: 'teste@example.com' },
});

console.log(JSON.stringify(conf, null, 2));

await prisma.$disconnect();
