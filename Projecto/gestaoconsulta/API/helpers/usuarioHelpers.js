
export function parseUsuarioRequest(body, options = {}) {
  const {
    nome,
    morada,
    email: emailField,
    'e-mail': emailHyphen,
    datanascimento,
    idade,
    senha,
    password,
    passwordHash,
    token,
    funcaoId,
    status,
    estado,
    dataRegisto,
  } = body;

  const email = emailField ?? emailHyphen;
  let dataNascimento = datanascimento;
  let senhaValor = password ?? senha ?? passwordHash;
  const parsedFuncaoId = funcaoId;
  const estadoNumerico = Number(estado);
  const estadoEhNumerico = estado !== '' && Number.isInteger(estadoNumerico);
  const statusValor = status ?? (!estadoEhNumerico && typeof estado === 'string' ? estado : undefined);

  // Quando vem idade, calcula a data de nascimento.
  if (!dataNascimento && typeof idade !== 'undefined') {
    const years = Number(idade);
    if (!Number.isFinite(years) || years <= 0) {
      return { error: 'Idade inválida.' };
    }

    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - years);
    dataNascimento = birthDate.toISOString();
  }

  // No cadastro exige tudo; no editar aceita campos soltos.
  if (!options.partial) {
    if (!nome || !email || !dataNascimento || !senhaValor || !statusValor) {
      return {
        error:
          'Os campos nome, email, datanascimento, password e status são obrigatórios.',
      };
    }
  }

  if (dataNascimento) {
    const parsedDate = new Date(dataNascimento);
    if (Number.isNaN(parsedDate.getTime())) {
      return { error: 'Data de nascimento inválida.' };
    }
    dataNascimento = parsedDate;
  }

  // Garante que a data de registo esta no formato certo.
  let dataRegistro = dataRegisto;
  if (dataRegistro) {
    const parsedDate = new Date(dataRegistro);
    if (Number.isNaN(parsedDate.getTime())) {
      return { error: 'Data de registo invalida.' };
    }
    dataRegistro = parsedDate;
  }

  return {
    ...(nome ? { nome } : {}),
    ...(morada ? { morada } : {}),
    ...(email ? { email } : {}),
    ...(dataNascimento ? { datanascimento: dataNascimento } : {}),
    ...(dataRegistro ? { dataRegisto: dataRegistro } : {}),
    ...(senhaValor ? { passwordHash: senhaValor } : {}),
    ...(parsedFuncaoId ? { funcaoId: parsedFuncaoId } : {}),
    ...(statusValor ? { status: statusValor } : {}),
    ...(estadoEhNumerico ? { estado: estadoNumerico } : {}),
  };
}

export function parseLoginRequest(body) {
  const {
    email: emailField,
    'e-mail': emailHyphen,
    password,
    senha,
    passwordHash,
    token,
  } = body;

  const email = emailField ?? emailHyphen;
  const credentials = password ?? senha ?? passwordHash ?? token;

  if (!email || !credentials) {
    return { error: 'Email e token/passwordHash são obrigatórios.' };
  }

  return { email, credentials };
}

export function parseUsuarioSearchQuery(query) {
  const nome = typeof query.nome === 'string' ? query.nome.trim() : undefined;
  const email = typeof query.email === 'string' ? query.email.trim() : undefined;
  const datanascimento =
    typeof query.datanascimento === 'string' ? query.datanascimento.trim() : undefined;

  return {
    nome: nome || undefined,
    email: email || undefined,
    datanascimento: datanascimento || undefined,
  };
}

export function parseDateRange(dateString) {
  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) {
    return { error: 'Data de nascimento inválida.' };
  }

  const start = new Date(parsedDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(parsedDate);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}
