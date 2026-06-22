const PERFIL_PADRAO = {
  role: 'desconhecido',
  perfil: 'desconhecido',
  paginaInicial: null,
};

const ACESSOS_POR_ROLE = {
  administrador: {
    role: 'administrador',
    perfil: 'administrador',
    paginaInicial: 'indexadministrador.tsx',
  },
  paciente: {
    role: 'paciente',
    perfil: 'paciente',
    paginaInicial: 'indexcliente.tsx',
  },
  pacientes: {
    role: 'paciente',
    perfil: 'paciente',
    paginaInicial: 'indexcliente.tsx',
  },
  usuario: {
    role: 'paciente',
    perfil: 'paciente',
    paginaInicial: 'indexcliente.tsx',
  },
  medico: {
    role: 'medico',
    perfil: 'medico',
    paginaInicial: 'indexmedico.tsx',
  },
  recepcao: {
    role: 'recepcao',
    perfil: 'recepcao',
    paginaInicial: 'indexrecepcao.tsx',
  },
  recepcionista: {
    role: 'recepcao',
    perfil: 'recepcao',
    paginaInicial: 'indexrecepcao.tsx',
  },
};

function normalizarRole(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function obterAcessoUsuario(usuario) {
  const role = normalizarRole(usuario?.funcao?.nome);

  return ACESSOS_POR_ROLE[role] ?? PERFIL_PADRAO;
}
