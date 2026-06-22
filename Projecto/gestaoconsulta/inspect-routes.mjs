import pkg from '@prisma/client';
import { createApp } from './API/rotas.js';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const app = createApp(prisma);
function listRoutes(stack, prefix = '') {
  for (const layer of stack) {
    if (layer.route) {
      const routePath = prefix + layer.route.path;
      const methods = Object.keys(layer.route.methods).join(',');
      console.log(routePath, methods);
    } else if (layer.name === 'router' && layer.handle.stack) {
      listRoutes(layer.handle.stack, prefix + (layer.regexp.source === '^\\/?$' ? '' : layer.regexp.source.replace('^\\/?', '').replace('\\/?$', '').replace('\\/', '/')));
    }
  }
}
listRoutes(app._router.stack);
await prisma.$disconnect();
