# Voicelet

Voicelet is a TypeScript background worker that receives Discord voice-state events and exposes
operational liveness, readiness, and metrics endpoints.

## Prerequisites

- Volta with Node 24.20.0; entering this repository automatically selects the pinned runtime.
- pnpm 10.15.0 installed through Volta.

## Setup and start

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

For a live Discord connection, set `DISCORD_TOKEN` in `.env` and enable only the
`GuildVoiceStates` intent. Never commit `.env` or a token. For local simulated operation, set
`GATEWAY_MODE=simulated`.

The operational endpoints are `GET /livez`, `GET /readyz`, and `GET /metrics`. A simulated worker
becomes ready only after its simulated Discord client emits a ready signal.

## Common commands

| Command          | Purpose                                      |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Run the worker in development mode.          |
| `pnpm format`    | Apply formatting.                            |
| `pnpm lint`      | Run static linting.                          |
| `pnpm typecheck` | Run strict TypeScript checking.              |
| `pnpm test`      | Run unit, integration, and end-to-end tests. |
| `pnpm build`     | Compile the worker to `dist/`.               |
| `pnpm check`     | Run the CI-equivalent quality gate.          |
