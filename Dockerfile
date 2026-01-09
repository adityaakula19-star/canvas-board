FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies separately for better caching
FROM base AS deps
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./ 2>/dev/null || true
RUN npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]

