import pkg from '@prisma/client';
import { createApp } from './API/rotas.js';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const app = createApp(prisma);

function dump(layer, indent = '') {
  const base = {
    name: layer.name,
    regexp: layer.regexp?.source ?? null,
    path: layer.path ?? null,
    route: layer.route ? { path: layer.route.path, methods: layer.route.methods } : null,
  };
  console.log(indent + JSON.stringify(base));
  if (layer.handle && layer.handle.stack) {
    for (const nested of layer.handle.stack) {
      dump(nested, indent + '  ');
    }
  }
}
for (const layer of app.router.stack) {
  dump(layer);
}
await prisma.$disconnect();
