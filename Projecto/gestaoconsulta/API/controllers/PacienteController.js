import pkg from '@prisma/client';
import { PacienteService } from '../services/pacienteService.js';

const { Prisma } = pkg;

export class PacienteController {
  constructor(prisma) {
    this.pacienteService = new PacienteService(prisma);
  }

  async cadastrar(req, res) {
    try {
      const result = await this.pacienteService.cadastrar(req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao cadastrar paciente:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar paciente.' });
    }
  }

  async listar(req, res) {
    try {
      const pacientes = await this.pacienteService.listar();
      return res.json(pacientes);
    } catch (error) {
      console.error('Erro ao listar pacientes:', error);
      return res.status(500).json({ error: 'Erro ao listar pacientes.' });
    }
  }

  async obterPorId(req, res) {
    const { id } = req.params;
    try {
      const result = await this.pacienteService.obterPorId(id);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao obter paciente:', error);
      return res.status(500).json({ error: 'Erro ao obter paciente.' });
    }
  }

  async atualizar(req, res) {
    const { id } = req.params;
    try {
      const result = await this.pacienteService.atualizar(id, req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Paciente não encontrado.' });
      }
      return res.status(500).json({ error: 'Erro ao atualizar paciente.' });
    }
  }

  async deletar(req, res) {
    const { id } = req.params;
    try {
      await this.pacienteService.deletar(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar paciente:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Paciente não encontrado.' });
      }
      return res.status(500).json({ error: 'Erro ao deletar paciente.' });
    }
  }
}
