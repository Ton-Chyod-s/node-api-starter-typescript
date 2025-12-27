# Qualidade

Este guia reúne os comandos e práticas de qualidade que o projeto já usa no dia a dia.

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
npm run format:check
npm run format:fix
```

## Prisma (format)

Para formatar schemas/arquivos do Prisma:

```bash
npm run format:prisma
```

## OpenAPI (validação)

O contrato OpenAPI fica em `docs/openapi/`. Para validar a consistência dos YAMLs:

```bash
npm run openapi:validate
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

## Check completo (CI local)

Se você quer rodar tudo em sequência (lint + prettier + validação OpenAPI + testes):

```bash
npm run check
```
