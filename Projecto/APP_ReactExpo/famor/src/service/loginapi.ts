import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { getApiResponseMessage } from './apiResponse';

const TOKEN_STORAGE_KEY = '@famor:token';
const LOGIN_PATH = '/login';

export interface LoginSession {
  token: string;
  usuarioId: string;
  email: string;
  nome: string;
  funcao: string;
  dataRegisto: string;
  usuario: any;
  raw: any;
}

export async function setAuthToken(token: string | null, persist = true) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    if (persist) {
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } else {
    delete api.defaults.headers.common.Authorization;
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function getSavedToken() {
  const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
  return token;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function firstValueAsString(...values: unknown[]) {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    const text = String(value).trim();
    if (text) {
      return text;
    }
  }

  return '';
}

function getLoginPayload(data: any) {
  let payload = data;

  for (let index = 0; index < 3; index += 1) {
    if (!payload || typeof payload !== 'object') break;

    const nextPayload = payload.usuario ?? payload.user ?? payload.perfil ?? payload.data;
    if (!nextPayload || nextPayload === payload) break;

    payload = Array.isArray(nextPayload) ? nextPayload[0] : nextPayload;
  }

  return payload ?? {};
}

function getUsuarioId(payload: any, data: any) {
  const nestedUsuario = data?.usuario || data?.user || data?.perfil || data?.data?.usuario || data?.data?.user;

  return firstValueAsString(
    payload?._id,
    payload?.id,
    payload?.usuarioId,
    payload?.usuario_id,
    payload?.idUsuario,
    payload?.id_usuario,
    payload?.codigoUsuario,
    payload?.codigo_usuario,
    nestedUsuario?._id,
    nestedUsuario?.id,
    nestedUsuario?.usuarioId,
    nestedUsuario?.usuario_id,
    data?._id,
    data?.id,
    data?.usuarioId,
    data?.usuario_id,
    data?.idUsuario,
    data?.id_usuario,
  );
}

function getFuncao(payload: any, data: any) {
  return firstString(
    payload?.funcao,
    payload?.funcaoNome,
    payload?.funcao?.nome,
    payload?.funcao?.descricao,
    payload?.role,
    payload?.tipoUsuario,
    data?.funcao,
    data?.funcaoNome,
    data?.role,
    data?.tipoUsuario,
  );
}

function getErrorMessage(error: any): string {
  const responseMessage = getApiResponseMessage(error?.response?.data);
  if (responseMessage) return responseMessage;
  if (error?.message) return error.message;
  return 'Falha ao efetuar login.';
}

export async function loginUser(email: string, password: string, remember = true): Promise<LoginSession> {
  try {
    const response = await api.post(LOGIN_PATH, {
      email,
      passwordHash: password,
    });

    const payload = getLoginPayload(response.data);
    const token = response.data?.token || payload?.token;

    if (!token) {
      throw new Error(
        `Token nao retornado pelo servidor. status=${response.status} body=${JSON.stringify(
          response.data,
        )}`,
      );
    }

    await setAuthToken(token, remember);

    let sessionPayload = payload;
    let sessionData = response.data;

    if (!getFuncao(sessionPayload, sessionData)) {
      try {
        const perfilResponse = await api.get('/usuarioperfil');
        sessionPayload = getLoginPayload(perfilResponse.data);
        sessionData = perfilResponse.data;
      } catch (perfilError) {
        console.warn('Nao foi possivel obter funcao em /usuarioperfil:', perfilError);
      }
    }

    return {
      token,
      usuarioId: getUsuarioId(sessionPayload, sessionData),
      email: firstString(sessionPayload?.email, response.data?.email, email),
      nome: firstString(sessionPayload?.nome, sessionPayload?.name, response.data?.nome, response.data?.name),
      funcao: getFuncao(sessionPayload, sessionData),
      dataRegisto: firstString(
        sessionPayload?.dataRegisto,
        sessionPayload?.createdAt,
        sessionPayload?.created_at,
        response.data?.dataRegisto,
      ),
      usuario: sessionPayload,
      raw: response.data,
    };
  } catch (error: any) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

