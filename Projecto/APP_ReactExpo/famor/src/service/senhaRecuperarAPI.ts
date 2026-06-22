import { api } from './api';
import { getApiResponseMessage } from './apiResponse';

export interface ResetPasswordData {
  email: string;
  token: string;
  passwordHash: string;
  password?: string;
  confirmPassword?: string;
  codigo?: string;
  codigoConfirmacao?: string;
}

function getErrorMessage(error: any): string {
  const responseMessage = getApiResponseMessage(error?.response?.data);
  if (responseMessage) return responseMessage;
  if (error?.message) return error.message;
  return 'Falha ao enviar o e-mail de recuperaÃ§Ã£o de senha.';
}

export async function recoverPassword(email: string) {
  try {
    const response = await api.post('/senha/recuperar', { email });
    return response.data;
  } catch (error: any) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

export async function resetPassword(data: ResetPasswordData) {
  const payload = {
    email: data.email,
    token: data.token,
    codigo: data.codigo,
    codigoConfirmacao: data.codigoConfirmacao,
    passwordHash: data.passwordHash,
    password: data.password || data.passwordHash,
    confirmPassword: data.confirmPassword || data.passwordHash,
  };

  const candidatePaths = [
    '/senha/redefinir',
    '/senha/resetar',
    '/senha/confirmar',
    '/senha/atualizar',
    '/usuarios/redefinir-senha',
    '/usuarios/reset-password',
  ];

  let lastError: any;

  for (const path of candidatePaths) {
    try {
      const response = await api.post(path, payload);
      return response.data;
    } catch (error: any) {
      lastError = error;

      if (error?.response?.status !== 404 && error?.response?.status !== 405) {
        const message = getErrorMessage(error);
        throw new Error(message);
      }
    }
  }

  const message = getErrorMessage(lastError);
  throw new Error(message);
}

