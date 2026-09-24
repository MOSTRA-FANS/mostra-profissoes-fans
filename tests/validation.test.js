const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { subscriptionSchema } = require('../src/features/subscriptions/subscription.schema');
const validateRequest = require('../src/shared/middlewares/validateRequest');
const errorHandler = require('../src/shared/middlewares/errorHandler');

const valid = {
  nome: '  Maria   da Silva ',
  email: ' Maria@Exemplo.COM ',
  telefone: '(11) 98765-4321',
  profissao_interesse: 'Direito',
};

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());
  app.post('/sub', validateRequest(subscriptionSchema), (req, res) => res.status(201).json(req.body));
  app.get('/boom', async () => {
    throw new Error('segredo interno');
  });
  app.get('/conflict', () => {
    throw Object.assign(new Error('E-mail ja inscrito'), { statusCode: 409 });
  });
  app.use(errorHandler);
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const post = (body, raw) =>
  fetch(`${baseUrl}/sub`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  });

test('payload valido passa e e sanitizado', async () => {
  const res = await post(valid);
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), {
    nome: 'Maria da Silva',
    email: 'maria@exemplo.com',
    telefone: '11987654321',
    profissao_interesse: 'Direito',
  });
});

test('profissao com acento e aceita', async () => {
  assert.equal((await post({ ...valid, profissao_interesse: 'Técnico em Segurança do Trabalho' })).status, 201);
});

test('fixo com 10 digitos e aceito', async () => {
  assert.equal((await post({ ...valid, telefone: '6132345678' })).status, 201);
});

const invalidCases = {
  nome: ['Maria', 'Jo', 'Maria 123'],
  email: ['maria@', 'maria.exemplo.com'],
  telefone: ['(20) 98765-4321', '1188765432', '119876543', '11 98765-432a'],
  profissao_interesse: ['Astronauta', 'Administracao'],
};

for (const [campo, values] of Object.entries(invalidCases)) {
  for (const value of values) {
    test(`${campo} invalido: ${JSON.stringify(value)} -> 400`, async () => {
      const res = await post({ ...valid, [campo]: value });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.deepEqual([...new Set(body.errors.map((e) => e.campo))], [campo]);
    });
  }
}

test('body vazio lista todos os campos obrigatorios', async () => {
  const body = await (await post({})).json();
  assert.equal(body.errors.length, 4);
});

test('JSON malformado -> 400', async () => {
  const res = await post(null, '{"nome":');
  assert.equal(res.status, 400);
  assert.equal((await res.json()).message, 'JSON malformado no corpo da requisicao');
});

test('erro async -> 500 com stack fora de producao', async () => {
  const body = await (await fetch(`${baseUrl}/boom`)).json();
  assert.equal(body.message, 'segredo interno');
  assert.ok(body.stack);
});

test('erro async em producao -> 500 sem detalhes internos', async () => {
  process.env.NODE_ENV = 'production';
  try {
    const res = await fetch(`${baseUrl}/boom`);
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { status: 'error', message: 'Erro interno do servidor' });
  } finally {
    delete process.env.NODE_ENV;
  }
});

test('erro com statusCode (AppError) mantem status e mensagem', async () => {
  const res = await fetch(`${baseUrl}/conflict`);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).message, 'E-mail ja inscrito');
});
