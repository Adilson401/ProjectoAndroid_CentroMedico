import pkg from '@prisma/client';
import { MarcacaoService } from '../services/marcacaoService.js';

const { Prisma } = pkg;

export class MarcacaoController {
  constructor(prisma) {
    this.marcacaoService = new MarcacaoService(prisma);
  }

  async cadastrar(req, res) {
    try {
      const result = await this.marcacaoService.cadastrar(req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao cadastrar marcação:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar marcação.' });
    }
  }

  async listar(req, res) {
    try {
      const marcacoes = await this.marcacaoService.listar();
      return res.json(marcacoes);
    } catch (error) {
      console.error('Erro ao listar marcações:', error);
      return res.status(500).json({ error: 'Erro ao listar marcações.' });
    }
  }

  async listarFeitas(req, res) {
    try {
      const marcacoes = await this.marcacaoService.listarMarcacoesFeitas(req.user?.id);
      if (marcacoes?.error) {
        return res.status(marcacoes.status).json({ error: marcacoes.error });
      }
      return res.json(marcacoes);
    } catch (error) {
      console.error('Erro ao listar marcacoes feitas:', error);
      return res.status(500).json({ error: 'Erro ao listar marcacoes feitas.' });
    }
  }

  async obterUltima(req, res) {
    try {
      const marcacao = await this.marcacaoService.obterUltimaMarcacao(req.user?.id);
      if (marcacao?.error) {
        return res.status(marcacao.status).json({ error: marcacao.error });
      }
      return res.json(marcacao);
    } catch (error) {
      console.error('Erro ao obter ultima marcacao:', error);
      return res.status(500).json({ error: 'Erro ao obter ultima marcacao.' });
    }
  }

  async obterTotaisConsultas(req, res) {
    try {
      const totais = await this.marcacaoService.obterTotaisConsultas(req.user?.id);
      if (totais?.error) {
        return res.status(totais.status).json({ error: totais.error });
      }
      return res.json(totais);
    } catch (error) {
      console.error('Erro ao obter totais de consultas:', error);
      return res.status(500).json({ error: 'Erro ao obter totais de consultas.' });
    }
  }

  async obterPorId(req, res) {
    const { id } = req.params;
    try {
      const result = await this.marcacaoService.obterPorId(id);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao obter marcação:', error);
      return res.status(500).json({ error: 'Erro ao obter marcação.' });
    }
  }

  async atualizar(req, res) {
    const { id } = req.params;
    try {
      const result = await this.marcacaoService.atualizar(id, req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar marcação:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Marcação não encontrada.' });
      }
      return res.status(500).json({ error: 'Erro ao atualizar marcação.' });
    }
  }

  async atualizarEstado(req, res) {
    const { id } = req.params;
    try {
      const result = await this.marcacaoService.atualizarEstado(id, req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar estado da marcacao:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Marcacao nao encontrada.' });
      }
      return res.status(500).json({ error: 'Erro ao atualizar estado da marcacao.' });
    }
  }

  async deletar(req, res) {
    const { id } = req.params;
    try {
      await this.marcacaoService.deletar(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar marcação:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Marcação não encontrada.' });
      }
      return res.status(500).json({ error: 'Erro ao deletar marcação.' });
    }
  }
}
