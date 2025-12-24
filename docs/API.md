# API

Este documento descreve o contrato HTTP exposto pela API.

## Formato de resposta

Todas as respostas seguem o formato:

```ts
type ApiResponse<T = unknown> = {
  statusCode: number;
  message: string;
  code?: string;
  data?: T;
  elapsedTime?: string;
};
```

Exemplo de sucesso:

```json
{
  "statusCode": 200,
  "message": "Ok",
  "data": {
    "example": "value"
  }
}
```

Exemplo de erro:

```json
{
  "statusCode": 400,
  "message": "Validation error",
  "code": "VALIDATION_ERROR",
  "data": {
    "issues": [{ "path": ["email"], "message": "Invalid email" }]
  }
}
```

## Autenticação

A API usa JWT. O token pode ser entregue de duas formas.

O payload do JWT inclui:

```ts
type TokenPayload = { sub: string; role: 'USER' | 'ADMIN' };
```

### Cookie httpOnly (Web)

- O endpoint de login (`POST /auth/login`) escreve um cookie `token` httpOnly.
- Esse cookie é lido no auth-middleware via `AUTH_COOKIE_NAME`.
- Em contexto navegador, recomenda-se habilitar CSRF (`CSRF_ENABLED=true`).

### Header Authorization: Bearer (Mobile / CLI)

- O endpoint `POST /auth/token` devolve um JWT no corpo, sem setar cookie.
- O cliente envia em todas as requisições protegidas:

  ```http
  Authorization: Bearer <token>
  ```

- Esse fluxo não usa CSRF, pois o token não é anexado automaticamente em nenhuma requisição.

### Comportamento do middleware de autenticação

O middleware de autenticação tenta, nesta ordem:

1. Ler o header `Authorization: Bearer <token>` (quando presente e não vazio).
2. Caso não exista Bearer, ler o token do cookie `token`.

Se não encontrar token ou se o token for inválido/expirado, a resposta será:

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

Em caso de sucesso, o middleware preenche `req.user` com:

```ts
req.user = { id: payload.sub, role: payload.role };
```

## CSRF

O middleware de CSRF é opcional e é controlado pela variável `CSRF_ENABLED`.

- Quando `CSRF_ENABLED=false`: nenhuma verificação de CSRF é feita.
- Quando `CSRF_ENABLED=true`:
  - O middleware só age em métodos unsafe (`POST`, `PUT`, `PATCH`, `DELETE`).
  - Ele só exige CSRF se:
    - existir o cookie de autenticação (`token`), ou
    - a rota estiver em uma lista de rotas de autenticação por cookie (por exemplo, `/auth/login`).

### Fluxo (double submit cookie)

1. A API gera um token aleatório e grava no cookie `CSRF_COOKIE_NAME` (por padrão `csrfToken`).
2. O cliente precisa enviar o mesmo valor em um header:
   - `x-csrf-token` ou
   - `x-xsrf-token`.
3. Se cookie e header não existirem ou não baterem, a API responde:

   ```json
   {
     "statusCode": 403,
     "message": "Invalid or missing CSRF token",
     "code": "CSRF_INVALID_TOKEN"
   }
   ```

### Web (SPA / navegador)

Quando `CSRF_ENABLED=true`, o **login por cookie** também exige CSRF. O fluxo recomendado é:

1. Chamar `GET /auth/csrf`.
   - Se CSRF estiver ligado, a resposta é 200 e também envia `Set-Cookie` do token (se necessário).
2. Enviar `POST /auth/login` com o header `x-csrf-token` igual ao valor do cookie de CSRF.
3. Em todas as requests unsafe (POST, PUT, PATCH, DELETE) que dependem do cookie `token`,
   enviar `x-csrf-token` com o mesmo valor do cookie de CSRF.

Dica (Swagger): o endpoint `/api/docs` já está configurado para enviar cookies (`withCredentials`)
e tentar injetar `x-csrf-token` automaticamente lendo o cookie de CSRF.

### Mobile / CLI

- Recomendado usar apenas `Authorization: Bearer <token>` em todas as requisições.
- Nesse caso, o CSRF não é exigido, mesmo quando `CSRF_ENABLED=true`, porque:
  - não há cookie `token` enviado automaticamente
  - o middleware de CSRF ignora requests com Bearer

Ou seja:

- se o backend for só para mobile/CLI, você pode simplesmente deixar `CSRF_ENABLED=false`
- se o backend for compartilhado com Web, pode deixar `CSRF_ENABLED=true`
  e os clientes mobile continuam funcionando normalmente, sem precisar de header de CSRF.

## Endpoints

### Health

**GET** `/health`

Retorna informações de saúde da API no padrão `createResponse`.

Inclui:

- `status`: `ok`, `degraded` (ex: timeout no DB) ou `down` (DB indisponível)
- `timestamp` e `uptimeSeconds`
- `app` (nome, versão, `nodeEnv`) e `runtime` (node, pid, platform, arch)
- `system.memory` (bytes) e `checks.database` (status e latência)

Respostas:

- 200: serviço saudável (ou degradado, mas ainda respondendo).
- 503: serviço indisponível (ex: banco fora).

Exemplo (200):

```json
{
  "statusCode": 200,
  "message": "OK",
  "data": {
    "status": "ok",
    "timestamp": "2025-12-23T23:59:59.000Z",
    "uptimeSeconds": 123.45,
    "app": {
      "name": "clean-arch-backend",
      "version": "1.0.0",
      "nodeEnv": "production"
    },
    "runtime": {
      "node": "v20.0.0",
      "pid": 123,
      "platform": "linux",
      "arch": "x64"
    },
    "system": {
      "hostname": "server-1",
      "memory": {
        "rssBytes": 123,
        "heapUsedBytes": 123,
        "heapTotalBytes": 123
      }
    },
    "checks": {
      "database": {
        "status": "up",
        "latencyMs": 10
      }
    }
  },
  "elapsedTime": "3ms"
}
```

### Registrar

**POST** `/auth/register`

Corpo:

```json
{
  "name": "João",
  "email": "joao@example.com",
  "password": "SenhaForte123"
}
```

Respostas:

- 201: usuário criado.
- 400: erro de validação.
- 409: email já cadastrado.

### Login (cookie, Web)

**POST** `/auth/login`

Corpo:

```json
{
  "email": "joao@example.com",
  "password": "SenhaForte123"
}
```

Respostas:

- 200: sucesso, seta cookie `token` httpOnly.
- 401: credenciais inválidas.
- 403: Invalid or missing CSRF token (when `CSRF_ENABLED=true` and the header was not sent correctly).

### Login (token, Mobile / CLI)

**POST** `/auth/token`

Corpo:

```json
{
  "email": "joao@example.com",
  "password": "SenhaForte123"
}
```

Respostas:

- 200:

  ```json
  {
    "statusCode": 200,
    "message": "Authenticated",
    "data": {
      "token": "<jwt>"
    }
  }
  ```

- 401: credenciais inválidas.

Uso típico em mobile:

```http
Authorization: Bearer <jwt>
```

### Logout

**POST** `/auth/logout`

- Limpa o cookie de autenticação `token` (se existir).
- Não invalida tokens Bearer emitidos por `/auth/token` (stateless).

Respostas:

- 200: logout ok.
- 401: quando não há token válido.

### Me

**GET** `/auth/me`

Requer autenticação (cookie ou Bearer).

Respostas:

- 200:

  ```json
  {
    "statusCode": 200,
    "message": "Authenticated",
    "data": {
      "user": {
        "id": "...",
        "name": "...",
        "email": "...",
        "role": "USER"
      }
    }
  }
  ```

- 401: sem token ou token inválido/expirado.

### Esqueci minha senha

**POST** `/auth/forgot-password`

Corpo:

```json
{
  "email": "joao@example.com"
}
```

Respostas:

- 200: sempre retorna a mesma mensagem (para evitar enumeração de usuários).
- 400: erro de validação.
- 429: limite de tentativas.

### Redefinir senha

**POST** `/auth/reset-password`

Corpo:

```json
{
  "token": "<token recebido por e-mail>",
  "newPassword": "NovaSenhaForte123"
}
```

Respostas:

- 200: senha redefinida.
- 400: token inválido/expirado ou payload inválido.
- 429: limite de tentativas.

### CSRF

**GET** `/auth/csrf`

- Quando `CSRF_ENABLED=true`:
  - retorna 200 com `{ csrfToken }` no body
  - garante que exista o cookie de CSRF (`CSRF_COOKIE_NAME`, padrão `csrfToken`)
- Quando `CSRF_ENABLED=false`:
  - retorna 204 No Content

Uso típico no front Web:

1. Chamar `/auth/csrf`.
2. Ler o cookie `csrfToken` (ou o nome configurado em `CSRF_COOKIE_NAME`).
3. Enviar o valor em `x-csrf-token` nos métodos POST, PUT, PATCH, DELETE.

### Rota de debug do Sentry (development)

**GET** `/debug-sentry`

- Disponível apenas em development e quando `DEBUG_ROUTES_ENABLED=true`.
- Dispara uma exceção para testar a integração com Sentry/GlitchTip.

### Admin ping (ADMIN)

**GET** `/admin/ping`

- Requer autenticação (cookie ou Bearer).
- Requer role `ADMIN`.

Respostas:

- 200: ok.
- 401: sem token ou token inválido.
- 403: token válido, porém role insuficiente.
