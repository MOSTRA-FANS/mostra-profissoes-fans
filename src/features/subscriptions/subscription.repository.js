'use strict';

// A injeção permite testar o contrato sem uma conexão real.
function createRepository(db) {
  return {
    async create(data) {
      const { nome, idade, telefone, email, curso, novo = null,
        outro = null, novidade = 0, feedback = null, saber = null } = data;
      const [result] = await db.query(
        `INSERT INTO inscricoes
          (nome, idade, telefone, email, curso, novo, outro, novidade, feedback, saber)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nome, idade, telefone, email, curso, novo, outro, novidade, feedback, saber]
      );
      return { id: result.insertId, nome, idade, telefone, email, curso,
        novo, outro, novidade, feedback, saber };
    },

    async findByEmail(email) {
      const [rows] = await db.query(
        'SELECT * FROM inscricoes WHERE email = ? LIMIT 1', [email]
      );
      return rows[0] || null;
    },

    async findById(id) {
      const [rows] = await db.query(
        'SELECT * FROM inscricoes WHERE id = ? LIMIT 1', [id]
      );
      return rows[0] || null;
    },

    async listCurrentCourses() {
      const [rows] = await db.query('SELECT nome FROM cursos_atuais ORDER BY nome');
      return rows.map(row => row.nome);
    },

    async listNewCourses() {
      const [rows] = await db.query('SELECT nome FROM cursos_novos ORDER BY nome');
      return rows.map(row => row.nome);
    },

    async checkHealth() {
      const start = Date.now();
      try {
        await db.query('SELECT 1');
        return { isHealthy: true, latencyMs: Date.now() - start,
          timestamp: new Date().toISOString() };
      } catch {
        return { isHealthy: false, latencyMs: Date.now() - start,
          timestamp: new Date().toISOString() };
      }
    },
  };
}

const repository = createRepository({
  query: (...args) => require('../../config/database').query(...args),
});
module.exports = repository;
module.exports.createRepository = createRepository;
