---

description: "Dependency-ordered implementation tasks for temporary room lifecycle"
---

# Tasks: Temporary Room Lifecycle

**Input**: Design documents from `specs/004-temporary-room-lifecycle/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [temporary room lifecycle contract](./contracts/temporary-room-lifecycle-contract.md), and [quickstart.md](./quickstart.md)

**Tests**: Unit, integration, and deterministic simulated E2E coverage are required by the feature specification and constitution. Tests must be written before their related lifecycle behavior and must not use real Discord credentials or wall-clock inactivity waits.

**Organization**: Tasks are grouped by user story so each deliverable can be reviewed and validated independently after the shared lifecycle foundation is ready.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its stated dependencies are complete.
- **[Story]**: Identifies the user story served by that task.
- Every task includes its exact target path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish deterministic test support and acceptance contracts before lifecycle behavior changes.

- [X] T001 [P] Add a reusable manual clock and cancellable scheduler test helper in `tests/support/manual-scheduler.ts`.
- [X] T002 [P] Add failing timeout default, boundary, and redaction-safe invalid-configuration assertions in `tests/integration/configuration-startup.test.ts`.
- [X] T003 [P] Add failing lifecycle documentation-contract assertions in `tests/integration/documentation.test.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the safe configuration, application ports, provider adapters, simulated state, and composition wiring on which every lifecycle story relies.

**⚠️ CRITICAL**: Complete this phase before implementing any user-story behavior.

- [X] T004 Extend `TemporaryRoomConfig` with the per-mapping inactivity timeout in `src/domain/voice-state.ts`.
- [X] T005 Parse the optional `inactivityTimeoutMinutes` field with default 60 and strict integer 1–1,440 validation in `src/config/load-config.ts`.
- [X] T006 Define cancellable scheduling, current room-state, delete-result, and room-deletion-notification contracts in `src/ports/index.ts`.
- [X] T007 Adapt live Discord room-state lookup, room deletion, and external voice-channel deletion notification in `src/infrastructure/discord/discord-client-factory.ts`.
- [X] T008 Model room membership, room state/deletion results, external deletion, deletion failures, and safe test controls in `src/infrastructure/discord/simulated-client-factory.ts`.
- [X] T009 Wire the system scheduler and external-deletion callback through `src/infrastructure/discord/discord-gateway-event-source.ts` and `src/composition/root.ts`.
- [X] T010 Extend bounded lifecycle observation outcome types, metrics, and privacy-safe logging in `src/ports/index.ts` and `src/infrastructure/logging/observability.ts`.
- [X] T011 Extend simulated-worker IPC to control room occupancy, external deletion/deletion failure, and manual time advancement in `src/main.ts`.

**Checkpoint**: Configuration, ports, adapters, simulator, and observability support deterministic lifecycle work without changing the one-room rule.

---

## Phase 3: User Story 1 - Remove Continuously Empty Temporary Rooms (Priority: P1) 🎯 MVP

**Goal**: Delete a recognized temporary room only after it has remained continuously empty for its configured period, clean up the creator association, and allow a later room creation.

**Independent Test**: In the simulator, create a room, make it empty, advance controlled time through the configured timeout, and observe deletion, association cleanup, and successful recreation by the creator.

### Tests for User Story 1

- [X] T012 [P] [US1] Add failing unit scenarios for inactivity start, single scheduling under duplicate empty reports, expiry, association cleanup, and recreation in `tests/unit/manage-temporary-room.test.ts`.
- [X] T013 [P] [US1] Add failing integration scenarios for configured timeout deletion and bounded deletion observations in `tests/integration/gateway-lifecycle.test.ts`.
- [X] T014 [P] [US1] Add the deterministic create-empty-expire-delete-cleanup-recreate process scenario in `tests/e2e/worker-voice-state.test.ts`.

### Implementation for User Story 1

- [X] T015 [US1] Implement managed-room reverse associations, per-room locks, inactivity records, expiry scheduling, final empty-state checks, successful deletion, and association cleanup in `src/application/manage-temporary-room.ts`.
- [X] T016 [US1] Connect normalized managed-room activity to the lifecycle manager and cancel outstanding work during worker shutdown in `src/infrastructure/discord/discord-gateway-event-source.ts`.
- [X] T017 [US1] Make the User Story 1 unit, integration, and E2E lifecycle tests pass in `tests/unit/manage-temporary-room.test.ts`, `tests/integration/gateway-lifecycle.test.ts`, and `tests/e2e/worker-voice-state.test.ts`.

**Checkpoint**: A recognized empty temporary room is removed only after its own full timeout, and its creator can receive one new room afterward.

---

## Phase 4: User Story 2 - Safely Handle Room Activity and Deletion Failures (Priority: P2)

**Goal**: Protect occupied rooms from delayed/duplicate events and expiry races while safely observing failed deletion and retrying every 15 minutes only while empty.

**Independent Test**: With controlled scheduling, exercise a rejoin before expiry, another empty period, duplicate reports, an expiry-boundary join, and a failed deletion retry without intentionally deleting an occupied room.

### Tests for User Story 2

- [X] T018 [P] [US2] Add failing unit scenarios for cancellation, reset without carried time, stale callback generations, concurrent join/expiry serialization, and 15-minute retry cancellation in `tests/unit/manage-temporary-room.test.ts`.
- [X] T019 [P] [US2] Add failing integration scenarios for final occupancy guard, failed deletion retention/retry, privacy-safe lifecycle outcomes, and exclusion of trigger, destination-category, unmanaged, and unrelated channels from deletion in `tests/integration/gateway-lifecycle.test.ts`.
- [X] T020 [P] [US2] Extend the process E2E scenario with rejoin-before-expiry, fresh-period reset, deletion failure/retry, and no real-time waiting in `tests/e2e/worker-voice-state.test.ts`.

### Implementation for User Story 2

- [X] T021 [US2] Implement lifecycle invalidation generations, final occupancy guards, contained deletion failures, and 15-minute empty-only retry scheduling in `src/application/manage-temporary-room.ts`.
- [X] T022 [US2] Make the User Story 2 unit, integration, and E2E resilience tests pass in `tests/unit/manage-temporary-room.test.ts`, `tests/integration/gateway-lifecycle.test.ts`, and `tests/e2e/worker-voice-state.test.ts`.

**Checkpoint**: A join invalidates the former inactivity period, duplicate/delayed reports do not duplicate work, and failed deletion remains safe and observable.

---

## Phase 5: User Story 3 - Recover from Externally Deleted Rooms (Priority: P3)

**Goal**: Remove stale room associations promptly or on the next creator request without treating a failed move as missing-room evidence.

**Independent Test**: Externally remove a managed simulated room, demonstrate association cleanup and replacement creation, then demonstrate a failed move to a still-existing room does not create a duplicate.

### Tests for User Story 3

- [X] T023 [P] [US3] Add failing unit scenarios for external-deletion cleanup, missing-room fallback during creator trigger, unavailable room-state preservation without replacement or deletion, and failed-move retention in `tests/unit/manage-temporary-room.test.ts`.
- [X] T024 [P] [US3] Add failing integration scenarios for external deletion notification, delayed/missing notification fallback, unavailable room-state preservation, and association-safe move failure in `tests/integration/gateway-lifecycle.test.ts`.

### Implementation for User Story 3

- [X] T025 [US3] Implement external-deletion cleanup and explicit missing-versus-unavailable stale-association recovery in `src/application/manage-temporary-room.ts`.
- [X] T026 [US3] Make the User Story 3 unit and integration stale-state tests pass in `tests/unit/manage-temporary-room.test.ts` and `tests/integration/gateway-lifecycle.test.ts`.

**Checkpoint**: External deletion cannot permanently block a creator, while an otherwise valid association survives a failed move or unavailable room lookup.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Document the configuration and lifecycle behavior, reconcile the architecture surface, and record final quality evidence.

- [X] T027 [P] Document the per-mapping timeout, default, whole-minute range, safe local test value, and lifecycle smoke test in `.env.example`, `README.md`, and `docs/local-discord-development.md`.
- [X] T028 [P] Document lifecycle test coverage, deterministic simulated time, privacy-safe observability, and architecture boundaries in `docs/testing.md` and `docs/architecture.md`.
- [X] T029 Reconcile all lifecycle documentation-contract assertions in `tests/integration/documentation.test.ts`.
- [X] T030 Run the quickstart lifecycle validation scenarios and record credential-free evidence in `specs/004-temporary-room-lifecycle/quickstart.md`.
- [X] T031 Run `pnpm check` and resolve any feature-related validation failures from `package.json`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately; establishes failing contracts and deterministic test tools.
- **Foundational (Phase 2)**: Depends on T001–T003 and blocks all lifecycle stories.
- **US1 (Phase 3)**: Depends on the foundation and provides the MVP continuous-empty deletion path.
- **US2 (Phase 4)**: Depends on US1's lifecycle record and extends it with cancellation, races, and retry behavior.
- **US3 (Phase 5)**: Depends on the foundation and association indexes; it may be implemented after US1 to preserve end-to-end creation behavior.
- **Polish (Phase 6)**: Depends on all stories; T031 is the final quality gate.

### User Story Dependencies

- **US1 (P1)**: Requires T004–T011; no dependency on later stories.
- **US2 (P2)**: Requires US1 lifecycle scheduling and deletion behavior.
- **US3 (P3)**: Requires association indexes and explicit room-state outcomes; it does not require retry behavior but follows US1 in delivery order.

### Parallel Opportunities

- T001–T003 can start in parallel because they modify separate test files.
- After the port contract is stable, T007 and T008 can proceed in parallel on separate adapters; T010 can proceed alongside them.
- Within each story, its listed test tasks can be drafted in parallel before its implementation task.
- T027 and T028 can proceed in parallel after behavior is stable; T029 follows their documentation changes.

## Parallel Example: User Story 1

```text
T012: tests/unit/manage-temporary-room.test.ts
T013: tests/integration/gateway-lifecycle.test.ts
T014: tests/e2e/worker-voice-state.test.ts
```

Each test task targets a distinct file and can proceed in parallel. T015–T017 then integrate the shared implementation and prove the full story.

## Implementation Strategy

### MVP First

1. Complete T001–T011.
2. Complete T012–T017 and run the User Story 1 independent test.
3. Review the deterministic deletion, cleanup, and recreation evidence before adding resilience behavior.

### Incremental Delivery

1. Add US1 for continuous-empty lifecycle deletion.
2. Add US2 for cancellation, concurrency safety, and retry recovery.
3. Add US3 for external deletion and stale-state recovery.
4. Complete documentation, quickstart, and `pnpm check`.

## Notes

- All 31 tasks use the required checkbox, sequential ID, optional parallel marker, story label where applicable, and exact path format.
- Tests are mandatory because the specification explicitly requires unit, integration, and E2E coverage.
- No task authorizes state persistence, restart recovery, raw Discord logging, production credentials, or unrelated channel deletion.
