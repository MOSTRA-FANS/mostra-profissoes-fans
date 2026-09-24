# Especificação da API REST — Mostra de Profissões

Documentação técnica oficial dos endpoints HTTP do backend da **Mostra de Profissões**, detalhando contratos de entrada e saída, status codes, regras de validação, rate limiting e exemplos práticos para integração com o cliente web (frontend).

---

## 1. Visão Geral da API

- **Base URL:** `http://localhost:3000/api` (ou endereço do servidor configurado via `PORT`)
- **Protocolo:** HTTP/1.1
- **Formato de Dados:** `application/json` (UTF-8)
- **Segurança:** Cabeçalhos de segurança via Helmet, CORS restrito via `CLIENT_ORIGIN` e proteção contra DoS via `express-rate-limit`.

### Cabeçalhos Padrão de Requisição

| Cabeçalho | Valor | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `Content-Type` | `application/json` | Sim (em POST) | Especifica o corpo da requisição em formato JSON. |
| `Accept` | `application/json` | Sim | Indica que o cliente aceita respostas JSON. |
| `Origin` | `http://localhost:5500` | Sim (no navegador) | Domínio do frontend verificado pela política de CORS. |

---

## 2. Política de Rate Limiting (Controle de Taxa)

Para mitigar abusos, automações maliciosas (bots) e ataques DoS, a API implementa dois níveis de proteção:

1. **Limite Global (`/api/*`):**
   - **Janela de Tempo:** 15 minutos (configurável por `RATE_LIMIT_WINDOW_MS`).
   - **Limite Máximo:** 100 requisições por IP (configurável por `RATE_LIMIT_MAX`).
   - **Exceção:** O endpoint de diagnóstico `/api/health` possui bypass deste limitador para monitoramento ininterrupto.

2. **Limite Específico do Formulário (`POST /api/subscriptions`):**
   - **Janela de Tempo:** 1 hora (configurável por `SUBSCRIPTION_RATE_LIMIT_WINDOW_MS`).
   - **Limite Máximo:** 5 tentativas por IP (configurável por `SUBSCRIPTION_RATE_LIMIT_MAX`).
   - **Cabeçalhos de Resposta Inclusos:**
     - `RateLimit-Limit`: Cota máxima na janela.
     - `RateLimit-Remaining`: Requisições restantes na cota do IP.
     - `RateLimit-Reset`: Tempo restante em segundos para renovação da cota.
     - `Retry-After`: Tempo de espera obrigatório antes da próxima requisição ao atingir o limite.

---

## 3. Resumo dos Endpoints

| Método | Endpoint | Middleware / Proteções | Descrição |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/health` | CORS, Helmet | Monitoramento do servidor e integridade da conexão MySQL. |
| **GET** | `/api/courses` | Global Rate Limiter, CORS | Retorna catálogos de cursos atuais homologados e novidades. |
| **POST** | `/api/subscriptions` | Subscription Limiter, Zod Validation, Error Handler | Registra nova inscrição de participante no formulário. |

---

## 4. Detalhamento dos Endpoints

### 4.1. Diagnóstico do Sistema: `GET /api/health`

Verifica a saúde operacional da API e a conectividade com o pool de banco de dados MySQL.

- **Método:** `GET`
- **URL:** `/api/health`
- **Autenticação:** Não requer.

#### Resposta de Sucesso (200 OK — Sistema Saudável)
```json
{
  "status": "ok",
  "uptime": 142,
  "timestamp": "2026-09-24T14:59:54.450Z",
  "database": {
    "status": "connected",
    "latencyMs": 3
  }
}
```

#### Resposta de Degradação (503 Service Unavailable — Falha no Banco)
```json
{
  "status": "degraded",
  "uptime": 142,
  "timestamp": "2026-09-24T14:59:54.459Z",
  "database": {
    "status": "disconnected",
    "latencyMs": 50,
    "error": "Connection refused"
  }
}
```

---

### 4.2. Consulta de Cursos: `GET /api/courses`

Fornece a lista de cursos válidos cadastrados no catálogo para população dinâmica dos componentes de seleção (`<select>`) no frontend.

- **Método:** `GET`
- **URL:** `/api/courses`

#### Resposta de Sucesso (200 OK)
```json
{
  "status": "success",
  "data": {
    "cursos_atuais": [
      "Administração",
      "Direito",
      "Ciências Contábeis",
      "Engenharia de Software",
      "Pedagogia",
      "Psicologia",
      "Técnico em Enfermagem",
      "Técnico em Segurança do Trabalho"
    ],
    "cursos_novos": []
  }
}
```

---

### 4.3. Criação de Inscrição: `POST /api/subscriptions`

Recebe os dados do formulário de inscrição, valida rigorosamente os tipos e formatos, normaliza campos de contato e persiste a resposta na tabela `inscricoes`.

- **Método:** `POST`
- **URL:** `/api/subscriptions`
- **Rate Limit:** 5 requisições / hora por IP.

#### Especificação do Payload (JSON Body)

| Campo | Tipo | Obrigatório | Descrição / Regra de Validação |
| :--- | :--- | :--- | :--- |
| `nome` | `string` | **Sim** | Nome completo do participante. Mínimo 3, máximo 150 caracteres. Letras, espaços e hifens. Espaços duplicados são colapsados. |
| `email` | `string` | **Sim** | E-mail válido (RFC 5322). Máximo 320 caracteres. É normalizado em minúsculas e deve ser único na base. |
| `telefone` | `string` | **Sim** | Telefone com DDD brasileiro válido (ANATEL). 10 dígitos (fixo, inicial 2-5) ou 11 dígitos (celular, inicial 9). Caracteres não numéricos são removidos na sanitização. |
| `curso` | `string` | **Sim\*** | Curso de interesse homologado (ex: `Engenharia de Software`). Também aceito como `profissao_interesse` para total retrocompatibilidade. |
| `idade` | `integer` | Não | Idade do participante (número inteiro entre 1 e 120 anos). |
| `novo` | `string \| null` | Não | Curso de catálogo novo sugerido/escolhido (máximo 100 caracteres). |
| `outro` | `string \| null` | Não | Campo de texto livre opcional (máximo 100 caracteres). |
| `novidade` | `integer \| boolean` | Não | Flag `0` ou `1` indicando se deseja receber novidades (padrão: 0). |
| `feedback` | `string \| null` | Não | Mensagem ou sugestão opcional do participante. |
| `saber` | `string \| null` | Não | Canal por onde conheceu a Mostra (ex: `Instagram`, `WhatsApp`, `Professor`, `Amigo/Colega`, `Site da faculdade`, `Cartaz`, `Outro`). |

*\* Nota: Deve ser fornecido `curso` ou `profissao_interesse` contendo uma das opções válidas.*

#### Exemplo de Requisição (Payload Completo)
```json
{
  "nome": "Mariana Costa Ribeiro",
  "email": "mariana.costa@exemplo.com",
  "telefone": "(31) 98765-4321",
  "curso": "Engenharia de Software",
  "idade": 19,
  "novidade": 1,
  "saber": "Instagram",
  "feedback": "Muito empolgada para o evento!"
}
```

---

## 5. Matriz de Respostas HTTP

### 5.1. 201 Created (Sucesso no Cadastro)
Retornado quando a validação estrutural passa e o registro é gravado com sucesso.
```json
{
  "status": "success",
  "message": "Inscrição realizada com sucesso.",
  "data": {
    "id": 101,
    "nome": "Mariana Costa Ribeiro",
    "idade": 19,
    "telefone": "31987654321",
    "email": "mariana.costa@exemplo.com",
    "curso": "Engenharia de Software",
    "novo": null,
    "outro": null,
    "novidade": 1,
    "feedback": "Muito empolgada para o evento!",
    "saber": "Instagram",
    "data_inscricao": "2026-09-24T14:59:54.480Z"
  }
}
```

### 5.2. 400 Bad Request (Dados Inválidos)
Retornado pelo middleware `validateRequest` quando o payload viola regras de schema, ou pelo `express.json` em caso de sintaxe JSON corrompida.

#### Exemplo A: Inconsistências de Validação de Campos
```json
{
  "status": "error",
  "message": "Dados invalidos",
  "errors": [
    {
      "campo": "nome",
      "mensagem": "Informe o nome completo"
    },
    {
      "campo": "email",
      "mensagem": "E-mail invalido"
    },
    {
      "campo": "telefone",
      "mensagem": "Telefone invalido: informe DDD valido + numero (10 ou 11 digitos)"
    },
    {
      "campo": "profissao_interesse",
      "mensagem": "Profissao invalida. Opcoes: Administração, Direito, Ciências Contábeis, Engenharia de Software, Pedagogia, Psicologia, Técnico em Enfermagem, Técnico em Segurança do Trabalho"
    }
  ]
}
```

#### Exemplo B: JSON Malformado
```json
{
  "status": "error",
  "message": "JSON inválido no corpo da requisição."
}
```

### 5.3. 409 Conflict (Cadastro Duplicado)
Retornado quando o e-mail informado já efetuou uma inscrição prévia na base de dados.
```json
{
  "status": "error",
  "message": "Este e-mail já respondeu ao formulário."
}
```

### 5.4. 429 Too Many Requests (Excesso de Requisições / Rate Limit)
Retornado quando um IP ultrapassa o limite de 5 tentativas de submissão por hora.
```json
{
  "status": "error",
  "message": "Limite de tentativas de inscrição excedido. Tente novamente mais tarde.",
  "retryAfterSeconds": 3598
}
```

### 5.5. 500 Internal Server Error (Erro Interno Não Tratado)
Retornado pelo middleware central `errorHandler` em caso de falhas inesperadas de infraestrutura. Em ambiente de produção (`NODE_ENV=production`), detalhes de stack trace são estritamente omitidos por segurança.

#### Em Produção:
```json
{
  "status": "error",
  "message": "Erro interno do servidor."
}
```

#### Em Desenvolvimento:
```json
{
  "status": "error",
  "message": "Falha de conexão com o banco de dados",
  "stack": "Error: Falha de conexão...\n    at SubscriptionRepository.create ..."
}
```

---

## 6. Guia de Integração com o Frontend (Fetch API)

Exemplo em JavaScript Vanilla para consumo do formulário:

```javascript
async function enviarInscricao(dadosFormulario) {
  const endpoint = 'http://localhost:3000/api/subscriptions';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(dadosFormulario)
    });

    const data = await response.json();

    switch (response.status) {
      case 201:
        alert(`Inscrição confirmada com sucesso! Código: ${data.data.id}`);
        break;

      case 400:
        if (data.errors && Array.isArray(data.errors)) {
          const mensagens = data.errors.map(err => `• ${err.campo}: ${err.mensagem}`).join('\n');
          alert(`Erros de preenchimento:\n${mensagens}`);
        } else {
          alert(`Erro: ${data.message}`);
        }
        break;

      case 409:
        alert('Atenção: Este e-mail já foi utilizado em outra inscrição.');
        break;

      case 429:
        const minutos = Math.ceil((data.retryAfterSeconds || 60) / 60);
        alert(`Muitas tentativas! Aguarde ${minutos} minuto(s) antes de tentar novamente.`);
        break;

      default:
        alert('Ocorreu um erro no servidor. Tente novamente mais tarde.');
    }
  } catch (error) {
    console.error('Falha de rede ao conectar à API:', error);
    alert('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
  }
}
```
