export class MarcacaoRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async criar({ pacienteId, medicoId, agendaMedicaId, dataConsultas, observacao, codigoConfirmacao, dataRegisto, estado }) {
    return this.prisma.marcacao.create({
      data: {
        pacienteId,
        medicoId,
        agendaMedicaId,
        dataConsultas,
        observacao,
        codigoConfirmacao,
        dataRegisto,
        estado,
      },
    });
  }

  async obterPacientePorId(id) {
    return this.prisma.paciente.findUnique({
      where: { id },
      select: {
        id: true,
        usuarioId: true,
      },
    });
  }

  async obterPacientePorUsuarioId(usuarioId) {
    return this.prisma.paciente.findUnique({
      where: { usuarioId },
      select: {
        id: true,
        usuarioId: true,
      },
    });
  }

  async obterUsuarioComFuncao(id) {
    return this.prisma.usuario.findUnique({
      where: { id },
      include: { funcao: true },
    });
  }

  async criarPacienteParaUsuario(usuarioId) {
    return this.prisma.paciente.create({
      data: {
        descricao: 'Paciente criado automaticamente a partir do usuario.',
        estado: 'Ativo',
        usuarioId,
      },
      select: {
        id: true,
        usuarioId: true,
      },
    });
  }

  async obterMedicoPorId(id) {
    return this.prisma.medico.findUnique({
      where: { id },
    });
  }

  async obterAgendaMedicaPorId(id) {
    return this.prisma.agendaMedica.findUnique({
      where: { id },
    });
  }

  async listar() {
    return this.prisma.marcacao.findMany();
  }

  async listarMarcacoesFeitas(pacienteId) {
    return this.prisma.marcacao.findMany({
      where: {
        pacienteId,
      },
      select: {
        id: true,
        medicoId: true,
        agendaMedicaId: true,
        dataConsultas: true,
        codigoConfirmacao: true,
        estado: true,
      },
      orderBy: {
        dataConsultas: 'desc',
      },
    });
  }

  async obterUltimaMarcacaoPorPaciente(pacienteId, dataInicio = null, dataFim = null) {
    const where = {
      pacienteId,
      ...(dataInicio && dataFim
        ? {
            dataConsultas: {
              gte: dataInicio,
              lt: dataFim,
            },
            OR: [
              { estado: 'Agendado' },
              { estado: 'agendado' },
              { estado: 'Agendada' },
              { estado: 'agendada' },
            ],
          }
        : {}),
    };

    return this.prisma.marcacao.findFirst({
      where,
      select: {
        id: true,
        codigoConfirmacao: true,
        dataConsultas: true,
        dataRegisto: true,
        estado: true,
        observacao: true,
        medico: {
          select: {
            id: true,
            nome: true,
            especialidade: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
        agendaMedica: {
          select: {
            id: true,
            horaInicio: true,
            horaFim: true,
          },
        },
      },
      orderBy: [
        {
          dataConsultas: 'desc',
        },
        {
          dataRegisto: 'desc',
        },
      ],
    });
  }

  async listarEstadosPorPaciente(pacienteId) {
    return this.prisma.marcacao.findMany({
      where: {
        pacienteId,
      },
      select: {
        estado: true,
      },
    });
  }

  async listarMedicosPorIds(ids) {
    return this.prisma.medico.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        nome: true,
        especialidadeId: true,
      },
    });
  }

  async listarEspecialidadesPorIds(ids) {
    return this.prisma.especialidade.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        nome: true,
      },
    });
  }

  async listarAgendasPorIds(ids) {
    return this.prisma.agendaMedica.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        horaInicio: true,
        horaFim: true,
      },
    });
  }

  async obterPorId(id) {
    return this.prisma.marcacao.findUnique({
      where: { id },
    });
  }

  async atualizarEstado(id, estado) {
    return this.prisma.marcacao.update({
      where: { id },
      data: { estado },
      select: {
        id: true,
        estado: true,
        codigoConfirmacao: true,
        dataConsultas: true,
      },
    });
  }

  async atualizar(id, { pacienteId, medicoId, agendaMedicaId, dataConsultas, observacao, codigoConfirmacao, dataRegisto, estado }) {
    return this.prisma.marcacao.update({
      where: { id },
      data: {
        ...(pacienteId !== undefined ? { pacienteId } : {}),
        ...(medicoId !== undefined ? { medicoId } : {}),
        ...(agendaMedicaId !== undefined ? { agendaMedicaId } : {}),
        ...(dataConsultas !== undefined ? { dataConsultas } : {}),
        ...(observacao !== undefined ? { observacao } : {}),
        ...(codigoConfirmacao !== undefined ? { codigoConfirmacao } : {}),
        ...(dataRegisto !== undefined ? { dataRegisto } : {}),
        ...(estado !== undefined ? { estado } : {}),
      },
    });
  }

  async deletar(id) {
    return this.prisma.marcacao.delete({
      where: { id },
    });
  }
}

