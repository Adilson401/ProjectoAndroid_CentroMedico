import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { UsuarioService } from './API/services/usuarioService.js';

const prisma = new PrismaClient();
const service = new UsuarioService(prisma);

const payload = {
  nome: 'TesteDebug',
  email: `teste-debug-${Date.now()}@example.com`,
  password: '123456',
  datanascimento: '1990-01-01',
  status: 'Activo'
};

async function main() {
  try {
    await prisma.$connect();
    console.log('payload:', payload);
    const result = await service.cadastrar(payload);
    console.log('result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('ERROR NAME:', error?.name);
    console.error('ERROR MESSAGE:', error?.message);
    console.error('ERROR STACK:', error?.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
