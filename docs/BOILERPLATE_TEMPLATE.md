# Boilerplate interno (modo template)

Este repositório pode ser usado como base para novos projetos.

## O que é "modo template"

A ideia é manter o core (config, infra, padrões, testes) e deixar itens de exemplo fáceis de remover.

### Itens opcionais / de exemplo

- Rotas de debug: `GET /api/debug-sentry`
  - Por padrão estão desabilitadas.
  - Para habilitar em development, use:

    ```env
    DEBUG_ROUTES_ENABLED=true
    ```

### Checklist rápido para iniciar um novo projeto

1. Ajuste o nome do projeto
   - `package.json` (name)
   - `docs/openapi/openapi.yaml` (title/servers)
   - `src/config/env.ts` (valores padrão de issuer/audience, se fizer sentido)

2. Troque segredos
   - `KEY_JWT` e variáveis de infra

3. Revisar módulos
   - Mantenha `auth` se já for útil para o projeto.
   - Remova rotas que não façam sentido para o contexto.

4. Contrato de erro
   - Use `AppError` para erros de negócio
   - Respostas de erro incluem `code` (machine-readable)

## Convenções do projeto

- Erros de negócio: lançar `AppError`.
- Erros inesperados: tratados pelo `errorMiddleware`.
- Validação: Zod nos controllers.
