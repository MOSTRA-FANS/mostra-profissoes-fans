-- 004_create_inscricoes.sql
-- Executar uma unica vez; consultar docs/database.md.

CREATE TABLE inscricoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  idade INT NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  email VARCHAR(320) COLLATE utf8mb4_unicode_ci NOT NULL,
  curso VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
  novo VARCHAR(100) COLLATE utf8mb4_bin NULL,
  outro VARCHAR(100),
  novidade TINYINT(1) DEFAULT 0,
  feedback TEXT,
  saber ENUM('Instagram', 'WhatsApp', 'Professor', 'Amigo/Colega',
             'Site da faculdade', 'Cartaz', 'Outro'),
  data_inscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
