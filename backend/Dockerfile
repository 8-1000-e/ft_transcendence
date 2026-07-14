# ---------- build stage ----------
FROM node:22-bookworm AS build
WORKDIR /app

# Install deps first (better layer caching). The `prepare` script wires husky
# hooks assuming the repo layout (backend as a subdir); it breaks inside the
# image where the backend IS the root, so drop it before `npm ci`.
COPY package*.json prisma.config.ts ./
RUN npm pkg delete scripts.prepare && npm ci

COPY . .
# Prisma 7 generates the client into ./generated ; must run before build.
RUN npx prisma generate && npm run build

# ---------- runtime stage ----------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
# Prisma query engine needs OpenSSL at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated
COPY --from=build /app/prisma ./prisma
COPY package*.json prisma.config.ts ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && mkdir -p uploads

EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
