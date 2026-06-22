import { PainelAdmRepository } from '../repositories/painelAdmRepository.js';

// Pega o intervalo do dia de hoje.
function obterIntervaloHoje() {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  return { inicio, fim };
}

// Tira acentos e deixa o estado mais facil de comparar.
function normalizarEstado(estado) {
  return String(estado || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function estaCancelada(marcacao) {
  return ['cancelado', 'cancelada', 'canceladas'].includes(normalizarEstado(marcacao.estado));
}

export class PainelAdmService {
  constructor(prisma) {
    this.repository = new PainelAdmRepository(prisma);
  }

  async obterResumo() {
    // Busca os totais todos de uma vez para responder mais rapido.
    const { inicio, fim } = obterIntervaloHoje();
    const [totalMedicos, totalUsuarios, totalConsultasHoje, marcacoesHoje] = await Promise.all([
      this.repository.contarMedicos(),
      this.repository.contarUsuarios(),
      this.repository.contarConsultasNoPeriodo(inicio, fim),
      this.repository.listarMarcacoesDeHoje(inicio, fim),
    ]);

    const medicosPorId = new Map();

    // Junta as consultas de hoje por medico e ignora as canceladas.
    for (const marcacao of marcacoesHoje) {
      if (!marcacao.medico || estaCancelada(marcacao)) {
        continue;
      }

      const medicoId = marcacao.medico.id;
      if (!medicosPorId.has(medicoId)) {
        medicosPorId.set(medicoId, {
          id: medicoId,
          medicoId,
          nome: marcacao.medico.nome,
          medico: marcacao.medico.nome,
          numeroOrdem: marcacao.medico.numeroordem ?? null,
          especialidade: marcacao.medico.especialidade?.nome ?? null,
          totalConsultasHoje: 0,
          consultasHoje: [],
        });
      }

      const medico = medicosPorId.get(medicoId);
      medico.totalConsultasHoje += 1;
      medico.consultasHoje.push({
        id: marcacao.id,
        data: marcacao.dataConsultas,
        dataRegisto: marcacao.dataRegisto,
        hora: marcacao.agendaMedica?.horaInicio ?? null,
        horaInicio: marcacao.agendaMedica?.horaInicio ?? null,
        horaFim: marcacao.agendaMedica?.horaFim ?? null,
        estado: marcacao.estado,
      });
    }

    const medicosEmConsulta = Array.from(medicosPorId.values());

    // Devolve nomes em maiusculo e minusculo para facilitar no Android.
    return {
      TotalMedicos: totalMedicos,
      TotalConsultasHoje: totalConsultasHoje,
      TotalConsultas: totalConsultasHoje,
      TotalUsuarios: totalUsuarios,
      MedicosEmConsulta: medicosEmConsulta,
      totalMedicos,
      totalConsultasHoje,
      totalConsultas: totalConsultasHoje,
      consultasHoje: totalConsultasHoje,
      total_consultas_hoje: totalConsultasHoje,
      totalUsuarios,
      medicosEmConsulta,
    };
  }
}
