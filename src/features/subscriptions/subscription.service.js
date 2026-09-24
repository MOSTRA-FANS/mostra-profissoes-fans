'use strict';

const { AppError, ConflictError } = require('../../shared/errors/AppError');
const defaultRepository = require('./subscription.repository');

function createService(repository = defaultRepository) {
  return {
    async create(data) {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new AppError('Informe os dados do formulário.', 400);
      }
      if (typeof data.email !== 'string' || !data.email.trim()) {
        throw new AppError('Informe um e-mail válido.', 400);
      }
      const email = data.email.trim().toLowerCase();
      if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AppError('Informe um e-mail válido.', 400);
      }
      if (typeof data.curso !== 'string') {
        throw new AppError('Escolha um único curso atual.', 400);
      }
      const curso = data.curso.trim();
      const novo = data.novo == null || data.novo === '' ? null : data.novo;
      if (novo !== null && (typeof novo !== 'string' || !novo.trim())) {
        throw new AppError('Escolha no máximo um curso novo.', 400);
      }
      const normalizedNew = novo === null ? null : novo.trim();
      const currentCourses = await repository.listCurrentCourses();
      if (!currentCourses.includes(curso)) {
        throw new AppError('Curso atual inválido.', 400);
      }
      if (normalizedNew !== null) {
        const newCourses = await repository.listNewCourses();
        if (!newCourses.includes(normalizedNew)) {
          throw new AppError('Curso novo inválido.', 400);
        }
      }
      if (await repository.findByEmail(email)) {
        throw new ConflictError('Este e-mail já respondeu ao formulário.');
      }
      try {
        return await repository.create({ ...data, email, curso, novo: normalizedNew });
      } catch (error) {
        // Também cobre duas respostas simultâneas após a consulta inicial.
        if (error.code === 'ER_DUP_ENTRY') {
          throw new ConflictError('Este e-mail já respondeu ao formulário.');
        }
        throw error;
      }
    },
  };
}

module.exports = createService();
module.exports.createService = createService;
