export function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.status && Number.isFinite(err.status) ? err.status : 500;
  const message = err.message || 'Erro interno do servidor.';

  res.status(status).json({ error: message });
}
