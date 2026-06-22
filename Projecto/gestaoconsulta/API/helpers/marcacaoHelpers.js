export function parseMarcacaoRequest(body, options = {}) {
  const {
    pacienteId,
    usuarioId,
    especialidadeId,
    medicoId,
    agendaMedicaId,
    dataConsultas,
    observacao,
    codigoConfirmacao,
    dataRegisto,
    estado,
  } = body;

  if (!options.partial) {
    if ((!pacienteId && !usuarioId) || !medicoId || !agendaMedicaId || !dataConsultas || !observacao || !codigoConfirmacao || !estado) {
      return {
        error:
          'Os campos pacienteId ou usuarioId, medicoId, agendaMedicaId, dataConsultas, observacao, codigoConfirmacao e estado sao obrigatorios.',
      };
    }
  }

  let parsedDataConsultas = dataConsultas;
  let parsedDataRegisto = dataRegisto;

  if (parsedDataConsultas) {
    const date = new Date(parsedDataConsultas);
    if (Number.isNaN(date.getTime())) {
      return { error: 'Data de consultas invalida.' };
    }
    parsedDataConsultas = date;
  }

  if (parsedDataRegisto) {
    const date = new Date(parsedDataRegisto);
    if (Number.isNaN(date.getTime())) {
      return { error: 'Data de registo invalida.' };
    }
    parsedDataRegisto = date;
  }

  return {
    ...(pacienteId ? { pacienteId } : {}),
    ...(usuarioId ? { usuarioId } : {}),
    ...(especialidadeId ? { especialidadeId } : {}),
    ...(medicoId ? { medicoId } : {}),
    ...(agendaMedicaId ? { agendaMedicaId } : {}),
    ...(parsedDataConsultas ? { dataConsultas: parsedDataConsultas } : {}),
    ...(observacao ? { observacao } : {}),
    ...(codigoConfirmacao ? { codigoConfirmacao } : {}),
    ...(parsedDataRegisto ? { dataRegisto: parsedDataRegisto } : {}),
    ...(estado ? { estado } : {}),
  };
}
