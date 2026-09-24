'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createService } = require('../src/features/subscriptions/subscription.service');
const { createRepository } = require('../src/features/subscriptions/subscription.repository');
const { AppError, ConflictError, BusinessError, NotFoundError } = require('../src/shared/errors/AppError');

const payload = { nome: 'Ana Silva', idade: 18, telefone: '31999999999',
  email: ' ANA@example.com ', curso: 'Direito' };
function repository(overrides = {}) {
  return { listCurrentCourses: async () => ['Direito'],
    listNewCourses: async () => ['Curso futuro'],
    findByEmail: async () => null,
    create: async data => ({ id: 1, ...data }), ...overrides };
}

test('normaliza e-mail, aceita uma escolha atual e curso novo ausente', async () => {
  const result = await createService(repository()).create(payload);
  assert.equal(result.email, 'ana@example.com');
  assert.equal(result.curso, 'Direito');
  assert.equal(result.novo, null);
});

test('aceita um curso novo cadastrado posteriormente', async () => {
  const result = await createService(repository()).create({ ...payload, novo: 'Curso futuro' });
  assert.equal(result.novo, 'Curso futuro');
});

test('rejeita arrays, cursos desconhecidos e e-mail inválido antes de gravar', async () => {
  const service = createService(repository({ create: async () => assert.fail('Não deve gravar') }));
  for (const change of [{ curso: ['Direito'] }, { novo: ['Curso futuro'] },
    { curso: 'Inexistente' }, { novo: 'Inexistente' }, { email: 'invalido' }]) {
    await assert.rejects(service.create({ ...payload, ...change }), { statusCode: 400 });
  }
});

test('bloqueia e-mail existente sem alterar resposta anterior', async () => {
  const service = createService(repository({
    findByEmail: async email => { assert.equal(email, 'ana@example.com'); return { id: 1 }; },
    create: async () => assert.fail('Não deve gravar'),
  }));
  await assert.rejects(service.create(payload), { statusCode: 409 });
});

test('converte duplicidade concorrente do banco em 409', async () => {
  const service = createService(repository({ create: async () => {
    throw Object.assign(new Error('SQL interno'), { code: 'ER_DUP_ENTRY' });
  } }));
  await assert.rejects(service.create(payload), { name: 'ConflictError', statusCode: 409 });
});

test('preserva falhas inesperadas para o errorHandler', async () => {
  const failure = new Error('Conexão indisponível');
  const service = createService(repository({ create: async () => { throw failure; } }));
  await assert.rejects(service.create(payload), error => error === failure);
});

test('repositório persiste campos do formulário com parâmetros e sem campos extras', async () => {
  const repo = createRepository({ query: async (sql, params) => {
    assert.match(sql, /INSERT INTO inscricoes/);
    assert.equal((sql.match(/\?/g) || []).length, params.length);
    assert.equal(params.length, 10);
    assert.equal(params[4], 'Direito');
    assert.equal(params[5], null);
    assert.ok(!sql.includes(payload.nome));
    return [{ insertId: 42 }];
  } });
  const result = await repo.create({ ...payload, cpf: 'ignorado' });
  assert.equal(result.id, 42);
  assert.equal(result.cpf, undefined);
});

test('classes de erro preservam mensagem, herança e status para o middleware', () => {
  for (const [ErrorType, statusCode] of [[AppError, 500], [ConflictError, 409],
    [BusinessError, 422], [NotFoundError, 404]]) {
    const error = new ErrorType('Mensagem pública');
    assert.ok(error instanceof Error);
    assert.ok(error instanceof AppError);
    assert.equal(error.name, ErrorType.name);
    assert.equal(error.statusCode, statusCode);
    assert.equal(error.message, 'Mensagem pública');
  }
});

test('duas requisições simultâneas normalizadas resultam em uma gravação e um conflito', async () => {
  let lookups = 0;
  let release;
  const bothLookedUp = new Promise(resolve => { release = resolve; });
  const saved = new Map();
  const service = createService(repository({
    findByEmail: async () => {
      if (++lookups === 2) release();
      await bothLookedUp;
      return null;
    },
    create: async data => {
      if (saved.has(data.email)) {
        throw Object.assign(new Error('Duplicate key'), { code: 'ER_DUP_ENTRY' });
      }
      const row = { ...data, id: 42 };
      saved.set(data.email, row);
      return row;
    },
  }));
  const results = await Promise.allSettled([
    service.create(payload), service.create({ ...payload, email: 'ana@example.com' }),
  ]);
  assert.equal(saved.size, 1);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'fulfilled').value.id, 42);
  assert.equal(results.find(result => result.status === 'rejected').reason.statusCode, 409);
});

test('catálogo novo vazio permite ausência mas rejeita seleção não cadastrada', async () => {
  const service = createService(repository({ listNewCourses: async () => [] }));
  for (const novo of [undefined, null, '']) {
    assert.equal((await service.create({ ...payload, novo })).novo, null);
  }
  await assert.rejects(service.create({ ...payload, novo: 'Curso futuro' }), { statusCode: 400 });
});

test('service devolve o registro gerado pelo repositório sem criar protocolo', async () => {
  const row = { ...payload, id: 42 };
  const service = createService(repository({ create: async () => row }));
  assert.strictEqual(await service.create(payload), row);
  assert.equal(row.protocolo, undefined);
});
