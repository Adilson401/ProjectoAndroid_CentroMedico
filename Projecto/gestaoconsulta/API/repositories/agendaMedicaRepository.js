export class AgendaMedicaRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async criar({ medicoId, data, horaInicio, horaFim, estado }) {
    return this.prisma.agendaMedica.create({
      data: {
        medicoId,
        data,
        horaInicio,
        horaFim,
        estado,
      },
    });
  }

  async listar() {
    return this.prisma.agendaMedica.findMany();
  }

  async listarParaFiltro(especialidadeId) {
    try {
      return await this.listarParaFiltroComNumeroOrdem(especialidadeId);
    } catch (error) {
      if (!String(error?.message || '').includes('numeroordem')) {
        throw error;
      }
      return this.listarParaFiltroSemNumeroOrdem(especialidadeId);
    }
  }

  async listarParaFiltroComNumeroOrdem(especialidadeId) {
    return this.prisma.agendaMedica.findMany({
      where: {
        medico: {
          especialidadeId,
        },
      },
      include: {
        medico: {
          select: {
            id: true,
            nome: true,
            numeroordem: true,
            especialidadeId: true,
          },
        },
      },
      orderBy: {
        data: 'asc',
      },
    });
  }

  async listarParaFiltroSemNumeroOrdem(especialidadeId) {
    return this.prisma.agendaMedica.findMany({
      where: {
        medico: {
          especialidadeId,
        },
      },
      include: {
        medico: {
          select: {
            id: true,
            nome: true,
            especialidadeId: true,
          },
        },
      },
      orderBy: {
        data: 'asc',
      },
    });
  }

  async obterPorId(id) {
    return this.prisma.agendaMedica.findUnique({
      where: { id },
    });
  }

  async atualizar(id, { medicoId, data, horaInicio, horaFim, estado }) {
    return this.prisma.agendaMedica.update({
      where: { id },
      data: {
        ...(medicoId !== undefined ? { medicoId } : {}),
        ...(data !== undefined ? { data } : {}),
        ...(horaInicio !== undefined ? { horaInicio } : {}),
        ...(horaFim !== undefined ? { horaFim } : {}),
        ...(estado !== undefined ? { estado } : {}),
      },
    });
  }

  async deletar(id) {
    return this.prisma.agendaMedica.delete({
      where: { id },
    });
  }
}
