# Qualidade

## ESLint

Config: `eslint.config.mjs`

Comandos:

```bash
npm run lint
npm run lint:fix
```

Dica: o lint está com `--max-warnings=0`, então warnings quebram o CI local.

## Prettier

Config: `prettier.config.cjs`

Comandos:

```bash
npm run format
npm run format:fix
```

## Testes (Jest)

Config: `jest.config.cjs`

Comandos:

```bash
npm test
npm run test:coverage
```

O relatório HTML fica em `coverage/lcov-report/index.html`.

No Windows, também existe o script:

```bash
npm run coverage
```

## Husky (pre-commit)

O Husky é instalado via script `prepare`:

```bash
npm run prepare
```

Hook atual: `.husky/pre-commit`

O hook roda:

- `npx lint-staged` (formata e aplica lint somente nos arquivos alterados)
- `npm test`

Config do `lint-staged` fica no `package.json`.
