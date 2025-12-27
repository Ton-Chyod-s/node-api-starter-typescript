# Como contribuir

## Pré-requisitos

- Node.js 20.x (obrigatório, conforme `engines` no `package.json`)
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

Para corrigir automaticamente:

```bash
npm run lint:fix
npm run format:fix
```

## Checklist de PR (sugestão)

- [ ] Testes passando (`npm test`)
- [ ] Lint sem erros (`npm run lint`)
- [ ] Prettier ok (`npm run format:check`)
- [ ] Documentação atualizada (quando alterar API/fluxo)
- [ ] Sem segredos no commit (`.env`, tokens, chaves)
