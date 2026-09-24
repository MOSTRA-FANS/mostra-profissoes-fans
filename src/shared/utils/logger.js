/**
 * Utilitário de logs (sem dependências externas).
 *
 * - Níveis: error < warn < info < debug (controlado por LOG_LEVEL).
 * - Desenvolvimento: saída legível e colorida.
 * - Produção: uma linha JSON por evento (fácil de indexar em ferramentas de log).
 * - `requestLogger`: middleware que registra método, rota, status, IP e tempo de resposta.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', debug: '\x1b[90m' };
const RESET = '\x1b[0m';

const isProduction = () => process.env.NODE_ENV === 'production';

function currentLevel() {
  const name = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[name] !== undefined ? LEVELS[name] : LEVELS.info;
}

/** Converte Errors em objetos serializáveis (JSON.stringify ignora message/stack). */
function serializeMeta(meta) {
  if (meta === undefined || meta === null) return undefined;
  if (meta instanceof Error) {
    return { name: meta.name, message: meta.message, stack: meta.stack };
  }
  if (typeof meta !== 'object') return { value: meta };

  const out = {};
  for (const [key, value] of Object.entries(meta)) {
    out[key] = value instanceof Error
      ? { name: value.name, message: value.message, stack: value.stack }
      : value;
  }
  return out;
}

function write(level, message, meta) {
  if (LEVELS[level] > currentLevel()) return;

  const timestamp = new Date().toISOString();
  const data = serializeMeta(meta);
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;

  if (isProduction()) {
    stream.write(`${JSON.stringify({ timestamp, level, message, ...(data ? { meta: data } : {}) })}\n`);
    return;
  }

  const tag = `${COLORS[level]}${level.toUpperCase().padEnd(5)}${RESET}`;
  const extra = data ? ` ${JSON.stringify(data)}` : '';
  stream.write(`[${timestamp}] ${tag} ${message}${extra}\n`);
}

const logger = {
  error: (message, meta) => write('error', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  info: (message, meta) => write('info', message, meta),
  debug: (message, meta) => write('debug', message, meta),
};

/**
 * Middleware de log de acessos. Deve ser registrado ANTES dos demais
 * middlewares (inclusive o rate limiter) para que respostas 429 também sejam logadas.
 */
function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](`${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs.toFixed(1)}ms`, {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}

module.exports = logger;
module.exports.requestLogger = requestLogger;
