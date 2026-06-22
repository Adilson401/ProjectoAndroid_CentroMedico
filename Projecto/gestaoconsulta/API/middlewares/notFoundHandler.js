export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Rota não encontrada.' });
}
