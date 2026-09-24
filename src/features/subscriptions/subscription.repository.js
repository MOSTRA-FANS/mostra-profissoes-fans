const db = require('../../config/database');

/**
 * Subscription Repository
 * Camada de Persistência responsável pelas operações SQL da tabela subscriptions.
 * Todas as queries utilizam Prepared Statements (parâmetros tipados) prevenindo SQL Injection.
 */
class SubscriptionRepository {
  /**
   * Cria um novo registro de inscrição no banco de dados.
   * @param {Object} subscriptionData
   * @param {string} subscriptionData.nome - Nome completo do inscrito
   * @param {string} subscriptionData.email - Endereço de e-mail
   * @param {string} subscriptionData.cpf - CPF formatado ou desformatado
   * @param {string} subscriptionData.telefone - Telefone com DDD
   * @param {string} subscriptionData.profissao_interesse - Nome da profissão / oficina escolhida
   * @param {string} subscriptionData.protocolo - Código único de protocolo gerado
   * @returns {Promise<Object>} Registro da inscrição persistido
   */
  async create(subscriptionData) {
    const {
      nome,
      email,
      cpf,
      telefone,
      profissao_interesse,
      protocolo,
    } = subscriptionData;

    const sql = `
      INSERT INTO subscriptions (
        nome,
        email,
        cpf,
        telefone,
        profissao_interesse,
        protocolo
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      nome,
      email,
      cpf,
      telefone,
      profissao_interesse,
      protocolo,
    ];

    const [result] = await db.query(sql, params);

    return {
      id: result.insertId,
      nome,
      email,
      cpf,
      telefone,
      profissao_interesse,
      protocolo,
      criado_em: new Date(),
    };
  }

  /**
   * Consulta uma inscrição através do endereço de e-mail.
   * @param {string} email
   * @returns {Promise<Object|null>} Registro encontrado ou null caso não exista
   */
  async findByEmail(email) {
    const sql = `
      SELECT id, nome, email, cpf, telefone, profissao_interesse, protocolo, criado_em
      FROM subscriptions
      WHERE email = ?
      LIMIT 1
    `;

    const [rows] = await db.query(sql, [email]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Consulta uma inscrição através do CPF.
   * @param {string} cpf
   * @returns {Promise<Object|null>} Registro encontrado ou null caso não exista
   */
  async findByCpf(cpf) {
    const sql = `
      SELECT id, nome, email, cpf, telefone, profissao_interesse, protocolo, criado_em
      FROM subscriptions
      WHERE cpf = ?
      LIMIT 1
    `;

    const [rows] = await db.query(sql, [cpf]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Realiza a contagem de inscritos para uma profissão/oficina específica.
   * Usado para verificar a capacidade de vagas disponíveis.
   * @param {string} profissao - Nome da profissão de interesse
   * @returns {Promise<number>} Quantidade de inscritos na profissão
   */
  async countByProfession(profissao) {
    const sql = `
      SELECT COUNT(*) AS total
      FROM subscriptions
      WHERE profissao_interesse = ?
    `;

    const [rows] = await db.query(sql, [profissao]);
    return rows.length > 0 ? Number(rows[0].total) : 0;
  }

  /**
   * Consulta uma inscrição através do código de protocolo.
   * @param {string} protocolo
   * @returns {Promise<Object|null>} Registro encontrado ou null caso não exista
   */
  async findByProtocolo(protocolo) {
    const sql = `
      SELECT id, nome, email, cpf, telefone, profissao_interesse, protocolo, criado_em
      FROM subscriptions
      WHERE protocolo = ?
      LIMIT 1
    `;

    const [rows] = await db.query(sql, [protocolo]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Consulta uma inscrição através do seu ID primário.
   * @param {number} id
   * @returns {Promise<Object|null>} Registro encontrado ou null caso não exista
   */
  async findById(id) {
    const sql = `
      SELECT id, nome, email, cpf, telefone, profissao_interesse, protocolo, criado_em
      FROM subscriptions
      WHERE id = ?
      LIMIT 1
    `;

    const [rows] = await db.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Verifica o status de saúde e latência da conexão ativa com o banco de dados.
   * @returns {Promise<{ isHealthy: boolean, latencyMs: number, timestamp: string, error?: string }>}
   */
  async checkHealth() {
    const start = Date.now();
    try {
      const [rows] = await db.query('SELECT 1 AS health_check');
      const latencyMs = Date.now() - start;

      const isHealthy = Boolean(rows && rows.length > 0 && rows[0].health_check === 1);

      return {
        isHealthy,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Date.now() - start;
      return {
        isHealthy: false,
        latencyMs,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
}

module.exports = new SubscriptionRepository();
