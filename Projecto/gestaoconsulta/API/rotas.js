import express from 'express';
import { UsuarioController } from './controllers/UsuarioController.js';
import { SenhaRecuperacaoController } from './controllers/SenhaRecuperacaoController.js';
import { FuncaoController } from './controllers/FuncaoController.js';
import { PacienteController } from './controllers/PacienteController.js';
import { EspecialidadeController } from './controllers/EspecialidadeController.js';
import { MedicoController } from './controllers/MedicoController.js';
import { AgendaMedicaController } from './controllers/AgendaMedicaController.js';
import { MarcacaoController } from './controllers/MarcacaoController.js';
import { PainelAdmController } from './controllers/PainelAdmController.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { authenticateBearerToken } from './middlewares/authenticateBearerToken.js';

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
}

function normalizeRepeatedSlashes(req, res, next) {
  const [path, query] = req.url.split('?');
  const normalizedPath = path.replace(/\/{2,}/g, '/');

  if (normalizedPath !== path) {
    req.url = query === undefined ? normalizedPath : `${normalizedPath}?${query}`;
  }

  return next();
}

function registerCrudRoutes(router, paths, idPaths, controller) {
  for (const path of paths) {
    router.post(path, (req, res) => controller.cadastrar(req, res));
    router.get(path, (req, res) => controller.listar(req, res));
  }

  for (const path of idPaths) {
    router.get(path, (req, res) => controller.obterPorId(req, res));
    router.put(path, (req, res) => controller.atualizar(req, res));
    router.delete(path, (req, res) => controller.deletar(req, res));
  }
}

function registerGetAliases(router, paths, handler) {
  for (const path of paths) {
    router.get(path, handler);
  }
}

function registerPublicRoutes(router, { usuarioController, senhaRecuperacaoController }) {
  router.post('/usuarios', (req, res) => usuarioController.cadastrar(req, res));
  router.post('/usuarios/confirmar', (req, res) => usuarioController.confirmarCadastro(req, res));
  router.post('/login', (req, res) => usuarioController.login(req, res));
  router.post('/senha/recuperar', (req, res) => senhaRecuperacaoController.solicitarRecuperacao(req, res));
  router.post('/senha/resetar', (req, res) => senhaRecuperacaoController.resetarSenha(req, res));
}

function registerUsuarioRoutes(router, usuarioController) {
  router.get('/usuarios', (req, res) => usuarioController.listar(req, res));
  router.get('/usuarios/listagemusuario', (req, res) => usuarioController.listarSimples(req, res));
  router.post('/usuarios/cadastro-admin', (req, res) => usuarioController.cadastrarDiretoPorAdministrador(req, res));
  router.get('/usuarioperfil', (req, res) => usuarioController.obterPerfil(req, res));
  router.get('/usuarioperfil/:id', (req, res) => usuarioController.obterPerfil(req, res));
  router.get('/usuarios/pesquisar', (req, res) => usuarioController.pesquisar(req, res));
  router.put('/usuarios/:id', (req, res) => usuarioController.atualizar(req, res));
  router.delete('/usuarios/:id', (req, res) => usuarioController.deletar(req, res));
}

function registerEspecialidadeRoutes(router, especialidadeController) {
  registerCrudRoutes(
    router,
    ['/especialidade', '/especialidades'],
    [],
    especialidadeController
  );
  router.get('/especialidade/nomes', (req, res) => especialidadeController.listarNomes(req, res));
  router.get('/especialidades/nomes', (req, res) => especialidadeController.listarNomes(req, res));
  router.get('/especialidades/medicos', (req, res) => especialidadeController.listarComMedicos(req, res));
  registerCrudRoutes(
    router,
    [],
    ['/especialidade/:id', '/especialidades/:id'],
    especialidadeController
  );
}

export function createApp(prisma) {
  const app = express();
  const publicRouter = express.Router();
  const protectedRouter = express.Router();

  const usuarioController = new UsuarioController(prisma);
  const senhaRecuperacaoController = new SenhaRecuperacaoController(prisma);

  app.use(corsMiddleware);
  app.use(normalizeRepeatedSlashes);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);

  registerPublicRoutes(publicRouter, { usuarioController, senhaRecuperacaoController });

  protectedRouter.use(authenticateBearerToken);
  const painelAdmController = new PainelAdmController(prisma);
  // Rota do painel do administrador.
  protectedRouter.get('/paineladm', (req, res) => painelAdmController.obterResumo(req, res));
  registerUsuarioRoutes(protectedRouter, usuarioController);
  registerCrudRoutes(
    protectedRouter,
    ['/funcao', '/funcoes'],
    ['/funcao/:id', '/funcoes/:id'],
    new FuncaoController(prisma)
  );
  registerCrudRoutes(
    protectedRouter,
    ['/paciente', '/pacientes'],
    ['/paciente/:id', '/pacientes/:id'],
    new PacienteController(prisma)
  );
  registerEspecialidadeRoutes(protectedRouter, new EspecialidadeController(prisma));
  registerCrudRoutes(
    protectedRouter,
    ['/medico', '/medicos'],
    ['/medico/:id', '/medicos/:id'],
    new MedicoController(prisma)
  );
  const agendaMedicaController = new AgendaMedicaController(prisma);
  registerGetAliases(
    protectedRouter,
    [
      '/agendamedicafiltrar/:especialidadeId',
      '/agendamedicafiltrar',
      '/agenda-medica/filtrar/:especialidadeId',
      '/agenda-medica/filtrar',
      '/agendamedica/filtrar/:especialidadeId',
      '/agendamedica/filtrar',
    ],
    (req, res) => agendaMedicaController.filtrarDisponibilidade(req, res)
  );
  registerCrudRoutes(
    protectedRouter,
    ['/agenda-medica', '/agenda-medicas', '/agendamedica', '/agendamedicas'],
    ['/agenda-medica/:id', '/agenda-medicas/:id', '/agendamedica/:id', '/agendamedicas/:id'],
    agendaMedicaController
  );
  const marcacaoController = new MarcacaoController(prisma);
  registerGetAliases(
    protectedRouter,
    ['/consultastotas', '/consultastotais'],
    (req, res) => marcacaoController.obterTotaisConsultas(req, res)
  );
  protectedRouter.get('/marcacaoultima', (req, res) => marcacaoController.obterUltima(req, res));
  protectedRouter.get('/marcacaoultima/:id', (req, res) => marcacaoController.obterUltima(req, res));
  registerGetAliases(
    protectedRouter,
    ['/marcacaofeitas', '/marcacoesfeitas'],
    (req, res) => marcacaoController.listarFeitas(req, res)
  );
  registerGetAliases(
    protectedRouter,
    ['/consultasmarcadas', '/consultas-marcadas', '/marcacoesmarcadas', '/marcacoes-marcadas'],
    (req, res) => marcacaoController.listarConsultasMarcadas(req, res)
  );
  protectedRouter.put('/marcacaofeitasestado/:id', (req, res) => marcacaoController.atualizarEstado(req, res));
  protectedRouter.patch('/marcacaofeitasestado/:id', (req, res) => marcacaoController.atualizarEstado(req, res));
  registerCrudRoutes(
    protectedRouter,
    ['/marcacao', '/marcacoes'],
    ['/marcacao/:id', '/marcacoes/:id'],
    marcacaoController
  );

  app.get('/resetar-senha', (req, res) => senhaRecuperacaoController.mostrarFormularioReset(req, res));
  app.post('/resetar-senha', (req, res) => senhaRecuperacaoController.resetarSenhaFormulario(req, res));
  app.use('/api', publicRouter);
  app.use('/api', protectedRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

