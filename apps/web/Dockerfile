
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build the application
RUN npx nx run web:build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Copy standalone build
COPY --from=builder /app/dist/apps/web/.next/standalone ./
COPY --from=builder /app/dist/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 4200

ENV PORT 4200
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/web/server.js"]
