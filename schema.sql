-- ==========================================================
-- Schema: Banco de Dados da Amostra de Profissões
-- Tabela: subscriptions (Inscrições)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `mostra_profissoes`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `mostra_profissoes`;

-- Tabela de Inscrições
CREATE TABLE IF NOT EXISTS `subscriptions` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `cpf` VARCHAR(14) NOT NULL,
    `telefone` VARCHAR(20) NOT NULL,
    `profissao_interesse` VARCHAR(100) NOT NULL,
    `protocolo` VARCHAR(50) NOT NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Restrições de Unicidade e Índices de Performance
    CONSTRAINT `uk_subscriptions_email` UNIQUE (`email`),
    CONSTRAINT `uk_subscriptions_cpf` UNIQUE (`cpf`),
    CONSTRAINT `uk_subscriptions_protocolo` UNIQUE (`protocolo`),
    INDEX `idx_subscriptions_profissao` (`profissao_interesse`),
    INDEX `idx_subscriptions_criado_em` (`criado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
