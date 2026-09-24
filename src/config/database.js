const mysql = require('mysql2/promise');

/**
 * Configuração do Pool de Conexões com o Banco de Dados MySQL
 * Gerencia limites de conexão, timeouts, fila de espera e reconexões automáticas.
 */
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mostra_profissoes',
  waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS !== 'false',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT, 10) || 0,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT, 10) || 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: 'Z',
  dateStrings: false,
};

// Criação do pool de conexões único
const pool = mysql.createPool(dbConfig);

/**
 * Executa uma query SQL parametrizada de forma segura contra SQL Injection
 * @param {string} sql - Instrução SQL preparada com marcadores ?
 * @param {Array} [params=[]] - Parâmetros da query
 * @returns {Promise<[any, any]>} - Resultado da execução [rows, fields]
 */
async function query(sql, params = []) {
  try {
    return await pool.query(sql, params);
  } catch (error) {
    console.error('[Database Error] Falha na execução da query:', {
      sql,
      error: error.message,
      code: error.code,
    });
    throw error;
  }
}

/**
 * Testa a conexão com o banco de dados e retorna status e latência
 * @returns {Promise<{ ok: boolean, latencyMs: number, error?: string }>}
 */
async function testConnection() {
  const startTime = Date.now();
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    const latencyMs = Date.now() - startTime;
    return { ok: true, latencyMs };
  } catch (error) {
    console.error('[Database Error] Falha ao conectar ao banco:', error.message);
    return { ok: false, latencyMs: Date.now() - startTime, error: error.message };
  }
}

/**
 * Encerra graciosamente o pool de conexões
 */
async function closePool() {
  try {
    await pool.end();
    console.log('[Database] Pool de conexões finalizado com sucesso.');
  } catch (error) {
    console.error('[Database Error] Erro ao fechar o pool de conexões:', error.message);
  }
}

module.exports = {
  pool,
  query,
  testConnection,
  closePool,
};
