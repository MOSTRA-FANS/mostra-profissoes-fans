/**
 * Middlewares de limitação de requisições (express-rate-limit).
 *
 * Exporta:
 *  - globalLimiter:       aplicado por server.js em todas as rotas /api.
 *  - subscriptionLimiter: mais restrito; deve ser vinculado por subscription.routes.js
 *                         na rota POST /api/subscriptions.
 *
 * Ao exceder o limite, responde HTTP 429 com corpo JSON padronizado.
 */
const rateLimit = require('express-rate-limit');
const config = require('../../config/rateLimiter');
const logger = require('../utils/logger');

function buildLimiter(name, { windowMs, max, message }, extraOptions = {}) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7', // envia RateLimit-* e Retry-After
    legacyHeaders: false,       // desativa X-RateLimit-*
    validate: { trustProxy: false },
    ...extraOptions,
    handler: (req, res, _next, options) => {
      const resetTime = req.rateLimit && req.rateLimit.resetTime;
      const retryAfterSeconds = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(windowMs / 1000);

      logger.warn(`Rate limit excedido (${name})`, {
        ip: req.ip,
        method: req.method,
        path: req.originalUrl,
      });

      res.status(options.statusCode).json({
        status: 'error',
        message,
        retryAfterSeconds,
      });
    },
  });
}

const globalLimiter = buildLimiter('global', config.global, {
  // Endpoints de monitoramento não devem consumir a cota do IP
  skip: (req) => req.path === '/health',
});

const subscriptionLimiter = buildLimiter('subscription', config.subscription);

module.exports = { globalLimiter, subscriptionLimiter, buildLimiter };
