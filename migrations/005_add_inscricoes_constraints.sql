-- 005_add_inscricoes_constraints.sql
-- Executar uma unica vez; consultar docs/database.md.

ALTER TABLE inscricoes
  MODIFY email VARCHAR(320) COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY curso VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
  MODIFY novo VARCHAR(100) COLLATE utf8mb4_bin NULL,
  ADD CONSTRAINT uk_inscricoes_email UNIQUE (email),
  ADD CONSTRAINT fk_inscricoes_curso FOREIGN KEY (curso) REFERENCES cursos_atuais(nome),
  ADD CONSTRAINT fk_inscricoes_novo FOREIGN KEY (novo) REFERENCES cursos_novos(nome);
