# Implementation Plan: Temporary Voice Room Creation

**Branch**: `002-temporary-voice-rooms` | **Date**: 2026-08-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-temporary-voice-rooms/spec.md`

## Summary

Extend the existing Discord voice-state worker so an eligible member entering a configured trigger channel receives a named voice room in a configured category. Add a transient, per-member room association service that serializes operations for a single member, permits parallel work for different members, detects stale room associations, and records only privacy-safe outcomes. The Discord adapter and deterministic simulator will gain room-management operations; configuration, documentation, and all three testing layers will cover the new flow without altering established worker readiness or lifecycle behavior.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 24

**Primary Dependencies**: discord.js 14.22, Fastify 5, Pino 9, prom-client 15, Zod 4

**Storage**: No persistent storage. A validated configuration map holds each configured guild's trigger/category pair; a process-local association map holds the active temporary room per guild/member until stale, process shutdown, or restart.

**Testing**: Vitest 3 unit, integration, and process-level E2E suites using the injected simulated Discord client

**Target Platform**: Node.js background worker connected to Discord Gateway; local and CI simulated Gateway execution

**Project Type**: Single background-worker service

**Performance Goals**: Successful simulated trigger entries complete their create-or-reuse and move flow within 5 seconds; 10 simultaneous distinct members complete independently; 100 duplicate or concurrent same-member trials never create a second active room.

**Constraints**: Preserve `domain ← application/ports ← infrastructure/composition`; retain no raw Discord payloads, identifiers, names, errors, or tokens in logs or metric labels; require only the existing `GuildVoiceStates` intent; no persisted recovery, cleanup, permissions management, or commands.

**Scale/Scope**: One configured trigger and destination category per configured Discord server; an in-memory association and lock key is scoped by `(guildId, userId)`; unconfigured servers are ignored; this feature changes the event flow, configuration, simulator, tests, and developer documentation only.

## Constitution Check

### Pre-design Gate

- **I. Testability — PASS**: Unit tests will cover eligibility, room naming, stale handling, one-member serialization, and safe failures. Integration tests will exercise adapter and simulator behavior; E2E will drive a worker process through the primary and safe-failure flow.
- **II. Enforced Quality Gates — PASS**: The affected unit, integration, E2E, type, lint, format, build, and aggregate `pnpm check` gates are planned.
- **III. Explicit Architecture — PASS**: Business decisions and transient association state remain inside application/domain code behind ports. Discord.js, process IPC, and the simulator remain infrastructure. Dependency direction is unchanged.
- **IV. Documentation as Deliverable — PASS**: README, architecture, and testing documentation are planned updates.
- **V. Explicit API Contracts — PASS**: The internal room-management boundary and valid voice-entry transition are defined in [temporary-room-port.md](./contracts/temporary-room-port.md).
- **VI. Security by Default — PASS**: Config validation rejects missing identifiers without revealing values; observability records bounded outcome classes only; tests assert no sensitive details reach output.
- **VII. Actionable Observability — PASS**: Bounded create, reuse, stale, creation-failure, and movement-failure signals will be emitted without identifier labels or raw provider errors.
- **VIII. Reproducible Repository — PASS**: No new runtime dependency is anticipated; the existing lockfile and documented `pnpm check` workflow remain authoritative.
- **IX. Definition of Done — PASS**: Implementation tasks will include code, tests, docs, and all required verification.

### Post-design Gate

**PASS** — Phase 0 and Phase 1 preserve the same boundaries, explicitly define privacy-safe contracts and outcomes, and introduce no constitution exception or complexity tracking item.

## Project Structure

### Documentation (this feature)

```text
specs/002-temporary-voice-rooms/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── temporary-room-port.md
└── tasks.md                 # Created by $speckit-tasks
```

### Source Code (repository root)

```text
src/
├── application/
│   ├── handle-voice-state.ts
│   └── manage-temporary-room.ts
├── composition/root.ts
├── config/load-config.ts
├── domain/
│   ├── normalize-voice-state.ts
│   └── voice-state.ts
├── infrastructure/
│   ├── discord/
│   │   ├── discord-client-factory.ts
│   │   ├── discord-gateway-event-source.ts
│   │   └── simulated-client-factory.ts
│   └── logging/observability.ts
└── ports/index.ts

tests/
├── e2e/worker-voice-state.test.ts
├── integration/gateway-lifecycle.test.ts
├── support/
│   ├── fixtures/voice-state.ts
│   └── gateway-simulator/index.ts
└── unit/
    ├── handle-voice-state.test.ts
    └── manage-temporary-room.test.ts
```

**Structure Decision**: Keep the established single-worker layout. The application service owns the transient association map and per-member serialization; all Discord SDK calls remain hidden behind ports and implemented only in infrastructure.

## Implementation Approach

1. Enrich the validated voice-state boundary with previous and current channel IDs, a bot flag, and a display-name input. Treat an event as a trigger entry only when it transitions from a channel other than the configured trigger to that trigger; ignore bot and unrelated transitions.
2. Add a validated per-server trigger/category mapping to application configuration. Use a structured environment value whose keys are guild identifiers and whose values contain trigger-channel and destination-category identifiers; reject malformed configured entries generically, while allowing an empty mapping so unconfigured servers are safely ignored.
3. Add a `TemporaryRoomGateway` port that can determine whether an associated room exists, create a voice room in the configured category, and move a member. Its values are operation inputs and outputs only; it does not expose Discord SDK types or raw errors.
4. Implement a process-local `(guildId, userId)` association map and keyed promise/mutex in the application layer. The critical section covers existence check, stale removal, creation, association update, and movement. A newly created association is retained if movement fails so a later trigger reuses the room rather than creating another. Different keys never share a lock.
5. Generate the channel name as a deterministic safe form of the supplied display name plus the suffix `-room`; normalize unsupported characters, collapse separators, cap it at Discord's channel-name limit, and use `temporary-room` when the resulting base is empty. Do not log the source display name or generated name.
6. Implement the port in the discord.js adapter using a guild voice-channel creation operation and member voice-channel movement; convert all provider failures to the bounded operation results in the contract. The deterministic simulator gains equivalent state, failure controls, and inspection methods.
7. Extend privacy-safe observability with bounded counters/outcomes for room creation, reuse, stale association, creation failure, and movement failure. Keep gateway readiness transitions unchanged.
8. Extend unit, integration, and E2E tests, including events for multiple configured servers and ignored unconfigured-server events; update `.env.example`, README, architecture, and testing documentation. Run `pnpm check` as the final implementation gate.

## Complexity Tracking

No constitution violations or complexity exceptions require justification.
