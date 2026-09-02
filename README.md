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

## Persistent guild configuration

Guild settings are stored through the application-owned `GuildConfigRepository`; Firestore is the
production adapter and `PERSISTENCE_PROVIDER=memory` is deterministic for tests. Each guild has one
validated document containing `triggerChannelId`, `destinationCategoryId`, optional
`inactivityTimeoutMinutes` (default 60), `reconciliationIntervalMinutes` (default 15), and
`permanentChannelIds`. Start the native emulator with `pnpm firebase:emulator`; local seeding is
documented in `docs/local-discord-development.md`. `DISCORD_TOKEN` and datastore credentials are
secrets, operational settings remain environment configuration, and guild settings do not belong
in either category.

Timeout values are whole minutes from 1 through 1440. The destination category is dedicated Voicelet-managed territory, and reconciliation never expands beyond it. The room-creation trigger
is validated as a voice channel before use.

A known managed room is present in the current in-memory association and is deleted only after it has
remained continuously empty for its inactivity timeout; a join starts a fresh period. Any
non-permanent voice channel in the destination category that lacks a current association is a zombie.
Reconciliation removes an empty zombie immediately, preserves an occupied zombie, and never rebuilds
ownership from names or members. After restart, temporary associations are intentionally lost, so
pre-existing empty rooms may be cleaned up at startup while occupied rooms remain until a later scan
finds them empty. The bot requires
View Channel, Manage Channels, Move Members, and Connect for the configured voice resources;
configuration or Discord operation failures are recorded without identifiers or provider details.
Room owners receive member-specific `Manage Channels` and `Manage Roles` overwrites only on their
own temporary room. Discord groups these capabilities, so owners may rename, change region or user
limit, manage access, move, or delete that room where permitted. Voicelet grants no owner role,
Administrator, server management, or moderation privilege. Native access editing requires effective
Administrator on the Voicelet bot as a bot-only prerequisite so lifecycle authority survives owner
overwrite changes; it is never granted to owners. A tracked room moved outside the category is
restored, and reconciliation never expands beyond the configured category.
Invalid runtime configuration fails startup with a generic validation error; the invalid value is not
echoed. Development credentials and identifiers belong in the ignored `.env`; do not use production
credentials for local testing.

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

## Production container and delivery

Build the production Docker image from the repository and lockfile with:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm container:build
```

Run it with runtime values supplied separately (the image contains no `.env` or credentials):

```sh
docker run --rm --publish 3000:3000 \
  --env HOST=0.0.0.0 \
  --env GATEWAY_MODE=simulated \
  voicelet:local
```

The container starts the normal production entrypoint and serves `/livez`, `/readyz`, and `/metrics`.
`pnpm container:smoke` runs the credential-free endpoint check when Docker is available.

Merges to `main` run quality checks and publish the image to GitHub Container Registry (GHCR) only
after they pass. Each published image uses the immutable tag
`ghcr.io/<owner>/<repository>:sha-<40-character-git-commit>`; its OCI revision metadata identifies
the source Git commit. A mutable `main` convenience tag may exist, but it is never deployed.

After publication, provide the immutable GHCR image reference to a compatible external container
environment. That environment owns registry pull authorization, runtime configuration, deployment,
health verification, observability, and rollback; repository CI does not perform or verify those
operations. Before removing the legacy repository deployment workflow, confirm that the chosen
environment can pull GHCR and is configured for the selected immutable image. See [the delivery
guide](docs/deployment.md) for the repository boundary and handoff details.
