import { SenhaRecuperacaoService } from '../services/senhaRecuperacaoService.js';

export class SenhaRecuperacaoController {
  constructor(prisma) {
    this.service = new SenhaRecuperacaoService(prisma);
  }

  async solicitarRecuperacao(req, res) {
    try {
      const email = req.body?.email;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Corpo inválido. Envie JSON com o campo "email".' });
      }

      const baseUrl = this._getResetPasswordBaseUrl(req);
      const result = await this.service.enviarTokenRecuperacao(email, baseUrl);
      if (result?.error) {
        return res.status(result.status || 400).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao solicitar recuperação de senha:', error);
      return res.status(500).json({ error: 'Erro ao enviar email de recuperação.' });
    }
  }

  _getResetPasswordBaseUrl(req) {
    const configuredUrl = process.env.RESET_PASSWORD_BASE_URL?.trim();
    const publicAppUrl = process.env.PUBLIC_APP_URL?.trim();
    const frontendUrl = process.env.FRONTEND_URL?.trim();

    if (configuredUrl) {
      return this._removeTrailingSlash(configuredUrl);
    }

    if (publicAppUrl) {
      return this._removeTrailingSlash(publicAppUrl);
    }

    if (frontendUrl && frontendUrl !== 'http://localhost:3000') {
      return this._removeTrailingSlash(frontendUrl);
    }

    const forwardedProto = req.get('x-forwarded-proto');
    const forwardedHost = req.get('x-forwarded-host');
    const protocol = forwardedProto || req.protocol;
    const host = forwardedHost || req.get('host');
    return this._removeTrailingSlash(`${protocol}://${host}`);
  }

  _removeTrailingSlash(url) {
    return url.replace(/\/+$/, '');
  }

  _normalizarValor(value) {
    if (value === null || typeof value === 'undefined') {
      return value;
    }
    return String(value).trim();
  }

  _primeiroValor(...values) {
    return values.find((value) => {
      const normalized = this._normalizarValor(value);
      return normalized !== null && typeof normalized !== 'undefined' && normalized !== '';
    });
  }

  async resetarSenha(req, res) {
    try {
      const {
        token,
        codigo,
        codigoConfirmacao,
        email,
        novaSenha,
        nova_password,
        novaSenhaUsuario,
        senhaNova,
        newPassword,
        new_password,
        password,
        senha,
        passwordHash,
        confirmPassword,
        confirmSenha,
      } = req.body;

      const senhaInformada = this._primeiroValor(
        novaSenha,
        nova_password,
        novaSenhaUsuario,
        senhaNova,
        newPassword,
        new_password,
        password,
        senha,
        passwordHash
      );
      const confirmacaoSenha = this._primeiroValor(confirmPassword, confirmSenha);
      if (
        confirmacaoSenha &&
        this._normalizarValor(senhaInformada) !== this._normalizarValor(confirmacaoSenha)
      ) {
        return res.status(400).json({ error: 'As senhas não coincidem.' });
      }

      const codigoInformado = this._primeiroValor(codigo, codigoConfirmacao);
      const tokenInformado =
        this._normalizarValor(token) === this._normalizarValor(codigoInformado) && email
          ? null
          : token;

      const result = await this.service.resetarSenha(
        tokenInformado,
        senhaInformada,
        codigoInformado,
        email
      );
      if (result?.error) {
        return res.status(result.status || 400).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      return res.status(500).json({ error: 'Erro ao resetar senha.' });
    }
  }
  // Mostra o formulario simples de reset.
  async mostrarFormularioReset(req, res) {
    const token = req.query.token;
    const codigo = req.query.codigo;
    res.send(this._buildResetForm(token, codigo));
  }

  async resetarSenhaFormulario(req, res) {
    const { token, codigo, novaSenha, confirmSenha } = req.body;
    if (!token || !codigo || !novaSenha || !confirmSenha) {
      return res.send(this._buildResetForm(token, codigo, 'Todos os campos são obrigatórios.'));
    }
    if (novaSenha !== confirmSenha) {
      return res.send(this._buildResetForm(token, codigo, 'As senhas não coincidem.'));
    }

    const result = await this.service.resetarSenha(token, novaSenha, codigo);
    if (result?.error) {
      return res.send(this._buildResetForm(token, codigo, result.error));
    }
    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>SGMO -Redefinir Senha</title>
</head>
<body>
  <h1>Senha redefinida com sucesso</h1>
  <p>Sua senha foi atualizada. Você já pode fechar esta janela ou retornar ao login.</p>
</body>
</html>`);
  }

  _buildResetForm(token, codigo = '', message = '') {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Redefinir senha -Famor - Gestão Consulta Online</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 520px; margin: 2rem auto; padding: 1rem; }
  label { display: block; margin: 1rem 0 0.25rem; }
  input { width: 100%; padding: 0.5rem; box-sizing: border-box; }
  button { margin-top: 1rem; padding: 0.75rem 1rem; }
  .message { margin: 1rem 0; color: red; }
</style>
</head>
<body>
  <h1>Redefinir senha</h1>
  ${message ? `<div class="message">${message}</div>` : ''}
  <form method="post" action="/resetar-senha">
    <input type="hidden" name="token" value="${token || ''}">
    <input type="hidden" name="codigo" value="${codigo || ''}">
    <label for="novaSenha">Nova senha</label>
    <input id="novaSenha" name="novaSenha" type="password" required>
    <label for="confirmSenha">Confirme a nova senha</label>
    <input id="confirmSenha" name="confirmSenha" type="password" required>
    <button type="submit">Alterar senha</button>
  </form>
  <p>Caso este link não funcionar cópia e cola o URL no navegador...</p>
</body>
</html>`;
  }
}
