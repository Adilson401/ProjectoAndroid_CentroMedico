import { PacienteRepository } from '../repositories/pacienteRepository.js';
import { parsePacienteRequest } from '../helpers/pacienteHelpers.js';

export class PacienteService {
  constructor(prisma) {
    this.repository = new PacienteRepository(prisma);
  }

  async cadastrar(body) {
    const parsed = parsePacienteRequest(body);
    if (parsed.error) {
      return { error: parsed.error, status: 400 };
    }
    return this.repository.criar(parsed);
  }

  async listar() {
    return this.repository.listar();
  }

  async obterPorId(id) {
    const paciente = await this.repository.obterPorId(id);
    if (!paciente) {
      return { error: 'Paciente não encontrado.', status: 404 };
    }
    return paciente;
  }

  async atualizar(id, body) {
    const parsed = parsePacienteRequest(body, { partial: true });
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
