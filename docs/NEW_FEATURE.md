# Como criar uma nova feature (passo a passo)

Este guia descreve um fluxo recomendado para adicionar uma feature nova mantendo o padrão do projeto (Clean Architecture + Express + Prisma + OpenAPI).

A ideia é você conseguir criar uma feature completa, com contrato HTTP, caso de uso testado, persistência e documentação.

## 0) Defina o contrato antes de codar

Antes de abrir arquivos, deixe claro:

- Qual rota? (ex: `POST /api/projects`)
- Precisa de autenticação? (cookie Web, Bearer Mobile, ou público)
- Precisa de CSRF? (apenas se usar cookie e for método unsafe)
- Qual o input? (body, params, query)
- Qual o output? (data e status codes)
- Erros esperados (400 validação, 401 auth, 403 CSRF, 404 not found, 409 conflito)

Dica: comece escrevendo o path no OpenAPI (docs/openapi) e depois implementa o código.

## 1) Domain (regra de negócio e contratos)

Objetivo: manter o domínio sem dependências de Express, Prisma ou libs HTTP.

1. Crie (ou ajuste) a entidade em `src/domain/entities/`.
2. Crie os DTOs do caso de uso em `src/domain/dtos/<feature>/`.
3. Defina o contrato do repositório em `src/domain/repositories/`.

Exemplo de estrutura:

- `src/domain/entities/project.ts`
- `src/domain/dtos/project/create-project-request-dto.ts`
- `src/domain/repositories/project-repository.ts`

Boas práticas:

- Domain não conhece status HTTP.
- Domain não importa Prisma nem `express`.

## 2) Use case (orquestração da regra)

Objetivo: implementar a regra da feature, usando contratos do domain.

1. Crie uma pasta em `src/usecases/<feature>/`.
2. Implemente o caso de uso com um método `execute(...)`.
3. Retorne um resultado simples (objeto) e lance erros previsíveis (para o controller mapear).

Onde olhar exemplos no projeto:

- `src/usecases/user/create-use-case.ts`
- `src/usecases/user/login-use-case.ts`

### Teste do use case

Crie um spec em `tests/usecases/<feature>/`.

Checklist de teste:

- cenário feliz
- cenários de erro (ex: duplicado, não encontrado, validação de regra)

## 3) Infra (Prisma e implementações)

Objetivo: implementar os contratos do domain usando Prisma.

1. Se precisar de tabela/campo novo, edite `prisma/schema.prisma`.
2. Gere migration:

```bash
npx prisma migrate dev
```

3. Implemente o repositório em `src/infrastructure/repositories/` (ou uma pasta por feature).
4. Se fizer sentido, ajuste `prisma/seed.ts` para facilitar onboarding.

Onde olhar exemplos no projeto:

- `src/infrastructure/repositories/user-repositories.ts`
- `src/infrastructure/prisma/client.ts`

### Teste de repositório

Crie um spec em `tests/infrastructure/repositories/` para validar:

- create/find/update/delete
- comportamento de constraints (unique, foreign keys etc)

## 4) HTTP (controller, validação e resposta)

Objetivo: transformar HTTP em input do use case e transformar resultado em resposta padronizada.

1. Crie um controller em `src/interfaces/http/controllers/<feature>/`.
2. Valide o input com Zod.
3. Converta para DTO do domain.
4. Chame o use case.
5. Responda usando `createResponse(status, message, data)`.

Onde olhar exemplos no projeto:

- `src/interfaces/http/controllers/user/register-controller.ts`
- `src/interfaces/http/controllers/user/login-controller.ts`

### Factory (wiring)

Se o controller tiver dependências (use case, repos, serviços), crie uma factory:

- `src/interfaces/http/factories/controllers/<feature>/<nome>.factory.ts`

Onde olhar exemplos:

- `src/interfaces/http/factories/controllers/user/register-controller.factory.ts`

### Teste do controller

Crie um spec em `tests/interfaces/controllers/`.

Checklist:

- validação 400 quando body inválido
- status code correto no cenário feliz
- mapeamento correto de erros do use case

## 5) Rotas (Express Router)

Objetivo: registrar endpoints e aplicar middlewares.

1. Crie um router em `src/interfaces/http/routes/<feature>.routes.ts`.
2. No `src/interfaces/http/routes/index.ts`, agregue o novo router.
3. Se a rota for protegida, use `makeAuth()` (auth middleware).

Observação importante sobre CSRF:

- O CSRF é aplicado globalmente em `src/main/app.ts` via `app.use(csrfMiddleware)`.
- Você não precisa aplicar nada na rota.
- Se o client usar cookie e fizer POST/PUT/PATCH/DELETE, o header `x-csrf-token` precisa ser enviado quando `CSRF_ENABLED=true`.

## 6) OpenAPI (Swagger) e docs

Objetivo: manter contrato e implementação andando juntos.

### 6.1 OpenAPI YAML (recomendado)

1. Adicione schemas em `docs/openapi/components/schemas.yaml` (ou crie um schema novo e referencie).
2. Crie um arquivo de path em `docs/openapi/paths/`, por exemplo:

- `docs/openapi/paths/projects.create.yaml`
- `docs/openapi/paths/projects.list.yaml`

3. Registre o path em `docs/openapi/openapi.yaml`.

4. Se precisar de headers específicos (ex: CSRF header), use o parâmetro já existente em `docs/openapi/components/parameters.yaml`.

Dica: as tags `Auth Web` e `Auth Mobile` já existem. Para features novas, você pode criar tags como `Projects`, `Orders` etc.

### 6.2 Docs em Markdown

Atualize também:

- `docs/API.md` para explicar o endpoint de forma humana (quando fizer sentido)
- `docs/ARCHITECTURE.md` se a feature alterar padrões ou módulos

## 7) Qualidade e CI local

Antes de abrir PR, rode tudo de uma vez:

```bash
npm run check
```

Ou, se preferir separar:

```bash
npm test
npm run lint
npm run format:check
```

Se for uma feature com migração:

- garanta que o projeto sobe com banco limpo
- atualize o seed, se necessário

## 8) Checklist rápido para PR

- [ ] OpenAPI atualizado (`docs/openapi`)
- [ ] docs/API.md atualizado (se for endpoint público/importante)
- [ ] testes de use case
- [ ] testes de controller (pelo menos cenário feliz e validação)
- [ ] migration aplicada e revisada
- [ ] sem secrets no repo (use `.env.example`)

Se você seguir essa ordem, a feature tende a entrar mais “redonda”, e o projeto continua bom como code base para outros devs.
