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

For first-time real Discord setup, follow the [Local Discord development onboarding guide](docs/local-discord-development.md).

The operational endpoints are `GET /livez`, `GET /readyz`, and `GET /metrics`. A Unix-domain
`SOCKET_PATH` is available for process-level local tests; ordinary development uses `HOST` and
`PORT`.

## Temporary voice rooms

Set `TEMPORARY_ROOM_CONFIG` to a JSON map keyed by Discord server ID, with `triggerChannelId`,
`destinationCategoryId`, optional `inactivityTimeoutMinutes`, optional
`reconciliationIntervalMinutes`, and optional `permanentChannelIds` in each value. Both minute
values are whole numbers from 1 through 1440; inactivity defaults to 60 and reconciliation defaults
to 15. The destination category is dedicated Voicelet-managed territory: do not place unrelated
permanent voice channels there unless they appear in `permanentChannelIds`. The trigger channel is
always excluded from zombie cleanup.

A known managed room is present in the current in-memory association and is deleted only after it has
remained continuously empty for its inactivity timeout; a join starts a fresh period. Any
non-permanent voice channel in the destination category that lacks a current association is a zombie.
Reconciliation removes an empty zombie immediately, preserves an occupied zombie, and never rebuilds
ownership from names or members. After restart, temporary associations are intentionally lost, so
pre-existing empty rooms may be cleaned up at startup while occupied rooms remain until a later scan
finds them empty. Servers omitted from the map are ignored. The bot requires
View Channel, Manage Channels, Move Members, and Connect for the configured voice resources;
configuration or Discord operation failures are recorded without identifiers or provider details.
Malformed JSON or mapping entries fail startup with a generic validation error; the invalid value is
not echoed. Development credentials and identifiers belong in the ignored `.env`; do not use
production credentials for local testing.

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
