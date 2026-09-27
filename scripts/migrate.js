'use strict';

require('dotenv').config();

const { readdir, readFile } = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');

const migrationsDirectory = path.join(__dirname, '..', 'migrations');

function requireDatabaseConfig() {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Variaveis obrigatorias ausentes: ${missing.join(', ')}`);
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    // As migrations são arquivos versionados e confiáveis do repositório.
    // Esta opção fica restrita a esta conexão administrativa; o pool da
    // aplicação continua aceitando somente uma instrução por chamada.
    multipleStatements: true,
  };
}

async function migrate() {
  const connection = await mysql.createConnection(requireDatabaseConfig());
  let lockAcquired = false;
  try {
    const [[lock]] = await connection.query("SELECT GET_LOCK('mostra_profissoes_migrations', 10) AS acquired");
    if (lock.acquired !== 1) throw new Error('Nao foi possivel obter o lock de migrations.');
    lockAcquired = true;

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        arquivo VARCHAR(255) PRIMARY KEY,
        aplicado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [appliedRows] = await connection.query('SELECT arquivo FROM schema_migrations');
    const applied = new Set(appliedRows.map((row) => row.arquivo));
    const files = (await readdir(migrationsDirectory))
      .filter((file) => /^\d{3}_.+\.sql$/.test(file))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[skip] ${file}`);
        continue;
      }
      const sql = await readFile(path.join(migrationsDirectory, file), 'utf8');
      console.log(`[apply] ${file}`);
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (arquivo) VALUES (?)', [file]);
    }

    console.log('Migrations concluidas.');
  } finally {
    if (lockAcquired) await connection.query("SELECT RELEASE_LOCK('mostra_profissoes_migrations')");
    await connection.end();
  }
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error(`Falha ao aplicar migrations: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { migrate, requireDatabaseConfig };
