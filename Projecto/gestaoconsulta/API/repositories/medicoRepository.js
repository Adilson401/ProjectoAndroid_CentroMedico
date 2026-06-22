export class MedicoRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async criar({ nome, numeroordem, especialidadeId, estado, usuarioId }) {
    return this.prisma.medico.create({
      data: {
        nome,
        numeroordem,
        especialidadeId,
        estado,
        usuarioId,
      },
    });
  }

  async obterUsuarioComFuncao(usuarioId) {
    return this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { funcao: true },
    });
  }

  async listar() {
    return this.prisma.medico.findMany();
  }

  async obterPorId(id) {
    return this.prisma.medico.findUnique({
      where: { id },
    });
  }

  async atualizar(id, { nome, numeroordem, especialidadeId, estado, usuarioId }) {
    return this.prisma.medico.update({
      where: { id },
      data: {
        ...(nome !== undefined ? { nome } : {}),
        ...(numeroordem !== undefined ? { numeroordem } : {}),
        ...(especialidadeId !== undefined ? { especialidadeId } : {}),
        ...(estado !== undefined ? { estado } : {}),
        ...(usuarioId !== undefined ? { usuarioId } : {}),
      },
    });
  }

  async deletar(id) {
    return this.prisma.medico.delete({
      where: { id },
    });
  }
}
