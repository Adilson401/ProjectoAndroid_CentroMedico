import crypto from 'crypto';
import { EmailService } from './emailService.js';

export class SenhaRecuperacaoService {
  constructor(prisma) {
    this.prisma = prisma;
    this.emailService = new EmailService();
  }

  hashPassword(password) {
    const normalizedPassword = this._normalizarValor(password);
    if (!normalizedPassword) {
      throw new TypeError('Nova senha é obrigatória.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.pbkdf2Sync(normalizedPassword, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${derived}`;
  }

  async enviarTokenRecuperacao(email, frontendUrl) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return { error: 'Email não existe no registro.', status: 404 };
    }

    if (!this.emailService.enabled) {
      return {
        error: 'Serviço SMTP não configurado. Configure SMTP_HOST, SMTP_USER e SMTP_PASS.',
        status: 500,
      };
    }
    const token = crypto.randomBytes(32).toString('hex');
    const codigo = this._gerarCodigoConfirmacao();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    await this.prisma.recuperacaoSenha.upsert({
      where: { usuarioId: usuario.id },
      update: {
        token,
        codigo,
        expiresAt,
        used: false,
      },
      create: {
        usuarioId: usuario.id,
        token,
        codigo,
        expiresAt,
        used: false,
      },
    });

    const baseUrl = frontendUrl || process.env.RESET_PASSWORD_BASE_URL || process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = this._buildResetUrl(baseUrl, token, codigo);
    const emailText = `Use este link para redefinir sua senha:\n\n${resetUrl}\n\nOu use o seguinte código de confirmação:\n${codigo}\n\nCaso o link não abra, cópia e cola a URL no navegador.`;
    const emailHtml = `<p>Use este link para redefinir sua senha:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ou use o seguinte código de confirmação:</p><p><strong>${codigo}</strong></p><p>Caso não consiga clicar, cópia e cola o URL acima no navegador.</p>`;
    let info;
    try {
      info = await this.emailService.sendMail({
        to: email,
        subject: 'Recuperação de senha -Famor - Gestão Consulta Online',
        text: emailText,
        html: emailHtml,
      });
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      return {
        error: 'Erro ao enviar email de recuperação.',
        status: 500,
      };
    }

    return {
      message: 'Email de recuperacao enviado. Verifique a sua caixa de entrada.',
    };
  }

  _buildResetUrl(baseUrl, token, codigo) {
    const url = new URL('/resetar-senha', baseUrl);
    url.searchParams.set('token', token);
    if (codigo) {
      url.searchParams.set('codigo', codigo);
    }
    return url.toString();
  }

  _gerarCodigoConfirmacao() {
    return crypto.randomInt(100000, 1000000).toString();
  }

  async resetarSenha(token, novaSenha, codigo = null, email = null) {
    const tokenNormalizado = this._normalizarValor(token);
    const codigoNormalizado = this._normalizarValor(codigo);
    const emailNormalizado = this._normalizarValor(email);
    const senhaNormalizada = this._normalizarValor(novaSenha);

    if (!senhaNormalizada) {
      return { error: 'Nova senha é obrigatória.', status: 400 };
    }

    if (!tokenNormalizado && (!emailNormalizado || !codigoNormalizado)) {
      return { error: 'Informe token ou e-mail com código de confirmação.', status: 400 };
    }

    let record = null;

    if (tokenNormalizado) {
      record = await this.prisma.recuperacaoSenha.findUnique({ where: { token: tokenNormalizado } });
    }

    if (!record && emailNormalizado && codigoNormalizado) {
      const usuario = await this.prisma.usuario.findUnique({ where: { email: emailNormalizado } });
      if (usuario) {
        record = await this.prisma.recuperacaoSenha.findUnique({
          where: { usuarioId: usuario.id },
        });
      }
    }

    if (!record || record.used) {
      return { error: 'Token inválido ou já utilizado.', status: 400 };
    }

    if (codigoNormalizado && this._normalizarValor(record.codigo) !== codigoNormalizado) {
      return { error: 'Código de confirmação inválido.', status: 400 };
    }

    if (emailNormalizado) {
      const usuario = await this.prisma.usuario.findUnique({ where: { email: emailNormalizado } });
      if (!usuario || usuario.id !== record.usuarioId) {
        return { error: 'E-mail não corresponde ao token informado.', status: 400 };
      }
    }

    if (record.expiresAt < new Date()) {
      return { error: 'Token expirado.', status: 400 };
    }

    const passwordHash = this.hashPassword(senhaNormalizada);

    await this.prisma.usuario.update({
      where: { id: record.usuarioId },
      data: { passwordHash },
    });

    await this.prisma.recuperacaoSenha.update({
      where: { token: record.token },
      data: { used: true },
    });

    return { message: 'Senha redefinida com sucesso.' };
  }

  _normalizarValor(value) {
    if (value === null || typeof value === 'undefined') {
      return value;
    }
    return String(value).trim();
  }
}
