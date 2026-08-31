# Implementation Plan: Room Reconciliation & Zombie Cleanup

**Branch**: `005-room-reconciliation` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-room-reconciliation/spec.md`

## Summary

Add a per-server, deterministic reconciliation policy that starts after each effective ready transition and repeats at the configured cadence. The application layer will enumerate only configured-category voice channels, classify them against permanent exclusions and current in-memory managed-room associations, and immediately remove only confirmed-empty zombies. Known rooms remain entirely under the existing inactivity lifecycle; ownership is never reconstructed or changed for zombies.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 24

**Primary Dependencies**: discord.js 14.22, Fastify 5, Pino 9, prom-client 15, Zod 4

**Storage**: No persistent storage. Managed-room associations, inactivity work, reconciliation work, and scan locks are in-process only and are discarded on restart.

**Testing**: Vitest 3 unit, integration, and child-process E2E tests; existing manual/simulated schedulers and simulated Discord client provide controllable time and state.

**Target Platform**: Node.js background worker connected to the Discord Gateway, with a local operational HTTP surface.

**Project Type**: Single background-worker service.

**Performance Goals**: One active periodic reconciliation schedule per configured server; one serial category scan per server; no duplicate cleanup deletion for a channel in unchanged state.

**Constraints**: Preserve `domain ← application/ports ← infrastructure/composition`; enumerate only `GuildVoice` channels within the configured category; validate interval as an integer 1–1,440 minutes with default 15; never infer ownership or persist state; never emit tokens, raw payloads, provider errors, or Discord identifiers in observations.

**Scale/Scope**: Multiple independent configured server mappings. Each scan evaluates category candidates one at a time, containing failures per candidate; current transient associations remain authoritative only during one process lifetime.

## Constitution Check

### Pre-design Gate

- **I. Testability — PASS**: Unit classification/lifecycle isolation, integration gateway/configuration/adapter behavior, and simulated process E2E startup-to-cleanup coverage are required. All cadence tests use controllable scheduling.
- **II. Enforced Quality Gates — PASS**: Tasks will require focused tests plus `pnpm check`.
- **III. Explicit Architecture — PASS**: Classification and scheduling policy remain in application code; category enumeration and deletion stay behind ports and adapters; composition only wires them.
- **IV. Documentation as Deliverable — PASS**: Configuration, category reservation, restart semantics, tests, local smoke testing, and architecture boundaries are planned documentation outputs.
- **V. Explicit API Contracts — PASS**: A feature contract defines configuration, category enumeration, classification, safe delete outcomes, cadence, and observations.
- **VI. Security by Default — PASS**: Validation is generic/redaction-safe, operations are category-scoped, and telemetry uses bounded outcomes without IDs or raw provider data.
- **VII. Actionable Observability — PASS**: Bounded reconciliation outcomes expose scan and per-channel failures without sensitive context.
- **VIII. Reproducible Repository — PASS**: Existing simulator, scheduler, lockfile, and CI commands are sufficient; no dependency is planned.
- **IX. Definition of Done — PASS**: The implementation task list will include all specified tests, documentation, contract checks, and final quality evidence.

### Post-design Gate

**PASS** — The design uses existing application/port boundaries and deterministic scheduler seams. It adds only the demonstrated capabilities needed for category-scoped inspection and guarded zombie deletion, leaves known-room lifecycle ownership untouched, and contains provider races and failures as safe no-ops or bounded observations. No complexity exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/005-room-reconciliation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/room-reconciliation-contract.md
└── tasks.md                         # Created by $speckit-tasks
```

### Source Code (repository root)

```text
src/
├── application/{manage-temporary-room.ts,reconcile-temporary-rooms.ts}
├── composition/root.ts
├── config/load-config.ts
├── domain/voice-state.ts
├── infrastructure/discord/{discord-client-factory.ts,discord-gateway-event-source.ts,simulated-client-factory.ts}
├── infrastructure/logging/observability.ts
├── main.ts
└── ports/index.ts

tests/
├── e2e/worker-voice-state.test.ts
├── integration/{configuration-startup.test.ts,documentation.test.ts,gateway-lifecycle.test.ts}
├── unit/{discord-client-factory.test.ts,manage-temporary-room.test.ts,reconcile-temporary-rooms.test.ts}
└── support/{gateway-simulator/index.ts,manual-scheduler.ts}

.env.example
README.md
docs/{architecture.md,local-discord-development.md,testing.md}
```

**Structure Decision**: Keep the single worker. A dedicated application reconciliation policy collaborates with a read-only known-managed-room query from the existing manager. Ports expose only category-scoped candidate IDs and guarded deletion; production and simulation adapters implement them; the gateway event source owns ready-time initiation and cancellation of periodic work.

## Implementation Approach

1. Extend each server mapping with `reconciliationIntervalMinutes` (default 15, integer 1–1,440) and `permanentChannelIds` (default empty, non-empty channel IDs). Treat `triggerChannelId` as permanently excluded regardless of category placement; reject malformed values with the existing generic configuration error.
2. Add category-scoped voice-channel enumeration and `deleteEmptyRoom` outcomes (`deleted`, `occupied`, `missing`, `failed`) to the Discord boundary. The adapter lists only voice channels whose parent is the configured category and rechecks occupancy immediately before a cleanup delete.
3. Add an application reconciler that receives a configuration map, Discord boundary, scheduler, read-only managed-room predicate, and bounded observer. It classifies candidate IDs in this order: permanent; known managed; zombie. It rechecks classification and current state inside its per-candidate serialization before deletion, never invokes lifecycle cleanup for zombies, and contains individual failures.
4. Start an immediate scan only on a transition into ready, maintain one recurrence per server, schedule the next run only after the prior run settles, coalesce duplicate ready/periodic requests, and cancel all recurrence work on disconnect/stop. This keeps scans repeatable without `setInterval` overlap.
5. Extend the simulator and process IPC with deterministic pre-ready category seeding, occupancy changes, failure/race controls, and explicit ready control while preserving the default automatic-ready path. Expose only bounded reconciliation counters/outcomes to E2E assertions.
6. Add all required unit, integration, production-adapter, configuration, documentation, and simulated E2E coverage. Update documentation and architecture, then prove the feature through `pnpm check`.

## Complexity Tracking

No constitution violations or complexity exceptions require justification.
