# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci

ARG PRISMA_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
RUN DATABASE_URL="${PRISMA_DATABASE_URL}" npx prisma generate

FROM deps AS dev

ENV NODE_ENV=development

COPY . .

USER node

EXPOSE 3000

CMD ["npm", "run", "dev"]


# ----------------------
# build (compila TS -> dist)
# ----------------------
FROM deps AS build

COPY . .
RUN npm run build

RUN npm prune --omit=dev

# ----------------------
# prod (runtime)
# ----------------------
FROM base AS prod

ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main/server.js"]
