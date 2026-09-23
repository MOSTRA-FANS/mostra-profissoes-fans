# Planejamento e Divisao de Tarefas — Amostra de Profissoes

Este documento estabelece a divisao do desenvolvimento do projeto **Amostra de Profissoes (Backend Node.js/Express e Frontend)** em etapas cronologicas e distribui as responsabilidades tecnicas entre **5 integrantes**, assegurando independencia no desenvolvimento, definicao clara de entregaveis e integracao padronizada.

---

## 1. Estrutura e Distribuicao de Funcoes

```text
+------------------------------------------------------------------------+
|                        ARQUITETURA DO PROJETO                          |
+---------------+-------------------+--------------------+---------------+
|   PESSOA 1    |     PESSOA 2      |      PESSOA 3      |   PESSOA 4    |
|  Setup & Core |  Banco de Dados   | Schemas & Handling | Service/Ctrl  |
+-------+-------+---------+---------+----------+---------+-------+-------+
        |                 |                    |                 |
        +-----------------+--------------------+-----------------+
                          |
                          v
                    +----------------------------+
                    |          PESSOA 5          |
                    |   Frontend & Integracao    |
                    +----------------------------+
```

---

### Pessoa 1: Setup do Projeto, Infraestrutura e Seguranca Global
**Foco:** Inicializacao do ecossistema, infraestrutura de servidor, seguranca e monitoramento por logs.

* **Arquivos sob responsabilidade:**
  * `package.json` / `.env.example` / `.gitignore`
  * `src/server.js`
  * `src/config/rateLimiter.js`
  * `src/shared/middlewares/rateLimiter.js`
  * `src/shared/utils/logger.js`
* **Tarefas tecnicas:**
  - [ ] Inicializar o projeto Node.js (`npm init -y`) e instalar dependencias base (`express`, `cors`, `dotenv`, `express-rate-limit`).
  - [ ] Implementar `src/server.js` com inicializacao do servidor Express e middlewares globais (parser JSON e politicas de CORS).
  - [ ] Configurar middleware de Rate Limiting (`express-rate-limit`) para protecao contra ataques de forca bruta, spam e DoS.
  - [ ] Desenvolver utilitario de logs (`src/shared/utils/logger.js`) para rastreamento de requisicoes e falhas do sistema.
  - [ ] Configurar scripts de execucao no `package.json` (`npm run dev` com Nodemon e `npm start`).
* **Criterio de Entrega:** Servidor Express inicializando corretamente na porta definida, com CORS restrito ao cliente oficial, limitador de requisicoes ativo e registros de log padronizados.

---

### Pessoa 2: Banco de Dados, Modelagem e Camada de Persistencia (Repository)
**Foco:** Conexao com banco de dados, definicao do esquema relacional/documental e metodos de persistencia.

* **Arquivos sob responsabilidade:**
  * `src/config/database.js`
  * Scripts de migracao/esquema (ex: `schema.sql` ou migrations de ORM)
  * `src/features/subscriptions/subscription.repository.js`
* **Tarefas tecnicas:**
  - [ ] Configurar e instanciar a conexao com o banco de dados em `src/config/database.js` com gerenciamento de pool e reconexao automatica.
  - [ ] Modelar a estrutura da tabela de inscricoes (campos: `id`, `nome`, `email`, `cpf`, `telefone`, `profissao_interesse`, `criado_em`).
  - [ ] Implementar as operacoes de banco de dados em `subscription.repository.js`:
    - `create(subscriptionData)`: Insercao de novo registro de inscricao.
    - `findByEmail(email)`: Consulta de inscricao por endereco de e-mail.
    - `findByCpf(cpf)`: Consulta de inscricao por CPF.
    - `countByProfession(profissao)`: Contagem de inscritos por categoria/oficina para controle de limite de vagas.
* **Criterio de Entrega:** Modulo de conexao estavel e repositorio com funcoes de persistencia e consulta testadas e documentadas.

---

### Pessoa 3: Validacao de Dados (Schemas) e Tratamento Centralizado de Erros
**Foco:** Validacao rigorosa de payloads de entrada, regras estruturais de dados e captura uniforme de excecoes.

* **Arquivos sob responsabilidade:**
  * `src/features/subscriptions/subscription.schema.js`
  * `src/shared/middlewares/errorHandler.js`
  * `src/shared/middlewares/validateRequest.js`
* **Tarefas tecnicas:**
  - [ ] Configurar biblioteca de validacao de esquemas (ex: `Zod` ou `Joi`).
  - [ ] Construir o esquema de validacao em `subscription.schema.js`:
    - Nome completo (obrigatorio, minimo de caracteres).
    - E-mail (formato RFC compativel e obrigatorio).
    - CPF (formato valido e validacao matematica de digitos verificadores).
    - Telefone (formato padronizado com codigo de area).
    - Profissao/Oficina (validacao contra lista predefinida de opcoes validas).
  - [ ] Implementar middleware generico `validateRequest.js` para interceptar requisicoes com payload invalido e retornar status `400 Bad Request` detalhado.
  - [ ] Implementar middleware global `errorHandler.js` para interceptar falhas nao tratadas, registrar logs e ocultar stack traces em ambiente de producao.
* **Criterio de Entrega:** Validacao consistente barrando entradas invalidas antes da camada de negocio e respostas de erro uniformes em JSON.

---

### Pessoa 4: Regras de Negocio (Service), Controladores e Rotas
**Foco:** Orquestracao do fluxo de inscricao, validacoes de negocio e exposicao dos endpoints REST.

* **Arquivos sob responsabilidade:**
  * `src/features/subscriptions/subscription.routes.js`
  * `src/features/subscriptions/subscription.controller.js`
  * `src/features/subscriptions/subscription.service.js`
* **Tarefas tecnicas:**
  - [ ] Implementar regras de negocio em `subscription.service.js`:
    - Validacao de duplicidade de e-mail e CPF consultando o repositorio.
    - Verificacao de disponibilidade de vagas para a profissao selecionada.
    - Delegacao da gravacao dos dados para a camada de persistencia.
  - [ ] Implementar controlador `subscription.controller.js`:
    - Extracao de parametros de `req.body`, repasse ao servico e construcao da resposta HTTP (`201 Created` ou codigos de erro apropriados).
  - [ ] Configurar rotas em `subscription.routes.js`:
    - Definir rota `POST /api/subscriptions` acoplando middleware de validacao e controlador.
    - Definir rota de verificacao `GET /api/subscriptions/health` (se aplicavel).
* **Criterio de Entrega:** Endpoints REST operacionais, desacoplados, aplicando principios de responsabilidade unica e integrados ao repositorio e esquemas.

---

### Pessoa 5: Interface de Usuario (Frontend) e Integracao com a API
**Foco:** Construcao da interface web responsiva, mascaras de entrada, consumo da API REST e feedback ao usuario.

* **Arquivos sob responsabilidade:**
  * `public/index.html`
  * `public/css/styles.css`
  * `public/js/app.js`
* **Tarefas tecnicas:**
  - [ ] Desenvolver estrutura semantica (HTML5) e layout responsivo e acessivel (CSS moderno).
  - [ ] Aplicar mascaras de formatacao e validacoes client-side em campos criticos (CPF, telefone, e-mail).
  - [ ] Implementar chamadas assincronas (`fetch` ou `axios`) direcionadas ao endpoint `POST /api/subscriptions`.
  - [ ] Desenvolver componentes de feedback visual:
    - Exibicao de confirmacao e comprovante em caso de sucesso (`201 Created`).
    - Exibicao de mensagens especificas para erros de validacao ou duplicidade (`400 Bad Request`, `409 Conflict`).
    - Notificacao de bloqueio temporario em caso de excesso de requisicoes (`429 Too Many Requests`).
  - [ ] Executar testes de ponta a ponta (E2E) simulando o preenchimento e submissao do formulario.
* **Criterio de Entrega:** Interface grafica funcional, integrada a API do backend, com tratamento de respostas de sucesso e excecoes.

---

## 2. Cronograma de Execucao por Etapas

| Etapa | Duracao Estimada | Atividades Principais | Responsaveis |
| :--- | :--- | :--- | :--- |
| **Etapa 1: Setup e Infraestrutura Base** | Dia 1 | Inicializacao do repositorio, configuracao do Express, conexao inicial com banco e definicao das variaveis de ambiente. | Pessoa 1 e Pessoa 2 |
| **Etapa 2: Construcao dos Modulos** | Dia 2 e Dia 3 | Desenvolvimento dos Schemas de validacao, Repository, Service, Controllers, Middlewares e prototipo da interface. | Pessoas 2, 3, 4 e 5 |
| **Etapa 3: Integracao de Camadas** | Dia 4 | Vinculacao de rotas, servicos, persistencia e conexao do Frontend com os endpoints da API. | Todas as Pessoas (1 a 5) |
| **Etapa 4: Validacao, Testes e Entrega** | Dia 5 | Testes de carga no Rate Limiting, validacao de dados de borda, responsividade cross-device e consolidacao da documentacao. | Todas as Pessoas (1 a 5) |

---

## 3. Matriz de Entregaveis e Criterios de Aceite

| Integrante | Funcao Principal | Componentes Chave | Criterio de Aceite Tecnico |
| :--- | :--- | :--- | :--- |
| **Pessoa 1** | DevOps & Core | `server.js`, `rateLimiter.js`, `logger.js` | O servidor inicia sem erros; requisicoes excedentes recebem HTTP 429; logs gravam acessos e falhas. |
| **Pessoa 2** | DBA & Data Layer | `database.js`, `subscription.repository.js` | Conexao estavel; consultas e insercoes executam sem violacoes de integridade no banco. |
| **Pessoa 3** | QA & Security | `subscription.schema.js`, `errorHandler.js` | Entradas fora do padrao retornam HTTP 400 com descricao clara; erros 500 ocultam dados internos do servidor. |
| **Pessoa 4** | Feature Lead | `subscription.service.js`, `subscription.controller.js` | Cadastros duplicados sao bloqueados; inscricoes validas sao registradas com retorno HTTP 201. |
| **Pessoa 5** | Frontend & UX | `index.html`, `styles.css`, `app.js` | Formulario se comunica com a API, trata todos os codigos de retorno e mantem layout responsivo. |

---

## 4. Padrao de Versionamento e Fluxo Git

1. **Branch Principal:** `main` (codigo estavel, pronto para producao).
2. **Branches por Integrante/Funcionalidade:**
   - Pessoa 1: `feature/core-setup-and-security`
   - Pessoa 2: `feature/database-and-repository`
   - Pessoa 3: `feature/schemas-and-error-handling`
   - Pessoa 4: `feature/subscription-service-controller`
   - Pessoa 5: `feature/frontend-subscription-form`
3. **Politica de Integracao:** Qualquer alteracao deve ser submetida via Pull Request (PR), acompanhada de descricao detalhada dos modulos alterados e aprovada antes do merge.
