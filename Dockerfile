FROM node:24-bookworm-slim AS server-build
WORKDIR /app/server
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate && npm run build

FROM node:24-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
ENV VITE_API_URL=""
RUN npm run build

FROM server-build AS migration
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

FROM server-build AS production-deps
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
WORKDIR /app/server
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=4000
COPY --from=production-deps /app/server/node_modules ./node_modules
COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/client/dist /app/client/dist
USER node
EXPOSE 4000
CMD ["node", "dist/src/index.js"]
