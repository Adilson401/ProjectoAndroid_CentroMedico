export function parseFuncaoRequest(body, options = {}) {
  const { nome, descricao } = body;

  if (!options.partial) {
    if (!nome || !descricao) {
      return { error: 'Os campos nome e descricao são obrigatórios.' };
    }
  }

  return {
    ...(nome ? { nome } : {}),
    ...(descricao ? { descricao } : {}),
  };
}
