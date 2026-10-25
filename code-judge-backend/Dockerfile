# syntax=docker/dockerfile:1.7

# ── Build dependencies ────────────────────────────────────────────────────────
FROM node:22.23.4-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ── TypeScript build ──────────────────────────────────────────────────────────
FROM dependencies AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production node_modules only ──────────────────────────────────────────────
FROM node:22.23.4-bookworm-slim AS production-dependencies
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22.23.4-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8000 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# PDF and document export run headless Chromium via Playwright. Install the
# browser plus only the OS libraries it needs, then drop root.
RUN npx playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/* \
    && chown -R node:node /ms-playwright

COPY --from=build /app/dist ./dist
COPY database ./database
COPY public ./public
COPY secure-media ./secure-media

USER node
EXPOSE 8000

CMD ["node", "dist/server.js"]
