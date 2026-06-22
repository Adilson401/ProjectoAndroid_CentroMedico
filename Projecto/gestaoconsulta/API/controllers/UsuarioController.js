import pkg from '@prisma/client';
import { UsuarioService } from '../services/usuarioService.js';
import { setAuthCookie } from '../helpers/authCookie.js';

const { Prisma } = pkg;

export class UsuarioController {
  constructor(prisma) {
    this.usuarioService = new UsuarioService(prisma);
  }
  async cadastrar(req, res) {
    try {
      const result = await this.usuarioService.cadastrar(req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(409).json({ error: 'Email já cadastrado.' });
      }
      return res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
    }
  }
  // Cadastro feito pelo administrador, sem etapa de confirmacao por email.
  async cadastrarDiretoPorAdministrador(req, res) {
    try {
      const result = await this.usuarioService.cadastrarDiretoPorAdministrador(
        req.body,
        req.user?.id
      );
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao cadastrar usuario pelo administrador:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Email repetido nao e erro do servidor.
        return res.status(409).json({ error: 'Email ja cadastrado.' });
      }
      return res.status(500).json({ error: 'Erro ao cadastrar usuario pelo administrador.' });
    }
  }

  async confirmarCadastro(req, res) {
    try {
      const result = await this.usuarioService.confirmarCadastro(req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao confirmar cadastro:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(409).json({ error: 'Email já cadastrado.' });
      }
      return res.status(500).json({ error: 'Erro ao confirmar cadastro.' });
    }
  }

  async login(req, res) {
    try {
      const result = await this.usuarioService.login(req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      setAuthCookie(res, result.token);
      return res.json(result);
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return res.status(500).json({ error: 'Erro ao conectar na rede com servidor.' });
    }
  }
  async listar(req, res) {
    try {
      const usuarios = await this.usuarioService.listar();
      return res.json(usuarios);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }
  }
  async listarSimples(req, res) {
    try {
      const usuarios = await this.usuarioService.listarSimples();
      return res.json(usuarios);
    } catch (error) {
      console.error('Erro ao buscar usuarios simples:', error);
      return res.status(500).json({ error: 'Erro ao buscar usuarios simples.' });
    }
  }

  async obterPerfil(req, res) {
    try {
      const usuarioId = req.params?.id ?? req.user?.id;
      const result = await this.usuarioService.obterPerfil(usuarioId);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao buscar perfil do usuario:', error);
      return res.status(500).json({ error: 'Erro ao buscar perfil do usuario.' });
    }
  }

  async atualizar(req, res) {
    const { id } = req.params;
    try {
      const result = await this.usuarioService.atualizar(id, req.body);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar usuario:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Usuario nao encontrado.' });
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(409).json({ error: 'Email ja cadastrado.' });
      }
      return res.status(500).json({ error: 'Erro ao atualizar usuario.' });
    }
  }
  async pesquisar(req, res) {
    try {
      const result = await this.usuarioService.pesquisar(req.query);
      if (result?.error) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao pesquisar usuários:', error);
      return res.status(500).json({ error: 'Erro ao pesquisar usuários.' });
    }
  }
  async deletar(req, res) {
    const { id } = req.params;
    try {
      await this.usuarioService.deletar(id);
      return res.json({ message: 'Usuario foi removido com sucesso.' });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      return res.status(500).json({ error: 'Erro ao deletar usuário.' });
    }
  }
}
