import pkg from '@prisma/client';
import { MedicoService } from '../services/medicoService.js';

const { Prisma } = pkg;

export class MedicoController {
  constructor(prisma) {
    this.medicoService = new MedicoService(prisma);
  }

  async cadastrar(req, res) {
    try {
      const result = await this.medicoService.cadastrar(req.body, req.user?.id);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao cadastrar médico:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(409).json({ error: 'Este usuario ja esta associado a um medico.' });
      }
      return res.status(500).json({ error: 'Erro ao cadastrar médico.' });
    }
  }

  async listar(req, res) {
    try {
      const medicos = await this.medicoService.listar();
      return res.json(medicos);
    } catch (error) {
      console.error('Erro ao listar médicos:', error);
      return res.status(500).json({ error: 'Erro ao listar médicos.' });
    }
  }

  async obterPorId(req, res) {
    const { id } = req.params;
    try {
      const result = await this.medicoService.obterPorId(id);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao obter médico:', error);
      return res.status(500).json({ error: 'Erro ao obter médico.' });
    }
  }

  async atualizar(req, res) {
    const { id } = req.params;
    try {
      const result = await this.medicoService.atualizar(id, req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar médico:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Médico não encontrado.' });
      }
      return res.status(500).json({ error: 'Erro ao atualizar médico.' });
    }
  }

  async deletar(req, res) {
    const { id } = req.params;
    try {
      await this.medicoService.deletar(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar médico:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Médico não encontrado.' });
      }
      return res.status(500).json({ error: 'Erro ao deletar médico.' });
    }
  }
}
