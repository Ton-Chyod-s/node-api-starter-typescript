# PROJECT_STANDARDS.md: clean-arch-backend

API backend construída com **Node.js 20 + TypeScript + Express + Prisma + PostgreSQL + Redis**. Este documento define os padrões oficiais para implementação de features, endpoints, testes e PRs. Siga estas diretrizes para manter consistência no repositório — inclusive ao usar IA para gerar código.

---

## 1. Visão do Projeto

### 1.1 Objetivo

API RESTful com autenticação baseada em cookie + JWT, proteção CSRF, rate limiting, roles de acesso (USER / ADMIN) e suporte a reset de senha via e-mail.

### 1.2 Módulos Principais

| Módulo      | Descrição                               |
| ----------- | --------------------------------------- |
| Auth        | Registro, login, logout, me, CSRF token |
| Credentials | Forgot password, reset password         |
| Admin       | Rotas protegidas por role ADMIN         |
| Health      | Healthcheck público                     |

### 1.3 Ambientes

| Ambiente        | NODE_ENV      | Arquivo de env            |
| --------------- | ------------- | ------------------------- |
| Desenvolvimento | `development` | `config/.env.development` |
| Teste           | `test`        | `config/.env.test`        |
| Produção        | `production`  | Injeção via container/CI  |

---

## 2. Stack e Ferramentas

### 2.1 Runtime

| Item       | Versão                  |
| ---------- | ----------------------- |
| Node.js    | 20.x (`.nvmrc` na raiz) |
| TypeScript | 5.x                     |

### 2.2 Bibliotecas Principais

| Biblioteca                 | Uso                          |
| -------------------------- | ---------------------------- |
| express 4                  | Framework HTTP               |
| prisma 7                   | ORM (PostgreSQL)             |
| zod 4                      | Validação e parse de entrada |
| argon2                     | Hash de senha                |
| jsonwebtoken               | Geração e verificação de JWT |
| ioredis + rate-limit-redis | Cache e rate limiting        |
| helmet                     | Headers de segurança HTTP    |
| express-rate-limit         | Rate limiting por rota       |
| nodemailer                 | Envio de e-mail              |
| @sentry/node               | Monitoramento de erros       |

### 2.3 Scripts Disponíveis

```bash
npm run dev              # Desenvolvimento com hot reload (tsx watch)
npm run build            # Compila TypeScript para dist/
npm start                # Produção (node dist/main/server.js)
npm test                 # Testes unitários + e2e
npm run test:integration # Testes de integração com banco real
npm run test:coverage    # Cobertura de testes
npm run lint             # ESLint (max-warnings=0)
npm run lint:fix         # ESLint com autofix
npm run format:check     # Prettier check
npm run format:fix       # Prettier fix
npm run openapi:validate # Valida o OpenAPI spec
npm run db:seed          # Seed do banco (cria admin)
npm run check            # lint + format + openapi + test (usar antes do PR)
```

---

## 3. Estrutura do Repositório

```
.
├── config/
│   ├── .env.development         # Env de desenvolvimento (não commitado)
│   ├── .env.example             # Template de variáveis (commitado)
│   ├── .env.test                # Env de testes
│   ├── Dockerfile
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   └── jest.config.cjs
├── docs/
│   ├── openapi/                 # Spec OpenAPI (yaml modular)
│   └── *.md                    # Documentação de arquitetura, deploy, etc.
├── prisma/
│   ├── schema/                  # Schemas Prisma por entidade
│   ├── migrations/              # Migrations geradas pelo Prisma
│   └── seed.ts                  # Seed do banco
├── src/
│   ├── config/                  # env.ts (Zod parse), load-env.ts
│   ├── domain/
│   │   ├── dtos/                # DTOs e schemas de validação (Zod)
│   │   ├── entities/            # Entidades de domínio
│   │   ├── repositories/        # Interfaces de repositório
│   │   └── services/            # Interfaces de serviços (cache, mailer, token)
│   ├── infrastructure/
│   │   ├── jwt/                 # Implementação do JwtTokenService
│   │   ├── logging/             # Logger
│   │   ├── prisma/              # Cliente Prisma singleton
│   │   ├── redis/               # Cliente Redis, RedisCacheService, NullCacheService
│   │   ├── repositories/        # Implementações Prisma dos repositórios
│   │   └── services/            # NodeMailerService, ConsoleMailerService
│   ├── interfaces/http/
│   │   ├── controllers/         # Controllers por módulo
│   │   ├── cookies/             # Configuração dos cookies de auth
│   │   ├── factories/           # Factories de controllers e middlewares
│   │   ├── middlewares/         # auth, csrf, error, rate-limit, require-role
│   │   └── routes/              # Rotas por módulo
│   ├── main/
│   │   ├── app.ts               # createApp() — monta o Express
│   │   ├── server.ts            # Ponto de entrada
│   │   └── instrument.ts        # Sentry init
│   ├── usecases/                # Casos de uso por módulo
│   └── utils/                   # AppError, createResponse, hash, httpConstants...
└── tests/
    ├── config/
    ├── infrastructure/
    ├── integration/
    ├── interfaces/
    ├── main/
    ├── security/
    ├── setup/
    └── usecases/
```

### 3.1 Ordem de Criação para Novas Features

| Ordem | Tipo                         | Localização                                                  |
| ----- | ---------------------------- | ------------------------------------------------------------ |
| 1     | Migration Prisma             | `prisma/schema/{entidade}.prisma` + `npx prisma migrate dev` |
| 2     | Entidade de domínio          | `src/domain/entities/`                                       |
| 3     | Interface de repositório     | `src/domain/repositories/`                                   |
| 4     | DTO / schema Zod             | `src/domain/dtos/`                                           |
| 5     | Implementação de repositório | `src/infrastructure/repositories/`                           |
| 6     | Use case                     | `src/usecases/{modulo}/`                                     |
| 7     | Controller                   | `src/interfaces/http/controllers/{modulo}/`                  |
| 8     | Factory                      | `src/interfaces/http/factories/controllers/{modulo}/`        |
| 9     | Rota                         | `src/interfaces/http/routes/{modulo}.routes.ts`              |
| 10    | Spec OpenAPI                 | `docs/openapi/paths/`                                        |
| 11    | Testes                       | `tests/` nas pastas correspondentes                          |

---

## 4. Convenções de Código

### 4.1 Nomenclatura

| Elemento             | Convenção                 | Exemplo                                         |
| -------------------- | ------------------------- | ----------------------------------------------- |
| Arquivos             | kebab-case                | `login-controller.ts`, `user-repository.ts`     |
| Classes              | PascalCase                | `LoginController`, `PrismaUserRepository`       |
| Interfaces           | PascalCase com `I` prefix | `IUserRepository`, `ICacheService`              |
| Funções/métodos      | camelCase                 | `execute()`, `hashPassword()`                   |
| Variáveis            | camelCase                 | `const userId`, `const tokenHash`               |
| Constantes de módulo | UPPER_SNAKE_CASE          | `const AUTH_COOKIE_NAME`                        |
| Tipos                | PascalCase                | `type UserRole`, `type LoginInput`              |
| Tabelas Prisma       | PascalCase singular       | `User`, `PasswordResetToken`                    |
| Colunas Prisma       | camelCase                 | `passwordHash`, `tokenVersion`                  |
| Rotas HTTP           | kebab-case                | `/auth/forgot-password`, `/auth/reset-password` |

### 4.2 Path Aliases (tsconfig)

Use sempre os aliases — nunca caminhos relativos longos:

```typescript
// ✅ correto
import { IUserRepository } from '@domain/repositories/user-repository';
import { AppError } from '@utils/app-error';
import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { LoginUseCase } from '@usecases/user/login-use-case';

// ❌ errado
import { AppError } from '../../../utils/app-error';
```

| Alias               | Resolve para           |
| ------------------- | ---------------------- |
| `@config/*`         | `src/config/*`         |
| `@domain/*`         | `src/domain/*`         |
| `@infrastructure/*` | `src/infrastructure/*` |
| `@interfaces/*`     | `src/interfaces/*`     |
| `@usecases/*`       | `src/usecases/*`       |
| `@utils/*`          | `src/utils/*`          |

### 4.3 TypeScript

- Nunca use `any`. Use `unknown` e narrowing.
- Prefira `satisfies` para garantir tipo sem perder inferência.
- Interfaces para contratos de repositório e serviço — classes para implementações.
- Entidades de domínio são imutáveis: propriedades `readonly`, objeto congelado com `Object.freeze`.

```typescript
// ✅ entidade imutável
const normalized = { id, name, email } satisfies Required<UserProps>;
this.props = Object.freeze(normalized);

// ✅ narrowing em vez de any
if (err instanceof Error) logger.error(err.message);
else logger.error(String(err));
```

### 4.4 Async/Await

Sempre `async/await`. Nunca `.then()/.catch()` em código novo.

```typescript
// ✅
const user = await userRepository.findByEmail(email);
if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');

// ❌
userRepository.findByEmail(email).then(user => { ... });
```

---

## 5. Arquitetura em Camadas

O projeto segue **Clean Architecture**. Cada camada tem responsabilidade estrita:

```
Domain  ←  UseCases  ←  Interfaces (Controllers/Routes)
   ↑             ↑
Infrastructure   Factories
```

### 5.1 Domain

Entidades, interfaces de repositório e interfaces de serviço. **Zero dependências externas** (sem Prisma, sem Express, sem Redis aqui).

```typescript
// src/domain/repositories/user-repository.ts
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
}
```

### 5.2 Use Cases

Orquestram repositórios e serviços via injeção de dependência. Não conhecem Express, cookies ou HTTP.

```typescript
// src/usecases/user/create-use-case.ts
export class CreateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: RegisterRequestDTO): Promise<User> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) throw AppError.conflict('User already exists', 'USER_ALREADY_EXISTS');

    const passwordHash = await hashPassword(input.password);
    return this.userRepository.create({ ...input, passwordHash });
  }
}
```

### 5.3 Controllers

Recebem `Request`, validam via Zod, chamam o use case, retornam resposta HTTP. Erros são propagados via `next(err)`.

```typescript
export class ExampleController {
  constructor(private readonly useCase: ExampleUseCase) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json(
            createResponse(
              400,
              'Invalid request body',
              { issues: parsed.error.issues },
              undefined,
              'VALIDATION_ERROR',
            ),
          );
      }

      const result = await this.useCase.execute(parsed.data);
      return res.status(200).json(createResponse(200, 'Success', result));
    } catch (err) {
      return next(err); // deixa o errorMiddleware tratar
    }
  }
}
```

### 5.4 Factories

Instanciam e conectam as dependências. Sem lógica de negócio.

```typescript
// src/interfaces/http/factories/controllers/user/register-controller.factory.ts
export function makeRegisterController() {
  const userRepository = new PrismaUserRepository();
  const createUserUseCase = new CreateUserUseCase(userRepository);
  return new RegisterController(createUserUseCase);
}
```

### 5.5 Infrastructure

Implementações concretas dos contratos do domain: `PrismaUserRepository`, `JwtTokenService`, `RedisCacheService`, etc.

---

## 6. Padrões de API

### 6.1 Autenticação

| Item                   | Valor                                                  |
| ---------------------- | ------------------------------------------------------ |
| Método                 | JWT assinado com HS256                                 |
| Transporte primário    | Cookie `httpOnly` (nome: `${APP_NAME}_token`)          |
| Transporte alternativo | Header `Authorization: Bearer {token}`                 |
| Claims obrigatórios    | `sub` (userId), `role`, `tokenVersion`, `iss`, `aud`   |
| Invalidação            | `tokenVersion` incrementado no logout e reset de senha |

**Fluxo de autenticação:**

1. `POST /api/auth/register` → cria usuário, retorna dados (sem token)
2. `POST /api/auth/login` → valida credenciais, define cookie, retorna dados do usuário
3. `GET /api/auth/me` → retorna usuário autenticado (requer cookie ou Bearer)
4. `POST /api/auth/logout` → incrementa `tokenVersion`, limpa cookie

### 6.2 CSRF

Rotas que usam cookie de autenticação são protegidas por CSRF (Double Submit Cookie pattern):

1. Buscar token: `GET /api/auth/csrf` → retorna `{ csrfToken }` e seta cookie
2. Enviar em toda mutação via cookie: header `X-CSRF-Token: {token}`

Rotas **isentas** de CSRF (sem cookie de auth): `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/token`.

### 6.3 Roles

| Role    | Acesso                    |
| ------- | ------------------------- |
| `USER`  | Rotas autenticadas padrão |
| `ADMIN` | Rotas em `/admin/*`       |

```typescript
// Rota protegida por role
router.get('/admin/recurso', authMiddleware, requireRole('ADMIN'), handler);

// Suporta múltiplos roles
router.get('/recurso', authMiddleware, requireRole(['ADMIN', 'USER']), handler);
```

### 6.4 Convenção de Rotas

| Padrão      | Exemplo                 |
| ----------- | ----------------------- |
| Prefixo     | `/api/{modulo}`         |
| Listagem    | `GET /api/users`        |
| Detalhe     | `GET /api/users/:id`    |
| Criação     | `POST /api/users`       |
| Atualização | `PUT /api/users/:id`    |
| Exclusão    | `DELETE /api/users/:id` |

### 6.5 Formato de Resposta

```typescript
// Tipo
type ApiResponse<T> = {
  statusCode: number;
  message: string;
  code?: string; // código de erro/sucesso em UPPER_SNAKE_CASE
  data?: T;
  elapsedTime?: string;
};

// Uso via helper
createResponse(200, 'Login successful', { user }, undefined, 'LOGIN_SUCCESS');
createResponse(400, 'Invalid request body', { issues }, undefined, 'VALIDATION_ERROR');
```

**Sucesso:**

```json
{
  "statusCode": 200,
  "message": "Login successful",
  "data": { "user": { "id": "...", "email": "..." } }
}
```

**Erro:**

```json
{
  "statusCode": 400,
  "message": "Invalid request body",
  "code": "VALIDATION_ERROR",
  "data": { "issues": [...] }
}
```

### 6.6 HTTP Status Codes

| Código | Uso                                        |
| ------ | ------------------------------------------ |
| 200    | Sucesso                                    |
| 201    | Recurso criado                             |
| 204    | Sucesso sem corpo                          |
| 400    | Dados inválidos / bad request              |
| 401    | Não autenticado                            |
| 403    | Não autorizado (forbidden) / CSRF inválido |
| 404    | Não encontrado                             |
| 409    | Conflito (recurso já existe)               |
| 429    | Rate limit atingido                        |
| 500    | Erro interno                               |

### 6.7 Rate Limiting

Todo endpoint sensível deve ter rate limiter explícito com `makeRateLimiter()`. O limiter global (`globalApiLimiter`) é o fallback — **não substitui** limiters por rota.

```typescript
// Padrão para rotas de autenticação
const authLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 20,
});

// Padrão para rotas de reset de senha
const passwordResetLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
});

router.post('/auth/login', authLimiter, asyncRoute(...));
router.post('/auth/forgot-password', passwordResetLimiter, asyncRoute(...));
```

**Limites de referência:**

| Tipo de rota                  | windowMs | limit         |
| ----------------------------- | -------- | ------------- |
| Global API                    | 15 min   | 300           |
| Auth (login, register, token) | 15 min   | 20            |
| Reset de senha                | 15 min   | 10            |
| Rotas admin                   | 15 min   | 50 (sugestão) |

> Em produção, Redis é obrigatório para o rate limiter. Em desenvolvimento, usa memória com warning no log.

---

## 7. Segurança — Padrões de Implementação

Esta seção é prescritiva: define **como** implementar corretamente, não apenas o que evitar.

### 7.1 Hashing de Senha

**Sempre use `argon2` via os helpers em `@utils/password-generator`:**

```typescript
import { hashPassword, verifyPassword } from '@utils/password-generator';

// Hash ao criar/redefinir senha
const passwordHash = await hashPassword(plainTextPassword);

// Verificação ao autenticar
const isValid = await verifyPassword(plainTextPassword, storedHash);
```

**Nunca use:** `bcrypt`, `crypto.createHash('sha256')` ou qualquer outro algoritmo para senha.

### 7.2 Geração de Tokens Seguros

Para qualquer token de uso único (reset de senha, verificação, convites), use sempre `crypto.randomBytes`:

```typescript
import crypto from 'crypto';
import { sha256Hex } from '@utils/hash';

// ✅ correto — token criptograficamente seguro
const rawToken = crypto.randomBytes(32).toString('hex'); // 64 chars hex
const tokenHash = sha256Hex(rawToken); // armazene apenas o hash no banco

// ✅ correto — código numérico de 6 dígitos
const code = crypto.randomInt(100000, 1000000).toString();

// ❌ errado — Math.random() é previsível
const token = Math.random().toString(36);
const code = Math.floor(100000 + Math.random() * 900000);
```

**Regra:** o valor bruto (`rawToken`) vai para o usuário (e-mail/SMS), o hash (`tokenHash`) é armazenado no banco. Na validação, re-hash o token recebido e compare com o armazenado.

### 7.3 Comparação Segura de Strings

Para comparar tokens ou qualquer valor sensível, use `crypto.timingSafeEqual` para evitar timing attacks:

```typescript
import crypto from 'crypto';

// ✅ correto — resistente a timing attack
function safeEqual(a: string, b: string): boolean {
  try {
    const aHash = crypto.createHash('sha256').update(a, 'utf8').digest();
    const bHash = crypto.createHash('sha256').update(b, 'utf8').digest();
    return crypto.timingSafeEqual(aHash, bHash);
  } catch {
    return false;
  }
}

// ❌ errado — vulnerável a timing attack
if (tokenFromUser === tokenFromDb) { ... }
```

### 7.4 Validação de Entrada

**Todo dado externo (req.body, req.params, req.query) deve ser validado via Zod antes de usar:**

```typescript
const schema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
  password: passwordSchema, // use o schema compartilhado de @domain/dtos/shared/password-schema
  name: z
    .string()
    .min(2)
    .max(100)
    .transform((v) => v.trim()),
});

const parsed = schema.safeParse(req.body);
if (!parsed.success) {
  return res
    .status(400)
    .json(
      createResponse(
        400,
        'Invalid request body',
        { issues: parsed.error.issues },
        undefined,
        'VALIDATION_ERROR',
      ),
    );
}
// use parsed.data — tipo seguro e sanitizado
```

**Schema de senha compartilhado** (`@domain/dtos/shared/password-schema`):

- mínimo 8 caracteres, máximo 72 (limite do argon2)
- importe e reutilize — não crie schemas de senha inline

### 7.5 AppError — Erros de Domínio

Use os factory methods estáticos para erros de negócio:

```typescript
import { AppError } from '@utils/app-error';

throw AppError.badRequest('Invalid token', 'TOKEN_INVALID');
throw AppError.unauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
throw AppError.forbidden('Access denied', 'FORBIDDEN');
throw AppError.notFound('User not found', 'USER_NOT_FOUND');
throw AppError.conflict('User already exists', 'USER_ALREADY_EXISTS');
```

O `errorMiddleware` em `app.ts` intercepta automaticamente e retorna a resposta formatada. **Nunca faça `res.status(500)` dentro de um controller** — sempre `next(err)`.

### 7.6 Logs — O que Nunca Logar

| Dado                                 | Motivo            |
| ------------------------------------ | ----------------- |
| Senha em texto puro                  | Segurança         |
| `passwordHash`                       | Segurança         |
| Token JWT completo                   | Segurança         |
| `KEY_JWT`                            | Segurança         |
| Chaves SMTP, Sentry DSN              | Segurança         |
| `req.body` completo em rotas de auth | Pode conter senha |
| Token de reset completo              | Segurança         |

**Do:**

```typescript
logger.info('Password reset requested', { userId: user.id });
logger.warn('Cache miss on auth', { userId });
```

**Don't:**

```typescript
logger.info('Login attempt', { email, password }); // ❌ nunca
logger.debug('Token generated', { token }); // ❌ nunca
```

### 7.7 Exposição Condicional por Ambiente

Nunca exponha dados internos em produção, mesmo que condicionalmente:

```typescript
// ✅ correto — expõe detalhes de erro apenas em não-produção
const message = isServerError && isProd ? 'Internal server error' : err.message;

// ❌ perigoso — se NODE_ENV for mal configurado em staging, vaza dados internos
if (process.env.NODE_ENV === 'development') {
  return res.json({ token: generatedToken });
}
```

### 7.8 Invalidação de Sessão

Ao alterar credenciais ou fazer logout, sempre:

1. Incrementar `tokenVersion` no banco via `userRepository.incrementTokenVersion(userId)`
2. Remover o cache do usuário via `cacheService.del(userCacheKey(userId))`

Isso invalida todos os tokens JWT emitidos anteriormente para aquele usuário.

```typescript
await this.userRepository.incrementTokenVersion(userId);
try {
  await this.cacheService.del(userCacheKey(userId));
} catch (err) {
  logger.warn('Falha ao invalidar cache.', { userId, error: String(err) });
}
```

---

## 8. Banco de Dados

### 8.1 Migrations

Use sempre o Prisma para gerenciar migrations. Nunca escreva SQL de migration manualmente.

```bash
# Criar migration após editar schema
npx prisma migrate dev --name descricao-da-mudanca

# Aplicar em produção
npx prisma migrate deploy
```

### 8.2 Schema por Entidade

Schemas ficam em `prisma/schema/`. Cada entidade tem seu próprio arquivo:

```prisma
// prisma/schema/user.prisma
model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique @db.Citext  // case-insensitive
  passwordHash String
  role         Role     @default(USER)
  tokenVersion Int      @default(0)         // para invalidação de JWT

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 8.3 Boas Práticas

- Use `@db.Citext` para campos de e-mail (comparação case-insensitive no PostgreSQL)
- Sempre inclua `createdAt` e `updatedAt`
- Use `uuid()` como `@id` por padrão
- Tokens sensíveis: armazene sempre o **hash** (sha256), nunca o valor bruto
- Adicione índices para campos de busca frequente

### 8.4 Acesso ao Banco

Sempre via repositório — nunca acesse `prisma` diretamente em use cases ou controllers:

```typescript
// ✅ use case recebe interface do repositório
export class LoginUseCase {
  constructor(private readonly userRepository: IUserRepository) {}
  // ...
}

// ❌ acesso direto ao Prisma fora da camada de infrastructure
import { prisma } from '@infrastructure/prisma/client';
const user = await prisma.user.findUnique(...); // não faça isso em use cases
```

---

## 9. Cache (Redis)

Use `ICacheService` — nunca acesse o cliente Redis diretamente fora de `RedisCacheService`.

```typescript
// Chaves de cache: use os helpers de @utils/cache-keys
import { userCacheKey } from '@utils/cache-keys';

await cacheService.set(userCacheKey(userId), userData, 60); // TTL em segundos
const cached = await cacheService.get<CachedUser>(userCacheKey(userId));
await cacheService.del(userCacheKey(userId));
```

**TTL do cache de usuário (auth middleware):** 60 segundos.

Em desenvolvimento sem Redis, o app usa `NullCacheService` (no-op) com warning. Em produção, `REDIS_URL` é obrigatória.

---

## 10. Variáveis de Ambiente

Todas as variáveis são validadas via Zod no boot em `src/config/env.ts`. Se uma variável obrigatória faltar, o processo encerra na inicialização.

### 10.1 Variáveis Obrigatórias

| Variável       | Descrição                                          |
| -------------- | -------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string                       |
| `KEY_JWT`      | Chave secreta do JWT (mínimo 32 chars recomendado) |
| `JWT_ISSUER`   | Identificador do emissor do JWT                    |
| `JWT_AUDIENCE` | Audience esperada no JWT                           |
| `CORS_ORIGIN`  | Origem permitida (nunca `*` em produção)           |
| `REDIS_URL`    | URL do Redis (**obrigatória em produção**)         |

### 10.2 Variáveis Importantes

| Variável                           | Padrão        | Descrição                           |
| ---------------------------------- | ------------- | ----------------------------------- |
| `NODE_ENV`                         | `development` | `development`, `test`, `production` |
| `PORT`                             | —             | Porta do servidor                   |
| `JWT_EXPIRES_IN`                   | —             | Ex: `1d`, `2h`, `3600`              |
| `COOKIE_SECURE`                    | —             | `true` em produção (HTTPS)          |
| `COOKIE_SAMESITE`                  | `lax`         | `lax`, `strict`, `none`             |
| `CSRF_ENABLED`                     | `true`        | Proteção CSRF                       |
| `TRUST_PROXY`                      | `0`           | `1` atrás de NGINX/Cloudflare       |
| `FRONTEND_URL`                     | —             | URL do frontend (links de e-mail)   |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | `15`          | Validade do token de reset          |

### 10.3 Segredos — Regras

- **Nunca** commite `.env.development` ou `.env.production` com valores reais
- Use `.env.example` como template (commitado, sem valores reais)
- Em produção: injete variáveis via CI/CD ou secrets manager
- `KEY_JWT`: use no mínimo 32 caracteres aleatórios (`openssl rand -hex 32`)

---

## 11. Testes

### 11.1 Estrutura

```
tests/
├── config/           # Testes do env/config
├── infrastructure/   # Testes de repositórios (mocked)
├── integration/      # Testes com banco real (marcados com RUN_INTEGRATION_TESTS)
├── interfaces/
│   ├── controllers/  # Testes de controllers
│   ├── middlewares/  # Testes de middlewares
│   └── routes/       # E2E de rotas (supertest)
├── main/             # Testes do app.ts
├── security/         # Testes de headers, CORS, CSRF, rate limit, cookies
├── setup/            # Helpers, mocks do Prisma, test-env
└── usecases/         # Testes dos use cases
```

### 11.2 Padrões

- **Use cases e controllers**: testar via mocks (sem banco real)
- **Integração**: marque com `describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)`
- **E2E/segurança**: use `supertest` com o app real
- **Mock do Prisma**: use `tests/setup/prisma-client-mock.ts`

```typescript
// Teste de use case
it('should throw conflict if user already exists', async () => {
  userRepositoryMock.findByEmail.mockResolvedValue(existingUser);
  await expect(createUseCase.execute(input)).rejects.toMatchObject({
    code: 'USER_ALREADY_EXISTS',
    statusCode: 409,
  });
});
```

### 11.3 Comandos

```bash
npm test                        # testes unitários + e2e
npm run test:integration        # testes de integração (requer banco)
npm run test:coverage           # gera relatório de cobertura
```

---

## 12. Adicionando uma Nova Feature

Siga o fluxo completo:

```bash
# 1. Criar/editar schema Prisma
# 2. Gerar migration
npx prisma migrate dev --name add-feature-x

# 3. Implementar na ordem da seção 3.1

# 4. Antes do PR
npm run check  # lint + format + openapi + tests
```

### 12.1 Checklist de PR

**Código:**

- [ ] Segue a ordem de camadas (domain → usecase → interface)
- [ ] Sem `any` no TypeScript
- [ ] Validação Zod em todo input externo
- [ ] Erros propagados via `next(err)` (nunca `res.status(500)` no controller)
- [ ] `npm run lint` passou sem warnings
- [ ] `npm run format:check` passou

**Segurança:**

- [ ] Senhas: apenas via `hashPassword`/`verifyPassword` de `@utils/password-generator`
- [ ] Tokens de uso único: `crypto.randomBytes(32)`, hash no banco, raw para o usuário
- [ ] Códigos numéricos: `crypto.randomInt()` — nunca `Math.random()`
- [ ] Comparação de tokens: `crypto.timingSafeEqual` via `safeEqual`
- [ ] Rate limiter aplicado em rotas sensíveis
- [ ] Nenhum dado sensível em logs
- [ ] Invalidação de `tokenVersion` + cache após alterar credenciais ou logout

**Banco de dados:**

- [ ] Migration gerada via `prisma migrate dev`
- [ ] Tokens sensíveis armazenados como hash (sha256)
- [ ] Índices criados para campos de busca

**Testes:**

- [ ] Use cases cobertos por testes unitários
- [ ] Controllers cobertos (mocked)
- [ ] `npm test` passou

**Documentação:**

- [ ] OpenAPI (`docs/openapi/`) atualizado para novos endpoints
- [ ] `.env.example` atualizado para novas variáveis

**Antes de Mergear:**

- [ ] `npm run check` passou completamente
- [ ] Code review aprovado
- [ ] Branch atualizada com base (main/develop)

---

## 13. Princípios de Design — Como Pensar Antes de Escrever

Esta seção define como o código deste projeto **deve ser pensado e gerado**. Cada princípio tem exemplos do código real. Ao usar IA para gerar código, inclua este contexto — ele evita que a IA crie abstrações desnecessárias, duplique lógica ou quebre a arquitetura.

---

### 13.1 YAGNI — You Aren't Gonna Need It

> Não implemente o que não é pedido agora. Abstrações prematuras são dívida técnica disfarçada de previsão.

**Neste projeto:**

```typescript
// ✅ correto — ITokenService tem exatamente o que é usado: sign + verify
export interface ITokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}

// ❌ YAGNI violation — não adicione antes de precisar
export interface ITokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
  refresh(token: string): string; // não existe caso de uso para isso ainda
  revoke(token: string): Promise<void>; // idem
  decode(token: string): TokenPayload; // idem
}
```

```typescript
// ✅ correto — cache com apenas o que é necessário
export interface ICacheService {
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  del(key: string): Promise<void>;
}

// ❌ YAGNI violation
export interface ICacheService {
  set(...): Promise<void>;
  get<T>(...): Promise<T | null>;
  del(...): Promise<void>;
  exists(key: string): Promise<boolean>;   // não tem uso hoje
  ttl(key: string): Promise<number>;        // idem
  keys(pattern: string): Promise<string[]>; // idem
  flush(): Promise<void>;                   // idem
}
```

**Regra:** só crie o método quando houver um use case real chamando-o. Se não há chamador, não existe.

---

### 13.2 KISS — Keep It Simple, Stupid

> A solução mais simples que resolve o problema é a correta. Complexidade sem necessidade é bug em potencial.

**Neste projeto:**

```typescript
// ✅ correto — NullCacheService resolve o problema de "sem Redis"
//    com zero complexidade: implementa a interface, não faz nada
export class NullCacheService implements ICacheService {
  async set(_key: string, _value: unknown, _ttlSeconds: number): Promise<void> {}
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }
  async del(_key: string): Promise<void> {}
}

// ❌ complexidade desnecessária para o mesmo problema
export class NullCacheService implements ICacheService {
  private readonly logger = new Logger();
  private readonly hits: Map<string, number> = new Map();

  async get<T>(key: string): Promise<T | null> {
    this.hits.set(key, (this.hits.get(key) ?? 0) + 1);
    this.logger.debug('NullCache miss', { key, total: this.hits.get(key) });
    return null;
  }
  // ...
}
```

```typescript
// ✅ correto — ForgotPasswordController sempre retorna 200
//    independente de o e-mail existir (não vaza informação)
await this.useCase.execute(parsed.data.email);
return res
  .status(200)
  .json(createResponse(200, 'If the email exists, you will receive instructions...'));

// ❌ complexidade que cria vulnerabilidade
const user = await this.useCase.execute(parsed.data.email);
if (!user) {
  return res.status(404).json(createResponse(404, 'E-mail não encontrado')); // enumera usuários
}
return res.status(200).json(createResponse(200, 'E-mail enviado'));
```

**Regra:** se dois caminhos produzem o mesmo resultado para o usuário, não os separe.

---

### 13.3 DRY — Don't Repeat Yourself

> Cada pedaço de conhecimento deve ter uma representação única e autoritativa no sistema.

**Neste projeto:**

```typescript
// ✅ correto — schema de senha definido uma única vez em @domain/dtos/shared
// src/domain/dtos/shared/password-schema.ts
export const passwordSchema = z.string().min(8).max(72);

// reutilizado em RegisterController, ResetPasswordUseCase, etc.
import { passwordSchema } from '@domain/dtos/shared/password-schema';
const schema = z.object({ password: passwordSchema });
```

```typescript
// ✅ correto — chave de cache centralizada em @utils/cache-keys
export const userCacheKey = (id: string) => `${env.APP_NAME}:user:${id}`;

// usado em auth-middleware, logout-controller, reset-password-use-case
// Se o formato da chave mudar, muda em um lugar só
```

```typescript
// ❌ DRY violation — schema de senha duplicado
// register-controller.ts
const schema = z.object({ password: z.string().min(8).max(72) });

// reset-password-use-case.ts
const parsed = z.string().min(8).max(72).safeParse(newPassword);

// forgot-password-controller.ts
const schema = z.object({ password: z.string().min(8).max(100) }); // max diferente — bug
```

**Atenção:** DRY não significa "abstraia tudo que parece parecido". Dois trechos podem ter código similar mas semântica diferente — nesses casos, duplicar é correto. A regra é sobre **conhecimento**, não sobre linhas de código.

---

### 13.4 SRP — Single Responsibility Principle

> Cada módulo deve ter exatamente um motivo para mudar.

**Mapeamento neste projeto:**

| Camada                              | Responsabilidade única                         |
| ----------------------------------- | ---------------------------------------------- |
| Entidade (`User`)                   | Garantir invariantes de domínio                |
| Use case (`LoginUseCase`)           | Orquestrar um caso de uso específico           |
| Controller (`LoginController`)      | Receber HTTP, validar input, retornar resposta |
| Repository (`PrismaUserRepository`) | Persistência de usuários                       |
| Factory (`makeLoginController`)     | Montar e conectar dependências                 |
| Middleware (`authMiddleware`)       | Verificar autenticação                         |
| Middleware (`requireRole`)          | Verificar autorização                          |

```typescript
// ✅ correto — authMiddleware só autentica, requireRole só autoriza
router.get('/admin/ping', authMiddleware, requireRole('ADMIN'), handler);

// ❌ SRP violation — middleware que autentica E verifica role
router.get('/admin/ping', authAndRequireAdminMiddleware, handler);
// problema: qualquer mudança em auth ou em role quebra o mesmo middleware
```

```typescript
// ✅ correto — use case com responsabilidade única
export class MeUseCase {
  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.unauthorized('Unauthorized', 'UNAUTHORIZED');
    return user;
  }
}

// ❌ SRP violation — use case que busca usuário E atualiza last_seen E envia e-mail
export class MeUseCase {
  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    await this.userRepository.updateLastSeen(userId); // outro motivo para mudar
    await this.mailer.sendWelcomeBack(user.email); // outro motivo para mudar
    return user;
  }
}
```

---

### 13.5 DIP — Dependency Inversion Principle

> Dependa de abstrações (interfaces), não de implementações concretas.

Este princípio já é aplicado sistematicamente no projeto. Ao criar novos módulos, siga o mesmo padrão:

```typescript
// ✅ correto — use case depende de IUserRepository (interface)
export class CreateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}
}

// A factory injeta a implementação concreta
export function makeCreateUserUseCase() {
  return new CreateUserUseCase(new PrismaUserRepository()); // só aqui depende do Prisma
}

// ❌ DIP violation — use case depende de implementação concreta
export class CreateUserUseCase {
  private readonly userRepository = new PrismaUserRepository(); // acoplado ao Prisma
}
// problema: impossível testar sem banco, impossível trocar implementação
```

**Impacto direto nos testes:**

```typescript
// ✅ testável porque depende de interface
const repoMock: jest.Mocked<IUserRepository> = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  // ...
};
const useCase = new CreateUserUseCase(repoMock);
```

---

### 13.6 Null Object Pattern

> Em vez de `if (redis) doSomething()` espalhado pelo código, forneça um objeto que implementa o contrato mas não faz nada.

**Neste projeto:**

```typescript
// ✅ correto — a factory decide qual implementação usar
export function makeCacheService(): ICacheService {
  if (env.REDIS_URL) return new RedisCacheService(getRedisClient());
  return new NullCacheService(); // mesmo contrato, zero efeito
}

// O auth-middleware nunca precisa saber se Redis existe:
const cached = await cacheService.get<CachedUser>(cacheKey); // funciona com ambos
```

```typescript
// ConsoleMailerService — mesmo padrão para e-mail sem SMTP configurado
export class ConsoleMailerService implements IMailerService {
  async sendMail(params): Promise<void> {
    if (env.NODE_ENV === 'production') return;
    console.log('[mailer:console]', params.to, params.subject);
  }
}
```

**Quando criar um Null Object:** sempre que uma dependência opcional tiver um contrato de interface e o código consumidor não dever saber se ela está ativa ou não.

---

### 13.7 Guard Clauses — Retorno Antecipado

> Valide e rejeite no início da função. Evite if/else aninhados.

```typescript
// ✅ correto — guard clauses, fluxo principal no final
async handle(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(createResponse(400, 'Invalid request body', ...));
    }

    const result = await this.useCase.execute(parsed.data);
    return res.status(200).json(createResponse(200, 'Success', result));
  } catch (err) {
    return next(err);
  }
}

// ❌ aninhamento desnecessário
async handle(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = schema.safeParse(req.body);
    if (parsed.success) {
      const result = await this.useCase.execute(parsed.data);
      if (result) {
        return res.status(200).json(createResponse(200, 'Success', result));
      } else {
        return res.status(404).json(createResponse(404, 'Not found'));
      }
    } else {
      return res.status(400).json(createResponse(400, 'Invalid request body', ...));
    }
  } catch (err) {
    return next(err);
  }
}
```

---

### 13.8 Fail Fast

> Erros devem ser detectados o mais cedo possível — na inicialização, não em runtime.

**Neste projeto:**

```typescript
// ✅ correto — env validado via Zod no boot
// Se KEY_JWT não estiver definido, o processo encerra antes de aceitar qualquer requisição
export const env = schema.parse(process.env);

// ✅ correto — entidade valida invariantes no construtor
constructor(props: UserProps) {
  if (!props.id) throw new Error('id is required');
  if (!props.email) throw new Error('email is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('email is invalid');
  // ...
  this.props = Object.freeze(normalized); // imutável após validação
}
```

```typescript
// ✅ correto — CORS inválido encerra no boot
if (corsOrigin === '*') {
  throw new Error('CORS_ORIGIN="*" não é permitido quando credentials=true.');
}

// ❌ fail late — descobre o problema apenas quando chega uma requisição
app.use(cors({ origin: env.CORS_ORIGIN })); // se * e credentials=true, vai falhar silenciosamente
```

**Regra:** qualquer configuração inválida ou ausente deve lançar erro na inicialização do processo, não na primeira requisição que depender dela.

---

### 13.9 Resumo — Checklist de Princípios para a IA

Ao gerar código para este projeto, verifique:

| Princípio     | Pergunta                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| YAGNI         | Há um caso de uso real chamando isso agora?                                                             |
| KISS          | Existe uma solução mais simples que resolve o mesmo problema?                                           |
| DRY           | Esse conhecimento já está definido em outro lugar (`passwordSchema`, `cache-keys`, etc.)?               |
| SRP           | Esse módulo tem mais de um motivo para mudar?                                                           |
| DIP           | O use case ou controller depende de uma classe concreta em vez de uma interface?                        |
| Null Object   | Estou espalhando `if (redis)` / `if (mailer)` em vez de usar `NullCacheService`/`ConsoleMailerService`? |
| Guard Clauses | O fluxo feliz está enterrado dentro de ifs aninhados?                                                   |
| Fail Fast     | Essa validação deveria ocorrer no boot em vez de em runtime?                                            |

---

---

## 14. Testes Unitários — Templates por Camada

Esta seção contém templates **completos e funcionais** baseados nos testes reais do projeto. Ao criar uma nova feature, copie o template correspondente e adapte para o novo módulo. Todos os exemplos aqui foram validados pelo Jest.

---

### 14.1 Filosofia

| Camada     | O que testar                                                                 | Como                                                            |
| ---------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Entidade   | Invariantes do construtor, normalização, métodos de domínio                  | Instanciação direta, sem mocks                                  |
| Use case   | Toda lógica de negócio                                                       | Mocks das interfaces (`IUserRepository`, `ICacheService`, etc.) |
| Controller | Validação de input (Zod), status HTTP, cookie, propagação de erro via `next` | Mocks do use case + `req`/`res`/`next` simulados                |
| Middleware | Autenticação, autorização, comportamento com cache                           | Mocks de `ITokenService`, `IUserRepository`, `ICacheService`    |

**Regra:** nunca acesse banco, Redis ou sistema de arquivos em testes unitários. Use mocks das interfaces.

**Casos obrigatórios por feature:**

| Tipo                 | Casos mínimos                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| Use case com busca   | feliz + entidade não encontrada + regra de negócio violada                                         |
| Use case com criação | feliz + conflito de unicidade + dependências não chamadas antes da validação                       |
| Use case com token   | feliz + token vazio + token não encontrado + invalidação de sessão verificada                      |
| Controller           | body válido + body inválido (use case não chamado) + use case lançando erro (propagado via `next`) |

---

### 14.2 Nomenclatura

```
deve [resultado esperado] quando [condição]
não deve [ação] quando [condição]
```

Exemplos:

```
deve retornar token e user quando credenciais forem válidas
deve lançar 401 quando o usuário não existir
não deve enviar e-mail quando usuário não existir
deve retornar 400 e não chamar o use case quando o body for inválido
deve repassar o erro para next quando o use case lançar erro
```

---

### 14.3 Template — Entidade de Domínio

> Teste invariantes do construtor, normalização de dados e métodos de negócio.

```typescript
// tests/domain/entities/{entidade}.spec.ts

import { User } from '@domain/entities/user';

// Factory de props válidas — facilita sobrescrever apenas o que muda no caso triste
function makeValidProps() {
  return {
    id: 'u1',
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: 'argon2hash',
    role: 'USER' as const,
    tokenVersion: 0,
  };
}

describe('User entity', () => {
  // ✅ CASOS FELIZES

  it('deve criar um usuário com todos os campos válidos', () => {
    const user = new User(makeValidProps());

    expect(user.id).toBe('u1');
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john@example.com');
    expect(user.role).toBe('USER');
    expect(user.tokenVersion).toBe(0);
  });

  it('deve normalizar o email para lowercase e sem espaços', () => {
    const user = new User({ ...makeValidProps(), email: '  JOHN@EXAMPLE.COM  ' });
    expect(user.email).toBe('john@example.com');
  });

  it('deve normalizar o nome removendo espaços', () => {
    const user = new User({ ...makeValidProps(), name: '  John Doe  ' });
    expect(user.name).toBe('John Doe');
  });

  it('deve aceitar role ADMIN', () => {
    const user = new User({ ...makeValidProps(), role: 'ADMIN' });
    expect(user.role).toBe('ADMIN');
  });

  it('deve usar tokenVersion 0 como padrão quando não informado', () => {
    const { tokenVersion: _, ...props } = makeValidProps();
    const user = new User(props);
    expect(user.tokenVersion).toBe(0);
  });

  it('deve preservar as datas informadas', () => {
    const createdAt = new Date('2024-01-01T00:00:00Z');
    const updatedAt = new Date('2024-06-01T00:00:00Z');
    const user = new User({ ...makeValidProps(), createdAt, updatedAt });
    expect(user.createdAt).toEqual(createdAt);
    expect(user.updatedAt).toEqual(updatedAt);
  });

  it('deve ser imutável após construção', () => {
    const user = new User(makeValidProps());
    expect(() => {
      (user as unknown as Record<string, unknown>)['id'] = 'outro';
    }).toThrow();
  });

  // Métodos de domínio
  it('changeName deve retornar nova instância com nome atualizado sem mutar o original', () => {
    const user = new User(makeValidProps());
    const updated = user.changeName('Jane Doe');
    expect(updated.name).toBe('Jane Doe');
    expect(user.name).toBe('John Doe'); // original inalterado
  });

  it('promoteToAdmin deve retornar nova instância com role ADMIN', () => {
    const user = new User(makeValidProps());
    const admin = user.promoteToAdmin();
    expect(admin.role).toBe('ADMIN');
    expect(user.role).toBe('USER');
  });

  it('promoteToAdmin deve retornar a mesma instância quando já for ADMIN', () => {
    const admin = new User({ ...makeValidProps(), role: 'ADMIN' });
    expect(admin.promoteToAdmin()).toBe(admin);
  });

  // ❌ CASOS TRISTES — invariantes do construtor

  it('deve lançar erro quando id for vazio', () => {
    expect(() => new User({ ...makeValidProps(), id: '' })).toThrow('id is required');
  });

  it('deve lançar erro quando id for só espaços', () => {
    expect(() => new User({ ...makeValidProps(), id: '   ' })).toThrow('id is required');
  });

  it('deve lançar erro quando name for vazio', () => {
    expect(() => new User({ ...makeValidProps(), name: '' })).toThrow('name is required');
  });

  it('deve lançar erro quando email for vazio', () => {
    expect(() => new User({ ...makeValidProps(), email: '' })).toThrow('email is required');
  });

  it('deve lançar erro quando email for inválido', () => {
    expect(() => new User({ ...makeValidProps(), email: 'nao-e-email' })).toThrow(
      'email is invalid',
    );
  });

  it('deve lançar erro quando email não tiver domínio', () => {
    expect(() => new User({ ...makeValidProps(), email: 'user@' })).toThrow('email is invalid');
  });

  it('deve lançar erro quando passwordHash for vazio', () => {
    expect(() => new User({ ...makeValidProps(), passwordHash: '' })).toThrow(
      'passwordHash is required',
    );
  });

  it('deve lançar erro quando role for inválida', () => {
    expect(() => new User({ ...makeValidProps(), role: 'SUPERUSER' as 'USER' })).toThrow(
      'role is invalid',
    );
  });
});
```

---

### 14.4 Template — Use Case simples (busca)

> Use case que busca uma entidade e lança erro se não encontrada.

```typescript
// tests/usecases/user/me-use-case.spec.ts

import { MeUseCase } from '@usecases/user/me-use-case';
import type { IUserRepository } from '@domain/repositories/user-repository';
import { User } from '@domain/entities/user';

function makeUserRepoMock(): jest.Mocked<IUserRepository> {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updatePasswordHash: jest.fn(),
    findAll: jest.fn(),
    incrementTokenVersion: jest.fn(),
  };
}

function makeUserStub(overrides: Partial<{ id: string; role: 'USER' | 'ADMIN' }> = {}): User {
  return new User({
    id: overrides.id ?? 'u1',
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: 'hash',
    role: overrides.role ?? 'USER',
    tokenVersion: 0,
  });
}

describe('MeUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ CASO FELIZ — usuário encontrado
  it('deve retornar o usuário quando o id existir', async () => {
    const repo = makeUserRepoMock();
    const useCase = new MeUseCase(repo);

    const user = makeUserStub({ id: 'u1' });
    repo.findById.mockResolvedValue(user);

    const result = await useCase.execute('u1');

    expect(repo.findById).toHaveBeenCalledWith('u1');
    expect(result).toBe(user);
  });

  it('deve retornar usuário ADMIN quando o id existir', async () => {
    const repo = makeUserRepoMock();
    const useCase = new MeUseCase(repo);

    repo.findById.mockResolvedValue(makeUserStub({ role: 'ADMIN' }));
    const result = await useCase.execute('u1');
    expect(result.role).toBe('ADMIN');
  });

  // ❌ CASO TRISTE — não encontrado
  it('deve lançar 401 quando o userId não existir no banco', async () => {
    const repo = makeUserRepoMock();
    const useCase = new MeUseCase(repo);

    repo.findById.mockResolvedValue(null);

    await expect(useCase.execute('nao-existe')).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });

    expect(repo.findById).toHaveBeenCalledWith('nao-existe');
  });

  // ❌ CASO TRISTE — erro inesperado do repositório
  it('deve propagar erro inesperado do repositório', async () => {
    const repo = makeUserRepoMock();
    const useCase = new MeUseCase(repo);

    repo.findById.mockRejectedValue(new Error('db offline'));

    await expect(useCase.execute('u1')).rejects.toThrow('db offline');
  });
});
```

---

### 14.5 Template — Use Case com autenticação e senha

> Use case que verifica credenciais, gera token e pode lançar erros de autenticação.

```typescript
// tests/usecases/user/login-use-case.spec.ts

import { LoginUseCase } from '@usecases/user/login-use-case';
import { IUserRepository } from '@domain/repositories/user-repository';
import { ITokenService } from '@domain/services/token-service';
import { User } from '@domain/entities/user';

// Mock do módulo de senha — nunca chame argon2 em unitários
jest.mock('@utils/password-generator', () => ({
  verifyPassword: jest.fn(),
}));
import { verifyPassword } from '@utils/password-generator';

function makeRepoMock(): jest.Mocked<IUserRepository> {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updatePasswordHash: jest.fn(),
    findAll: jest.fn(),
    incrementTokenVersion: jest.fn(),
  };
}

function makeTokenMock(): jest.Mocked<ITokenService> {
  return { sign: jest.fn(), verify: jest.fn() };
}

describe('LoginUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  // ✅ CASO FELIZ
  it('deve retornar token e user quando credenciais forem válidas', async () => {
    const repo = makeRepoMock();
    const tokenService = makeTokenMock();
    const useCase = new LoginUseCase(repo, tokenService);

    const user = new User({
      id: 'u1',
      name: 'John',
      email: 'john@example.com',
      passwordHash: 'hash',
      role: 'USER',
    });
    repo.findByEmail.mockResolvedValue(user);
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    tokenService.sign.mockReturnValue('token-123');

    const result = await useCase.execute({ email: 'john@example.com', password: 'correct' });

    expect(verifyPassword).toHaveBeenCalledWith('correct', 'hash');
    expect(tokenService.sign).toHaveBeenCalledWith({ sub: 'u1', role: 'USER', tokenVersion: 0 });
    expect(result).toEqual({
      token: 'token-123',
      user: { id: 'u1', name: 'John', email: 'john@example.com', role: 'USER' },
    });
  });

  // ❌ CASO TRISTE — usuário não existe
  it('deve lançar 401 quando o usuário não existir', async () => {
    const repo = makeRepoMock();
    const tokenService = makeTokenMock();
    const useCase = new LoginUseCase(repo, tokenService);

    repo.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'noone@example.com', password: '12345678' }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'AUTH_INVALID_CREDENTIALS' });

    // Garante que não avançou para verificar senha
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(tokenService.sign).not.toHaveBeenCalled();
  });

  // ❌ CASO TRISTE — senha incorreta
  it('deve lançar 401 quando a senha estiver incorreta', async () => {
    const repo = makeRepoMock();
    const tokenService = makeTokenMock();
    const useCase = new LoginUseCase(repo, tokenService);

    const user = new User({
      id: 'u1',
      name: 'John',
      email: 'john@example.com',
      passwordHash: 'hash',
      role: 'USER',
    });
    repo.findByEmail.mockResolvedValue(user);
    (verifyPassword as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'john@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'AUTH_INVALID_CREDENTIALS' });

    expect(verifyPassword).toHaveBeenCalledWith('wrong', 'hash');
    expect(tokenService.sign).not.toHaveBeenCalled();
  });
});
```

---

### 14.6 Template — Use Case com token de uso único (reset de senha)

> Use case que consome um token, valida, atualiza e invalida sessão.

```typescript
// tests/usecases/credentials/reset-password-use-case.spec.ts

import { ResetPasswordUseCase } from '@usecases/credentials/reset-password-use-case';
import type { IUserRepository } from '@domain/repositories/user-repository';
import type { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token-repository';
import type { ICacheService } from '@domain/services/cache-service';

jest.mock('@utils/password-generator', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-new-password'),
}));

jest.mock('@utils/hash', () => ({
  sha256Hex: jest.fn((v: string) => `sha256:${v}`),
}));

function makeUserRepoMock(): jest.Mocked<IUserRepository> {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updatePasswordHash: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn(),
    incrementTokenVersion: jest.fn().mockResolvedValue(undefined),
  };
}

function makeResetTokenRepoMock(): jest.Mocked<IPasswordResetTokenRepository> {
  return {
    replaceTokenForUser: jest.fn(),
    findValidByTokenHash: jest.fn(),
    markUsed: jest.fn(),
    consumeByTokenHash: jest.fn(),
  };
}

function makeCacheServiceMock(): jest.Mocked<ICacheService> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
}

describe('ResetPasswordUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  // ✅ CASO FELIZ — token válido, atualiza senha e invalida sessão
  it('deve atualizar senha, incrementar tokenVersion e invalidar cache', async () => {
    const userRepo = makeUserRepoMock();
    const resetTokenRepo = makeResetTokenRepoMock();
    const cacheService = makeCacheServiceMock();

    resetTokenRepo.consumeByTokenHash.mockResolvedValue('u1');

    const useCase = new ResetPasswordUseCase(userRepo, resetTokenRepo, cacheService);
    await useCase.execute({ token: 'valid-token-123', newPassword: 'NovaSenhaForte123' });

    expect(resetTokenRepo.consumeByTokenHash).toHaveBeenCalledWith('sha256:valid-token-123');
    expect(userRepo.updatePasswordHash).toHaveBeenCalledWith('u1', 'hashed-new-password');
    // Invalida todos os tokens JWT anteriores
    expect(userRepo.incrementTokenVersion).toHaveBeenCalledWith('u1');
    // Remove cache para forçar re-autenticação
    expect(cacheService.del).toHaveBeenCalledWith(expect.stringContaining('u1'));
  });

  // ❌ CASO TRISTE — token vazio ou whitespace
  it('deve lançar 400 para token vazio', async () => {
    const useCase = new ResetPasswordUseCase(
      makeUserRepoMock(),
      makeResetTokenRepoMock(),
      makeCacheServiceMock(),
    );

    await expect(
      useCase.execute({ token: '   ', newPassword: 'SenhaForte123' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'PASSWORD_RESET_INVALID_TOKEN' });
  });

  // ❌ CASO TRISTE — token não encontrado ou expirado
  it('deve lançar 400 quando token não existir ou estiver expirado', async () => {
    const resetTokenRepo = makeResetTokenRepoMock();
    resetTokenRepo.consumeByTokenHash.mockResolvedValue(null);

    const useCase = new ResetPasswordUseCase(
      makeUserRepoMock(),
      resetTokenRepo,
      makeCacheServiceMock(),
    );

    await expect(
      useCase.execute({ token: 'token-inexistente', newPassword: 'SenhaForte123' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'PASSWORD_RESET_INVALID_TOKEN' });

    expect(resetTokenRepo.consumeByTokenHash).toHaveBeenCalledWith('sha256:token-inexistente');
  });
});
```

---

### 14.7 Template — Controller padrão

> Controller com validação Zod, caso feliz, body inválido e erro propagado via `next`.

```typescript
// tests/interfaces/controllers/{modulo}/{nome}-controller.spec.ts

import { Request, Response, NextFunction } from 'express';
import { RegisterController } from '@interfaces/http/controllers/user/register-controller';
import { CreateUserUseCase } from '@usecases/user/create-use-case';
import { User } from '@domain/entities/user';
import { httpStatusCodes } from '@utils/httpConstants';

// Mocks padrão de req/res/next — reutilize este padrão em todo controller
const makeResponseMock = () => {
  const res = {
    status: jest.fn().mockReturnThis(), // permite encadeamento .status(200).json(...)
    json: jest.fn(),
    // cookie: jest.fn(),  // adicione apenas se o controller seta cookie
  };
  return res as unknown as Response;
};

const makeNextMock = () => jest.fn() as unknown as NextFunction;
const makeUseCaseMock = () => ({ execute: jest.fn() }) as unknown as CreateUserUseCase;

describe('RegisterController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ✅ CASO FELIZ — body válido
  it('deve retornar 201 e usuário criado quando o body é válido', async () => {
    const useCase = makeUseCaseMock();
    const controller = new RegisterController(useCase);

    // Dados com espaços e uppercase — controller deve normalizar via Zod transform
    const req = {
      body: { name: '  John Doe  ', email: 'John.DOE@Example.com', password: '12345678' },
    } as Request;

    const user = new User({
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      passwordHash: 'hash',
      role: 'USER',
    });
    (useCase.execute as jest.Mock).mockResolvedValue(user);

    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    // Verifica que dados foram normalizados antes de chegar no use case
    expect(useCase.execute).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: '12345678',
    });
    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User created successfully',
        data: expect.objectContaining({ id: '1', email: 'john.doe@example.com' }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ❌ CASO TRISTE — body inválido (Zod rejeita antes do use case)
  it('deve retornar 400 e não chamar o use case quando o body é inválido', async () => {
    const useCase = makeUseCaseMock();
    const controller = new RegisterController(useCase);

    const req = { body: { name: 'J', email: 'email-invalido', password: '123' } } as Request;
    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(useCase.execute).not.toHaveBeenCalled(); // nunca chegou no use case
    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        data: {
          issues: expect.arrayContaining([
            expect.objectContaining({ message: expect.any(String) }),
          ]),
        },
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ❌ CASO TRISTE — use case lança erro (AppError ou exceção)
  it('deve repassar o erro para next quando o use case lançar erro', async () => {
    const useCase = makeUseCaseMock();
    const controller = new RegisterController(useCase);

    const req = {
      body: { name: 'John Doe', email: 'john@example.com', password: '12345678' },
    } as Request;
    const error = new Error('unexpected');
    (useCase.execute as jest.Mock).mockRejectedValue(error);

    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error); // erro propagado para o errorMiddleware
    expect(res.status).not.toHaveBeenCalled(); // não respondeu diretamente
    expect(res.json).not.toHaveBeenCalled();
  });
});
```

---

### 14.8 Template — Controller que seta cookie (Login)

> Mesmo padrão do controller padrão, com verificação adicional do cookie de auth.

```typescript
// tests/interfaces/controllers/login-controller.spec.ts

import { Request, Response, NextFunction } from 'express';
import { LoginController } from '@interfaces/http/controllers/user/login-controller';
import { LoginUseCase } from '@usecases/user/login-use-case';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME } from '@interfaces/http/cookies/auth-cookie';

// res inclui cookie: jest.fn() — obrigatório para controllers que setam cookie
const makeResponseMock = () =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    cookie: jest.fn(),
  }) as unknown as Response;

const makeNextMock = () => jest.fn() as unknown as NextFunction;
const makeUseCaseMock = () => ({ execute: jest.fn() }) as unknown as LoginUseCase;

describe('LoginController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ✅ CASO FELIZ — seta cookie httpOnly com o token
  it('deve retornar 200, setar cookie e retornar usuário quando credenciais são válidas', async () => {
    const useCase = makeUseCaseMock();
    const controller = new LoginController(useCase);

    (useCase.execute as jest.Mock).mockResolvedValue({
      token: 'fake-token',
      user: { id: '1', name: 'John Doe', email: 'john@example.com', role: 'USER' as const },
    });

    const req = { body: { email: 'john@example.com', password: '12345678' } } as Request;
    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    // Verifica que o cookie de auth foi setado com o token
    expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, 'fake-token', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Login successful' }));
  });

  // ❌ CASO TRISTE — body inválido não seta cookie
  it('deve retornar 400 e não setar cookie quando o body é inválido', async () => {
    const useCase = makeUseCaseMock();
    const controller = new LoginController(useCase);

    const req = { body: { email: 'invalido', password: '123' } } as Request;
    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(useCase.execute).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled(); // nunca seta cookie em caso de erro
    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.BAD_REQUEST);
  });

  // ❌ CASO TRISTE — credenciais inválidas (use case lança AppError)
  it('deve repassar o erro para next e não setar cookie quando credenciais são inválidas', async () => {
    const useCase = makeUseCaseMock();
    const controller = new LoginController(useCase);

    const error = {
      statusCode: 401,
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid credentials',
    };
    (useCase.execute as jest.Mock).mockRejectedValue(error);

    const req = { body: { email: 'john@example.com', password: '12345678' } } as Request;
    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
```

---

### 14.9 Template — Controller que verifica req.user (Me)

> Controller protegido por authMiddleware — testa o guard de `req.user` ausente.

```typescript
// tests/interfaces/controllers/me-controller.spec.ts

import { Request, Response, NextFunction } from 'express';
import { MeController } from '@interfaces/http/controllers/user/me-controller';
import { MeUseCase } from '@usecases/user/me-use-case';
import { User } from '@domain/entities/user';
import { httpStatusCodes } from '@utils/httpConstants';

const makeResponseMock = () =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }) as unknown as Response;

const makeNextMock = () => jest.fn() as unknown as NextFunction;
const makeUseCaseMock = () => ({ execute: jest.fn() }) as unknown as MeUseCase;

describe('MeController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ✅ CASO FELIZ — req.user preenchido pelo authMiddleware
  it('deve retornar 200 e dados do usuário quando req.user estiver preenchido', async () => {
    const useCase = makeUseCaseMock();
    const controller = new MeController(useCase);

    const user = new User({
      id: 'u1',
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hash',
      role: 'USER',
      tokenVersion: 0,
    });
    (useCase.execute as jest.Mock).mockResolvedValue(user);

    const req = { user: { id: 'u1', role: 'USER', tokenVersion: 0 } } as unknown as Request;
    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith('u1');
    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Authenticated',
        data: { user: { id: 'u1', name: 'John Doe', email: 'john@example.com', role: 'USER' } },
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ❌ CASO TRISTE — req.user ausente (auth middleware falhou ou rota sem proteção)
  it('deve retornar 401 quando req.user não estiver definido', async () => {
    const useCase = makeUseCaseMock();
    const controller = new MeController(useCase);

    const req = { user: undefined } as unknown as Request;
    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(useCase.execute).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNAUTHORIZED' }));
    expect(next).not.toHaveBeenCalled();
  });

  // ❌ CASO TRISTE — use case lança erro (ex: usuário deletado após emissão do token)
  it('deve repassar o erro para next quando o use case lançar erro', async () => {
    const useCase = makeUseCaseMock();
    const controller = new MeController(useCase);

    const error = new Error('db failure');
    (useCase.execute as jest.Mock).mockRejectedValue(error);

    const req = { user: { id: 'u1', role: 'USER', tokenVersion: 0 } } as unknown as Request;
    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
```

---

### 14.10 Checklist de Testes para o PR

- [ ] Entidade nova tem spec cobrindo todas as invariantes do construtor
- [ ] Use case tem ao menos: 1 caso feliz + todos os caminhos de erro do domínio
- [ ] Controller tem ao menos: body válido + body inválido + use case lançando erro
- [ ] No caso triste de body inválido: `useCase.execute` **não foi chamado**
- [ ] No caso triste de erro: `next` foi chamado com o erro, `res.status` **não foi chamado**
- [ ] Invalidação de sessão verificada: `incrementTokenVersion` + `cacheService.del` com `userId`
- [ ] Erros verificados com `rejects.toMatchObject({ statusCode, code })` — nunca só `toThrow`
- [ ] `jest.clearAllMocks()` no `beforeEach`
- [ ] Módulos com efeitos colaterais (argon2, crypto) mockados via `jest.mock`
- [ ] `npm test` passou antes do PR
