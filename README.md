# Arquitetura do Backend — Amostra de Profissões

Este documento descreve a arquitetura do backend para a aplicação de inscrição da Amostra de Profissões, utilizando **Node.js** e **Express**.

---

## 1. Visão Geral e Princípios
- **Arquitetura Baseada em Recursos (Feature Folder):** O código é organizado por módulos funcionais em vez de pastas genéricas.
- **Responsabilidade Única (SRP em Camadas):** Separação clara entre roteamento, controle de requisições, regra de negócio e persistência de dados.
- **Desacoplamento do Client (API REST):** A API aceita e responde estritamente no formato JSON, mantendo o frontend (HTML/CSS/JS) totalmente independente.
- **Segurança e Resiliência:** Proteção contra abusos no envio do formulário através de limitador de requisições (Rate Limiting).

---

## 2. Estrutura de Pastas

```text
src/
├── config/
│   ├── database.js          # Configuração de conexão com o Banco de Dados
│   └── rateLimiter.js       # Parâmetros globais do rate limiter
├── features/
│   └── subscriptions/       # Módulo da funcionalidade de Inscrição
│       ├── subscription.routes.js     # Endpoints e Middlewares específicos
│       ├── subscription.controller.js # Recebe req, chama service e responde res
│       ├── subscription.service.js    # Regras de negócio e validações
│       ├── subscription.repository.js # Operações diretas com o banco de dados
│       └── subscription.schema.js     # Schema de validação de payload (ex: Zod/Joi)
├── shared/                  # Módulos compartilhados entre features
│   ├── middlewares/
│   │   ├── errorHandler.js  # Captura e formatação centralizada de erros
│   │   └── rateLimiter.js   # Middleware de limitação de requisições
│   └── utils/
│       └── logger.js        # Utilitário para logs do sistema
└── server.js                # Inicialização do servidor Express
```

---

## 3. Divisão de Responsabilidades (SRP)

| Camada | Arquivo Exemplo | Responsabilidade |
| :--- | :--- | :--- |
| **Routes** | `subscription.routes.js` | Define as rotas HTTP (`POST /api/subscriptions`) e aplica os middlewares específicos. |
| **Controller** | `subscription.controller.js` | Recebe a requisição, extrai o corpo (`req.body`), aciona a camada de serviço e retorna o status HTTP + JSON. |
| **Service** | `subscription.service.js` | Contém a regra de negócio (ex: verificar duplicidade de e-mail/CPF, validar vagas disponíveis). |
| **Repository** | `subscription.repository.js` | Contém as consultas SQL ou chamadas do ORM/ODM (ex: Prisma, TypeORM, Mongoose). |
| **Schema** | `subscription.schema.js` | Valida a estrutura dos dados recebidos no formulário antes de prosseguir. |

---

## 4. Segurança & Boas Práticas

1. **Rate Limiting (Proteção contra Spam):**
   - Implementado via `express-rate-limit`.
   - Limita o número de inscrições por IP dentro de uma janela de tempo para evitar bots ou ataques de negação de serviço (DoS).

2. **CORS (Cross-Origin Resource Sharing):**
   - Restringe o consumo da API apenas para o domínio oficial onde o frontend (HTML/CSS/JS) está hospedado.

3. **Tratamento Global de Erros:**
   - Evita a exposição de stack traces em ambiente de produção através do middleware `errorHandler.js`.