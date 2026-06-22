import { MarcacaoRepository } from '../repositories/marcacaoRepository.js';
import { parseMarcacaoRequest } from '../helpers/marcacaoHelpers.js';
import { obterAcessoUsuario } from '../helpers/perfilUsuario.js';

const ESTADOS_MARCACAO = {
  agendado: { estado: 'Agendado', cor: '#2563EB' },
  consultado: { estado: 'Consultado', cor: '#16A34A' },
  cancelado: { estado: 'Cancelado', cor: '#DC2626' },
  pendente: { estado: 'Pendente', cor: '#D97706' },
};

function obterEstadoMarcacao(estado) {
  const key = String(estado || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  return ESTADOS_MARCACAO[key] ?? null;
}

function normalizarEstado(estado) {
  return String(estado || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function obterIntervaloHoje() {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  return { inicio, fim };
}

export class MarcacaoService {
  constructor(prisma) {
    this.repository = new MarcacaoRepository(prisma);
  }

  async cadastrar(body) {
    const parsed = parseMarcacaoRequest(body);
    if (parsed.error) {
      return { error: parsed.error, status: 400 };
    }

    const paciente = await this.obterOuCriarPaciente(parsed);
    if (!paciente) {
      return { error: 'Paciente informado nao encontrado.', status: 404 };
    }
    parsed.pacienteId = paciente.id;
    delete parsed.usuarioId;

    const medico = await this.repository.obterMedicoPorId(parsed.medicoId);
    if (!medico) {
      return { error: 'Medico informado nao encontrado.', status: 404 };
    }

    if (parsed.especialidadeId && medico.especialidadeId !== parsed.especialidadeId) {
      return { error: 'Medico nao pertence a especialidade selecionada.', status: 400 };
    }
    delete parsed.especialidadeId;

    const agenda = await this.repository.obterAgendaMedicaPorId(parsed.agendaMedicaId);
    if (!agenda) {
      return { error: 'Agenda medica informada nao encontrada.', status: 404 };
    }

    if (agenda.medicoId !== parsed.medicoId) {
      return { error: 'Agenda medica nao pertence ao medico informado.', status: 400 };
    }

    return this.repository.criar(parsed);
  }

  async obterOuCriarPaciente(parsed) {
    if (parsed.pacienteId) {
      return this.repository.obterPacientePorId(parsed.pacienteId);
    }

    const usuario = await this.repository.obterUsuarioComFuncao(parsed.usuarioId);
    if (!usuario) {
      return null;
    }

    const acesso = obterAcessoUsuario(usuario);
    if (acesso.role !== 'paciente') {
      return null;
    }

    const pacienteExistente = await this.repository.obterPacientePorUsuarioId(parsed.usuarioId);
    if (pacienteExistente) {
      return pacienteExistente;
    }

    return this.repository.criarPacienteParaUsuario(parsed.usuarioId);
  }

  async listar() {
    return this.repository.listar();
  }

  async listarMarcacoesFeitas(usuarioId) {
    if (!usuarioId) {
      return { error: 'Usuario autenticado nao encontrado.', status: 401 };
    }

    const paciente = await this.repository.obterPacientePorUsuarioId(usuarioId);
    if (!paciente) {
      return [];
    }

    const marcacoes = await this.repository.listarMarcacoesFeitas(paciente.id);
    const medicoIds = [...new Set(marcacoes.map((marcacao) => marcacao.medicoId).filter(Boolean))];
    const agendaIds = [...new Set(marcacoes.map((marcacao) => marcacao.agendaMedicaId).filter(Boolean))];

    const medicos = medicoIds.length ? await this.repository.listarMedicosPorIds(medicoIds) : [];
    const especialidadeIds = [...new Set(medicos.map((medico) => medico.especialidadeId).filter(Boolean))];
    const especialidades = especialidadeIds.length
      ? await this.repository.listarEspecialidadesPorIds(especialidadeIds)
      : [];
    const agendas = agendaIds.length ? await this.repository.listarAgendasPorIds(agendaIds) : [];

    const medicosPorId = new Map(medicos.map((medico) => [medico.id, medico]));
    const especialidadesPorId = new Map(especialidades.map((especialidade) => [especialidade.id, especialidade]));
    const agendasPorId = new Map(agendas.map((agenda) => [agenda.id, agenda]));

    return marcacoes.map((marcacao) => {
      const medico = medicosPorId.get(marcacao.medicoId);
      const especialidade = medico ? especialidadesPorId.get(medico.especialidadeId) : null;
      const agenda = agendasPorId.get(marcacao.agendaMedicaId);

      return {
        id: marcacao.id,
        medicoNome: medico?.nome ?? null,
        especialidade: especialidade?.nome ?? null,
        data: marcacao.dataConsultas,
        horaInicio: agenda?.horaInicio ?? null,
        horaFim: agenda?.horaFim ?? null,
        codigoConfirmacao: marcacao.codigoConfirmacao,
        estado: marcacao.estado,
        estadoCor: obterEstadoMarcacao(marcacao.estado)?.cor ?? null,
      };
    });
  }

  async obterUltimaMarcacao(usuarioId) {
    if (!usuarioId) {
      return { error: 'Usuario autenticado nao encontrado.', status: 401 };
    }

    const paciente = await this.repository.obterPacientePorUsuarioId(usuarioId);
    if (!paciente) {
      return null;
    }

    const { inicio, fim } = obterIntervaloHoje();
    const marcacao = await this.repository.obterUltimaMarcacaoPorPaciente(paciente.id, inicio, fim);
    if (!marcacao) {
      return null;
    }

    const medico = marcacao.medico?.nome ?? null;
    const especialidade = marcacao.medico?.especialidade?.nome ?? null;

    // Resposta alinhada com o cartao "Proximas Consultas" da app.
    return {
      id: marcacao.id,
      Medico: medico,
      Especialidade: especialidade,
      medico,
      medicoId: marcacao.medico?.id ?? null,
      especialidade,
      especialidadeId: marcacao.medico?.especialidade?.id ?? null,
      data: marcacao.dataConsultas,
      dataConsultas: marcacao.dataConsultas,
      hora: marcacao.agendaMedica?.horaInicio ?? null,
      horaInicio: marcacao.agendaMedica?.horaInicio ?? null,
      horaFim: marcacao.agendaMedica?.horaFim ?? null,
      agendaMedicaId: marcacao.agendaMedica?.id ?? null,
      codigoConfirmacao: marcacao.codigoConfirmacao,
      observacao: marcacao.observacao,
      estado: marcacao.estado,
      estadoCor: obterEstadoMarcacao(marcacao.estado)?.cor ?? null,
    };
  }

  async obterTotaisConsultas(usuarioId) {
    if (!usuarioId) {
      return { error: 'Usuario autenticado nao encontrado.', status: 401 };
    }

    const paciente = await this.repository.obterPacientePorUsuarioId(usuarioId);
    if (!paciente) {
      return {
        totalConsultas: 0,
        concluidas: 0,
        canceladas: 0,
      };
    }

    const marcacoes = await this.repository.listarEstadosPorPaciente(paciente.id);
    const totais = marcacoes.reduce(
      (acc, marcacao) => {
        const estado = normalizarEstado(marcacao.estado);
        acc.totalConsultas += 1;

        if (['consultado', 'concluido', 'concluida', 'concluidas'].includes(estado)) {
          acc.concluidas += 1;
        }

        if (['cancelado', 'cancelada', 'canceladas'].includes(estado)) {
          acc.canceladas += 1;
        }

        return acc;
      },
      {
        totalConsultas: 0,
        concluidas: 0,
        canceladas: 0,
      }
    );

    return {
      TotalConsultas: totais.totalConsultas,
      Concluidas: totais.concluidas,
      Canceladas: totais.canceladas,
      totalConsultas: totais.totalConsultas,
      concluidas: totais.concluidas,
      canceladas: totais.canceladas,
    };
  }

  async atualizarEstado(id, body) {
    const parsedEstado = obterEstadoMarcacao(body?.estado);
    if (!parsedEstado) {
      return {
        error: 'Estado invalido. Use Agendado, Consultado, Cancelado ou Pendente.',
        status: 400,
      };
    }

    const marcacao = await this.repository.atualizarEstado(id, parsedEstado.estado);
    return {
      ...marcacao,
      estadoCor: parsedEstado.cor,
    };
  }

  async obterPorId(id) {
    const marcacao = await this.repository.obterPorId(id);
    if (!marcacao) {
      return { error: 'Marcação não encontrada.', status: 404 };
    }
    return marcacao;
  }

  async atualizar(id, body) {
    const parsed = parseMarcacaoRequest(body, { partial: true });
    if (parsed.error) {
      return { error: parsed.error, status: 400 };
    }
    if (Object.keys(parsed).length === 0) {
      return { error: 'Informe pelo menos um campo para atualizar.', status: 400 };
    }
    return this.repository.atualizar(id, parsed);
  }

  async deletar(id) {
    return this.repository.deletar(id);
  }
}


