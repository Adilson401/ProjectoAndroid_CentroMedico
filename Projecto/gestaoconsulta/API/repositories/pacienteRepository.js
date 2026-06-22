export class PacienteRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async criar({ nome, descricao, estado, dataRegisto, usuarioId }) {
    return this.prisma.paciente.create({
      data: {
        nome,
        descricao,
        estado,
        dataRegisto,
        usuarioId,
      },
    });
  }

  async listar() {
    return this.prisma.paciente.findMany();
  }

  async obterPorId(id) {
    return this.prisma.paciente.findUnique({
      where: { id },
    });
  }

  async atualizar(id, { nome, descricao, estado, dataRegisto, usuarioId }) {
    return this.prisma.paciente.update({
      where: { id },
      data: {
        ...(nome !== undefined ? { nome } : {}),
        ...(descricao !== undefined ? { descricao } : {}),
        ...(estado !== undefined ? { estado } : {}),
        ...(dataRegisto !== undefined ? { dataRegisto } : {}),
        ...(usuarioId !== undefined ? { usuarioId } : {}),
      },
    });
  }

  async deletar(id) {
    return this.prisma.paciente.delete({
      where: { id },
    });
  }
}
