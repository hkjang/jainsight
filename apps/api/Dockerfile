
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx nx run api:build:production
# RUN npx nx run api:prune-lockfile

FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist/apps/api ./

EXPOSE 3000
ENV PORT 3000

CMD ["node", "main.js"]
