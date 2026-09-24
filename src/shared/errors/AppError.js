'use strict';

/**
 * Erro conhecido da aplicação. O errorHandler deve usar statusCode para
 * definir a resposta e enviar somente a mensagem, sem expor a stack.
 * Use mensagens públicas, sem dados pessoais ou detalhes internos.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);

    this.name = new.target.name;
    this.statusCode = statusCode;

    Error.captureStackTrace?.(this, new.target);
  }
}

/** Conflito com um registro existente, como e-mail duplicado. */
class ConflictError extends AppError {
  constructor(message = 'Já existe um registro com os dados informados.') {
    super(message, 409);
  }
}

/** Dados válidos que não atendem a uma regra de negócio. */
class BusinessError extends AppError {
  constructor(message = 'A operação não atende às regras de negócio.') {
    super(message, 422);
  }
}

/** Recurso solicitado não encontrado. */
class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado.') {
    super(message, 404);
  }
}

module.exports = { AppError, ConflictError, BusinessError, NotFoundError };
