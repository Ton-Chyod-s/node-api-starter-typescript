# Setup

## Requisitos

- Node.js 20.x (obrigatório, conforme `engines` no `package.json`)
- PostgreSQL (local ou via Docker)
- npm

## Instalação

```bash
npm install
```

## Variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e ajuste os valores:

```bash
cp .env.example .env
```

As variáveis abaixo são lidas em `src/config/env.ts` e validadas com Zod.

### Essenciais

| Variável     | Obrigatória | Exemplo                                          | Observação                                     |
| ------------ | ----------- | ------------------------------------------------ | ---------------------------------------------- |
| NODE_ENV     | não         | development                                      | development, test ou production                |
| PORT         | não         | 3000                                             | Porta do HTTP server. Default: 3000            |
| DATABASE_URL | sim         | postgresql://user:pass@localhost:5432/db         | URL do Postgres (usada pelo Prisma)            |
| KEY_JWT      | sim         | troque-esta-chave-por-um-segredo-forte           | Segredo para assinar tokens JWT                |
| JWT_ISSUER   | sim         | clean-arch-backend                               | iss esperado nos tokens                        |
| JWT_AUDIENCE | sim         | clean-arch-clients                               | aud esperado nos tokens                        |
| CORS_ORIGIN  | sim         | http://localhost:3000 ou https://app.exemplo.com | Origem do front. Pode ser lista separada por , |

### Expiração do JWT

`JWT_EXPIRES_IN` aceita:

- número de segundos, por exemplo 3600
- string no formato do pacote ms, por exemplo 1d, 2h, 15m

Exemplos válidos:

```env
JWT_EXPIRES_IN=3600
JWT_EXPIRES_IN="1d"
JWT_EXPIRES_IN="2h"
```

Se omitido, o serviço usa o padrão definido no código.

### Sentry / GlitchTip (opcional)

| Variável                  | Obrigatória | Exemplo     | Observação                           |
| ------------------------- | ----------- | ----------- | ------------------------------------ |
| SENTRY_DSN                | não         | https://... | Se vazio, Sentry fica desativado     |
| SENTRY_TRACES_SAMPLE_RATE | não         | 0.1         | 0 a 1, fração de requests rastreadas |

### Proxy / infraestrutura

| Variável    | Obrigatória | Exemplo | Observação                                                        |
| ----------- | ----------- | ------- | ----------------------------------------------------------------- |
| TRUST_PROXY | não         | 0       | Valores aceitos pelo Express, por exemplo 0, 1, 2, true, loopback |

Use TRUST_PROXY quando a app estiver atrás de NGINX, Cloudflare e afins, para que o Express entenda X-Forwarded-For e X-Forwarded-Proto.

### Cookies e CSRF

Essas variáveis controlam o comportamento do cookie de autenticação e do middleware de CSRF.

| Variável         | Obrigatória | Exemplo   | Observação                                                                                  |
| ---------------- | ----------- | --------- | ------------------------------------------------------------------------------------------- |
| COOKIE_SAMESITE  | não         | lax       | lax, strict ou none. Default: lax. Se none, exige HTTPS (COOKIE_SECURE=true).               |
| COOKIE_SECURE    | não         | false     | true em produção com HTTPS. Quando true, o cookie só é enviado em conexões TLS.             |
| CSRF_ENABLED     | não         | true      | true para proteger rotas que usam cookie de auth em contexto Web (SPA, SSR). Default: true. |
| CSRF_COOKIE_NAME | não         | csrfToken | Nome do cookie de CSRF. O header deve usar o mesmo valor (x-csrf-token ou x-xsrf-token).    |

#### Web (SPA / navegador)

Recomendação padrão em desenvolvimento:

```env
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
COOKIE_SAMESITE=lax
COOKIE_SECURE=false
CSRF_ENABLED=true
```

Em produção com domínio próprio e HTTPS:

```env
NODE_ENV=production
CORS_ORIGIN=https://app.suaempresa.com
COOKIE_SAMESITE=lax      # ou none, se o front estiver em outro domínio
COOKIE_SECURE=true
CSRF_ENABLED=true
```

#### Mobile / CLI

Para apps mobile (React Native, Flutter etc) ou CLI que usam apenas Authorization: Bearer <token>:

- Não há envio automático de cookie pelo navegador, então CSRF não é necessário para essas requisições.
- O middleware de CSRF só exige token quando:
  - CSRF_ENABLED=true e
  - a requisição tiver o cookie de auth (token) ou estiver em rotas de login por cookie.

Ou seja, um cliente mobile usando apenas Bearer não é bloqueado pelo CSRF, mesmo com CSRF_ENABLED=true.

Cenários sugeridos:

1. Backend usado só por mobile/CLI

   ```env
   CSRF_ENABLED=false
   ```

2. Backend compartilhado entre Web (cookie) e Mobile (Bearer)

   ```env
   CSRF_ENABLED=true
   ```

   - Web: usa cookie + CSRF.
   - Mobile: usa só Bearer e passa direto pelo middleware de CSRF.

## Recuperação de senha

Variáveis usadas nos endpoints:

- `POST /auth/forgot-password`
- `POST /auth/reset-password`

| Variável                         | Obrigatória | Exemplo                 | Observação                                                          |
| -------------------------------- | ----------- | ----------------------- | ------------------------------------------------------------------- |
| FRONTEND_URL                     | não         | http://localhost:3001   | Base do link enviado por e-mail. Em produção, recomenda-se definir. |
| PASSWORD_RESET_PATH              | não         | /reset-password/{token} | Caminho do front. Use `{token}` para interpolar.                    |
| PASSWORD_RESET_TOKEN_TTL_MINUTES | não         | 15                      | Expiração do token em minutos. Default: 15.                         |

Se o SMTP não estiver configurado, o backend usa um mailer de console em `development/test` e imprime o link de reset no log.

## Seed (admin)

O `prisma/seed.ts` cria (ou atualiza) um usuário admin.

Em `production`, defina obrigatoriamente `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` antes de rodar o seed.

| Variável            | Obrigatória | Exemplo          | Observação                                    |
| ------------------- | ----------- | ---------------- | --------------------------------------------- |
| SEED_ADMIN_EMAIL    | não         | admin@local.test | Em produção, é obrigatória para rodar o seed. |
| SEED_ADMIN_PASSWORD | não         | ChangeMe!123     | Em produção, é obrigatória para rodar o seed. |
| SEED_ADMIN_NAME     | não         | Admin            | Nome exibido do admin.                        |

O usuário criado pelo seed recebe `role=ADMIN`.

## SMTP (Nodemailer)

Configure essas variáveis para enviar e-mails de recuperação via SMTP. Se estiverem vazias, a API usa o mailer de console.

| Variável      | Obrigatória | Exemplo               | Observação                              |
| ------------- | ----------- | --------------------- | --------------------------------------- |
| SMTP_HOST     | não         | smtp.gmail.com        | Host do SMTP.                           |
| SMTP_PORT     | não         | 465                   | Porta. Default: 465.                    |
| SMTP_SECURE   | não         | true                  | Se vazio, infere pela porta (465=true). |
| SMTP_USER     | não         | no-reply@dominio.com  | Usuário/login.                          |
| SMTP_PASSWORD | não         | senha-ou-app-password | Senha.                                  |
| EMAIL_FROM    | não         | no-reply@dominio.com  | Remetente. Se vazio, usa SMTP_USER.     |

## Rodando o projeto em desenvolvimento

```bash
npm run dev
```

Por padrão, o servidor sobe em http://localhost:3000.

## Rodando com Docker (recomendado para onboarding)

O `docker-compose.yml` sobe:

- `db`: PostgreSQL
- `api`: o backend em modo dev (ts-node-dev), rodando migrations e seed automaticamente

### Subir tudo

```bash
docker compose up --build
```

Após subir:

- API: http://localhost:3000
- Health: http://localhost:3000/api/health
- Swagger UI: http://localhost:3000/api/docs

### Variáveis no Docker

O compose já define `DATABASE_URL` apontando para o serviço `db`.
Para segredos e ajustes (ex: `KEY_JWT`), você pode criar um arquivo `.env` (usado pelo Docker Compose para substituição de variáveis):

```env
KEY_JWT=troque-esta-chave-por-um-segredo-forte
JWT_ISSUER=clean-arch-backend
JWT_AUDIENCE=clean-arch-backend
CORS_ORIGIN=http://localhost:3000
```

### Rodar apenas banco (se quiser usar Node local)

```bash
docker compose up -d db
```

### Produção (imagem `prod`)

O `Dockerfile` tem o target `prod` (com build em `dist` e sem devDependencies). Para testar via compose:

```bash
docker compose --profile prod up --build api-prod
```

Observação: o serviço `api-prod` não roda migrations automaticamente. Em produção, rode `prisma migrate deploy` no pipeline/deploy.

Para uma referência mais completa (comandos, reset de volume, profile prod e troubleshooting), veja `docs/DOCKER.md`.

## Docs

A pasta docs/ usa Docsify. Para abrir a documentação:

```bash
npm run docs
```

## Scripts

- `npm run dev`: servidor em desenvolvimento (TypeScript com hot reload via ts-node-dev)
- `npm run build`: build TypeScript para `dist/` (inclui ajuste de paths com tsc-alias)
- `npm start`: roda `dist/main/server.js`
- `npm test`: testes unitários (Jest)
- `npm run test:integration`: habilita testes de integração via `RUN_INTEGRATION_TESTS=1`
- `npm run test:integration:local-db`: integração apontando para um Postgres local (URL padrão no script)
- `npm run test:coverage`: gera relatório de cobertura em `coverage/`
- `npm run coverage`: abre o relatório HTML no Windows
- `npm run lint` e `npm run lint:fix`: ESLint
- `npm run format:check` e `npm run format:fix`: Prettier
- `npm run format:prisma`: formata arquivos do Prisma
- `npm run openapi:validate`: valida os YAMLs do OpenAPI em `docs/openapi/`
- `npm run docs`: abre a documentação (Docsify)
- `npm run db:seed`: executa o seed do Prisma (cria/atualiza admin)
- `npm run check`: roda lint + prettier + validação OpenAPI + testes
