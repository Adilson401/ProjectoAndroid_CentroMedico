import pkg from '@prisma/client';
import { FuncaoService } from '../services/funcaoService.js';

const { Prisma } = pkg;

export class FuncaoController {
  constructor(prisma) {
    this.funcaoService = new FuncaoService(prisma);
  }

  async cadastrar(req, res) {
    try {
      const result = await this.funcaoService.cadastrar(req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao cadastrar função:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar função.' });
    }
  }

  async listar(req, res) {
    try {
      const funcoes = await this.funcaoService.listar();
      return res.json(funcoes);
    } catch (error) {
      console.error('Erro ao listar funções:', error);
      return res.status(500).json({ error: 'Erro ao listar funções.' });
    }
  }

  async obterPorId(req, res) {
    const { id } = req.params;
    try {
      const result = await this.funcaoService.obterPorId(id);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao obter função:', error);
      return res.status(500).json({ error: 'Erro ao obter função.' });
    }
  }

  async atualizar(req, res) {
    const { id } = req.params;
    try {
      const result = await this.funcaoService.atualizar(id, req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar função:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Função não encontrada.' });
      }
      return res.status(500).json({ error: 'Erro ao atualizar função.' });
    }
  }

  async deletar(req, res) {
    const { id } = req.params;
    try {
      await this.funcaoService.deletar(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar função:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Função não encontrada.' });
      }
      return res.status(500).json({ error: 'Erro ao deletar função.' });
    }
  }
}
