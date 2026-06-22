export function parseEspecialidadeRequest(body, options = {}) {
  const { nome, descricao, estado, dataRegisto } = body;

  if (!options.partial) {
    if (!nome || !descricao || !estado) {
      return { error: 'Os campos nome, descricao e estado são obrigatórios.' };
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
    ...(nome ? { nome } : {}),
    ...(descricao ? { descricao } : {}),
    ...(estado ? { estado } : {}),
    ...(parsedDateRegisto ? { dataRegisto: parsedDateRegisto } : {}),
  };
}
