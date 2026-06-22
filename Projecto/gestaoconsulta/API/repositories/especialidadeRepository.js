export class EspecialidadeRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async criar({ nome, descricao, estado, dataRegisto }) {
    return this.prisma.especialidade.create({
      data: {
        nome,
        descricao,
        estado,
        dataRegisto,
      },
    });
  }

  async listar() {
    return this.prisma.especialidade.findMany();
  }

  async listarNomes() {
    return this.prisma.especialidade.findMany({
      select: {
        id: true,
        nome: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async listarComMedicos() {
    return this.prisma.especialidade.findMany({
      include: {
        medicos: {
          select: {
            nome: true,
          },
        },
      },
    });
  }

  async obterPorId(id) {
    return this.prisma.especialidade.findUnique({
      where: { id },
    });
  }

  async atualizar(id, { nome, descricao, estado, dataRegisto }) {
    return this.prisma.especialidade.update({
      where: { id },
      data: {
        ...(nome !== undefined ? { nome } : {}),
        ...(descricao !== undefined ? { descricao } : {}),
        ...(estado !== undefined ? { estado } : {}),
        ...(dataRegisto !== undefined ? { dataRegisto } : {}),
      },
    });
  }

  async deletar(id) {
    return this.prisma.especialidade.delete({
      where: { id },
    });
  }
}
