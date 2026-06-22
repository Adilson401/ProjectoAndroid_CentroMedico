export function getApiResponseMessage(data: any): string {
  // Mantem as mensagens da API num so ponto, para nao repetir codigo nas telas.
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.msg === 'string') return data.msg;
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.detail === 'string') return data.detail;

  if (Array.isArray(data?.errors)) {
    return data.errors.map((item: any) => item?.message || item).join(', ');
  }

  return '';
}

export function getApiErrorMessage(error: any, fallbackMessage = 'Nao foi possivel concluir a operacao.') {
  const responseMessage = getApiResponseMessage(error?.response?.data);
  if (responseMessage) return responseMessage;

  if (error?.message) return error.message;

  return fallbackMessage;
}

export function getApiSuccessMessage(data: any, fallbackMessage = 'Operacao realizada com sucesso.') {
  const responseMessage = getApiResponseMessage(data);
  return responseMessage || fallbackMessage;
}
