import pkg from '@prisma/client';
import { AgendaMedicaService } from '../services/agendaMedicaService.js';

const { Prisma } = pkg;

export class AgendaMedicaController {
  constructor(prisma) {
    this.agendaMedicaService = new AgendaMedicaService(prisma);
  }

  async cadastrar(req, res) {
    try {
      const result = await this.agendaMedicaService.cadastrar(req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao cadastrar agenda médica:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar agenda médica.' });
    }
  }

  async listar(req, res) {
    try {
      const agendas = await this.agendaMedicaService.listar();
      return res.json(agendas);
    } catch (error) {
      console.error('Erro ao listar agendas médicas:', error);
      return res.status(500).json({ error: 'Erro ao listar agendas médicas.' });
    }
  }

  async filtrarDisponibilidade(req, res) {
    try {
      const especialidadeId = req.params.especialidadeId || req.query.especialidadeId;
      const disponibilidade = await this.agendaMedicaService.filtrarDisponibilidade(especialidadeId);
      if (disponibilidade?.error) {
        return res.status(disponibilidade.status).json({ error: disponibilidade.error });
      }
      return res.json(disponibilidade);
    } catch (error) {
      console.error('Erro ao filtrar agenda medica:', error);
      return res.status(500).json({ error: 'Erro ao filtrar agenda medica.' });
    }
  }

  async obterPorId(req, res) {
    const { id } = req.params;
    try {
      const result = await this.agendaMedicaService.obterPorId(id);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao obter agenda médica:', error);
      return res.status(500).json({ error: 'Erro ao obter agenda médica.' });
    }
  }

  async atualizar(req, res) {
    const { id } = req.params;
    try {
      const result = await this.agendaMedicaService.atualizar(id, req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar agenda médica:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Agenda médica não encontrada.' });
      }
      return res.status(500).json({ error: 'Erro ao atualizar agenda médica.' });
    }
  }

  async deletar(req, res) {
    const { id } = req.params;
    try {
      await this.agendaMedicaService.deletar(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar agenda médica:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Agenda médica não encontrada.' });
      }
      return res.status(500).json({ error: 'Erro ao deletar agenda médica.' });
    }
  }
}
