/**
 * Ponto de entrada do backend — Amostra de Profissões.
 *
 * Responsabilidades desta camada (Pessoa 1):
 *  - carregar variáveis de ambiente;
 *  - configurar Express, segurança (helmet, CORS, rate limit) e parsing de JSON;
 *  - conectar as rotas das features e o tratamento global de erros;
 *  - subir o servidor com encerramento gracioso e captura de falhas fatais.
 *
 * O `app` é exportado para permitir testes de integração (Supertest) sem abrir porta.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const logger = require('./shared/utils/logger');
const { requestLogger } = logger;
const { globalLimiter } = require('./shared/middlewares/rateLimiter');

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Carrega um módulo que pode ainda não existir (módulos das Pessoas 2–5 durante o
 * desenvolvimento paralelo). Só ignora a ausência do próprio módulo: erros de
 * sintaxe ou dependências quebradas dentro dele continuam sendo propagados.
 */
function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes(modulePath.replace('./', ''))) {
      return null;
    }
    throw err;
  }
}

function parseTrustProxy(value) {
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  const hops = Number.parseInt(value, 10);
  return Number.isNaN(hops) ? value : hops; // número de proxies ou lista/sub-rede
}

function resolveAllowedOrigins() {
  const raw = process.env.CLIENT_ORIGIN;

  if (raw) {
    return raw.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);
  }
  if (IS_PRODUCTION) {
    throw new Error('CLIENT_ORIGIN é obrigatório em produção (defina o domínio do frontend).');
  }
  // Padrão de desenvolvimento: Live Server do VS Code
  return ['http://localhost:5500', 'http://127.0.0.1:5500'];
}

/* ------------------------------------------------------------------ */
/* Aplicação Express                                                   */
/* ------------------------------------------------------------------ */

const app = express();
const allowedOrigins = resolveAllowedOrigins();

app.disable('x-powered-by');
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

// Segurança de cabeçalhos HTTP
app.use(helmet());

// CORS restrito ao(s) domínio(s) do frontend.
// Requisições sem cabeçalho Origin (curl, Postman, health checks) não são afetadas.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      logger.warn('Origem bloqueada por CORS', { origin });
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    maxAge: 600,
  })
);

// Log de acessos: antes do rate limiter para registrar também os 429
app.use(requestLogger);

// Parsing de JSON com limite de tamanho (payload de formulário é pequeno)
app.use(express.json({ limit: '10kb' }));

// Rate limit global para toda a API
app.use('/api', globalLimiter);

/* ------------------------------------------------------------------ */
/* Rotas das features                                                  */
/* ------------------------------------------------------------------ */

// Contrato de montagem: o router é montado em "/api", portanto
// subscription.routes.js deve declarar "/subscriptions" e "/health".
const subscriptionRoutes = loadOptional('./features/subscriptions/subscription.routes');

if (subscriptionRoutes) {
  app.use('/api', subscriptionRoutes);
} else {
  logger.warn('subscription.routes.js ainda não disponível — rotas de inscrição não montadas.');
}

// Rota informativa na raiz para facilitar acesso pelo navegador
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend da Mostra de Profissões está online!',
    endpoints: {
      health: '/api/health',
      courses: '/api/courses',
      subscriptions: '/api/subscriptions',
    },
  });
});

// 404 para rotas inexistentes
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Rota não encontrada.' });
});

/* ------------------------------------------------------------------ */
/* Tratamento global de erros                                          */
/* ------------------------------------------------------------------ */

// Usa o errorHandler da Pessoa 3 quando disponível; caso contrário, aplica um
// fallback mínimo (sem vazar stack trace em produção).
const errorHandler =
  loadOptional('./shared/middlewares/errorHandler') ||
  // eslint-disable-next-line no-unused-vars
  ((err, req, res, _next) => {
    const status = err.statusCode || err.status || 500;
    if (status >= 500) {
      logger.error('Erro não tratado', { error: err, path: req.originalUrl });
    } else {
      logger.warn('Requisição rejeitada', { status, reason: err.message, path: req.originalUrl });
    }

    const message =
      err.type === 'entity.parse.failed' ? 'JSON inválido no corpo da requisição.'
      : err.type === 'entity.too.large' ? 'Corpo da requisição excede o tamanho permitido.'
      : status >= 500 && IS_PRODUCTION ? 'Erro interno do servidor.'
      : err.message || 'Erro interno do servidor.';

    res.status(status).json({ status: 'error', message });
  });

app.use(errorHandler);

/* ------------------------------------------------------------------ */
/* Inicialização e encerramento gracioso                               */
/* ------------------------------------------------------------------ */

function start() {
  const server = app.listen(PORT, () => {
    logger.info(`Servidor rodando na porta ${PORT} [${NODE_ENV}]`, { allowedOrigins });
  });

  server.on('error', (err) => {
    logger.error(
      err.code === 'EADDRINUSE' ? `Porta ${PORT} já está em uso.` : 'Falha ao iniciar o servidor',
      { error: err }
    );
    process.exit(1);
  });

  let shuttingDown = false;
  const shutdown = (reason, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Encerrando servidor (${reason})...`);

    server.close(() => {
      logger.info('Servidor encerrado.');
      process.exit(exitCode);
    });

    // Força a saída se conexões pendentes impedirem o encerramento
    setTimeout(() => {
      logger.error('Encerramento forçado após timeout.');
      process.exit(exitCode || 1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Promise rejeitada sem catch: registra e mantém o servidor de pé
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection', { error: reason instanceof Error ? reason : new Error(String(reason)) });
  });

  // Exceção síncrona fora de qualquer handler: estado indefinido → encerra de forma limpa
  process.on('uncaughtException', (err) => {
    logger.error('uncaughtException', { error: err });
    shutdown('uncaughtException', 1);
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = app;
module.exports.start = start;
