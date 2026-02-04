# ── Stage 1: Build frontend ──
FROM node:22-alpine AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Build backend ──
FROM node:22-alpine AS backend-build

WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm install

COPY server/ .
RUN npx prisma generate
RUN npx tsc

# ── Stage 3: Production ──
FROM node:22-alpine

WORKDIR /app

# Copy backend build output
COPY --from=backend-build /app/server/dist ./dist
COPY --from=backend-build /app/server/node_modules ./node_modules
COPY --from=backend-build /app/server/package.json ./package.json

# Copy prisma schema + generated client
COPY --from=backend-build /app/server/prisma ./prisma
COPY --from=backend-build /app/server/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-build /app/server/node_modules/@prisma ./node_modules/@prisma

# Copy frontend build output into public/
COPY --from=frontend-build /app/dist ./public

RUN mkdir -p /app/data
VOLUME /app/data

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL="file:/app/data/data.db"

EXPOSE 3001

# Run prisma migrate deploy on startup, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
