export class UsuarioRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }
  async criar({ nome, morada, email, datanascimento, passwordHash, funcaoId, status, estado }) {
    return this.prisma.usuario.create({
      data: {
        nome,
        morada,
        email,
        datanascimento,
        passwordHash,
        funcaoId,
        status,
        estado: estado ?? 1,
      },
    });
  }

  async encontrarPorEmail(email) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  async encontrarPorId(id) {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  async encontrarPorEmailComFuncao(email) {
    return this.prisma.usuario.findUnique({
      where: { email },
      include: { funcao: true },
    });
  }

  async encontrarPerfilPorId(id) {
    return this.prisma.usuario.findUnique({
      where: { id },
      include: { funcao: true },
    });
  }
  // Mantem apenas uma confirmacao pendente por email.
  async criarConfirmacaoCadastro({ email, codigo, dados, expiresAt }) {
    return this.prisma.usuarioCadastroConfirmacao.upsert({
      where: { email },
      update: {
        codigo,
        dados,
        expiresAt,
      },
      create: {
        email,
        codigo,
        dados,
        expiresAt,
      },
    });
  }

  async encontrarConfirmacaoCadastro(email) {
    return this.prisma.usuarioCadastroConfirmacao.findUnique({ where: { email } });
  }

  async deletarConfirmacaoCadastro(email) {
    return this.prisma.usuarioCadastroConfirmacao.delete({ where: { email } });
  }
  async listar() {
    return this.prisma.usuario.findMany({
      where: { estado: 1 },
    });
  }

  async listarSimples() {
    // So mostra utilizadores activos.
    return this.prisma.usuario.findMany({
      where: { estado: 1 },
      include: { funcao: true },
    });
  }
  async atualizar(id, { nome, morada, email, datanascimento, dataRegisto, passwordHash, funcaoId, status, estado }) {
    // Campos vazios ficam fora do update.
    return this.prisma.usuario.update({
      where: { id },
      data: {
        nome,
        morada,
        email,
        datanascimento,
        dataRegisto,
        passwordHash,
        funcaoId,
        status,
        estado,
      },
    });
  }
  async deletar(id) {
    // Remocao logica: conserva o registo na base.
    return this.prisma.usuario.update({
      where: { id },
      data: {
        estado: 0,
      },
    });
  }
  async pesquisar({ nome, email, dataRange }) {
    const where = { estado: 1 };

    if (nome) {
      where.nome = { contains: nome, mode: 'insensitive' };
    }

    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }

    if (dataRange) {
      where.datanascimento = {
        gte: dataRange.start,
        lte: dataRange.end,
      };
    }

    return this.prisma.usuario.findMany({ where });
  }
}
