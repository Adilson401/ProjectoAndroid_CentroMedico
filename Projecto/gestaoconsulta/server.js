import 'dotenv/config';
import pkg from '@prisma/client';
import { createApp } from './API/rotas.js';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const app = createApp(prisma);
const DEFAULT_PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await prisma.$connect();
    await listenOnPort(DEFAULT_PORT);
  } catch (error) {
    console.error('Failed to start server:', error);
    await shutdown(1);
  }
}

function listenOnPort(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);

    server.on('listening', () => {
      console.log(`Server is running on port ${port}`);
      resolve(server);
    });

    server.on('error', async (error) => {
      if (error.code === 'EADDRINUSE' && port === DEFAULT_PORT) {
        const fallbackPort = port + 1;
        console.warn(`Port ${port} already in use, trying port ${fallbackPort} instead.`);
        await listenOnPort(fallbackPort).then(resolve).catch(reject);
      } else if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} already in use. Stop the other process or set PORT to another value.`);
        reject(error);
      } else {
        console.error('Server listen error:', error);
        reject(error);
      }
    });
  });
}

startServer();

async function shutdown(code = 0) {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error during shutdown:', error);
  } finally {
    process.exit(code);
  }
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await shutdown(1);
});
process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled rejection:', reason);
  await shutdown(1);
});
