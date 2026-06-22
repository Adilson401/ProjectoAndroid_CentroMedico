import { FuncaoRepository } from '../repositories/funcaoRepository.js';
import { parseFuncaoRequest } from '../helpers/funcaoHelpers.js';

export class FuncaoService {
  constructor(prisma) {
    this.repository = new FuncaoRepository(prisma);
  }

  async cadastrar(body) {
    const parsed = parseFuncaoRequest(body);
    if (parsed.error) {
      return { error: parsed.error, status: 400 };
    }
    return this.repository.criar(parsed);
  }

  async listar() {
    return this.repository.listar();
  }

  async obterPorId(id) {
    const funcao = await this.repository.obterPorId(id);
    if (!funcao) {
      return { error: 'Função não encontrada.', status: 404 };
    }
    return funcao;
  }

  async atualizar(id, body) {
    const parsed = parseFuncaoRequest(body, { partial: true });
    if (parsed.error) {
      return { error: parsed.error, status: 400 };
    }

    if (Object.keys(parsed).length === 0) {
      return { error: 'Informe nome ou descricao para atualizar.', status: 400 };
    }

    return this.repository.atualizar(id, parsed);
  }

  async deletar(id) {
    return this.repository.deletar(id);
  }
}
