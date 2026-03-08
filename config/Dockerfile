# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

# ----------------------
# deps
# ----------------------
FROM base AS deps

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

# ----------------------
# dev
# ----------------------
FROM deps AS dev

ENV NODE_ENV=development

COPY . .

USER node

EXPOSE 3000

# Gera Prisma client no runtime para refletir mudanças de schema sem rebuild
CMD ["sh", "-c", "npx prisma generate && npm run dev"]

# ----------------------
# build (compila TS -> dist)
# ----------------------
FROM deps AS build

COPY . .

# DATABASE_URL fake apenas para o prisma generate no build
ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake?schema=public"

RUN npx prisma generate

RUN npm run build

RUN npm prune --omit=dev

# ----------------------
# prod (runtime mínimo)
# ----------------------
FROM base AS prod

ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts ./

USER node

EXPOSE 3000

CMD ["node", "dist/main/server.js"]
