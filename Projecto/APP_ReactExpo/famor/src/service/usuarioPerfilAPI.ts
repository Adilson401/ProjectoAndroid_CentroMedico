import { api } from './api';

export interface UsuarioPerfil {
  nome: string;
  email: string;
  morada: string;
  funcao: string;
  dataRegisto: string;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function getPayload(data: any) {
  let payload = Array.isArray(data) ? data[0] : data;

  for (let index = 0; index < 3; index += 1) {
    if (!payload || typeof payload !== 'object') break;

    const nextPayload = payload.usuario ?? payload.perfil ?? payload.data;
    if (!nextPayload || nextPayload === payload) break;

    payload = Array.isArray(nextPayload) ? nextPayload[0] : nextPayload;
  }

  return payload ?? {};
}

function getFuncao(payload: any) {
  return firstString(
    payload?.funcao,
    payload?.funcaoNome,
    payload?.funcao?.nome,
    payload?.funcao?.descricao,
    payload?.role,
    payload?.tipoUsuario,
  );
}

function getErrorMessage(error: any) {
  const payload = error?.response?.data;

  if (typeof payload === 'string') return payload;
  if (typeof payload?.message === 'string') return payload.message;
  if (typeof payload?.msg === 'string') return payload.msg;
  if (typeof payload?.error === 'string') return payload.error;
  if (error?.message) return error.message;

  return 'Nao foi possivel carregar o perfil do usuario.';
}

export async function getUsuarioPerfil(): Promise<UsuarioPerfil> {
  try {
    const response = await api.get('/usuarioperfil');
    const payload = getPayload(response.data);

    return {
      nome: firstString(payload?.nome, payload?.name),
      email: firstString(payload?.email),
      morada: firstString(payload?.morada, payload?.endereco, payload?.address),
      funcao: getFuncao(payload),
      dataRegisto: firstString(payload?.dataRegisto, payload?.createdAt, payload?.created_at),
    };
  } catch (error: any) {
    console.error('getUsuarioPerfil error:', {
      message: getErrorMessage(error),
      response: error?.response ?? error,
    });
    throw new Error(getErrorMessage(error));
  }
}
