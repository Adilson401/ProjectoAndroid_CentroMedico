export function parsePacienteRequest(body, options = {}) {
  const { descricao, estado, dataRegisto, usuarioId } = body;

  if (!options.partial) {
    if (!descricao || !estado || !usuarioId) {
      return { error: 'Os campos descricao, estado e usuarioId são obrigatórios.' };
    }
  }

  let parsedDateRegisto = dataRegisto;
  if (parsedDateRegisto) {
    const date = new Date(parsedDateRegisto);
    if (Number.isNaN(date.getTime())) {
      return { error: 'Data de registo inválida.' };
    }
    parsedDateRegisto = date;
  }

  return {
    ...(descricao ? { descricao } : {}),
    ...(estado ? { estado } : {}),
    ...(parsedDateRegisto ? { dataRegisto: parsedDateRegisto } : {}),
    ...(usuarioId ? { usuarioId } : {}),
  };
}
