import { api } from './api';
import { getApiResponseMessage } from './apiResponse';

export interface RegistrationData {
  nome: string;
  morada: string;
  email: string;
  datanascimento: string;
  dataRegisto: string;
  funcaoId: string;
  passwordHash: string;
  status: string;
}

export interface VerificationCodeData {
  email: string;
  codigo: string;
  codigoConfirmacao?: string;
}

function getErrorMessage(error: any): string {
  const responseMessage = getApiResponseMessage(error?.response?.data);

  if (responseMessage) {
    return responseMessage;
  }

  const messageText = (error?.message || '').toLowerCase();

  if (error?.code === 'ERR_NETWORK' || messageText.includes('network error') || messageText.includes('failed to fetch')) {
    return 'NÃ£o foi possÃ­vel ligar ao servidor. Verifique a ligaÃ§Ã£o ou o endereÃ§o da API.';
  }

  if (error?.response?.status === 404) {
    return 'A API nÃ£o respondeu na rota correta. Verifique se o endereÃ§o do servidor estÃ¡ correto.';
  }

  if (error?.response?.status === 500) {
    return 'O servidor encontrou um erro. Tente novamente mais tarde.';
  }

  if (messageText.includes('email') && (messageText.includes('exist') || messageText.includes('jÃ¡'))) {
    return 'Este e-mail jÃ¡ estÃ¡ a ser usado por outra conta.';
  }

  if (messageText.includes('codigo') && (messageText.includes('expir') || messageText.includes('expired'))) {
    return 'O cÃ³digo expirou. PeÃ§a um novo cÃ³digo.';
  }

  if (messageText.includes('codigo') && (messageText.includes('inv') || messageText.includes('incor') || messageText.includes('inval'))) {
    return 'O cÃ³digo inserido estÃ¡ incorreto. Verifique o cÃ³digo recebido.';
  }

  return 'NÃ£o foi possÃ­vel concluir o cadastro.';
}

export async function registerUser(data: RegistrationData) {

  try {
    const response = await api.post('/usuarios', data);

    return response.data;
  } catch (error: any) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

export async function registerUserByAdmin(data: RegistrationData) {

  try {
    const response = await api.post('/usuarios/cadastro-admin', data);

    return response.data;
  } catch (error: any) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

export async function verifyRegistrationCode(data: VerificationCodeData) {

  const payload = {
    email: data.email,
    codigo: data.codigo,
    codigoConfirmacao: data.codigoConfirmacao ?? data.codigo,
  };

  try {
    const response = await api.post('/usuarios/confirmar', payload);

    return response.data;
  } catch (error: any) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}


