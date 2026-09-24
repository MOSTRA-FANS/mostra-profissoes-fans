'use strict';

const defaultService = require('./subscription.service');
const defaultRepository = require('./subscription.repository');
const logger = require('../../shared/utils/logger');

/**
 * Controller responsável por receber requisições HTTP,
 * coordenar a chamada aos serviços e retornar os status e dados apropriados.
 *
 * Suporta injeção de dependências para facilitar testes unitários e de integração.
 */
function createController({
  service = defaultService,
  repository = defaultRepository,
} = {}) {
  return {
    /**
     * Endpoint de criação de nova inscrição: POST /api/subscriptions
     *
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {import('express').NextFunction} next
     */
    async create(req, res, next) {
      try {
        const body = req.body || {};

        // Garante compatibilidade caso venha curso ou profissao_interesse
        const payload = {
          ...body,
          curso: body.curso || body.profissao_interesse,
        };

        const result = await service.create(payload);

        logger.info('Inscrição criada com sucesso', {
          id: result.id,
          email: result.email,
          curso: result.curso,
        });

        return res.status(201).json({
          status: 'success',
          message: 'Inscrição realizada com sucesso.',
          data: result,
        });
      } catch (error) {
        return next(error);
      }
    },

    /**
     * Endpoint de verificação de saúde e diagnóstico: GET /api/health
     * Monitora status do processo e conexão com a base de dados.
     *
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {import('express').NextFunction} next
     */
    async health(req, res, next) {
      try {
        let dbHealth = { isHealthy: false, latencyMs: null };

        if (repository && typeof repository.checkHealth === 'function') {
          dbHealth = await repository.checkHealth();
        }

        const isHealthy = Boolean(dbHealth && dbHealth.isHealthy);
        const statusCode = isHealthy ? 200 : 503;

        return res.status(statusCode).json({
          status: isHealthy ? 'ok' : 'degraded',
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
          database: {
            status: isHealthy ? 'connected' : 'disconnected',
            latencyMs: dbHealth.latencyMs ?? null,
            ...(dbHealth.error && { error: dbHealth.error }),
          },
        });
      } catch (error) {
        return next(error);
      }
    },

    /**
     * Endpoint de consulta dos catálogos de cursos: GET /api/courses
     * Facilita o consumo pelo frontend para preenchimento dinâmico de selects.
     *
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {import('express').NextFunction} next
     */
    async getCourses(req, res, next) {
      try {
        const currentCourses =
          typeof repository.listCurrentCourses === 'function'
            ? await repository.listCurrentCourses()
            : [];
        const newCourses =
          typeof repository.listNewCourses === 'function'
            ? await repository.listNewCourses()
            : [];

        return res.status(200).json({
          status: 'success',
          data: {
            cursos_atuais: currentCourses,
            cursos_novos: newCourses,
          },
        });
      } catch (error) {
        return next(error);
      }
    },
  };
}

const controller = createController();
module.exports = controller;
module.exports.createController = createController;
