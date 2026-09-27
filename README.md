# Mostra de Profissões FANS

Site institucional e API do formulário de interesse da Mostra de Profissões.
O frontend é HTML/CSS/JavaScript e o backend usa Node.js, Express e MySQL.

## Funcionalidades

- Formulário em `inscricao.html`, preenchido com os catálogos do banco.
- Uma resposta por e-mail, inclusive sob envios simultâneos.
- Curso atual obrigatório e, quando cadastrado, um curso novo opcional.
- Validação e sanitização com Zod.
- CORS, Helmet, limite global e limite específico para inscrições.
- Health check do processo e do MySQL.
- Logs estruturados em produção sem registrar o e-mail do participante.

## API

| Método | Rota | Finalidade |
| --- | --- | --- |
| `GET` | `/api/health` | Saúde do processo e conexão MySQL. |
| `GET` | `/api/courses` | Catálogos atuais e novos. |
| `POST` | `/api/subscriptions` | Cria uma inscrição. |

O contrato completo está em `docs/api-spec.md` e o banco em
`docs/database.md`.

## Instalação local

Requisitos: Node.js 18 ou superior e MySQL 8.

```powershell
npm ci
Copy-Item .env.example .env
```

Edite `.env` com um usuário MySQL dedicado e execute:

```powershell
npm run db:migrate
npm start
```

Sirva os arquivos HTML em `http://localhost:5500`. Nesse endereço,
`inscricao.html` usa automaticamente a API em `http://localhost:3000/api`.
Em produção, frontend e API podem compartilhar a mesma origem (`/api`) ou o
frontend pode definir `window.MOSTRA_API_BASE_URL` antes de carregar
`js/subscription.js`.

## Testes

```powershell
npm test
npm run test:coverage
```

Os testes comuns não alteram banco real. Para a suíte MySQL, use uma instância
exclusiva de teste e um usuário autorizado a criar e remover bancos temporários:

```powershell
npm run test:mysql
```

A suíte cria uma base aleatória `mostra_test_*` e remove somente essa base ao
terminar. Nunca use credenciais de produção nesse comando.

## Estrutura principal

```text
src/
├── config/                         # Banco e rate limit
├── features/subscriptions/         # Routes, controller, schema, service e repository
├── shared/                         # Erros, middlewares e logs
└── server.js                       # Aplicação Express
migrations/                       # Evolução versionada do banco
scripts/                          # Executor de migrations e teste MySQL
tests/                            # Testes HTTP, domínio, frontend e MySQL
inscricao.html                    # Formulário da Mostra
js/subscription.js                # Integração frontend/API
```

## Publicação

1. Configure todas as variáveis de `.env.example`; em produção as credenciais
   do banco e `CLIENT_ORIGIN` são obrigatórias.
2. Faça backup do banco e execute `npm run db:migrate` uma vez por versão.
3. Execute `npm test` e, no ambiente de homologação, `npm run test:mysql`.
4. Inicie a API com `NODE_ENV=production` e configure `TRUST_PROXY` conforme a
   quantidade real de proxies reversos.
5. Confira `/api/health` e envie uma inscrição de homologação antes de liberar.
