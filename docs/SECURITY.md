# Segurança

Este documento descreve o que já existe no projeto e recomendações para uso em produção.

## Senhas

- Hash com Argon2 (`src/utils/password-generator.ts`).
- Nunca armazenar senha em texto puro.
- Regra mínima atual (controllers): 8 caracteres.
- Limite de tamanho no cadastro: senha com tamanho máximo controlado por Zod (evita DoS por hash gigante).

Recomendação: sempre forçar senhas fortes no front (tamanho mínimo, letras maiúsculas, minúsculas, números e caracteres especiais).

## JWT

- Assinatura/verificação via jsonwebtoken (`JwtTokenService`).
- Segredo vindo de KEY_JWT (obrigatório).
- JWT_ISSUER e JWT_AUDIENCE são validados no verify.

Boas práticas:

- Usar KEY_JWT longo e gerado de forma segura.
- Rotacionar a chave se for vazada.
- Usar JWT_EXPIRES_IN com prazos razoáveis (por exemplo, horas ou poucos dias).

## Cookies de autenticação (Web)

- Nome do cookie: definido em AUTH_COOKIE_NAME (no código, token).
- Configuração baseada em env:
  - httpOnly: true (o front não lê via document.cookie).
  - secure: depende de COOKIE_SECURE e NODE_ENV.
  - sameSite: configurado por COOKIE_SAMESITE (lax por padrão).
- Path do cookie pode ser restrito (por exemplo, /api).

Regra importante:

- Se COOKIE_SAMESITE=none, obrigatoriamente COOKIE_SECURE=true, pois cookies SameSite=None exigem HTTPS.

## CSRF

O middleware de CSRF é implementado em `src/interfaces/http/middlewares/csrf-middleware.ts` e é opcional.

### Quando é aplicado

- Controlado por CSRF_ENABLED:
  - false: CSRF desativado.
  - true: CSRF ativo.
- Só verifica métodos POST, PUT, PATCH, DELETE.
- Só exige token quando:
  - existe cookie de autenticação (token), ou
  - a rota é marcada como dependente de autenticação por cookie (por exemplo, `/api/auth/login`).

### Como funciona

- Gera um token aleatório e salva em um cookie (CSRF_COOKIE_NAME, padrão csrfToken).
- Espera o mesmo valor em um header:
  - x-csrf-token ou
  - x-xsrf-token.
- Se o cookie não existir, o header não existir ou os valores forem diferentes, responde:

  ```json
  {
    "statusCode": 403,
    "message": "Invalid or missing CSRF token"
  }
  ```

### Web (SPA / navegador)

Recomendado:

- CSRF_ENABLED=true.

Fluxo recomendado (importante: o login por cookie também exige CSRF quando está habilitado):

1. Chamar `GET /api/auth/csrf` para garantir o cookie de CSRF.
2. Fazer login em `POST /api/auth/login` enviando `x-csrf-token` com o mesmo valor do cookie de CSRF.
3. Em todas as requests unsafe que dependem do cookie `token`, enviar `x-csrf-token` com o mesmo valor do cookie.

Observação sobre o Swagger (`/api/docs`):

- Está configurado com `persistAuthorization=false`, para não gravar autorizações no localStorage.
- Está configurado para enviar cookies (`withCredentials=true`).
- Tenta injetar `x-csrf-token` automaticamente lendo o cookie de CSRF.

### Mobile / CLI

Para apps mobile e CLIs que usam apenas Authorization: Bearer <token>:

- Não há cookie de autenticação anexado automaticamente.
- O risco de CSRF é praticamente inexistente, porque outra origem não consegue enviar o token Bearer em nome do usuário.
- O middleware de CSRF do projeto ignora essas requisições, mesmo quando CSRF_ENABLED=true, pois há Bearer no header.

Recomendação:

- Backend só para mobile/CLI: CSRF_ENABLED=false.
- Backend compartilhado entre Web e Mobile:
  - CSRF_ENABLED=true.
  - Web segue o fluxo com cookie + CSRF.
  - Mobile continua usando somente Bearer e não precisa do header de CSRF.

Mesmo em mobile, cuidado com:

- Armazenamento do token em local seguro (Keychain/Keystore, SecureStore etc).
- Evitar logs com o token.
- Evitar exposição do token em deep links.

## Rate limit

O projeto aplica rate limit em dois níveis:

- **Global**: middleware `globalApiLimiter` aplicado em `/api` (veja `src/interfaces/http/middlewares/global-rate-limit.ts`).
  - Janela padrão: 15 minutos.
  - Limite padrão: 300 requisições por IP por janela.
  - `/api/health` é ignorado pelo limiter (útil para healthchecks).
  - Resposta usa o formato `createResponse` com status 429.

- **Rotas sensíveis de auth**: limiters adicionais em `auth.routes.ts` (por exemplo login, register, token, forgot/reset).

Objetivo: reduzir brute force e abuso de endpoints de autenticação sem atrapalhar healthchecks e tráfego normal.

Sugestão: ajuste limites/janelas conforme o perfil do seu tráfego e a sua infraestrutura (e monitore com Sentry/GlitchTip, se usar).

## Tratamento de erros

- errorMiddleware centraliza o tratamento.
- Em produção:
  - não expõe stack trace para o cliente.
  - retorna mensagens genéricas para erros inesperados.
- Em desenvolvimento:
  - pode logar detalhes no console para debug.

Tipos específicos tratados:

- Erros de validação (Zod): retornam 400 com detalhes.
- Erros JWT: retornam 401.
- Erros Prisma conhecidos: podem retornar 400 ou 409 (conforme o caso).

## Sentry / GlitchTip

Quando SENTRY_DSN está configurado:

- Requests e erros são enviados para o provedor configurado.
- Há uma rota de debug (/debug-sentry) disponível apenas em development e quando `DEBUG_ROUTES_ENABLED=true`.

Boas práticas:

- Não enviar tokens de autenticação, senhas ou dados sensíveis nos eventos de Sentry.
- Revisar periodicamente a política de retenção e os dados coletados (PII).

## Distribuição do projeto e secrets

- Não versionar nem distribuir `.env` com secrets reais.
- Use apenas `.env.example` como referência.
