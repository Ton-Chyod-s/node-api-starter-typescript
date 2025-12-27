# clean-arch-backend

API em Node.js + TypeScript com Express e Prisma (PostgreSQL), seguindo uma variação de Clean Architecture (camadas: domain, usecases, interfaces, infrastructure, main).

Este repositório foi pensado como **codebase base** para futuros projetos Web (SPA com cookie + CSRF) e Mobile/CLI (token Bearer), reaproveitando:

- autenticação JWT
- middlewares de segurança (CORS, CSRF, rate limit, Helmet)
- estrutura de pastas em camadas
- documentação com Docsify
- pipeline de qualidade (ESLint, Prettier, Jest e validação OpenAPI)

## Requisitos

- Node.js 20.x (obrigatório, conforme `engines` no `package.json`)
- PostgreSQL (local ou via Docker)

## Começando rápido

1. Instale as dependências:

   ```bash
   npm i
   ```

2. Copie o arquivo de exemplo de variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

3. Ajuste as variáveis de ambiente conforme descrito em `docs/SETUP.md`.

4. Rode as migrations do Prisma e suba o servidor em modo desenvolvimento:

   ```bash
   npx prisma migrate dev
   npm run db:seed
   npm run dev
   ```

5. Rode os checks locais (lint + prettier + OpenAPI + testes), se quiser:

   ```bash
   npm run check
   ```

6. Abra a documentação completa com Docsify:

   ```bash
   npm run docs
   ```

## Começando com Docker

Se você prefere não instalar Postgres localmente, use o Docker Compose:

```bash
docker compose up --build
```

Isso sobe o Postgres e a API em modo dev, aplicando migrations e rodando o seed automaticamente.

- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- Health: http://localhost:3000/api/health

Comandos úteis:

```bash
# logs
docker compose logs -f api

# parar
docker compose down

# resetar o banco (apaga o volume do Postgres)
docker compose down -v
```

Detalhes (dev, prod, troubleshooting): veja `docs/DOCKER.md`.

## Autenticação e CSRF

A API suporta dois modos de autenticação:

- Web (SPA): token via cookie `HttpOnly` e proteção CSRF em requisições de escrita (POST, PUT, PATCH, DELETE).
- Mobile/CLI: token via `Authorization: Bearer <jwt>`.

Fluxo Web recomendado quando `CSRF_ENABLED=true`:

1. `GET /api/auth/csrf` (garante cookie de CSRF)
2. `POST /api/auth/login` enviando `x-csrf-token` com o mesmo valor do cookie de CSRF
3. Em requests unsafe que usam cookie, continuar enviando `x-csrf-token`

Swagger:

- `/api/docs` envia cookies (`withCredentials=true`)
- tenta injetar `x-csrf-token` automaticamente lendo o cookie de CSRF
- não persiste autorizações no localStorage (`persistAuthorization=false`)

Detalhes e exemplos:

- `docs/SECURITY.md` (JWT, cookies e CSRF)
- `docs/API.md` (como consumir a API, exemplos de headers/cookies)

## Documentação

A documentação detalhada fica na pasta `docs/`:

- `SETUP.md`: configuração de ambiente, variáveis de ambiente e scripts
- `ENV.md`: guia rápido de variáveis de ambiente
- `API.md`: contrato da API (formato de resposta, autenticação, CSRF, endpoints)
- `NEW_FEATURE.md`: passo a passo para criar uma nova feature no padrão do projeto
- `ARCHITECTURE.md`: visão geral de camadas e fluxo das requisições
- `SECURITY.md`: decisões de segurança (senhas, JWT, cookies, CSRF, rate limit)
- `QUALITY.md`: lint, formato de código, testes e cobertura
- `DEPLOYMENT.md`: recomendações para build e deploy em produção
- `TROUBLESHOOTING.md`: resolução de problemas comuns
- `CONTRIBUTING.md`: orientações para contribuição
