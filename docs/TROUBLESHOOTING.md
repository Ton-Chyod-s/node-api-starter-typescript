# Troubleshooting

Alguns problemas comuns e como investigar.

## Guia rápido de debug

Quando algo “quebra” e você precisa achar a causa rápido, siga esta ordem:

1. Health
   - Verifique o status do serviço e do banco:
     - `GET /api/health` (retorna status geral e info do DB quando possível)

2. Logs
   - Local (sem Docker): veja o console onde o `npm run dev` está rodando.
   - Docker Compose:
     - `docker compose ps`
     - `docker compose logs -f api` (ajuste o nome do serviço se necessário)

3. Sentry (se configurado)
   - Confirme `SENTRY_DSN` no ambiente.
   - Procure o erro em Issues e veja stack trace, breadcrumbs e contexto da request.

4. Banco e migrations (Prisma)
   - Confirme `DATABASE_URL` apontando para o banco correto.
   - Verifique migrações:
     - Dev: `npx prisma migrate dev`
     - Prod: `npx prisma migrate deploy`
     - Status: `npx prisma migrate status`
   - Se necessário, regenere client: `npx prisma generate`

## Docker e Docker Compose

Se você está usando Docker, o guia principal fica em `docs/DOCKER.md`.

Checklist rápido:

- Verifique status dos serviços:

  ```bash
  docker compose ps
  ```

- Verifique logs:

  ```bash
  docker compose logs -f api
  docker compose logs -f db
  ```

- Resetar banco (apaga o volume do Postgres):

  ```bash
  docker compose down -v
  docker compose up --build
  ```

- Porta 5432 em uso: mude para `5433:5432` no compose.

## Falha ao conectar no banco (Prisma / PostgreSQL)

Sintomas:

- Erros como `P1001: Can't reach database server`.
- Mensagens de timeout ao aplicar migrations.

Checklist:

1. Verifique a variável DATABASE_URL no .env.
2. Confirme se o serviço PostgreSQL está rodando e acessível no host/porta indicados.
3. Teste a conexão com um cliente (por exemplo, psql, DBeaver).
4. Se a senha tiver caracteres especiais, use URL encode.

Exemplo:

```env
DATABASE_URL=postgresql://user:senha%40com%21@localhost:5432/db
```

## Erros de import com aliases TypeScript

Sintomas:

- Mensagens de erro ao importar usando @domain, @usecases, @interfaces etc.
- Funciona no TypeScript, mas falha no Node depois do build.

Checklist:

1. Verifique `tsconfig.json` (paths e baseUrl).
2. Verifique `tsconfig.build.json`, se existir.
3. Confirme se o bundler (ou o Node via ts-node) está respeitando os paths.
4. Confira se o Jest está configurado com moduleNameMapper compatível.

## Cookie de autenticação não é enviado pelo navegador

Sintomas:

- Login responde 200 mas o front não permanece logado.
- Requisições seguintes parecem não autenticadas.

Checklist:

1. Verifique se o backend está configurado com `credentials: true` no CORS.
2. No front, use `credentials: "include"` (fetch) ou `withCredentials: true` (axios).
3. Confirme se CORS_ORIGIN corresponde exatamente à origem do front.
4. Em ambiente HTTPS, verifique se COOKIE_SECURE=true.
5. Se COOKIE_SAMESITE=none, HTTPS é obrigatório.

## 403 "Invalid or missing CSRF token" em Web

Sintomas:

- O front Web recebe 403 em POST/PUT/PATCH/DELETE depois do login por cookie.

Checklist:

1. Verifique se CSRF_ENABLED=true no .env.
2. Confirme se o front chamou /auth/csrf antes de fazer requests unsafe.
3. Verifique se o cookie CSRF_COOKIE_NAME (padrão csrfToken) está presente.
4. Confira se o header x-csrf-token está sendo enviado com o mesmo valor do cookie.

## 403 "Invalid or missing CSRF token" em mobile

Sintoma:

- O app mobile recebe 403 com mensagem de CSRF, mesmo usando Authorization: Bearer <token>.

Checklist:

1. Verifique se o app está enviando apenas o header Authorization (sem cookies de sessão reaproveitados de um WebView).
2. Confirme o valor de CSRF_ENABLED no .env:
   - Se o backend for só para mobile/CLI, pode deixar CSRF_ENABLED=false.
   - Se o backend também tiver front Web, CSRF_ENABLED=true é aceitável.
3. Lembre que o middleware de CSRF só exige token quando:
   - existe o cookie de autenticação (token), ou
   - a rota é marcada para uso com cookie.

Se o erro estiver aparecendo em mobile mesmo sem cookie, provavelmente o app está reaproveitando cookies de um WebView ou de um fluxo de login Web. Nesse caso:

- limpe cookies/sessão no dispositivo
- ou use um domínio/API separado para o fluxo mobile.
