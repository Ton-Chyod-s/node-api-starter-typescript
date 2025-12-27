# Guia rápido de variáveis de ambiente

Este é um mini guia só para consultar as variáveis de ambiente mais usadas no projeto,
sem precisar ler o SETUP inteiro.

---

## Essenciais

| Variável     | Obrigatória | Exemplo                                  | Para que serve                                        |
| ------------ | ----------- | ---------------------------------------- | ----------------------------------------------------- |
| NODE_ENV     | não         | development                              | Ambiente: development, test ou production             |
| PORT         | não         | 3000                                     | Porta HTTP do servidor                                |
| DATABASE_URL | sim         | postgresql://user:pass@localhost:5432/db | Conexão com o Postgres (Prisma)                       |
| KEY_JWT      | sim         | troque-esta-chave-por-um-segredo-forte   | Segredo usado para assinar tokens JWT                 |
| JWT_ISSUER   | sim         | clean-arch-backend                       | Emissor esperado no token (iss)                       |
| JWT_AUDIENCE | sim         | clean-arch-backend                       | Público esperado no token (aud)                       |
| CORS_ORIGIN  | sim         | http://localhost:3000                    | Origem do front (pode ser lista separada por vírgula) |

---

## Debug routes (apenas desenvolvimento)

| Variável             | Obrigatória | Exemplo | Para que serve                                            |
| -------------------- | ----------- | ------- | --------------------------------------------------------- |
| DEBUG_ROUTES_ENABLED | não         | false   | Habilita rotas de debug (ex: `/api/debug-sentry`) em dev. |

### Nota sobre Docker Compose e .env

- O Docker Compose usa um arquivo `.env` na raiz para substituir variáveis do `docker-compose.yml` (ex: `KEY_JWT`, `JWT_ISSUER`).
- A aplicação também carrega `.env` via `dotenv/config`, mas as variáveis definidas no container têm precedência (dotenv não sobrescreve por padrão).
- Em Compose, o `DATABASE_URL` já é apontado para o serviço `db`.

---

## JWT

| Variável       | Obrigatória | Exemplo | Observação                                             |
| -------------- | ----------- | ------- | ------------------------------------------------------ |
| JWT_EXPIRES_IN | não         | 3600    | Pode ser segundos (3600) ou string estilo ms (1d, 2h). |

Exemplos válidos:

```env
JWT_EXPIRES_IN=3600
JWT_EXPIRES_IN="1d"
JWT_EXPIRES_IN="2h"
```

---

## Cookies e CSRF

| Variável         | Obrigatória | Exemplo   | Observação                                                                  |
| ---------------- | ----------- | --------- | --------------------------------------------------------------------------- |
| COOKIE_SAMESITE  | não         | lax       | lax, strict ou none. Se none, exige HTTPS (COOKIE_SECURE=true).             |
| COOKIE_SECURE    | não         | false     | true em produção com HTTPS.                                                 |
| CSRF_ENABLED     | não         | true      | true para habilitar CSRF nas rotas que usam cookie de auth (default: true). |
| CSRF_COOKIE_NAME | não         | csrfToken | Nome do cookie de CSRF (default usado pelo middleware).                     |

Como o CSRF funciona aqui:

- Só é checado em métodos POST, PUT, PATCH, DELETE.
- Só é exigido quando existe o cookie de autenticação (`token`) ou em rotas marcadas para uso com cookie.
- O front precisa enviar o mesmo valor do cookie num header: `x-csrf-token` ou `x-xsrf-token`.

### Web (SPA / navegador)

Exemplo rápido de configuração:

```env
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
COOKIE_SAMESITE=lax
COOKIE_SECURE=false
CSRF_ENABLED=true
```

Em produção (HTTPS + domínio próprio):

```env
NODE_ENV=production
CORS_ORIGIN=https://app.suaempresa.com
COOKIE_SAMESITE=lax      # ou none, se o front estiver em outro domínio
COOKIE_SECURE=true
CSRF_ENABLED=true
```

### Mobile / CLI

Para apps mobile (React Native, Flutter etc) e CLI:

- Use só `Authorization: Bearer <token>` nas requisições.
- Não depende de cookie, então CSRF não é necessário para esse fluxo.

Cenários típicos:

- Backend **apenas mobile/CLI**:

  ```env
  CSRF_ENABLED=false
  ```

- Backend **compartilhado** Web + Mobile:

  ```env
  CSRF_ENABLED=true
  ```

  - Web usa cookie + CSRF.
  - Mobile usa só Bearer (sem header de CSRF) e passa normalmente pelo middleware.

---

## Recuperação de senha

Usado pelos endpoints `POST /auth/forgot-password` e `POST /auth/reset-password`.

| Variável                         | Obrigatória | Exemplo                 | Para que serve                               |
| -------------------------------- | ----------- | ----------------------- | -------------------------------------------- |
| FRONTEND_URL                     | não         | http://localhost:3001   | Base do link enviado por e-mail.             |
| PASSWORD_RESET_PATH              | não         | /reset-password/{token} | Caminho do front para redefinição.           |
| PASSWORD_RESET_TOKEN_TTL_MINUTES | não         | 15                      | Expiração do token em minutos (default: 15). |

Se o SMTP não estiver configurado, em `development/test` o backend imprime o link no console.

---

## Seed (admin)

| Variável            | Obrigatória | Exemplo          | Para que serve                   |
| ------------------- | ----------- | ---------------- | -------------------------------- |
| SEED_ADMIN_EMAIL    | não         | admin@local.test | Email do admin criado pelo seed. |
| SEED_ADMIN_PASSWORD | não         | ChangeMe!123     | Senha do admin criado pelo seed. |
| SEED_ADMIN_NAME     | não         | Admin            | Nome do admin criado pelo seed.  |

Em produção, `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` são exigidas para rodar o seed com segurança.

---

## SMTP (Nodemailer)

| Variável      | Obrigatória | Exemplo              | Para que serve                          |
| ------------- | ----------- | -------------------- | --------------------------------------- |
| SMTP_HOST     | não         | smtp.gmail.com       | Host do SMTP.                           |
| SMTP_PORT     | não         | 465                  | Porta (default: 465).                   |
| SMTP_SECURE   | não         | true                 | Se vazio, infere pela porta (465=true). |
| SMTP_USER     | não         | no-reply@dominio.com | Usuário/login.                          |
| SMTP_PASSWORD | não         | ...                  | Senha.                                  |
| EMAIL_FROM    | não         | no-reply@dominio.com | Remetente. Se vazio, usa SMTP_USER.     |

---

## Observabilidade

| Variável                  | Obrigatória | Exemplo     | Observação                           |
| ------------------------- | ----------- | ----------- | ------------------------------------ |
| SENTRY_DSN                | não         | https://... | Se vazio, Sentry fica desativado     |
| SENTRY_TRACES_SAMPLE_RATE | não         | 0.1         | 0 a 1, fração de requests rastreadas |

---

## Infraestrutura

| Variável    | Obrigatória | Exemplo | Observação                                              |
| ----------- | ----------- | ------- | ------------------------------------------------------- |
| TRUST_PROXY | não         | 0       | Configuração de proxy do Express (0, 1, 2, true, etc.). |

Use TRUST_PROXY quando a app estiver atrás de NGINX, Cloudflare ou outro proxy reverso,
para o Express interpretar corretamente X-Forwarded-For e X-Forwarded-Proto.
