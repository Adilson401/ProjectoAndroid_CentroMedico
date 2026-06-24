export class PainelAdmRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // Conta todos os medicos cadastrados.
  async contarMedicos() {
    return this.prisma.medico.count();
  }

  // Conta os usuarios activos, igual a listagem de usuarios.
  async contarUsuarios() {
    return this.prisma.usuario.count({
      where: { estado: 1 },
    });
  }

  // Conta as consultas agendadas dentro do periodo informado.
  async contarConsultasNoPeriodo(dataInicio, dataFim) {
    return this.prisma.marcacao.count({
      where: {
        dataConsultas: {
          gte: dataInicio,
          lt: dataFim,
        },
      },
    });
  }

  // Lista as marcacoes agendadas hoje com medico, especialidade e hora.
  async listarMarcacoesDeHoje(dataInicio, dataFim) {
    return this.prisma.marcacao.findMany({
      where: {
        dataConsultas: {
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
        dataConsultas: 'desc',
      },
    });
  }
}
