---

description: "Dependency-ordered implementation tasks for room reconciliation and zombie cleanup"
---

# Tasks: Room Reconciliation & Zombie Cleanup

**Input**: Design documents from `specs/005-room-reconciliation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [room reconciliation contract](./contracts/room-reconciliation-contract.md), and [quickstart.md](./quickstart.md)

**Tests**: Unit, integration, production-adapter, deterministic simulated E2E, and documentation-contract coverage are mandatory under the feature specification and constitution. Test tasks precede their behavior and must not wait for real reconciliation intervals.

**Organization**: Tasks are grouped by user story so each increment has a clear independent acceptance demonstration after the shared reconciliation foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after stated dependencies are met and target files do not overlap.
- **[Story]**: Identifies the user story served by the task.
- Every task includes exact target paths.

## Phase 1: Setup (Shared Contracts and Test Scaffolding)

**Purpose**: Establish failing acceptance contracts and deterministic fixtures before changing room behavior.

- [X] T001 [P] Add reconciliation interval default/range, permanent-exclusion normalization, and redaction-safe invalid-mapping assertions in `tests/integration/configuration-startup.test.ts`.
- [X] T002 [P] Add requirements-quality documentation contract assertions for dedicated-category guidance, permanent exclusions, restart behavior, zombie definitions, and reconciliation smoke testing in `tests/integration/documentation.test.ts`.
- [X] T003 [P] Add category-enumeration and guarded-empty-deletion adapter contract assertions in `tests/unit/discord-client-factory.test.ts`.
- [X] T004 [P] Add reusable simulated category-room seeding, occupancy, inspection-failure, and ready-control helpers in `tests/support/gateway-simulator/index.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define safe configuration, boundaries, adapter support, controlled simulation, and observability required by all reconciliation stories.

**⚠️ CRITICAL**: Complete this phase before implementing a user-story reconciliation behavior.

- [X] T005 Extend `TemporaryRoomConfig` with `reconciliationIntervalMinutes` and normalized `permanentChannelIds` in `src/domain/voice-state.ts`.
- [X] T006 Parse the optional 15-minute reconciliation interval and permanent channel exclusions with strict generic-error validation in `src/config/load-config.ts`.
- [X] T007 Define category-scoped voice-room enumeration, guarded empty-room deletion outcomes, and bounded reconciliation observation types in `src/ports/index.ts`.
- [X] T008 [P] Implement category-only voice enumeration and occupancy-rechecked cleanup deletion in `src/infrastructure/discord/discord-client-factory.ts`.
- [X] T009 [P] Implement category enumeration, guarded deletion outcomes, controlled failure/race seams, and optional explicit readiness in `src/infrastructure/discord/simulated-client-factory.ts`.
- [X] T010 [P] Add privacy-safe reconciliation metric/log outcome recording with no Discord identifiers or raw provider data in `src/infrastructure/logging/observability.ts`.
- [X] T011 Extend simulated-worker IPC for pre-ready room seeding, controlled occupancy, reconciliation invocation/time advancement, and bounded assertions in `src/main.ts`.
- [X] T012 Add the read-only managed-room membership query and candidate-safe serialization seam without changing existing lifecycle semantics in `src/application/manage-temporary-room.ts`.

**Checkpoint**: Configuration, ports, adapters, simulator, observability, and read-only lifecycle access support deterministic reconciliation without scanning or deleting any channel yet.

---

## Phase 3: User Story 1 - Remove Empty Untracked Rooms (Priority: P1) 🎯 MVP

**Goal**: On readiness, safely identify an empty untracked category voice channel as a zombie and remove it immediately, while leaving known managed rooms under their ordinary inactivity lifecycle.

**Independent Test**: Seed an empty untracked category room and a known managed room, reach ready, and demonstrate immediate zombie removal with no association or known-room inactivity change.

### Tests for User Story 1

- [X] T013 [P] [US1] Add failing unit classification and empty-zombie cleanup/no-association/lifecycle-isolation scenarios in `tests/unit/reconcile-temporary-rooms.test.ts`.
- [X] T014 [P] [US1] Add failing startup integration scenarios for empty zombie deletion, known managed-room preservation, and category-only scope in `tests/integration/gateway-lifecycle.test.ts`.
- [X] T015 [P] [US1] Add the failing pre-seeded startup empty-zombie and known-room lifecycle process scenario in `tests/e2e/worker-voice-state.test.ts`.

### Implementation for User Story 1

- [X] T016 [US1] Implement category candidate classification, candidate rechecks, immediate guarded empty-zombie cleanup, and no transient-association mutation in `src/application/reconcile-temporary-rooms.ts`.
- [X] T017 [US1] Wire one immediate post-ready scan and known-room predicate into `src/infrastructure/discord/discord-gateway-event-source.ts`.
- [X] T018 [US1] Make User Story 1 unit, integration, and E2E scenarios pass in `tests/unit/reconcile-temporary-rooms.test.ts`, `tests/integration/gateway-lifecycle.test.ts`, and `tests/e2e/worker-voice-state.test.ts`.

**Checkpoint**: With no persisted state after restart, an empty untracked room in the dedicated category is removed at startup while a tracked room remains governed solely by its inactivity timeout.

---

## Phase 4: User Story 2 - Preserve Active and Permanent Rooms (Priority: P1)

**Goal**: Protect trigger/permanent channels and occupied zombies, then delete an occupied zombie only when a later reconciliation finds it empty.

**Independent Test**: Reconcile a category containing a trigger, configured permanent voice channel, occupied zombie, empty zombie, and known managed room; later empty the occupied zombie and prove the next scan removes only that zombie.

### Tests for User Story 2

- [X] T019 [P] [US2] Add failing unit cases for effective permanent exclusions, occupied/missing/unavailable zombie outcomes, and reclassification before deletion in `tests/unit/reconcile-temporary-rooms.test.ts`.
- [X] T020 [P] [US2] Add failing integration cases for trigger/permanent preservation, no deletion outside the category or of the category, occupied-to-empty cleanup, and join/delete races in `tests/integration/gateway-lifecycle.test.ts`.
- [X] T021 [P] [US2] Extend the simulated process E2E with configured permanent preservation, occupied zombie preservation, later-empty deletion, and out-of-category preservation in `tests/e2e/worker-voice-state.test.ts`.

### Implementation for User Story 2

- [X] T022 [US2] Extend `src/application/reconcile-temporary-rooms.ts` to apply effective permanent exclusions, preserve occupied/unavailable candidates, and safely handle missing/reclassified/raced candidates.
- [X] T023 [US2] Make User Story 2 unit, integration, and E2E preservation/transition scenarios pass in `tests/unit/reconcile-temporary-rooms.test.ts`, `tests/integration/gateway-lifecycle.test.ts`, and `tests/e2e/worker-voice-state.test.ts`.

**Checkpoint**: Permanent and active rooms are never cleanup targets; an untracked occupied room remains untouched and is immediately removed only after a later scan observes it empty.

---

## Phase 5: User Story 3 - Reconcile Reliably Over Time (Priority: P2)

**Goal**: Repeat reconciliation at the configured per-server cadence without real-time waits, duplicate periodic work, or managed-state corruption.

**Independent Test**: Advance a manual scheduler through multiple configured intervals and duplicate ready/reconciliation requests, then demonstrate one effective scan at a time and no duplicate deletion side effects.

### Tests for User Story 3

- [X] T024 [P] [US3] Add failing unit cases for per-server recurrence, coalesced requests, next-scan-after-settlement scheduling, and disposal cancellation in `tests/unit/reconcile-temporary-rooms.test.ts`.
- [X] T025 [P] [US3] Add failing gateway integration cases for effective ready transitions, interval scheduling, duplicate-ready coalescing, and repeated idempotent scans in `tests/integration/gateway-lifecycle.test.ts`.
- [X] T026 [P] [US3] Add the simulated process E2E sequence that advances the configured interval without wall-clock waiting and proves no duplicate side effects in `tests/e2e/worker-voice-state.test.ts`.

### Implementation for User Story 3

- [X] T027 [US3] Implement one active scan and one recurrence per server, post-settlement rescheduling, ready-transition coalescing, and disposal cancellation in `src/application/reconcile-temporary-rooms.ts`.
- [X] T028 [US3] Connect ready/disconnect/stop lifecycle transitions to reconciliation start, pause, and disposal in `src/infrastructure/discord/discord-gateway-event-source.ts`.
- [X] T029 [US3] Make User Story 3 unit, integration, and E2E deterministic cadence/idempotency scenarios pass in `tests/unit/reconcile-temporary-rooms.test.ts`, `tests/integration/gateway-lifecycle.test.ts`, and `tests/e2e/worker-voice-state.test.ts`.

**Checkpoint**: Reconciliation starts after ready, repeats independently per server through controllable time, and cannot overlap into duplicate cleanup behavior.

---

## Phase 6: User Story 4 - Diagnose Safe Cleanup Failures (Priority: P3)

**Goal**: Contain individual category, inspection, and deletion failures while exposing bounded, privacy-safe operational evidence and continuing safely independent candidates.

**Independent Test**: Simulate one unavailable category/candidate or failed deletion alongside another eligible empty zombie and demonstrate worker availability, continued safe cleanup, and identifier-free observations.

### Tests for User Story 4

- [X] T030 [P] [US4] Add failing unit cases for per-candidate failure containment, bounded reconciliation outcomes, and no transient-state mutation after failure in `tests/unit/reconcile-temporary-rooms.test.ts`.
- [X] T031 [P] [US4] Add failing integration cases for category unavailability, inspection/deletion failure continuation, privacy-safe metrics/logging, and readiness retention in `tests/integration/gateway-lifecycle.test.ts`.
- [X] T032 [P] [US4] Add simulated process E2E failure-containment and bounded-observation assertions in `tests/e2e/worker-voice-state.test.ts`.

### Implementation for User Story 4

- [X] T033 [US4] Implement per-candidate failure containment and bounded reconciliation outcome emission in `src/application/reconcile-temporary-rooms.ts`.
- [X] T034 [US4] Make User Story 4 unit, integration, and E2E failure-resilience scenarios pass in `tests/unit/reconcile-temporary-rooms.test.ts`, `tests/integration/gateway-lifecycle.test.ts`, and `tests/e2e/worker-voice-state.test.ts`.

**Checkpoint**: A provider failure cannot crash the worker or broaden deletion scope, and safe independent cleanup remains observable without Discord data leakage.

---

## Phase 7: Polish and Cross-Cutting Concerns

**Purpose**: Publish the feature's operational contract, reconcile architecture/test documentation, and record final validation evidence.

- [X] T035 [P] Update safe mapping examples, interval documentation, permanent exclusions, dedicated category guidance, known-versus-zombie behavior, and restart semantics in `.env.example` and `README.md`.
- [X] T036 [P] Add the local reconciliation restart/empty/occupied zombie smoke procedure and configuration troubleshooting to `docs/local-discord-development.md`.
- [X] T037 [P] Document reconciliation ownership, category-scoped adapter boundaries, deterministic cadence testing, and privacy-safe observations in `docs/architecture.md` and `docs/testing.md`.
- [X] T038 Reconcile documentation-contract assertions in `tests/integration/documentation.test.ts`.
- [X] T039 Run every quickstart scenario and record credential-free evidence in `specs/005-room-reconciliation/quickstart.md`.
- [X] T040 Run `pnpm check` and resolve feature-related validation failures from `package.json`.

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately; defines acceptance expectations and simulation support.
- **Foundational (Phase 2)**: Depends on T001–T004 and blocks all user stories.
- **US1 (Phase 3)**: Depends on the completed foundation and delivers immediate empty-zombie cleanup without lifecycle interference.
- **US2 (Phase 4)**: Depends on US1's classifier/cleanup path and extends it with permanent and occupied preservation.
- **US3 (Phase 5)**: Depends on the foundation and US1 reconciliation initiation; follows US2 to reuse the complete candidate safety path.
- **US4 (Phase 6)**: Depends on the foundation and can be implemented after US1; it follows the recurring behavior to validate failures across the complete flow.
- **Polish (Phase 7)**: Depends on all user-story behavior; T040 is the final quality gate.

### User Story Dependencies

- **US1 (P1)**: Requires T005–T012; no dependency on later stories.
- **US2 (P1)**: Requires US1's initial classifier and guarded deletion behavior.
- **US3 (P2)**: Requires US1 ready-time scan; it uses US2's complete preservation classification for final cadence proof.
- **US4 (P3)**: Requires the foundation and reconciliation policy; it validates the completed behavior's safety under provider failures.

### Parallel Opportunities

- T001–T004 can run in parallel because they target separate test/support files.
- After port contracts stabilize, T008–T011 can proceed in parallel on distinct adapters, observability, and process-boundary files.
- Within every user story, its listed test tasks can be drafted in parallel before its implementation task.
- T035–T037 can proceed in parallel after behavior stabilizes; T038 then reconciles their document assertions.

## Parallel Example: User Story 1

```text
T013: tests/unit/reconcile-temporary-rooms.test.ts
T014: tests/integration/gateway-lifecycle.test.ts
T015: tests/e2e/worker-voice-state.test.ts
```

Each task targets a distinct test layer and can be completed in parallel before T016–T018 integrate the shared behavior.

## Implementation Strategy

### MVP First

1. Complete T001–T012 to establish safe configuration, boundaries, simulation, and observability.
2. Complete T013–T018 and demonstrate startup deletion of only an empty untracked room while known-room timing remains intact.
3. Review the MVP evidence before adding protection, recurring scheduling, and failure resilience.

### Incremental Delivery

1. Deliver empty zombie classification and cleanup (US1).
2. Add permanent and occupied-room preservation with later-empty cleanup (US2).
3. Add coalesced per-server recurrence and restart/ready safety (US3).
4. Add contained failure observability and continuation (US4).
5. Complete documentation, quickstart evidence, and `pnpm check`.

## Notes

- All 40 tasks use the required checkbox, sequential ID, optional parallel marker, story label where required, and exact paths.
- Tests are mandatory because the feature specification explicitly requires unit, integration, and deterministic simulated E2E coverage.
- No task authorizes persistence, ownership reconstruction, raw Discord logging, production credentials, or deletion outside a configured temporary-room category.

## Phase 8: Convergence

- [X] T041 Prevent an in-flight reconciliation scan from rescheduling after disconnect or pause, and add deterministic regression coverage in `src/application/reconcile-temporary-rooms.ts` and `tests/unit/reconcile-temporary-rooms.test.ts` per FR-001 and plan: Scheduling Contract (partial).
