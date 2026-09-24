'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

// Opt-in: cria e remove somente um banco aleatório desta execução.
test('integração com MySQL real', { skip: process.env.RUN_MYSQL_TESTS !== '1' }, async t => {
  const mysql = require('mysql2/promise');
  const database = `mostra_test_${randomBytes(8).toString('hex')}`;
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  let db;
  let created = false;
  const previousName = process.env.DB_NAME;
  try {
    await admin.query(`CREATE DATABASE ${database} CHARACTER SET utf8mb4`);
    created = true;
    await admin.query(`USE ${database}`);
    for (const file of ['002_create_course_catalogs.sql', '003_seed_current_courses.sql',
      '004_create_inscricoes.sql', '005_add_inscricoes_constraints.sql']) {
      await admin.query(await readFile(path.join(__dirname, '../../migrations', file), 'utf8'));
    }
    process.env.DB_NAME = database;
    db = require('../../src/config/database');
    const { createRepository } = require('../../src/features/subscriptions/subscription.repository');
    const { createService } = require('../../src/features/subscriptions/subscription.service');
    const repo = createRepository(db);
    const service = createService(repo);
    const payload = { nome: 'Teste integração', idade: 18, telefone: '31999999999',
      email: ' NORMALIZADO@example.com ', curso: 'Direito' };
    const [[version]] = await admin.query('SELECT VERSION() AS version');
    t.diagnostic(`MySQL ${version.version}; migrations 002–005 aplicadas`);

    await t.test('conexão, catálogos e restrições criados pelas migrations', async () => {
      assert.equal((await db.testConnection()).ok, true);
      assert.equal((await repo.checkHealth()).isHealthy, true);
      assert.equal((await repo.listCurrentCourses()).length, 8);
      assert.ok((await repo.listCurrentCourses()).includes('Administração'));
      assert.deepEqual(await repo.listNewCourses(), []);
      const [[row]] = await admin.query('SHOW CREATE TABLE inscricoes');
      for (const name of ['uk_inscricoes_email', 'fk_inscricoes_curso', 'fk_inscricoes_novo']) {
        assert.ok(row['Create Table'].includes(name));
      }
    });
    await t.test('gravação, normalização, ID e data gerados pelo MySQL', async () => {
      const saved = await service.create(payload);
      assert.ok(saved.id > 0);
      const row = await repo.findById(saved.id);
      assert.equal(row.email, 'normalizado@example.com');
      assert.equal(row.nome, payload.nome);
      assert.equal(row.novo, null);
      assert.ok(row.data_inscricao instanceof Date);
      await assert.rejects(service.create(payload), { statusCode: 409 });
    });
    await t.test('catálogos rejeitam escolhas inválidas e aceitam curso novo cadastrado', async () => {
      await assert.rejects(service.create({ ...payload, novo: 'Curso teste' }), { statusCode: 400 });
      await assert.rejects(service.create({ ...payload, curso: 'Inválido' }), { statusCode: 400 });
      await admin.query('INSERT INTO cursos_novos (nome) VALUES (?)', ['Curso teste']);
      const saved = await service.create({ ...payload, email: 'novo@example.com', novo: 'Curso teste' });
      assert.equal((await repo.findById(saved.id)).novo, 'Curso teste');
    });
    await t.test('MySQL impõe UNIQUE e as duas FKs mesmo sem o service', async () => {
      await assert.rejects(repo.create({ ...payload, email: 'NORMALIZADO@example.com' }), { code: 'ER_DUP_ENTRY' });
      await assert.rejects(repo.create({ ...payload, email: 'fk@example.com', curso: 'Inválido' }),
        { code: 'ER_NO_REFERENCED_ROW_2' });
      await assert.rejects(repo.create({ ...payload, email: 'fk@example.com', novo: 'Inválido' }),
        { code: 'ER_NO_REFERENCED_ROW_2' });
    });
    await t.test('duas consultas reais sem registro seguidas de INSERTs concorrentes: um sucesso e um 409', async () => {
      let lookups = 0;
      let release;
      const barrier = new Promise(resolve => { release = resolve; });
      const concurrent = createService({ ...repo, findByEmail: async email => {
        const row = await repo.findByEmail(email);
        assert.equal(row, null);
        if (++lookups === 2) release();
        await barrier;
        return row;
      } });
      const results = await Promise.allSettled([
        concurrent.create({ ...payload, email: ' RACE@example.com ' }),
        concurrent.create({ ...payload, email: 'race@example.com' }),
      ]);
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      assert.equal(results.find(result => result.status === 'rejected').reason.statusCode, 409);
      const [[row]] = await admin.query('SELECT COUNT(*) AS total FROM inscricoes WHERE email = ?', ['race@example.com']);
      assert.equal(row.total, 1);
    });
  } finally {
    try {
      if (db) await db.closePool();
      if (created) await admin.query(`DROP DATABASE ${database}`);
    } finally {
      await admin.end();
      if (previousName === undefined) delete process.env.DB_NAME;
      else process.env.DB_NAME = previousName;
    }
  }
});
