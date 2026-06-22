import { AgendaMedicaRepository } from '../repositories/agendaMedicaRepository.js';
import { parseAgendaMedicaRequest } from '../helpers/agendaMedicaHelpers.js';

const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terca-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sabado',
];

export class AgendaMedicaService {
  constructor(prisma) {
    this.repository = new AgendaMedicaRepository(prisma);
  }

  async cadastrar(body) {
    const parsed = parseAgendaMedicaRequest(body);
    if (parsed.error) {
      return { error: parsed.error, status: 400 };
    }
    return this.repository.criar(parsed);
  }

  async listar() {
    return this.repository.listar();
  }

  async filtrarDisponibilidade(especialidadeId) {
    if (!especialidadeId) {
      return { error: 'O campo especialidadeId e obrigatorio.', status: 400 };
    }

    const agendas = await this.repository.listarParaFiltro(especialidadeId);
    const disponibilidadePorMedico = new Map();

    for (const agenda of agendas) {
      if (!agenda.medico) {
        continue;
      }

      const estado = String(agenda.estado || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      if (estado && !['ativo', 'aberto', 'disponivel'].includes(estado)) {
        continue;
      }

      const medicoId = agenda.medico.id;
      if (!disponibilidadePorMedico.has(medicoId)) {
        disponibilidadePorMedico.set(medicoId, {
          id: medicoId,
          medicoId,
          especialidadeId: agenda.medico.especialidadeId,
          nome: agenda.medico.nome,
          mediconome: agenda.medico.nome,
          numeroOrdem: agenda.medico.numeroordem ?? null,
          numeroordem: agenda.medico.numeroordem ?? null,
          agendas: [],
          diasDisponiveis: [],
          diasSemanaDisponivel: [],
        });
      }

      const diaSemana = DIAS_SEMANA[agenda.data.getUTCDay()];
      const disponibilidade = disponibilidadePorMedico.get(medicoId);
      disponibilidade.agendas.push({
        id: agenda.id,
        agendaMedicaId: agenda.id,
        data: agenda.data,
        dataConsultas: agenda.data,
        horaInicio: agenda.horaInicio,
        horaFim: agenda.horaFim,
        estado: agenda.estado,
        diaSemana,
      });

      if (!disponibilidade.diasSemanaDisponivel.includes(diaSemana)) {
        disponibilidade.diasSemanaDisponivel.push(diaSemana);
        disponibilidade.diasDisponiveis.push(diaSemana);
      }
    }

    return Array.from(disponibilidadePorMedico.values());
  }

  async obterPorId(id) {
    const agenda = await this.repository.obterPorId(id);
    if (!agenda) {
      return { error: 'Agenda médica não encontrada.', status: 404 };
    }
    return agenda;
  }

  async atualizar(id, body) {
    const parsed = parseAgendaMedicaRequest(body, { partial: true });
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
