import pkg from '@prisma/client';
import { createApp } from './API/rotas.js';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const app = createApp(prisma);

function dumpStack(stack, prefix = '') {
  for (const layer of stack) {
    const route = layer.route;
    const handle = layer.handle;
    const layerInfo = {
      prefix,
      name: layer.name,
      path: layer.path,
      regexp: layer.regexp?.toString(),
      methods: layer.methods,
      route: route ? { path: route.path, methods: route.methods } : undefined,
    };
    console.log(JSON.stringify(layerInfo));
    if (handle && handle.stack) {
      dumpStack(handle.stack, prefix + (layer.path || ''));
    }
  }
}

console.log('router exists', !!app.router);
if (app.router) {
  console.log('router.stack length', app.router.stack?.length);
  dumpStack(app.router.stack);
}
await prisma.$disconnect();
