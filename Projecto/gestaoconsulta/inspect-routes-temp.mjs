import { createApp } from './API/rotas.js';
const app = createApp({});

function dumpStack(stack, indent = '') {
  for (const layer of stack) {
    const route = layer.route ? {
      path: layer.route.path,
      methods: Object.keys(layer.route.methods).join(', '),
    } : null;
    console.log(`${indent}layer name=${layer.name} path=${layer.path ?? 'null'} route=${route ? JSON.stringify(route) : 'null'}`);
    if (layer.handle && layer.handle.stack) {
      console.log(`${indent}  nested stack:`);
      dumpStack(layer.handle.stack, indent + '    ');
    }
  }
}

console.log('app router stack length', app._router?.stack?.length ?? 'none');
dumpStack(app._router.stack);
