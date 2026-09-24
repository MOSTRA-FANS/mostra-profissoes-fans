// Middleware global de erros: deve ser o ULTIMO app.use() do server.js.
// Express 5 encaminha automaticamente rejeicoes de handlers async para ca.
// Erros com statusCode/status (ex: AppError, JSON malformado) mantem o status;
// qualquer outro vira 500.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const rawStatus = Number(err.statusCode || err.status);
  const statusCode = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;
  const isServerError = statusCode >= 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isServerError) console.error(err); // ponytail: trocar pelo logger.js da Pessoa 1 quando existir

  let message = err.message || 'Erro interno do servidor';
  if (err.type === 'entity.parse.failed') message = 'JSON malformado no corpo da requisicao';
  if (isServerError && isProduction) message = 'Erro interno do servidor';

  const body = { status: 'error', message };
  if (!isProduction) body.stack = err.stack;

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
