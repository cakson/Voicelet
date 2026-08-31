---

description: "Dependency-ordered implementation tasks for temporary voice room creation"
---

# Tasks: Temporary Voice Room Creation

**Input**: Design documents from `specs/002-temporary-voice-rooms/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [temporary-room port contract](./contracts/temporary-room-port.md),
and [quickstart.md](./quickstart.md)

**Tests**: Unit, integration, and end-to-end tests are required by FR-013 and the constitution.
Write each story's tests before its corresponding implementation tasks.

**Organization**: Tasks are grouped by user story so each increment has a clear independent
validation path.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its stated dependencies are complete.
- **[Story]**: Identifies the user story served by that task.
- Every task includes its exact target path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared test data and configuration examples for the feature.

- [ ] T001 [P] Extend synthetic voice-transition fixtures for configured, unconfigured, bot, join, move, and duplicate events in `tests/support/fixtures/voice-state.ts`
- [ ] T002 [P] Add a safe multi-server `TEMPORARY_ROOM_CONFIG` example and comments to `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish validated multi-server configuration, normalized transition data, provider
ports, simulator support, and privacy-safe observations required by all stories.

**⚠️ CRITICAL**: Complete this phase before starting user-story implementation.

- [ ] T003 [P] Add configuration integration coverage for valid multi-server mappings, malformed entries, and empty mappings in `tests/integration/configuration-startup.test.ts`
- [ ] T004 [P] Add normalization unit coverage for previous/current channel transitions, bot state, and display-name validation in `tests/unit/normalize-voice-state.test.ts`
- [ ] T005 [P] Extend `RawVoiceState`, normalized transition, temporary-room gateway, and safe operation-outcome contracts in `src/ports/index.ts` and `src/domain/voice-state.ts`
- [ ] T006 Implement validated `TEMPORARY_ROOM_CONFIG` parsing and per-server lookup in `src/config/load-config.ts`
- [ ] T007 Implement transition normalization that rejects malformed enriched voice-state input in `src/domain/normalize-voice-state.ts`
- [ ] T008 Extend bounded room-operation counters and privacy-safe observation methods in `src/infrastructure/logging/observability.ts`
- [ ] T009 Extend deterministic room existence, create, move, failure controls, and inspection support in `src/infrastructure/discord/simulated-client-factory.ts`

**Checkpoint**: Configuration, ports, normalized transitions, simulator behavior, and bounded
observability are ready for independently testable user stories.

---

## Phase 3: User Story 1 - Create a Personal Voice Room (Priority: P1) 🎯 MVP

**Goal**: An eligible non-bot entry into a configured server's trigger creates a predictably named
voice room in that server's destination category and moves the member there.

**Independent Test**: Configure one simulated server, emit an eligible member transition into its
trigger, and observe one room in that server's category and the member's placement within 5 seconds.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add unit coverage for configured-trigger eligibility, bot/unrelated-event rejection, and deterministic safe room naming in `tests/unit/manage-temporary-room.test.ts`
- [ ] T011 [P] [US1] Add integration coverage for simulated room creation and member movement in `tests/integration/gateway-lifecycle.test.ts`
- [ ] T012 [P] [US1] Add process-level simulated primary-flow coverage and safe outcome metrics in `tests/e2e/worker-voice-state.test.ts`

### Implementation for User Story 1

- [ ] T013 [US1] Implement configured-server eligibility, safe name derivation, creation, and move orchestration in `src/application/manage-temporary-room.ts`
- [ ] T014 [US1] Implement Discord room existence, voice-channel creation, and member movement behind the temporary-room gateway in `src/infrastructure/discord/discord-client-factory.ts`
- [ ] T015 [US1] Wire enriched voice transitions, temporary-room orchestration, and per-server configuration in `src/infrastructure/discord/discord-gateway-event-source.ts` and `src/composition/root.ts`
- [ ] T016 [US1] Extend simulated-worker IPC to drive and inspect the primary temporary-room flow in `src/main.ts`

**Checkpoint**: A configured server's eligible member receives one named room and is moved there;
bots and unrelated transitions create no rooms.

---

## Phase 4: User Story 2 - Reuse an Existing Personal Room (Priority: P2)

**Goal**: A member reuses their existing room and safely replaces a stale association instead of
accumulating duplicate rooms.

**Independent Test**: Seed or create an associated room, re-enter the trigger to observe reuse, then
make that room unavailable and observe exactly one replacement room on a later qualifying entry.

### Tests for User Story 2

- [ ] T017 [P] [US2] Add unit coverage for association reuse, stale-room replacement, and retained association after movement failure in `tests/unit/manage-temporary-room.test.ts`
- [ ] T018 [P] [US2] Add integration coverage for simulated existing-room reuse and stale-room replacement in `tests/integration/gateway-lifecycle.test.ts`
- [ ] T019 [P] [US2] Add E2E coverage for reuse and safe retry of a room whose prior movement failed in `tests/e2e/worker-voice-state.test.ts`

### Implementation for User Story 2

- [ ] T020 [US2] Add in-memory association lookup, stale removal, reuse, replacement, and movement-failure retention behavior in `src/application/manage-temporary-room.ts`
- [ ] T021 [US2] Translate room lookup outcomes and reuse/retry observations in `src/infrastructure/discord/discord-gateway-event-source.ts` and `src/infrastructure/logging/observability.ts`

**Checkpoint**: Re-entering a trigger reuses an existing room; missing rooms are replaced once; a
movement failure leaves the created room eligible for later reuse.

---

## Phase 5: User Story 3 - Remain Reliable During Overlapping Events (Priority: P3)

**Goal**: Same-member overlaps never create multiple rooms, different members proceed independently,
and Discord-operation failures remain privacy-safe while worker readiness is preserved.

**Independent Test**: Simulate 100 duplicate/concurrent trigger deliveries for one member, at least
10 concurrent members, and create/move failures; assert room limits, independent placements, safe
metrics, and readiness for a subsequent event.

### Tests for User Story 3

- [ ] T022 [P] [US3] Add unit coverage for 100 duplicate or concurrent same-member trigger trials, per-guild/member serialization, lock release after every outcome, and independent-key concurrency in `tests/unit/manage-temporary-room.test.ts`
- [ ] T023 [P] [US3] Add integration coverage for duplicate same-member events, at least 10 concurrent members, create failure, move failure, unconfigured-server ignore behavior, and reconnect lifecycle preservation in `tests/integration/gateway-lifecycle.test.ts`
- [ ] T024 [P] [US3] Add E2E coverage for startup, bounded shutdown, bounded safe room-operation metrics, readiness after simulated failure followed by a valid event, and the five-second assignment bound in `tests/e2e/worker-voice-state.test.ts`

### Implementation for User Story 3

- [ ] T025 [US3] Add keyed asynchronous serialization and guaranteed release around association, create, and move operations in `src/application/manage-temporary-room.ts`
- [ ] T026 [US3] Convert Discord lookup, create, and move exceptions into bounded safe outcomes in `src/infrastructure/discord/discord-client-factory.ts` and `src/infrastructure/discord/discord-gateway-event-source.ts`
- [ ] T027 [US3] Add safe create, reuse, stale, creation-failure, and movement-failure metrics and log events without Discord identifiers in `src/infrastructure/logging/observability.ts`
- [ ] T028 [US3] Support concurrent dispatch and deterministic failure injection for the worker's simulated IPC protocol in `src/main.ts` and `src/infrastructure/discord/simulated-client-factory.ts`

**Checkpoint**: Duplicate same-member events cannot create more than one room; independent members
proceed concurrently; failures do not crash the worker or expose sensitive Discord data.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Document operational setup and perform final cross-story validation.

- [ ] T029 [P] Document multi-server room configuration, required permissions, and safe defaults in `README.md`
- [ ] T030 [P] Document temporary-room application ownership, in-memory lifecycle, ports, and dependency direction in `docs/architecture.md`
- [ ] T031 [P] Document unit, integration, E2E simulator scenarios and required quality gates in `docs/testing.md`
- [ ] T032 Reconcile the environment example and configuration documentation against the feature contract in `.env.example` and `README.md`
- [ ] T033 Run the complete documented validation and quickstart journey, recording any discrepancy in `specs/002-temporary-voice-rooms/quickstart.md`
- [ ] T034 Run `pnpm check` from the repository root and resolve any feature-related failure in the affected source, test, or documentation file

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately; its fixture and example work informs Phase 2.
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all user-story implementation.
- **Phase 3 (US1)**: Depends on Phase 2 and delivers the MVP create-and-move journey.
- **Phase 4 (US2)**: Depends on the US1 room-orchestration surface because reuse operates on its
  created association.
- **Phase 5 (US3)**: Depends on US1 and US2 behavior so it can serialize their full lifecycle and
  safely classify all outcomes.
- **Phase 6 (Polish)**: Depends on the selected user-story phases and completes documentation and
  quality validation.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; no dependency on later stories.
- **US2 (P2)**: Builds on US1's association and room-management behavior; it remains independently
  testable using an existing simulated association.
- **US3 (P3)**: Builds on US1 and US2 because it enforces concurrency and failure safety across the
  same full flow.

### Parallel Opportunities

- T001 and T002 can run in parallel.
- T003–T005 can run in parallel after Phase 1; T006–T009 then complete the shared foundation.
- T010–T012, T017–T019, and T022–T024 can each be authored in parallel within their story phases.
- T029–T031 can run in parallel after feature behavior stabilizes.

## Parallel Example: User Story 1

```text
T010: tests/unit/manage-temporary-room.test.ts
T011: tests/integration/gateway-lifecycle.test.ts
T012: tests/e2e/worker-voice-state.test.ts
```

These tasks have distinct files and may proceed in parallel after Phase 2. T013–T016 then complete
the feature flow that makes them pass.

## Implementation Strategy

### MVP First

1. Complete Phases 1 and 2.
2. Complete US1 tests and T013–T016.
3. Run the US1 independent simulated journey before adding reuse or concurrency behavior.

### Incremental Delivery

1. Add US2 reuse and stale replacement after the MVP exists.
2. Add US3 keyed concurrency, safe failure handling, and readiness evidence over that full flow.
3. Complete documentation and run the repository's CI-equivalent validation in Phase 6.
