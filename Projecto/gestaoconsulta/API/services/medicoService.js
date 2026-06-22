import { MedicoRepository } from '../repositories/medicoRepository.js';
import { parseMedicoRequest } from '../helpers/medicoHelpers.js';
import { obterAcessoUsuario } from '../helpers/perfilUsuario.js';

export class MedicoService {
  constructor(prisma) {
    this.repository = new MedicoRepository(prisma);
  }

  async cadastrar(body, administradorId) {
    if (!administradorId) {
      return { error: 'Usuario autenticado nao encontrado.', status: 401 };
    }

    const administrador = await this.repository.obterUsuarioComFuncao(administradorId);
    const acessoAdministrador = obterAcessoUsuario(administrador);
    if (acessoAdministrador.role !== 'administrador') {
      return {
        error: 'Apenas administradores podem cadastrar medicos.',
        status: 403,
      };
    }

    const parsed = parseMedicoRequest(body);
    if (parsed.error) {
      return { error: parsed.error, status: 400 };
    }

    const usuario = await this.repository.obterUsuarioComFuncao(parsed.usuarioId);
    if (!usuario) {
      return { error: 'Usuario informado nao encontrado.', status: 404 };
    }

    return this.repository.criar(parsed);
  }

  async listar() {
    return this.repository.listar();
  }

  async obterPorId(id) {
    const medico = await this.repository.obterPorId(id);
    if (!medico) {
      return { error: 'Médico não encontrado.', status: 404 };
    }
    return medico;
  }

  async atualizar(id, body) {
    const parsed = parseMedicoRequest(body, { partial: true });
    if (parsed.error) {
      return { error: parsed.error, status: 400 };
    }
    if (Object.keys(parsed).length === 0) {
      return { error: 'Informe pelo menos um campo para atualizar.', status: 400 };
    }
    return this.repository.atualizar(id, parsed);
  }

  async deletar(id) {
    return this.repository.deletar(id);
  }
}
