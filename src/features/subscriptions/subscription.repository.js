'use strict';

const DEFAULT_COURSES = [
  'Administração',
  'Direito',
  'Ciências Contábeis',
  'Engenharia de Software',
  'Pedagogia',
  'Psicologia',
  'Técnico em Enfermagem',
  'Técnico em Segurança do Trabalho',
];

// A injeção permite testar o contrato sem uma conexão real.
function createRepository(db) {
  const inMemoryInscricoes = new Map();
  let inMemoryIdCounter = 1;

  const isConnError = (err) =>
    Boolean(
      err &&
      (err.code === 'ECONNREFUSED' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ENOTFOUND' ||
        err.code === 'ER_NO_SUCH_TABLE')
    );

  return {
    async create(data) {
      const {
        nome,
        idade = null,
        telefone,
        email,
        curso,
        novo = null,
        outro = null,
        novidade = 0,
        feedback = null,
        saber = null,
      } = data;

      try {
        const [result] = await db.query(
          `INSERT INTO inscricoes
            (nome, idade, telefone, email, curso, novo, outro, novidade, feedback, saber)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [nome, idade, telefone, email, curso, novo, outro, novidade, feedback, saber]
        );
        return {
          id: result.insertId,
          nome,
          idade,
          telefone,
          email,
          curso,
          novo,
          outro,
          novidade,
          feedback,
          saber,
          data_inscricao: new Date().toISOString(),
        };
      } catch (err) {
        if (isConnError(err)) {
          const id = inMemoryIdCounter++;
          const record = {
            id,
            nome,
            idade,
            telefone,
            email,
            curso,
            novo,
            outro,
            novidade,
            feedback,
            saber,
            data_inscricao: new Date().toISOString(),
          };
          inMemoryInscricoes.set(email.toLowerCase(), record);
          return record;
        }
        throw err;
      }
    },

    async findByEmail(email) {
      try {
        const [rows] = await db.query(
          'SELECT * FROM inscricoes WHERE email = ? LIMIT 1',
          [email]
        );
        return rows[0] || null;
      } catch (err) {
        if (isConnError(err)) {
          return inMemoryInscricoes.get(email.toLowerCase()) || null;
        }
        throw err;
      }
    },

    async findById(id) {
      try {
        const [rows] = await db.query(
          'SELECT * FROM inscricoes WHERE id = ? LIMIT 1',
          [id]
        );
        return rows[0] || null;
      } catch (err) {
        if (isConnError(err)) {
          for (const item of inMemoryInscricoes.values()) {
            if (item.id === id) return item;
          }
          return null;
        }
        throw err;
      }
    },

    async listCurrentCourses() {
      try {
        const [rows] = await db.query('SELECT nome FROM cursos_atuais ORDER BY nome');
        return rows.map((row) => row.nome);
      } catch (err) {
        if (isConnError(err)) {
          return [...DEFAULT_COURSES];
        }
        throw err;
      }
    },

    async listNewCourses() {
      try {
        const [rows] = await db.query('SELECT nome FROM cursos_novos ORDER BY nome');
        return rows.map((row) => row.nome);
      } catch (err) {
        if (isConnError(err)) {
          return [];
        }
        throw err;
      }
    },

    async checkHealth() {
      const start = Date.now();
      try {
        await db.query('SELECT 1');
        return {
          isHealthy: true,
          latencyMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          isHealthy: false,
          latencyMs: Date.now() - start,
          timestamp: new Date().toISOString(),
          error: error.message,
        };
      }
    },
  };
}

const repository = createRepository({
  query: (...args) => require('../../config/database').query(...args),
});
module.exports = repository;
module.exports.createRepository = createRepository;
