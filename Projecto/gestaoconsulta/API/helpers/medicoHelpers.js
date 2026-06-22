export function parseMedicoRequest(body, options = {}) {
  const { nome, numeroordem, especialidadeId, estado, usuarioId } = body;

  if (!options.partial) {
    if (!nome || !especialidadeId || !estado || !usuarioId) {
      return { error: 'Os campos nome, especialidadeId, estado e usuarioId são obrigatórios.' };
    }
  }

  return {
    ...(nome ? { nome } : {}),
    ...(numeroordem ? { numeroordem } : {}),
    ...(especialidadeId ? { especialidadeId } : {}),
    ...(estado ? { estado } : {}),
    ...(usuarioId ? { usuarioId } : {}),
  };
}
