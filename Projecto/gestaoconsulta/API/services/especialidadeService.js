import { EspecialidadeRepository } from '../repositories/especialidadeRepository.js';
import { parseEspecialidadeRequest } from '../helpers/especialidadeHelpers.js';

export class EspecialidadeService {
  constructor(prisma) {
    this.repository = new EspecialidadeRepository(prisma);
  }

  async cadastrar(body) {
    const parsed = parseEspecialidadeRequest(body);
    if (parsed.error) {
      return { error: parsed.error, status: 400 };
    }
    return this.repository.criar(parsed);
  }

  async listar() {
    return this.repository.listar();
  }

  async listarNomes() {
    return this.repository.listarNomes();
  }

  async listarComMedicos() {
    const especialidades = await this.repository.listarComMedicos();
    return especialidades.map((especialidade) => ({
      nome: especialidade.nome,
      descricao: especialidade.descricao,
      estado: especialidade.estado,
      medicos: especialidade.medicos.map((medico) => ({ nome: medico.nome })),
    }));
  }

  async obterPorId(id) {
    const especialidade = await this.repository.obterPorId(id);
    if (!especialidade) {
      return { error: 'Especialidade não encontrada.', status: 404 };
    }
    return especialidade;
  }

  async atualizar(id, body) {
    const parsed = parseEspecialidadeRequest(body, { partial: true });
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
