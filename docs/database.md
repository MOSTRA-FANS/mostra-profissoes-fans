# Banco do formulário da Mostra de Profissões

## Referências oficiais

- Estrutura e dados iniciais: `migrations/`, na ordem abaixo.
- Contrato do formulário e procedimento operacional: este documento.
- Acesso aos dados: `src/features/subscriptions/subscription.repository.js`.
- Regras de negócio: `src/features/subscriptions/subscription.service.js`.
- Divisão entre integrantes: `TASK.md`.

Não há cópias do schema na raiz. Cada mudança futura deve acrescentar uma
migration; não editar arquivos já aplicados. A próxima numeração livre é 006.

## Migrations e responsabilidades

| Ordem | Arquivo | Responsabilidade |
| --- | --- | --- |
| 002 | `002_create_course_catalogs.sql` | Estrutura dos catálogos atual e novo. |
| 003 | `003_seed_current_courses.sql` | Carga dos oito cursos atuais aprovados. |
| 004 | `004_create_inscricoes.sql` | Campos e tipos das respostas. |
| 005 | `005_add_inscricoes_constraints.sql` | E-mail único e vínculos com os catálogos. |

A 001 foi preservada sem alteração em
`migrations/legacy/001_create_subscriptions_table.sql`. É histórica e não entra
em instalações novas. Não execute migrations recursivamente incluindo legacy.

002–005 substituem a proposta local ainda não commitada
`002_formulario_interesse.sql`. Quem já executou essa proposta ou um dos schemas
monolíticos precisa conciliar o estado existente, não repetir a nova sequência.

## Contrato do formulário

| Campo | Tipo e regra |
| --- | --- |
| id | Inteiro gerado pelo banco. |
| nome | Texto obrigatório, até 150 caracteres. |
| idade | Inteiro obrigatório. |
| telefone | Texto obrigatório, até 20 caracteres. |
| email | Texto obrigatório, até 320 caracteres, único. |
| curso | Uma string obrigatória do catálogo atual, até 100 caracteres. |
| novo | Uma string do catálogo novo ou null, até 100 caracteres. |
| outro | Texto opcional preexistente, até 100 caracteres; não é segunda seleção de curso. |
| novidade | Flag 0/1, padrão 0; validar na entrada. |
| feedback | Texto opcional. |
| saber | Instagram, WhatsApp, Professor, Amigo/Colega, Site da faculdade, Cartaz ou Outro; opcional. |
| data_inscricao | Data/hora gerada pelo banco. |

O catálogo novo começa vazio: novo permanece opcional. Arrays e nomes fora dos
catálogos são rejeitados. O service normaliza e-mail com trim/lowercase e retorna
409 para duplicidade, inclusive em gravações simultâneas. Não há CPF, protocolo
ou limite de vagas. Os nomes de cursos usam comparação exata.

Os oito nomes aprovados estão na migration 003; o JavaScript consulta o catálogo
em vez de manter outra lista. Novos cursos aprovados devem ser adicionados por
uma nova migration de dados, sem repetir a criação das tabelas.

## Instalação em banco novo

1. A infraestrutura provisiona um banco MySQL com charset utf8mb4 e as permissões
   necessárias. O nome padrão é mostra_profissoes, configurável por DB_NAME.
   Criação do banco e gestão de usuários ficam fora das migrations.
2. Conecte-se ao banco escolhido com um cliente configurado para utf8mb4.
3. Execute 002, 003, 004 e 005 nessa ordem, uma vez cada. Pare ao primeiro erro;
   não use opções para ignorar erros. São arquivos SQL comuns, sem SOURCE ou
   outros comandos exclusivos de um cliente.
4. Registre ambiente, arquivo aplicado, data e commit no controle de implantação.
   Ainda não há executor automático ou tabela de histórico: a aplicação não
   executa migrations na inicialização nem descobre quais já foram aplicadas.
5. Confira oito cursos atuais, catálogo novo vazio e a tabela inscricoes.
   Use SHOW CREATE TABLE inscricoes para conferir uk_inscricoes_email,
   fk_inscricoes_curso e fk_inscricoes_novo.

CREATE e INSERT não ignoram objetos ou registros existentes: divergências devem
ser identificadas antes de continuar, não mascaradas por IF NOT EXISTS/IGNORE.

## Bases existentes

Faça backup e suspenda gravações antes de atualizar. Inspecione tabelas, campos,
collations, índices e chaves para determinar quais passos faltam.

- Somente subscriptions legada: execute 002–005. A tabela antiga é preservada.
  Não há conversão automática porque faltam idade e as escolhas do formulário.
- Inscricoes original: execute 002 e 003 se os catálogos não existirem. Compare
  os campos com 004 e registre a etapa como conciliada apenas se compatível;
  não execute CREATE novamente. Confira InnoDB. A 005 ajusta as collations de
  email/curso/novo e aplica as restrições.
- Schema monolítico ou proposta 002 já aplicado: compare o banco com cada etapa,
  registre as equivalentes e execute apenas as pendentes. Para uma etapa
  parcialmente aplicada, prepare correção específica em vez de repetir tudo.

Antes da 005, normalize e-mails com trim/lowercase e identifique duplicidades.
Resolva conflitos sem apagar respostas automaticamente. Confira curso contra
cursos_atuais; converta ausência de novo para NULL e confira valores preenchidos
contra cursos_novos. Só inclua nomes novos no catálogo após aprovação do grupo.

DDL do MySQL pode confirmar alterações parcialmente. Em caso de erro, pare e
inspecione o estado antes de continuar. Não há rollback destrutivo automático.

## Responsáveis e validação

- Pessoa 2: migrations, repositório, registro de aplicação e testes em MySQL real.
- Pessoa 1: ambiente, mysql2, credenciais, permissões e carregamento das variáveis.
- Pessoa 3: validação completa de tipos, formatos e tamanhos; errorHandler.
- Pessoa 4: normalização, duplicidade e escolhas válidas no service.
- Pessoa 5: rotas, controller, exposição das listas de cursos e testes HTTP.

create retorna id e dados gravados; findById retorna também data_inscricao.
Execute os testes isolados com `node --test tests/*.test.js`. Eles não substituem
execução das migrations nem testes de integridade em MySQL real.
