'use strict';

const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

// Garante ambiente de teste com trust proxy ativo para permitir simulação de IPs
process.env.NODE_ENV = 'test';
process.env.TRUST_PROXY = 'true';
process.env.CLIENT_ORIGIN = 'http://localhost:5500,http://127.0.0.1:5500';

const app = require('../src/server');
const repository = require('../src/features/subscriptions/subscription.repository');

// Cursos homologados para retorno nos mocks
const MOCK_CURSOS_ATUAIS = [
  'Administração',
  'Direito',
  'Ciências Contábeis',
  'Engenharia de Software',
  'Pedagogia',
  'Psicologia',
  'Técnico em Enfermagem',
  'Técnico em Segurança do Trabalho',
];

const validPayload = {
  nome: 'Mariana Costa Ribeiro',
  email: 'mariana.costa@exemplo.com',
  telefone: '(31) 98765-4321',
  curso: 'Engenharia de Software',
  idade: 19,
};

let dbRegisteredEmails = new Set();
let simulateDbError = false;
let simulateDbDown = false;

// Configuração do mock do repository para isolamento sem dependência de MySQL externo
before(() => {
  repository.listCurrentCourses = async () => [...MOCK_CURSOS_ATUAIS];
  repository.listNewCourses = async () => [];
  repository.findByEmail = async (email) => {
    if (simulateDbError) throw new Error('Falha de I/O na tabela MySQL');
    return dbRegisteredEmails.has(email) ? { id: 1, email } : null;
  };
  repository.create = async (data) => {
    if (simulateDbError) throw new Error('Falha catastrófica no pool de conexões');
    dbRegisteredEmails.add(data.email);
    return { id: 101, ...data, data_inscricao: new Date().toISOString() };
  };
  repository.checkHealth = async () => {
    if (simulateDbDown) {
      return { isHealthy: false, latencyMs: 50, timestamp: new Date().toISOString(), error: 'Connection refused' };
    }
    return { isHealthy: true, latencyMs: 3, timestamp: new Date().toISOString() };
  };
});

beforeEach(() => {
  dbRegisteredEmails.clear();
  simulateDbError = false;
  simulateDbDown = false;
});

/* -------------------------------------------------------------------------- */
/* 1. Diagnóstico e Monitoramento: GET /api/health                            */
/* -------------------------------------------------------------------------- */
test('GET /api/health -> 200 OK com status e latência do banco de dados', async () => {
  const res = await request(app)
    .get('/api/health')
    .expect('Content-Type', /json/)
    .expect(200);

  assert.equal(res.body.status, 'ok');
  assert.ok(typeof res.body.uptime === 'number');
  assert.ok(res.body.timestamp);
  assert.equal(res.body.database.status, 'connected');
  assert.ok(typeof res.body.database.latencyMs === 'number');
});

test('GET /api/health -> 503 Service Unavailable quando o banco está desconectado', async () => {
  simulateDbDown = true;
  const res = await request(app)
    .get('/api/health')
    .expect('Content-Type', /json/)
    .expect(503);

  assert.equal(res.body.status, 'degraded');
  assert.equal(res.body.database.status, 'disconnected');
  assert.ok(res.body.database.error);
});

/* -------------------------------------------------------------------------- */
/* 2. Catálogo de Cursos: GET /api/courses                                    */
/* -------------------------------------------------------------------------- */
test('GET /api/courses -> 200 OK com catálogo de cursos disponíveis', async () => {
  const res = await request(app)
    .get('/api/courses')
    .expect('Content-Type', /json/)
    .expect(200);

  assert.equal(res.body.status, 'success');
  assert.ok(Array.isArray(res.body.data.cursos_atuais));
  assert.ok(res.body.data.cursos_atuais.includes('Engenharia de Software'));
});

/* -------------------------------------------------------------------------- */
/* 3. Cenário Sucesso: POST /api/subscriptions -> 201 Created                 */
/* -------------------------------------------------------------------------- */
test('POST /api/subscriptions -> 201 Created quando o formulário é válido', async () => {
  const res = await request(app)
    .post('/api/subscriptions')
    .set('X-Forwarded-For', '10.0.1.1')
    .send(validPayload)
    .expect('Content-Type', /json/)
    .expect(201);

  assert.equal(res.body.status, 'success');
  assert.equal(res.body.message, 'Inscrição realizada com sucesso.');
  assert.equal(res.body.data.id, 101);
  assert.equal(res.body.data.nome, 'Mariana Costa Ribeiro');
  assert.equal(res.body.data.email, 'mariana.costa@exemplo.com');
  assert.equal(res.body.data.telefone, '31987654321');
  assert.equal(res.body.data.curso, 'Engenharia de Software');
});

test('POST /api/subscriptions -> 201 Created aceita profissao_interesse como alias de curso', async () => {
  const payloadAlias = {
    nome: 'Lucas Gabriel Mendes',
    email: 'lucas.mendes@exemplo.com',
    telefone: '11987654321',
    profissao_interesse: 'Direito',
  };

  const res = await request(app)
    .post('/api/subscriptions')
    .set('X-Forwarded-For', '10.0.1.2')
    .send(payloadAlias)
    .expect(201);

  assert.equal(res.body.status, 'success');
  assert.equal(res.body.data.curso, 'Direito');
});

/* -------------------------------------------------------------------------- */
/* 4. Cenário Dados Inválidos: POST /api/subscriptions -> 400 Bad Request      */
/* -------------------------------------------------------------------------- */
test('POST /api/subscriptions -> 400 Bad Request quando corpo está vazio', async () => {
  const res = await request(app)
    .post('/api/subscriptions')
    .set('X-Forwarded-For', '10.0.2.1')
    .send({})
    .expect(400);

  assert.equal(res.body.status, 'error');
  assert.equal(res.body.message, 'Dados invalidos');
  assert.ok(Array.isArray(res.body.errors));
  assert.ok(res.body.errors.length >= 3);
});

test('POST /api/subscriptions -> 400 Bad Request com e-mail inválido', async () => {
  const res = await request(app)
    .post('/api/subscriptions')
    .set('X-Forwarded-For', '10.0.2.2')
    .send({ ...validPayload, email: 'email_invalido_sem_arroba' })
    .expect(400);

  assert.equal(res.body.status, 'error');
  assert.ok(res.body.errors.some((err) => err.campo === 'email'));
});

test('POST /api/subscriptions -> 400 Bad Request com telefone/DDD inválido', async () => {
  const res = await request(app)
    .post('/api/subscriptions')
    .set('X-Forwarded-For', '10.0.2.3')
    .send({ ...validPayload, telefone: '0012345678' })
    .expect(400);

  assert.equal(res.body.status, 'error');
  assert.ok(res.body.errors.some((err) => err.campo === 'telefone'));
});

test('POST /api/subscriptions -> 400 Bad Request com curso inexistente no catálogo', async () => {
  const res = await request(app)
    .post('/api/subscriptions')
    .set('X-Forwarded-For', '10.0.2.4')
    .send({ ...validPayload, curso: 'Astrofísica Quântica' })
    .expect(400);

  assert.equal(res.body.status, 'error');
  assert.ok(
    res.body.errors.some((err) => err.campo === 'curso' || err.campo === 'profissao_interesse')
  );
});

test('POST /api/subscriptions -> 400 Bad Request quando o payload JSON é malformado', async () => {
  const res = await request(app)
    .post('/api/subscriptions')
    .set('X-Forwarded-For', '10.0.2.5')
    .set('Content-Type', 'application/json')
    .send('{"nome": "Maria", "email":')
    .expect(400);

  assert.equal(res.body.status, 'error');
  assert.match(res.body.message, /JSON/i);
});

/* -------------------------------------------------------------------------- */
/* 5. Cenário Cadastro Duplicado: POST /api/subscriptions -> 409 Conflict    */
/* -------------------------------------------------------------------------- */
test('POST /api/subscriptions -> 409 Conflict para e-mail já cadastrado', async () => {
  const ip = '10.0.3.1';

  // Primeira submissão com sucesso
  await request(app)
    .post('/api/subscriptions')
    .set('X-Forwarded-For', ip)
    .send(validPayload)
    .expect(201);

  // Segunda submissão com o mesmo e-mail -> Conflito
  const res = await request(app)
    .post('/api/subscriptions')
    .set('X-Forwarded-For', ip)
    .send({ ...validPayload, nome: 'Outro Nome Mesmo Email' })
    .expect(409);

  assert.equal(res.body.status, 'error');
  assert.equal(res.body.message, 'Este e-mail já respondeu ao formulário.');
});

/* -------------------------------------------------------------------------- */
/* 6. Cenário Excesso de Requisições: POST /api/subscriptions -> 429         */
/* -------------------------------------------------------------------------- */
test('POST /api/subscriptions -> 429 Too Many Requests ao exceder limite de taxa', async () => {
  const ip = '10.0.4.99';
  const limit = 5; // Limite configurado em config/rateLimiter.js (subscription: max 5)

  // Faz requisições até esgotar o limite
  for (let i = 1; i <= limit; i++) {
    await request(app)
      .post('/api/subscriptions')
      .set('X-Forwarded-For', ip)
      .send({ ...validPayload, email: `usuario_${i}@exemplo.com` })
      .expect(201);
  }

  // A 6ª requisição deve ser bloqueada pelo middleware de rate limit
  const res = await request(app)
    .post('/api/subscriptions')
    .set('X-Forwarded-For', ip)
    .send({ ...validPayload, email: 'usuario_bloqueado@exemplo.com' })
    .expect(429);

  assert.equal(res.body.status, 'error');
  assert.match(res.body.message, /Limite de tentativas de inscrição excedido/i);
  assert.ok(typeof res.body.retryAfterSeconds === 'number');
  assert.ok(res.body.retryAfterSeconds > 0);
});

/* -------------------------------------------------------------------------- */
/* 7. Cenário Erro Interno do Servidor: POST /api/subscriptions -> 500       */
/* -------------------------------------------------------------------------- */
test('POST /api/subscriptions -> 500 Internal Server Error quando ocorre falha inesperada', async () => {
  simulateDbError = true;

  const res = await request(app)
    .post('/api/subscriptions')
    .set('X-Forwarded-For', '10.0.5.1')
    .send(validPayload)
    .expect(500);

  assert.equal(res.body.status, 'error');
  assert.ok(res.body.message);
});

/* -------------------------------------------------------------------------- */
/* 8. Rota Inexistente: 404 Not Found                                         */
/* -------------------------------------------------------------------------- */
test('GET /api/rota-inexistente -> 404 Not Found', async () => {
  const res = await request(app)
    .get('/api/rota-inexistente')
    .expect(404);

  assert.equal(res.body.status, 'error');
  assert.equal(res.body.message, 'Rota não encontrada.');
});
