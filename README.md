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
`GuildVoiceStates` intent. Never commit `.env` or a token. The worker loads `.env` before
validating configuration. For a credential-free local readiness check, set
`GATEWAY_MODE=simulated`; the simulated Gateway automatically emits ready.

The operational endpoints are `GET /livez`, `GET /readyz`, and `GET /metrics`. A Unix-domain
`SOCKET_PATH` is available for process-level local tests; ordinary development uses `HOST` and
`PORT`.

## Temporary voice rooms

Set `TEMPORARY_ROOM_CONFIG` to a JSON map keyed by Discord server ID, with `triggerChannelId` and
`destinationCategoryId` in each value. Servers omitted from the map are ignored. The bot requires
Manage Channels, Move Members, and access to the destination category; configuration or Discord
operation failures are recorded without identifiers or provider details. Malformed JSON or mapping
entries fail startup with a generic validation error; the invalid value is not echoed.

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
