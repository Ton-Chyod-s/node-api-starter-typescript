# Redis

O projeto usa Redis como camada de cache opcional. Quando `REDIS_URL` não está definida, o sistema opera normalmente com `NullCacheService` (sem cache), o que garante compatibilidade com ambientes de teste e deploys simples.

---

## Configuração

Adicione ao seu `.env.development` (ou `.env.production`):

```env
REDIS_URL=redis://localhost:6379
```

Em produção com autenticação:

```env
REDIS_URL=redis://:sua-senha@redis-host:6379
```

Com TLS (Redis Cloud, Upstash, etc.):

```env
REDIS_URL=rediss://usuario:senha@host:6380
```

---

## Docker (desenvolvimento local)

O `docker-compose.dev.yml` já inclui o serviço Redis. Basta subir normalmente:

```bash
docker compose -f docker-compose.dev.yml up --build
```

A variável `REDIS_URL=redis://redis:6379` é injetada automaticamente pelo compose na API. Não precisa colocar no `.env.development` neste caso.

---

## Arquitetura

O Redis segue o mesmo padrão do restante do projeto: contrato no domínio, implementação na infra, factory para wiring.

```
src/domain/services/cache-service.ts          ← interface ICacheService
src/infrastructure/redis/client.ts            ← singleton ioredis
src/infrastructure/redis/redis-cache-service.ts ← implementação real
src/infrastructure/redis/null-cache-service.ts  ← no-op (testes / sem Redis)
src/interfaces/http/factories/cache/container.ts ← factory makeCacheService()
```

A factory `makeCacheService()` decide automaticamente qual implementação usar:

```
REDIS_URL definida  → RedisCacheService
REDIS_URL ausente   → NullCacheService
```

---

## Uso atual

### Cache de usuário no auth-middleware

Toda request autenticada precisa verificar se o usuário ainda existe e se o `tokenVersion` é válido. Sem cache isso é uma query ao banco por request.

Com Redis, o usuário é cacheado por **60 segundos** após a primeira consulta:

```
Cache key: user:{userId}
TTL: 60 segundos
Payload: { id, role, tokenVersion }
```

**Fluxo:**

```
Token válido
  → Busca user:{id} no Redis
  → HIT: verifica tokenVersion → segue
  → MISS: busca no banco → salva no Redis → verifica tokenVersion → segue
```

**Invalidação explícita:** ao fazer logout ou trocar a senha, o `tokenVersion` do usuário é incrementado no banco. Na próxima request, mesmo que o cache retorne o dado antigo, o `tokenVersion` do token JWT não vai bater com o do cache — o middleware rejeita e busca do banco, atualizando o cache.

> O TTL de 60s é o tempo máximo de "atraso" entre uma invalidação e o cache refletir. Para operações críticas como troca de role ou banimento, considere chamar `cacheService.del('user:{id}')` após a operação.

---

## Como usar o cache em outros módulos

Injete `ICacheService` via construtor, igual ao padrão dos repositórios:

```typescript
import type { ICacheService } from '@domain/services/cache-service';

export class GetProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly cache: ICacheService,
  ) {}

  async execute(productId: string) {
    const cacheKey = `product:${productId}`;

    const cached = await this.cache.get<ProductDTO>(cacheKey);
    if (cached) return cached;

    const product = await this.productRepository.findById(productId);
    if (!product) throw AppError.notFound('Product not found', 'PRODUCT_NOT_FOUND');

    await this.cache.set(cacheKey, product.toDTO(), 300); // 5 minutos
    return product.toDTO();
  }
}
```

Na factory do controller, injete `makeCacheService()`:

```typescript
import { makeCacheService } from '@interfaces/http/factories/cache/container';

export function makeGetProductController() {
  const productRepository = new PrismaProductRepository();
  const cacheService = makeCacheService();
  const useCase = new GetProductUseCase(productRepository, cacheService);
  return new GetProductController(useCase);
}
```

---

## Convenção de chaves

Use o padrão `entidade:identificador` para evitar colisões:

| Entidade | Padrão              | Exemplo           |
| -------- | ------------------- | ----------------- |
| Usuário  | `user:{id}`         | `user:abc123`     |
| Produto  | `product:{id}`      | `product:xyz789`  |
| Carrinho | `cart:{userId}`     | `cart:abc123`     |
| Listagem | `products:page:{n}` | `products:page:1` |

---

## Testes

Nos testes, o `NullCacheService` é usado automaticamente (sem `REDIS_URL` no `.env.test`). Para testar comportamento de cache explicitamente, instancie o `NullCacheService` ou crie um mock:

```typescript
const cacheService: ICacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};
```

---

## Instalação da dependência

```bash
npm install ioredis
npm install --save-dev @types/ioredis  # se necessário — ioredis já inclui tipos
```
