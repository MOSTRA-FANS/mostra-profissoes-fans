# Planejamento e Divisao de Tarefas do Backend — Mostra de Profissoes

Este documento estabelece a divisao do desenvolvimento do **Backend da aplicacao de inscricoes da Mostra de Profissoes (Node.js/Express)** em etapas cronologicas e distribui as responsabilidades tecnicas exclusivamente no ecossistema do backend entre **5 integrantes**, assegurando separacao de conceitos (SRP), desacoplamento entre camadas e integracao fluida da API REST.

---

## 1. Arquitetura em Camadas e Distribuicao das 5 Funcoes

```text
+-----------------------------------------------------------------------------------+
|                            ARQUITETURA DO BACKEND                                 |
+-------------------+-------------------+-------------------+-----------------------+
|     PESSOA 1      |     PESSOA 2      |     PESSOA 3      |       PESSOA 4        |
|  Core & Seguranca | Banco & Persist.  | Validacao & Erros |   Regras de Negocio   |
| (Server/RateLimit)| (DB & Repository) | (Schema/Handler)  |    (Service Layer)    |
+---------+---------+---------+---------+---------+---------+-----------+-----------+
          |                   |                   |                     |
          +-------------------+-------------------+---------------------+
                                      |
                                      v
                        +---------------------------+
                        |         PESSOA 5          |
                        | Rotas, Controller, Testes |
                        |     e Docs da API REST    |
                        +---------------------------+
```

---

### Pessoa 1: Core do Servidor, Infraestrutura e Seguranca Global
**Foco:** Inicializacao do runtime Node.js, configuracao do Express, politicas de seguranca de rede e modulo de logs.

* **Arquivos sob responsabilidade:**
  * `package.json`
  * `.env.example`
  * `.gitignore`
  * `src/server.js`
  * `src/config/rateLimiter.js`
  * `src/shared/middlewares/rateLimiter.js`
  * `src/shared/utils/logger.js`
* **Tarefas tecnicas:**
  - [ ] Inicializar o projeto Node.js (`npm init -y`) e configurar scripts no `package.json` (`start`, `dev` com nodemon).
  - [ ] Instalar dependencias centrais de infraestrutura (`express`, `cors`, `dotenv`, `express-rate-limit`, `helmet`).
  - [ ] Configurar o arquivo principal `src/server.js` com instanciacao do Express, parsing de JSON (`express.json`) e politicas de CORS restritas ao dominio cliente.
  - [ ] Implementar e parametrizar o limitador de requisicoes (`src/config/rateLimiter.js` e `src/shared/middlewares/rateLimiter.js`) para mitigar abusos e ataques DoS.
  - [ ] Desenvolver utilitario de logs (`src/shared/utils/logger.js`) para rastreamento de acessos, erros e tempo de resposta das chamadas.
* **Criterio de Entrega:** Servidor Express inicializando de forma resiliente na porta definida, com protecao por Rate Limit ativa, configuracao de variaveis de ambiente e logs operacionais.

---

### Pessoa 2: Banco de Dados, Modelagem e Camada de Persistencia (Repository)
**Foco:** Conexao com a base de dados, modelagem das tabelas de inscricao e metodos de consulta/escrita SQL ou ORM.

* **Arquivos sob responsabilidade:**
  * `src/config/database.js`
  * Migrations versionadas em `migrations/` e contrato em `docs/database.md`
  * `src/features/subscriptions/subscription.repository.js`
* **Tarefas tecnicas:**
  - [x] Configurar o conector com o banco de dados em `src/config/database.js` (gerenciamento de pool de conexoes, tratamento de timeout e reconexao).
  - [x] Elaborar a modelagem de dados da tabela `inscricoes` com campos: `id`, `nome`, `idade`, `email`, `telefone`, `curso`, `novo`, `outro`, `novidade`, `feedback`, `saber`, `data_inscricao`; catalogos `cursos_atuais` e `cursos_novos`.
  - [x] Implementar a camada de persistencia em `subscription.repository.js`:
    - `create(subscriptionData)`: Persistencia do registro da inscricao no banco.
    - `findByEmail(email)`: Consulta de inscricao por endereco de e-mail.
    - `listCurrentCourses()` e `listNewCourses()`: Opcoes permitidas dos catalogos do banco.
    - `checkHealth()`: Funcao para verificar status ativo da conexao com a base.
* **Criterio de Entrega:** Modulo de conexao estavel e repositorio com funcoes de consulta e escrita testadas, sem vulnerabilidades de injecao (SQL Injection).

---

### Pessoa 3: Validacao de Dados (Schemas) e Tratamento Centralizado de Erros
**Foco:** Garantia da integridade dos payloads de entrada, regras estruturais de validacao e captura padronizada de falhas.

* **Arquivos sob responsabilidade:**
  * `src/features/subscriptions/subscription.schema.js`
  * `src/shared/middlewares/validateRequest.js`
  * `src/shared/middlewares/errorHandler.js`
* **Tarefas tecnicas:**
  - [ ] Integrar biblioteca de validacao de esquemas (ex: `Zod` ou `Joi`).
  - [ ] Definir regras de validacao rigorosas em `subscription.schema.js`:
    - Nome completo (obrigatorio, minimo de caracteres, sanitizacao de espacos).
    - E-mail (formato de e-mail valido segundo especificacao RFC).
    - Idade (inteiro obrigatorio), campos opcionais e limites de tamanho conforme `docs/database.md` e migrations.
    - Telefone (codigo DDD valido e tamanho padrao nacional).
    - Um curso atual obrigatorio e no maximo um curso novo opcional; rejeitar arrays. Catalogos mantidos no banco.
  - [ ] Implementar middleware reutilizavel `validateRequest.js` para interceptar payloads invalidos antes de chegarem aos controladores, retornando status `400 Bad Request` com array de inconsistencias.
  - [ ] Implementar middleware global `errorHandler.js` para capturar excecoes sincronas e assincronas, formatar a saida JSON e omitir detalhes internos em ambiente de producao.
* **Criterio de Entrega:** Validacao robusta barrando entradas invalidas com mensagens claras e camada central de captura de erros operando em todas as rotas.

---

### Pessoa 4: Regras de Negocio e Camada de Servico (Service Layer)
**Foco:** Implementacao da logica do dominio de inscricoes, validacoes de negocio, bloqueio de e-mail repetido e selecao de cursos.

* **Arquivos sob responsabilidade:**
  * `src/features/subscriptions/subscription.service.js`
  * `src/shared/errors/AppError.js` (classes de erros personalizados)
* **Tarefas tecnicas:**
  - [x] Criar classes de erros customizados (ex: `ConflictError`, `BusinessError`, `NotFoundError`) para mapeamento automatico de status HTTP.
  - [x] Implementar a logica de negocio em `subscription.service.js`:
    - Normalizar e-mail com trim e lowercase e rejeitar novas respostas do mesmo e-mail, inclusive em envios simultaneos.
    - Validar curso atual e curso novo contra os catalogos; sem reserva ou limite de vagas.
    - Usar o id gerado pelo banco; CPF e protocolo nao fazem parte deste formulario.
    - Chamada ao repositorio para efetivacao da gravacao dos dados tratados.
* **Criterio de Entrega:** Camada de servico contendo todas as regras de negocio isoladas, sem dependencia direta do protocolo HTTP (`req`/`res`), com testes de cenarios positivos e excecoes.

---

### Pessoa 5: Controladores, Roteamento HTTP, Testes Automatizados e Documentacao da API
**Foco:** Recebimento das requisicoes HTTP, orquestracao da comunicacao entre camadas, suite de testes de integracao e especificacao dos contratos REST.

* **Arquivos sob responsabilidade:**
  * `src/features/subscriptions/subscription.controller.js`
  * `src/features/subscriptions/subscription.routes.js`
  * `tests/` ou script de validacao de endpoints (ex: Jest/Supertest ou suite Postman/Insomnia)
  * `docs/api-spec.md` (ou especificacao OpenAPI/Swagger)
* **Tarefas tecnicas:**
  - [ ] Implementar `subscription.controller.js`:
    - Extrair dados do corpo (`req.body`), acionar o servico (`subscription.service.js`) e retornar status HTTP correspondente (`201 Created`, `200 OK`).
  - [ ] Configurar o roteador `subscription.routes.js`:
    - Mapear a rota `POST /api/subscriptions` vinculando os middlewares de Rate Limiting, validacao de schema e o metodo do controller.
    - Mapear rota de diagnostico `GET /api/health` para monitoramento do backend e da conexao com o banco.
  - [ ] Desenvolver suite de testes de integracao / colecao de testes de API cobrindo cenarios: sucesso (201), dados invalidos (400), cadastro duplicado (409), excesso de requisicoes (429) e erro interno (500).
  - [ ] Elaborar a documentacao tecnica dos endpoints da API REST (metodos, URLs, cabeçalhos, payloads de requisicao e exemplos de respostas JSON).
* **Criterio de Entrega:** Endpoints expostos e funcionais, rotas integradas ao servidor principal, suite de testes comprovando o funcionamento da API e documentacao dos contratos para consumo pelo frontend.

---

## 2. Cronograma de Execucao por Etapas

| Etapa | Duracao Estimada | Atividades Principais | Responsaveis Envolvidos |
| :--- | :--- | :--- | :--- |
| **Etapa 1: Estrutura Base e Persistencia** | Dia 1 | Criacao do repositorio Git, setup do Express, configuracao do banco de dados e modelagem das tabelas. | Pessoa 1 e Pessoa 2 |
| **Etapa 2: Validacao, Regras e Endpoints** | Dia 2 e Dia 3 | Construcao dos Schemas de validacao, Services de negocio, Repositories, Controllers e Middlewares de erro. | Pessoas 2, 3, 4 e 5 |
| **Etapa 3: Integracao do Pipeline HTTP** | Dia 4 | Vinculacao de todas as camadas no `server.js`, aplicacao dos middlewares globais e integracao completa do fluxo de inscricao. | Todas as Pessoas (1 a 5) |
| **Etapa 4: Testes de Integracao e Seguranca** | Dia 5 | Execucao dos testes de integracao, validacao de cenarios de borda, teste de carga do Rate Limiter e fechamento da documentacao. | Todas as Pessoas (1 a 5) |

---

## 3. Matriz de Entregaveis e Criterios de Aceite Tecnico

| Integrante | Funcao no Backend | Modulos Principais | Criterio de Aceite Tecnico |
| :--- | :--- | :--- | :--- |
| **Pessoa 1** | Core & Seguranca | `server.js`, `rateLimiter.js`, `logger.js` | Servidor roda estavel na porta configurada; IP e bloqueado com status HTTP 429 apos exceder o limite de requisicoes; logs registram eventos. |
| **Pessoa 2** | Persistencia & Banco | `database.js`, `subscription.repository.js` | Conexao resiliente com pool ativo; dados sao gravados e consultados sem falhas de integridade ou vulnerabilidade a SQL Injection. |
| **Pessoa 3** | Validacao & Erros | `subscription.schema.js`, `errorHandler.js` | Payloads fora do padrao sao barrados com HTTP 400 antes da regra de negocio; falhas nao tratadas resultam em HTTP 500 sem stack trace exposto. |
| **Pessoa 4** | Regras de Negocio | `subscription.service.js`, `AppError.js` | E-mail repetido retorna 409; aceita um curso atual e no maximo um curso novo dos catalogos; sem limite de vagas. |
| **Pessoa 5** | Controller & Testes | `subscription.controller.js`, `subscription.routes.js`, testes e docs | Rotas respondem nos contratos JSON definidos; respostas HTTP 201/400/409/429/500 corretas; suite de testes automatizada validando o fluxo. |

---

## 4. Padrao de Versionamento e Fluxo Git

1. **Branch Principal:** `main` (codigo de backend estavel, homologado e testado).
2. **Branches por Integrante/Modulo:**
   - Pessoa 1: `feature/core-server-and-security`
   - Pessoa 2: `feature/database-and-repository`
   - Pessoa 3: `feature/schemas-and-error-handling`
   - Pessoa 4: `feature/subscription-service-rules`
   - Pessoa 5: `feature/controller-routes-and-tests`
3. **Politica de Integracao:** Qualquer alteracao devera ser submetida via Pull Request (PR), passando por revisao cruzada entre camadas adjacentes antes do merge na branch principal.

## Contrato atualizado do formulario

Consulte `docs/database.md`. O catalogo de cursos novos comeca vazio; `novo` pode ser null. Validacao HTTP completa e testes com MySQL real ainda pendentes.
