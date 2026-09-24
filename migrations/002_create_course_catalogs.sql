-- 002_create_course_catalogs.sql
-- Executar uma unica vez; consultar docs/database.md.

CREATE TABLE cursos_atuais (
  nome VARCHAR(100) COLLATE utf8mb4_bin PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cursos_novos (
  nome VARCHAR(100) COLLATE utf8mb4_bin PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
