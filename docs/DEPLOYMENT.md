# Deploy

Este guia descreve um caminho simples para rodar a API em produção.

## Build

```bash
npm ci
npm run build
```

Isso gera a pasta `dist/`.

## Rodar

```bash
npm start
```

A API sobe em `dist/main/server.js`.

## Variáveis de ambiente em produção

Garanta, no mínimo:

- `DATABASE_URL`
- `KEY_JWT`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `CORS_ORIGIN`
- `NODE_ENV=production`

Sugestões:

- `JWT_EXPIRES_IN=1d`
- `SENTRY_DSN=...` (se usar Sentry/GlitchTip)
- `TRUST_PROXY=1` (se estiver atrás de NGINX, Cloudflare, Load Balancer)

## Migrações (Prisma)

Em produção, aplique as migrações existentes com:

```bash
npx prisma migrate deploy
```

Opcional (quando necessário):

```bash
npx prisma generate
```

Obs: o Prisma usa `prisma.config.ts` para ler `DATABASE_URL` (e o projeto carrega `.env` via `dotenv/config`).

## Reverse proxy (NGINX, etc)

Se estiver atrás de proxy e usando HTTPS no proxy:

- defina `TRUST_PROXY` para que o Express enxergue o `X-Forwarded-Proto`
- isso é importante porque o cookie de auth usa `secure: true` em `NODE_ENV=production`

## Healthcheck

Use o endpoint:

- `GET /api/health`

Ele retorna um `createResponse` com dados como `status`, `uptimeSeconds`, `timestamp` e um check de banco (`checks.database`).

Recomendação:

- use `200` como OK
- trate `503` como indisponível (ex: DB fora) para readiness

## Processo e logs

Recomendação: usar um process manager (ex: pm2, systemd, Docker) para:

- reiniciar automaticamente em caso de crash
- registrar logs
- controlar variáveis de ambiente

## Observação sobre CORS

Em produção, configure `CORS_ORIGIN` para o domínio real do seu front, por exemplo:

```env
CORS_ORIGIN=https://app.suaempresa.com
```

Se tiver múltiplas origens, use lista separada por vírgula (o `env.ts` converte para array).
