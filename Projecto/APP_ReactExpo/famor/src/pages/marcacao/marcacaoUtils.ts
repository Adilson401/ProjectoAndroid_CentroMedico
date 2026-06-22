export type SpecialtyLookup = Record<string, string>;

export function stringValue(value: unknown) {
  if (value === undefined || value === null || typeof value === 'object') {
    return '';
  }

  return String(value).trim();
}

export function firstStringValue(...values: unknown[]) {
  for (const value of values) {
    const text = stringValue(value);
    if (text) {
      return text;
    }
  }

  return '';
}

export function normalizeText(value: unknown) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getListPayload(data: any, keys: string[]) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
    if (Array.isArray(data?.dados?.[key])) return data.dados[key];
  }

  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.dados)) return data.dados;
  if (Array.isArray(data?.resultado)) return data.resultado;
  if (Array.isArray(data?.result)) return data.result;

  return [];
}

export function getSpecialtiesPayload(data: any) {
  return getListPayload(data, ['especialidades', 'especialidade', 'nomes']);
}

export function getSpecialtyId(value: any) {
  if (!value || typeof value !== 'object') {
    return '';
  }

  return firstStringValue(
    value?._id,
    value?.id,
    value?.especialidadeId,
    value?.especialidade_id,
    value?.idEspecialidade,
    value?.id_especialidade,
    value?.codigo,
  );
}

export function getSpecialtyName(value: any) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  return firstStringValue(
    value?.nome,
    value?.name,
    value?.especialidade,
    value?.especialidadeNome,
    value?.nomeEspecialidade,
    value?.descricao,
    value?.label,
    value?.especialidadeId?.nome,
    value?.especialidadeId?.name,
    value?.especialidade?.nome,
    value?.especialidade?.name,
  );
}

export function normalizeSpecialtyLookup(data: any) {
  const specialties = getSpecialtiesPayload(data) as any[];

  // Mapa simples: se a marcacao vier so com ID, aqui buscamos o nome certo.
  return specialties.reduce<SpecialtyLookup>((lookup, item: any) => {
    const name = getSpecialtyName(item);
    const id = getSpecialtyId(item) || name;

    if (id && name) {
      lookup[id] = name;
    }

    return lookup;
  }, {});
}

export function getSessionUsuarioId(usuarioSessao: any) {
  const payload =
    usuarioSessao?.usuario ||
    usuarioSessao?.raw?.usuario ||
    usuarioSessao?.raw?.user ||
    usuarioSessao?.raw?.perfil ||
    usuarioSessao?.raw;

  return firstStringValue(
    usuarioSessao?.usuarioId,
    payload?._id,
    payload?.id,
    payload?.usuarioId,
    payload?.usuario_id,
    payload?.idUsuario,
    payload?.id_usuario,
    usuarioSessao?.raw?._id,
    usuarioSessao?.raw?.id,
    usuarioSessao?.raw?.usuarioId,
    usuarioSessao?.raw?.usuario_id,
  );
}

export function getConsultationUsuarioId(item: any) {
  const usuario = item?.usuario || item?.usuarioId || item?.user || item?.paciente || item?.pacienteId || {};

  return firstStringValue(
    usuario?._id,
    usuario?.id,
    usuario?.usuarioId,
    usuario?.usuario_id,
    item?.usuarioId,
    item?.usuario_id,
    item?.idUsuario,
    item?.id_usuario,
    item?.pacienteId,
    item?.paciente_id,
  );
}

export function findNestedSpecialtyName(value: any, depth = 0): string {
  if (!value || typeof value !== 'object' || depth > 5) {
    return '';
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNestedSpecialtyName(item, depth + 1);
      if (found) return found;
    }

    return '';
  }

  const directName = firstStringValue(value?.especialidadeNome, value?.nomeEspecialidade, value?.specialtyName);
  if (directName) {
    return directName;
  }

  for (const key of ['especialidade', 'especialidadeId', 'specialty']) {
    const specialty = value?.[key];

    if (specialty && typeof specialty === 'object') {
      const specialtyName = firstStringValue(specialty?.nome, specialty?.name, specialty?.descricao, specialty?.label);
      if (specialtyName) {
        return specialtyName;
      }

      const nestedSpecialtyName = findNestedSpecialtyName(specialty, depth + 1);
      if (nestedSpecialtyName) {
        return nestedSpecialtyName;
      }
    }
  }

  for (const nestedValue of Object.values(value)) {
    const nestedSpecialtyName = findNestedSpecialtyName(nestedValue, depth + 1);
    if (nestedSpecialtyName) {
      return nestedSpecialtyName;
    }
  }

  return '';
}

export function resolveSpecialtyName(item: any, specialtyById: SpecialtyLookup = {}) {
  const medico = item?.medico || item?.medicoId || item?.doctor || item?.profissional || {};
  const especialidade = item?.especialidade || item?.especialidadeId || item?.specialty || {};
  const agenda = item?.agendaMedica || item?.agendaMedicaId || item?.agenda || {};
  const medicoEspecialidade = medico?.especialidade || medico?.especialidadeId || medico?.specialty || {};
  const agendaEspecialidade = agenda?.especialidade || agenda?.especialidadeId || agenda?.specialty || {};

  const specialtyId = firstStringValue(
    getSpecialtyId(especialidade),
    getSpecialtyId(medicoEspecialidade),
    getSpecialtyId(agendaEspecialidade),
    item?.especialidadeId,
    item?.especialidade_id,
    item?.idEspecialidade,
    item?.id_especialidade,
    medico?.especialidadeId,
    medico?.especialidade_id,
    agenda?.especialidadeId,
    agenda?.especialidade_id,
  );

  const specialtyRawText = firstStringValue(
    typeof item?.especialidade === 'string' ? item.especialidade : '',
    typeof item?.specialty === 'string' ? item.specialty : '',
    typeof item?.especialidadeId === 'string' ? item.especialidadeId : '',
    typeof medico?.especialidade === 'string' ? medico.especialidade : '',
    typeof medico?.especialidadeId === 'string' ? medico.especialidadeId : '',
    typeof agenda?.especialidade === 'string' ? agenda.especialidade : '',
    typeof agenda?.especialidadeId === 'string' ? agenda.especialidadeId : '',
  );

  // Ordem da busca: primeiro nome vindo da API, depois nome por ID, por fim texto cru.
  return firstStringValue(
    typeof especialidade === 'object' ? getSpecialtyName(especialidade) : '',
    typeof medicoEspecialidade === 'object' ? getSpecialtyName(medicoEspecialidade) : '',
    typeof agendaEspecialidade === 'object' ? getSpecialtyName(agendaEspecialidade) : '',
    item?.nomeEspecialidade,
    item?.especialidadeNome,
    item?.specialtyName,
    medico?.especialidadeNome,
    medico?.nomeEspecialidade,
    agenda?.especialidadeNome,
    agenda?.nomeEspecialidade,
    findNestedSpecialtyName(item),
    specialtyById[specialtyId],
    specialtyById[specialtyRawText],
    specialtyRawText,
    'Especialidade',
  );
}
