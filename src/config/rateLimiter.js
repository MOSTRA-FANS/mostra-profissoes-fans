/**
 * Parâmetros globais do rate limiter.
 * Todos os valores podem ser sobrescritos via variáveis de ambiente (.env).
 */
require('dotenv').config();

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

module.exports = {
  // Limite geral aplicado a todas as rotas /api
  global: {
    windowMs: toPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * MINUTE),
    max: toPositiveInt(process.env.RATE_LIMIT_MAX, 100),
    message: 'Muitas requisições realizadas. Tente novamente mais tarde.',
  },

  // Limite estrito para o envio do formulário de inscrição (anti-spam / anti-bot)
  subscription: {
    windowMs: toPositiveInt(process.env.SUBSCRIPTION_RATE_LIMIT_WINDOW_MS, HOUR),
    max: toPositiveInt(process.env.SUBSCRIPTION_RATE_LIMIT_MAX, 5),
    message: 'Limite de tentativas de inscrição excedido. Tente novamente mais tarde.',
  },
};
