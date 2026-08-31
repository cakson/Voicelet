# Implementation Plan: Temporary Room Lifecycle

**Branch**: `004-temporary-room-lifecycle` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-temporary-room-lifecycle/spec.md`

## Summary

Extend the in-memory temporary-room manager to track occupancy and delete managed rooms only after continuous emptiness. Each server mapping gains optional whole-minute `inactivityTimeoutMinutes`, defaulting to 60 and constrained to 1–1,440. The application layer owns associations, lifecycle generations, and room locks; explicit room-state, deletion, external-deletion, and scheduling ports make Discord failures safe and timing deterministic. Failed deletions retain state and retry every 15 minutes only while empty.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 24

**Primary Dependencies**: discord.js 14.22, Fastify 5, Pino 9, prom-client 15, Zod 4

**Storage**: No persistent storage. Associations, lifecycle records, locks, and scheduled work exist only in process memory and are discarded on shutdown/restart.

**Testing**: Vitest 3 unit, integration, and process E2E suites; deterministic simulated Discord client; injected manual clock and scheduler for lifecycle tests.

**Target Platform**: Node.js background worker connected to Discord Gateway.

**Project Type**: Single background-worker service with local operational HTTP endpoints.

**Performance Goals**: One effective scheduled operation per managed room state; no intentional deletion of an occupied room; failed deletion retry no sooner than 15 minutes.

**Constraints**: Preserve `domain ← application/ports ← infrastructure/composition`; no state persistence; no deletion of unmanaged channels; validate mapping timeout as integer 1–1,440; never log tokens, raw Discord payloads/provider errors, or identifying room/member data.

**Scale/Scope**: Multiple configured server mappings and one active room per creator during process lifetime; no restart reconciliation or offline recovery.

## Constitution Check

### Pre-design Gate

- **I. Testability — PASS**: Unit tests use a manual scheduler; integration tests use the simulated Discord boundary; child-process E2E proves create/cancel/reset/delete/recreate.
- **II. Enforced Quality Gates — PASS**: Tasks require focused suites and `pnpm check`.
- **III. Explicit Architecture — PASS**: Lifecycle policy remains in application code, with Discord calls and timers accessed through ports.
- **IV. Documentation as Deliverable — PASS**: README, safe example, local guide, test guide, and architecture documentation will be updated.
- **V. Explicit API Contracts — PASS**: Configuration and room/scheduling semantics are specified in [temporary-room-lifecycle-contract.md](./contracts/temporary-room-lifecycle-contract.md).
- **VI. Security by Default — PASS**: Configuration failures and lifecycle observations are redaction-safe and bounded.
- **VII. Actionable Observability — PASS**: Lifecycle start, cancellation, success, retry, failure, and external deletion are observable through bounded outcomes.
- **VIII. Reproducible Repository — PASS**: Existing simulator, test commands, lockfile, and CI gate are sufficient; no new dependency is planned.
- **IX. Definition of Done — PASS**: Tasks include required tests, docs, and quality validation.

### Post-design Gate

**PASS** — The design adds narrow ports for authoritative room state and controllable scheduling. It preserves dependency direction, treats unavailable Discord state as non-destructive, and makes required timing/race tests reproducible. No complexity exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/004-temporary-room-lifecycle/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/temporary-room-lifecycle-contract.md
└── tasks.md                 # Created by $speckit-tasks
```

### Source Code (repository root)

```text
src/
├── application/manage-temporary-room.ts
├── composition/root.ts
├── config/load-config.ts
├── domain/voice-state.ts
├── infrastructure/discord/{discord-client-factory.ts,discord-gateway-event-source.ts,simulated-client-factory.ts}
├── infrastructure/logging/observability.ts
├── ports/index.ts
└── main.ts

tests/{unit/manage-temporary-room.test.ts,integration/{configuration-startup.test.ts,documentation.test.ts,gateway-lifecycle.test.ts},e2e/worker-voice-state.test.ts}
.env.example
README.md
docs/{architecture.md,local-discord-development.md,testing.md}
```

**Structure Decision**: Keep the existing worker. Lifecycle policy belongs in the application manager, configuration parsing stays in `src/config`, abstract boundaries in `src/ports`, and Discord/system-time details in infrastructure/composition.

## Implementation Approach

1. Add optional per-mapping `inactivityTimeoutMinutes`, defaulting missing values to 60 and rejecting invalid values without exposing configuration contents.
2. Replace boolean room-existence assumptions with explicit current state (`empty`, `occupied`, `missing`, or `unavailable`) and deletion results. Never infer absence from move failure.
3. Add a cancellable scheduler port. Composition supplies system scheduling; unit, integration, and E2E simulation use manual time advancement.
4. Maintain creator-to-room and room-to-creator indexes plus per-room lifecycle generations and locks. Empty starts one expiry; occupancy invalidates it; callbacks re-read room state under lock.
5. On successful/missing deletion, clear both indexes and scheduled work. On failed deletion, keep state, record a bounded failure, and schedule a 15-minute retry after another empty-state check.
6. Forward channel-deletion notification to association cleanup and retain creation-path state lookup as fallback for missed/delayed external-deletion notification.
7. Extend the simulator and IPC with deterministic occupancy, external deletion/failure, and time controls; add only bounded metrics for E2E evidence.
8. Update configuration, documentation, architecture, and all required automated coverage.

## Complexity Tracking

No constitution violations or complexity exceptions require justification.
