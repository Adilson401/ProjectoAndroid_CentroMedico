import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
await prisma.$connect();
console.log('keys includes usuario=', Object.prototype.hasOwnProperty.call(prisma, 'usuario'));
console.log('keys includes usuarioCadastroConfirmacao=', Object.prototype.hasOwnProperty.call(prisma, 'usuarioCadastroConfirmacao'));
console.log('model names sample=', Object.keys(prisma).filter((k) => k.includes('Usuario') || k.includes('Confirmacao')).slice(0, 50));
await prisma.$disconnect();
