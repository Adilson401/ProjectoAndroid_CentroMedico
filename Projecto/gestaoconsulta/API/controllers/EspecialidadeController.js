import pkg from '@prisma/client';
import { EspecialidadeService } from '../services/especialidadeService.js';

const { Prisma } = pkg;

export class EspecialidadeController {
  constructor(prisma) {
    this.especialidadeService = new EspecialidadeService(prisma);
  }

  async cadastrar(req, res) {
    try {
      const result = await this.especialidadeService.cadastrar(req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao cadastrar especialidade:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar especialidade.' });
    }
  }

  async listar(req, res) {
    try {
      const especialidades = await this.especialidadeService.listar();
      return res.json(especialidades);
    } catch (error) {
      console.error('Erro ao listar especialidades:', error);
      return res.status(500).json({ error: 'Erro ao listar especialidades.' });
    }
  }

  async listarNomes(req, res) {
    try {
      const especialidades = await this.especialidadeService.listarNomes();
      return res.json(especialidades);
    } catch (error) {
      console.error('Erro ao listar nomes das especialidades:', error);
      return res.status(500).json({ error: 'Erro ao listar nomes das especialidades.' });
    }
  }

  async listarComMedicos(req, res) {
    try {
      const especialidades = await this.especialidadeService.listarComMedicos();
      return res.json(especialidades);
    } catch (error) {
      console.error('Erro ao listar especialidades com médicos:', error);
      return res.status(500).json({ error: 'Erro ao listar especialidades com médicos.' });
    }
  }

  async obterPorId(req, res) {
    const { id } = req.params;
    try {
      const result = await this.especialidadeService.obterPorId(id);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao obter especialidade:', error);
      return res.status(500).json({ error: 'Erro ao obter especialidade.' });
    }
  }

  async atualizar(req, res) {
    const { id } = req.params;
    try {
      const result = await this.especialidadeService.atualizar(id, req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar especialidade:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Especialidade não encontrada.' });
      }
      return res.status(500).json({ error: 'Erro ao atualizar especialidade.' });
    }
  }

  async deletar(req, res) {
    const { id } = req.params;
    try {
      await this.especialidadeService.deletar(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar especialidade:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Especialidade não encontrada.' });
      }
      return res.status(500).json({ error: 'Erro ao deletar especialidade.' });
    }
  }
}
