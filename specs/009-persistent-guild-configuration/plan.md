# Implementation Plan: Persistent Guild Configuration

**Branch**: `009-persistent-guild-configuration` | **Date**: 2026-09-02 | **Spec**: [spec.md](spec.md)

## Summary

Replace `TEMPORARY_ROOM_CONFIG` with durable per-guild configuration accessed through an
application-owned repository port. The canonical `GuildConfig` retains all existing per-guild room
settings. Cloud Firestore is the first production adapter, isolated in infrastructure; Firebase's
official Firestore emulator supports local, integration, and end-to-end validation.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js 24, native ESM.

**Primary Dependencies**: Existing discord.js, Fastify, Zod, Pino, prom-client; add official
`@google-cloud/firestore` and a lockfile-pinned Firebase CLI development dependency.

**Storage**: Cloud Firestore production adapter; Firebase Local Emulator Suite for local, integration,
and E2E testing; deterministic in-memory repository for unit/application tests.

**Testing**: Vitest unit, integration, and E2E projects. Firestore-specific tests run using
`firebase emulators:exec --only firestore` and a disposable project ID.

**Target Platform**: Single Node.js Linux container worker; local macOS/Linux and GitHub Actions CI.

**Constraints**: Preserve `domain ← application/ports ← infrastructure/composition`. Firestore
types, paths, references, timestamps, snapshots, queries, raw errors, credentials, raw documents,
and identifier-bearing observability details do not cross the boundary. Persistence failure makes
readiness unhealthy but not liveness; the next successful read restores readiness.

## Constitution Check

| Gate | Result | Evidence |
|---|---|---|
| Testability | Pass | In-memory unit/application, emulator integration, and simulated-Gateway/emulator E2E coverage. |
| Quality gates | Pass | Reproducible emulator lifecycle is integrated into `pnpm check`. |
| Architecture | Pass | Application port, Firestore infrastructure adapter, composition-only provider selection. |
| Documentation | Pass | Architecture, development, testing, deployment, README, and examples are updated. |
| Security/observability | Pass | Runtime-only credentials and bounded identifier-free failure diagnostics. |
| Reproducibility | Pass | Locked SDK/CLI, committed emulator config, disposable project/data. |

Post-design: all gates remain satisfied. The repository port is the minimum demonstrated abstraction;
no second provider is implemented.

## Project Structure

```text
src/
├── domain/guild-config.ts
├── application/guild-config-service.ts
├── application/{manage-temporary-room,reconcile-temporary-rooms}.ts
├── ports/guild-config-repository.ts
├── infrastructure/firestore/{firestore-client-factory,firestore-guild-config-repository}.ts
├── infrastructure/memory/in-memory-guild-config-repository.ts
├── config/load-config.ts
└── composition/root.ts
tests/{unit,integration,e2e,support}/
firebase.json
```

## Implementation Approach

1. Add domain-owned canonical/config-input validation, defaults, and V1 plain stored data from
   [data-model.md](data-model.md). Canonical values are complete; datastore defaults and transforms
   never define business behavior.
2. Define `GuildConfigRepository` in `src/ports` with safe lookup, enumeration, and save/replace
   result unions. Enumeration exists solely to preserve existing reconciliation scheduling.
3. Refactor room-management and reconciliation application paths to resolve/enumerate through the
   port. Missing, invalid, and unavailable results safely skip affected behavior; room associations,
   locks, timers, and lifecycle policy remain transient.
4. Implement Firestore under `src/infrastructure/firestore`. Translate document data to V1 plain
   data, validate it, map SDK errors to bounded outcomes, and use only ordinary reads/writes and
   enumeration. No SDK values escape the adapter.
5. Update composition/configuration to select Firestore, use `FIRESTORE_EMULATOR_HOST` only for
   local/testing, use runtime Application Default Credentials in production, remove
   `TEMPORARY_ROOM_CONFIG`, and dispose adapter resources on shutdown.
6. Require Gateway and persistence availability for readiness. Add bounded persistence metrics/logs;
   any successful later read restores persistence readiness.
7. Add pinned emulator scripts, deterministic seed/reset helpers, Java 21 CI setup, and the test
   layers in [quickstart.md](quickstart.md). CI never receives production credentials.

## Complexity Tracking

No constitution violations.
