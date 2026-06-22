export class FuncaoRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async criar({ nome, descricao }) {
    return this.prisma.funcao.create({
      data: {
        nome,
        descricao,
      },
    });
  }

  async listar() {
    return this.prisma.funcao.findMany();
  }

  async obterPorId(id) {
    return this.prisma.funcao.findUnique({
      where: { id },
    });
  }

  async atualizar(id, { nome, descricao }) {
    return this.prisma.funcao.update({
      where: { id },
      data: {
        ...(nome !== undefined ? { nome } : {}),
        ...(descricao !== undefined ? { descricao } : {}),
      },
    });
  }

  async deletar(id) {
    return this.prisma.funcao.delete({
      where: { id },
    });
  }
}
