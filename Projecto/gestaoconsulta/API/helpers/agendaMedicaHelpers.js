export function parseAgendaMedicaRequest(body, options = {}) {
  const { medicoId, data, horaInicio, horaFim, estado } = body;

  if (!options.partial) {
    if (!medicoId || !data || !horaInicio || !horaFim || !estado) {
      return { error: 'Os campos medicoId, data, horaInicio, horaFim e estado são obrigatórios.' };
    }
  }

  let parsedData = data;
  if (parsedData) {
    const date = new Date(parsedData);
    if (Number.isNaN(date.getTime())) {
      return { error: 'Data inválida.' };
    }
    parsedData = date;
  }

  return {
    ...(medicoId ? { medicoId } : {}),
    ...(parsedData ? { data: parsedData } : {}),
    ...(horaInicio ? { horaInicio } : {}),
    ...(horaFim ? { horaFim } : {}),
    ...(estado ? { estado } : {}),
  };
}
