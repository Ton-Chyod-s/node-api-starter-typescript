# Docker

Este guia explica como rodar o projeto com Docker e Docker Compose, tanto para desenvolvimento quanto para testes de deploy.

## Requisitos

- Docker Desktop (Windows/Mac) ou Docker Engine (Linux)
- Docker Compose v2 (comando `docker compose`)

## Subir em desenvolvimento (recomendado)

Na raiz do projeto:

```bash
docker compose up --build
```

O compose sobe:

- `db`: Postgres (com volume persistente)
- `api`: API em modo desenvolvimento (ts-node-dev) com hot reload

Endpoints:

- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- Health: http://localhost:3000/api/health

### O que acontece no start

No serviço `api` (dev), o container executa este comando:

```bash
npx prisma migrate deploy && npm run db:seed && npm run dev
```

Isso garante que as migrations sejam aplicadas e que exista um admin para você testar o RBAC.

## Variáveis no Docker Compose

O `docker-compose.yml` já injeta o `DATABASE_URL` apontando para o host `db`.

Para sobrescrever segredos e ajustes, crie um arquivo `.env` na raiz (este `.env` é lido pelo Docker Compose para substituição de variáveis):

```env
KEY_JWT=troque-esta-chave-por-um-segredo-forte
JWT_ISSUER=clean-arch-backend
JWT_AUDIENCE=clean-arch-backend
CORS_ORIGIN=http://localhost:3000

# Opcional
CSRF_ENABLED=true
CHOKIDAR_USEPOLLING=false
```

Nota: a aplicação também carrega `.env` via `dotenv/config`, mas as variáveis definidas no compose têm precedência (dotenv não sobrescreve por padrão).

## Comandos úteis

Subir em segundo plano:

```bash
docker compose up -d
```

Ver logs:

```bash
docker compose logs -f api
docker compose logs -f db
```

Parar:

```bash
docker compose down
```

Resetar banco (apaga volume do Postgres):

```bash
docker compose down -v
```

Entrar no container da API:

```bash
docker compose exec api sh
```

Rodar Prisma manualmente dentro do container:

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run db:seed
docker compose exec api npx prisma studio
```

## Rodar somente o banco (Node local)

Se você quer rodar o Node localmente e só usar o Postgres no Docker:

```bash
docker compose up -d db
```

Depois, no seu `.env` local (do Node), use:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
```

### Conectar no Postgres (DBeaver, pgAdmin, psql)

Credenciais padrão do compose (dev):

- Host: `localhost`
- Porta: `5432`
- Banco: `postgres`
- Usuário: `postgres`
- Senha: `postgres`

Observação: a porta do Postgres está bindada em `127.0.0.1`, então só fica acessível localmente no seu computador.

Se você mudou a porta para `5433:5432`, conecte usando `localhost:5433`.

### Alterar usuário/senha/banco no compose

Edite as variáveis do serviço `db` em `docker-compose.yml`:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

Depois, ajuste o `DATABASE_URL` do serviço `api` para bater com os novos valores.

## Produção (imagem `prod`)

O `Dockerfile` é multi-stage e possui um target `prod` (build em `dist/` e sem devDependencies).

Build da imagem:

```bash
docker build -t clean-arch-backend:prod --target prod .
```

Rodar container (exemplo):

```bash
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://..." \
  -e KEY_JWT="..." \
  -e JWT_ISSUER="clean-arch-backend" \
  -e JWT_AUDIENCE="clean-arch-backend" \
  -e CORS_ORIGIN="https://app.suaempresa.com" \
  clean-arch-backend:prod
```

Importante: em produção, aplique migrations fora do processo da API (pipeline/deploy), usando `npx prisma migrate deploy`.

### Compose com profile `prod`

Você também pode subir o serviço `api-prod` (target `prod`) usando o profile:

```bash
docker compose --profile prod up --build api-prod
```

## Troubleshooting rápido

### Porta 5432 já está em uso

Se você já tem Postgres local, mude a porta no compose:

```yml
ports:
  - '5433:5432'
```

E conecte usando `localhost:5433`.

### Watch de arquivos lento no Windows/WSL

Ative polling:

```env
CHOKIDAR_USEPOLLING=true
```

### Prisma não conecta no DB

Verifique:

- o serviço `db` está healthy (`docker compose ps`)
- `DATABASE_URL` dentro do container aponta para `db` (não `localhost`)
- reset do volume quando necessário (`docker compose down -v`)
