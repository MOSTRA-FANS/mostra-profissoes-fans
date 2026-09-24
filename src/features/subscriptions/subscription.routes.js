'use strict';

const { Router } = require('express');
const { subscriptionLimiter } = require('../../shared/middlewares/rateLimiter');
const validateRequest = require('../../shared/middlewares/validateRequest');
const { subscriptionSchema } = require('./subscription.schema');
const defaultController = require('./subscription.controller');

/**
 * Cria o roteador Express para a funcionalidade de inscrições e endpoints relacionados.
 * Suporta injeção de dependência do controller para facilitar testes e modularidade.
 *
 * @param {Object} [controller=defaultController]
 * @returns {import('express').Router}
 */
function createRouter(controller = defaultController) {
  const router = Router();

  /**
   * GET /api/health
   * Monitoramento e diagnóstico da integridade do backend e da conexão com o banco de dados.
   * Não consome cota do rate limiter (skip configurado em globalLimiter).
   */
  router.get('/health', controller.health);

  /**
   * GET /api/courses
   * Catálogo de cursos atuais e novos disponíveis para preenchimento no formulário.
   */
  if (typeof controller.getCourses === 'function') {
    router.get('/courses', controller.getCourses);
  }

  /**
   * POST /api/subscriptions
   * Criação de nova inscrição:
   * 1. subscriptionLimiter: mitigação contra abusos e DoS (anti-spam / anti-bot).
   * 2. validateRequest(subscriptionSchema): validação estrutural do payload com Zod.
   * 3. controller.create: orquestração da camada de serviço e resposta HTTP.
   */
  router.post(
    '/subscriptions',
    subscriptionLimiter,
    validateRequest(subscriptionSchema),
    controller.create
  );

  return router;
}

const router = createRouter();
module.exports = router;
module.exports.createRouter = createRouter;
