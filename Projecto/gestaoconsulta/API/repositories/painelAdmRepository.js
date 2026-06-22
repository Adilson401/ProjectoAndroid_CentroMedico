export class PainelAdmRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // Conta todos os medicos cadastrados.
  async contarMedicos() {
    return this.prisma.medico.count();
  }

  // Conta todos os usuarios cadastrados.
  async contarUsuarios() {
    return this.prisma.usuario.count();
  }

  // Conta as consultas registadas dentro do periodo informado.
  async contarConsultasNoPeriodo(dataInicio, dataFim) {
    return this.prisma.marcacao.count({
      where: {
        dataRegisto: {
          gte: dataInicio,
          lt: dataFim,
        },
      },
    });
  }

  // Lista as marcacoes registadas hoje com medico, especialidade e hora.
  async listarMarcacoesDeHoje(dataInicio, dataFim) {
    return this.prisma.marcacao.findMany({
      where: {
        dataRegisto: {
          gte: dataInicio,
          lt: dataFim,
        },
      },
      select: {
        id: true,
        dataConsultas: true,
        dataRegisto: true,
        estado: true,
        medico: {
          select: {
            id: true,
            nome: true,
            numeroordem: true,
            especialidade: {
              select: {
                nome: true,
              },
            },
          },
        },
        agendaMedica: {
          select: {
            horaInicio: true,
            horaFim: true,
          },
        },
      },
      orderBy: {
        dataRegisto: 'desc',
      },
    });
  }
}
