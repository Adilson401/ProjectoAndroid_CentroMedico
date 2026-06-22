import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UsuarioRepository } from '../repositories/usuarioRepository.js';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/auth.js';
import { EmailService } from './emailService.js';
import {
  parseUsuarioRequest,
  parseLoginRequest,
  parseUsuarioSearchQuery,
  parseDateRange,
} from '../helpers/usuarioHelpers.js';
import { obterAcessoUsuario } from '../helpers/perfilUsuario.js';

export class UsuarioService {
  constructor(prisma) {
    this.repository = new UsuarioRepository(prisma);
    this.emailService = new EmailService();
  }
  generateToken(usuario) {
    return jwt.sign(
      { id: usuario.id, email: usuario.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }
  // Codigo curto enviado ao email do utilizador.
  gerarCodigoConfirmacao() {
    return crypto.randomInt(100000, 1000000).toString();
  }

  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${derived}`;
  }

  verifyPassword(password, storedHash) {
    if (!password || !storedHash) {
      return false;
    }

    if (storedHash === password) {
      return true;
    }

    const [salt, hash] = String(storedHash).split(':');
    if (!salt || !hash) {
      return false;
    }

    const derived = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return derived === hash;
  }

  async cadastrar(body) {
    const parsed = parseUsuarioRequest(body);
    if (parsed.error) {
      return { error: parsed.error, status: 400 };
    }

    const usuarioExistente = await this.repository.encontrarPorEmail(parsed.email);
    if (usuarioExistente) {
      return { error: 'Email já cadastrado.', status: 409 };
    }
    // O cadastro fica pendente ate o utilizador confirmar o codigo por email.
    const codigo = this.gerarCodigoConfirmacao();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.repository.criarConfirmacaoCadastro({
      email: parsed.email,
      codigo,
      dados: {
        ...parsed,
        datanascimento: parsed.datanascimento.toISOString(),
      },
      expiresAt,
    });

    try {
      await this.emailService.sendMail({
        to: parsed.email,
        subject: 'Código de confirmação - Famor',
        text: `O seu código de confirmação é: ${codigo}. Ele expira em 15 minutos.`,
        html: `<p>O seu código de confirmação é: <strong>${codigo}</strong></p><p>Ele expira em 15 minutos.</p>`,
      });
    } catch (error) {
      console.error('Erro ao enviar código de confirmação:', error);
      return {
        error: 'Não foi possível enviar o código de confirmação.',
        status: 500,
      };
    }

    return {
      message: 'Código de confirmação enviado para o email informado.',
      email: parsed.email,
      expiresAt,
    };
  }

  async cadastrarDiretoPorAdministrador(body, administradorId) {
    const administrador = await this.repository.encontrarPerfilPorId(administradorId);
    const acessoAdministrador = obterAcessoUsuario(administrador);

    if (acessoAdministrador.role !== 'administrador') {
      return {
        error: 'Apenas administradores podem cadastrar usuarios diretamente.',
        status: 403,
      };
    }

    const parsed = parseUsuarioRequest(body);
    if (parsed.error) {
      return { error: parsed.error, status: 400 };
    }

    const usuarioExistente = await this.repository.encontrarPorEmail(parsed.email);
    if (usuarioExistente) {
      return { error: 'Email ja cadastrado.', status: 409 };
    }

    const usuario = await this.repository.criar({
      ...parsed,
      passwordHash: this.hashPassword(parsed.passwordHash),
    });

    return {
      message: 'Usuario cadastrado com sucesso.',
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        funcaoId: usuario.funcaoId,
        status: usuario.status,
        estado: usuario.estado,
        dataRegisto: usuario.dataRegisto,
      },
    };
  }

  async confirmarCadastro(body) {
    const email = body.email ?? body['e-mail'];
    const codigo = body.codigo ?? body.codigoConfirmacao;

    if (!email || !codigo) {
      return { error: 'Email e código de confirmação são obrigatórios.', status: 400 };
    }

    const confirmacao = await this.repository.encontrarConfirmacaoCadastro(email);
    if (!confirmacao) {
      return { error: 'Cadastro pendente não encontrado.', status: 404 };
    }

    if (confirmacao.expiresAt < new Date()) {
      await this.repository.deletarConfirmacaoCadastro(email);
      return { error: 'Código de confirmação expirado. Faça o cadastro novamente.', status: 410 };
    }

    if (confirmacao.codigo !== String(codigo)) {
      return { error: 'Código de confirmação inválido.', status: 401 };
    }

    const usuarioExistente = await this.repository.encontrarPorEmail(email);
    if (usuarioExistente) {
      await this.repository.deletarConfirmacaoCadastro(email);
      return { error: 'Email já cadastrado.', status: 409 };
    }

    const dados = {
      ...confirmacao.dados,
      datanascimento: new Date(confirmacao.dados.datanascimento),
      passwordHash: this.hashPassword(confirmacao.dados.passwordHash),
    };

    const usuario = await this.repository.criar(dados);
    await this.repository.deletarConfirmacaoCadastro(email);
    const token = this.generateToken(usuario);

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        datanascimento: usuario.datanascimento,
        funcaoId: usuario.funcaoId,
        status: usuario.status,
        estado: usuario.estado,
        dataRegisto: usuario.dataRegisto,
      },
    };
  }

  async login(body) {
    const parsed = parseLoginRequest(body);
    if (parsed.error) {
      return { error: parsed.error, status: 400 };
    }

    const usuario = await this.repository.encontrarPorEmailComFuncao(parsed.email);
    if (!usuario || usuario.estado !== 1 || !this.verifyPassword(parsed.credentials, usuario.passwordHash)) {
      return { error: 'Dados de acesso invalidos. Verifique o email e a senha.', status: 401 };
    }

    const token = this.generateToken(usuario);
    const acesso = obterAcessoUsuario(usuario);

    return {
      token,
      role: acesso.role,
      perfil: acesso.perfil,
      paginaInicial: acesso.paginaInicial,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        funcaoId: usuario.funcaoId,
        funcao: usuario.funcao
          ? {
              id: usuario.funcao.id,
              nome: usuario.funcao.nome,
              descricao: usuario.funcao.descricao,
            }
          : null,
        role: acesso.role,
        perfil: acesso.perfil,
        paginaInicial: acesso.paginaInicial,
        status: usuario.status,
        estado: usuario.estado,
      },
    };
  }

  async listar() {
    return this.repository.listar();
  }

  async listarSimples() {
    const usuarios = await this.repository.listarSimples();
    return usuarios.map((usuario) => ({
      id: usuario.id,
      nome: usuario.nome,
      morada: usuario.morada,
      email: usuario.email,
      datanascimento: usuario.datanascimento,
      dataRegisto: usuario.dataRegisto,
      funcaoId: usuario.funcaoId,
      status: usuario.status,
      estado: usuario.estado,
      funcao: usuario.funcao
        ? {
            id: usuario.funcao.id,
            nome: usuario.funcao.nome,
            descricao: usuario.funcao.descricao,
          }
        : null,
    }));
  }

  async obterPerfil(usuarioId) {
    if (!usuarioId) {
      return { error: 'Usuário autenticado não encontrado.', status: 401 };
    }

    const usuario = await this.repository.encontrarPerfilPorId(usuarioId);
    if (!usuario || usuario.estado !== 1) {
      return { error: 'Usuário não encontrado.', status: 404 };
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      morada: usuario.morada,
      datanascimento: usuario.datanascimento,
      funcaoId: usuario.funcaoId,
      funcao: usuario.funcao?.nome ?? null,
      estado: usuario.status,
      status: usuario.status,
      dataRegisto: usuario.dataRegisto,
    };
  }

  async atualizar(id, body) {
    // Na edicao, so entram os campos enviados pela tela.
    const parsed = parseUsuarioRequest(body, { partial: true });
    if (parsed.error) {
      return { error: parsed.error, status: 400 };
    }
    // Nao deixa dois usuarios com o mesmo email.
    if (parsed.email) {
      const usuarioComEmail = await this.repository.encontrarPorEmail(parsed.email);
      if (usuarioComEmail && usuarioComEmail.id !== id) {
        return { error: 'Email ja cadastrado.', status: 409 };
      }
    }
    // Senha nova entra cifrada antes de gravar.
    if (parsed.passwordHash && !String(parsed.passwordHash).includes(':')) {
      parsed.passwordHash = this.hashPassword(parsed.passwordHash);
    }

    return this.repository.atualizar(id, parsed);
  }

  async deletar(id) {
    return this.repository.deletar(id);
  }

  async pesquisar(query) {
    const filters = parseUsuarioSearchQuery(query);
    if (!filters.nome && !filters.email && !filters.datanascimento) {
      return {
        error: 'Informe nome, email ou datanascimento para pesquisar.',
        status: 400,
      };
    }

    const searchParams = {
      nome: filters.nome,
      email: filters.email,
    };

    if (filters.datanascimento) {
      const dateRange = parseDateRange(filters.datanascimento);
      if (dateRange.error) {
        return { error: dateRange.error, status: 400 };
      }
      searchParams.dataRange = dateRange;
    }

    return this.repository.pesquisar(searchParams);
  }
}
