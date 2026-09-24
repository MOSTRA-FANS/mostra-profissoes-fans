-- 003_seed_current_courses.sql
-- Executar uma unica vez; consultar docs/database.md.

INSERT INTO cursos_atuais (nome) VALUES
  ('Administração'), ('Direito'), ('Ciências Contábeis'),
  ('Engenharia de Software'), ('Pedagogia'), ('Psicologia'),
  ('Técnico em Enfermagem'), ('Técnico em Segurança do Trabalho');
