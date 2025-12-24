# Como contribuir

## Pré-requisitos

- Node.js (LTS)
- PostgreSQL
- npm

## Setup rápido

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

## Padrão de branches (sugestão)

- `feature/<nome>`
- `fix/<nome>`
- `chore/<nome>`
- `docs/<nome>`

## Checks locais

Antes de abrir PR:

```bash
npm test
npm run lint
npm run format
```

Para corrigir automaticamente:

```bash
npm run lint:fix
npm run format:fix
```

## Checklist de PR (sugestão)

- [ ] Testes passando (`npm test`)
- [ ] Lint sem erros (`npm run lint`)
- [ ] Prettier ok (`npm run format`)
- [ ] Documentação atualizada (quando alterar API/fluxo)
- [ ] Sem segredos no commit (`.env`, tokens, chaves)
