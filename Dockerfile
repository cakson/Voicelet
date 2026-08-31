FROM node:24.20.0-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build
RUN pnpm prune --prod

FROM node:24.20.0-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
WORKDIR /app

RUN groupadd --system voicelet \
  && useradd --system --gid voicelet --create-home voicelet
COPY --from=build --chown=voicelet:voicelet /app/node_modules ./node_modules
COPY --from=build --chown=voicelet:voicelet /app/dist ./dist
COPY --from=build --chown=voicelet:voicelet /app/package.json ./package.json

USER voicelet
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/livez').then((r) => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"
CMD ["node", "dist/main.js"]
