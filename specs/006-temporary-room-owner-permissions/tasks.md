---
description: "Dependency-ordered implementation tasks for temporary room owner permissions"
---

# Tasks: Temporary Room Owner Permissions

**Input**: Design documents from `specs/006-temporary-room-owner-permissions/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contract](./contracts/temporary-room-owner-permissions-contract.md), and [quickstart.md](./quickstart.md)

**Tests**: Unit, production-adapter, integration, deterministic simulated E2E, and documentation contract coverage are mandatory under the specification and constitution.

**Organization**: Tasks are grouped by user story so each increment is independently testable after the shared Discord boundary is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after stated dependencies and when target files do not overlap.
- **[Story]**: Identifies the user story served by the task.
- Every task includes exact target paths.

## Phase 1: Setup and Governance Gate

**Purpose**: Record the security exception and reviewer-facing acceptance evidence before changing permission behavior.

- [X] T001 Obtain maintainer approval for the bot Administrator exception and record the approved owner, risk acceptance, remediation plan, and expiry in `specs/006-temporary-room-owner-permissions/plan.md`; provide the evidence to reviewers without changing `specs/006-temporary-room-owner-permissions/checklists/ownership-boundaries.md` markers.
- [ ] T002 [P] Add documentation-contract assertions for native owner scope, owner privilege exclusions, bot Administrator prerequisite, category restoration, and the two-owner smoke test in `tests/integration/documentation.test.ts`.
- [ ] T003 [P] Add reusable two-owner, room-parent-move, owner-allowance failure, and bounded-observation helpers in `tests/support/gateway-simulator/index.ts`.

---

## Phase 2: Foundational Discord Boundary (Blocking Prerequisites)

**Purpose**: Define typed safe outcomes, observability, production/simulated provider support, and test-only process controls required by every story.

**⚠️ CRITICAL**: Complete this phase before implementing any user-story behavior.

- [X] T004 Define owner-allowance and room-category-restoration result unions, parent-change listener, and bounded temporary-room observation names in `src/ports/index.ts`.
- [ ] T005 [P] Add failing production-adapter unit coverage for member-only permission overwrites, voice-room type/guild guards, parent restoration, bounded provider failures, and parent-change filtering in `tests/unit/discord-client-factory.test.ts`.
- [ ] T006 [P] Add privacy-safe owner-permission and category-restoration metric/log outcome support with identifier-free assertions in `src/infrastructure/logging/observability.ts` and `tests/integration/gateway-lifecycle.test.ts`.
- [X] T007 Implement member-only owner overwrite application, voice-room parent restoration, and filtered voice-channel parent-change events in `src/infrastructure/discord/discord-client-factory.ts`.
- [X] T008 Implement room-level owner allowance storage, native-capability query helpers, controlled allowance/restoration failures, parent moves, and parent-change notifications in `src/infrastructure/discord/simulated-client-factory.ts`.
- [X] T009 Extend bounded simulated-worker IPC controls and assertions for owner allowance failures, room moves, and owner-permission outcomes in `src/main.ts` and `tests/e2e/worker-voice-state.test.ts`.

**Checkpoint**: The port, production adapter, simulator, observability, and simulated process can represent only room-scoped owner allowances and category restoration without changing creation flow.

---

## Phase 3: User Story 1 - Manage an Assigned Temporary Room Natively (Priority: P1) 🎯 MVP

**Goal**: A newly created temporary room has exactly one owner-specific native management allowance on that room, while category/trigger/other rooms remain isolated and a moved tracked room is restored.

**Independent Test**: Create rooms for two members in the simulator and demonstrate their allowances are confined to their own rooms, with no capability on protected resources; move one room and confirm restoration without out-of-category reconciliation.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add failing unit policy cases for creator-to-owner association, exact owner allowance, two-owner isolation, prohibited privilege absence, and replacement-room isolation in `tests/unit/manage-temporary-room.test.ts`.
- [ ] T011 [US1] Add failing unit cases for moved tracked-room restoration, duplicate parent-event coalescing, deletion-wins restoration races, idempotent owner-allowance reapplication, and category-only reconciliation preservation in `tests/unit/manage-temporary-room.test.ts` and `tests/unit/reconcile-temporary-rooms.test.ts`.
- [ ] T012 [P] [US1] Add failing gateway integration cases for owner override placement, trigger/category/permanent/unrelated isolation, native room capability, and parent-change restoration in `tests/integration/gateway-lifecycle.test.ts`.
- [ ] T013 [P] [US1] Add the simulated process E2E creation, association, room-scoped allowance, two-owner isolation, and moved-room restoration sequence in `tests/e2e/worker-voice-state.test.ts`.

### Implementation for User Story 1

- [ ] T014 [US1] Replace parallel owner/room maps with a transient association record that retains exactly one owner and permission state per room in `src/application/manage-temporary-room.ts`.
- [X] T015 [US1] Apply the member-specific owner allowance after creating and associating a room, record bounded success outcomes, and preserve the existing member-move and inactivity lifecycle in `src/application/manage-temporary-room.ts`.
- [X] T016 [US1] Handle known-room parent changes by coalescing duplicate events, serially restoring the configured category, making confirmed deletion win over restoration, idempotently reapplying the owner allowance after restoration, and keeping reconciliation category-scoped in `src/application/manage-temporary-room.ts` and `src/infrastructure/discord/discord-gateway-event-source.ts`.
- [ ] T017 [US1] Make the User Story 1 unit, integration, and simulated E2E scenarios pass in `tests/unit/manage-temporary-room.test.ts`, `tests/unit/reconcile-temporary-rooms.test.ts`, `tests/integration/gateway-lifecycle.test.ts`, and `tests/e2e/worker-voice-state.test.ts`.

**Checkpoint**: An owner can use Discord-native management on only their room; no owner grant is present on another room, trigger, category, permanent channel, or unrelated channel, and moves are restored without widening reconciliation.

---

## Phase 4: User Story 2 - Safely Delete and Replace an Owned Room (Priority: P2)

**Goal**: Native/external deletion clears only the matching owner association and permits a normal replacement room while preserving every other owner and allowance.

**Independent Test**: Create two owned rooms, delete one through the simulator, then demonstrate exactly one replacement for its former owner and no mutation of the second owner.

### Tests for User Story 2

- [ ] T018 [P] [US2] Add failing unit cases that external deletion clears owner-permission state only for the deleted room and a replacement receives a fresh room-only allowance in `tests/unit/manage-temporary-room.test.ts`.
- [ ] T019 [P] [US2] Add failing integration cases for owner/native deletion, stale association cleanup, independent second-owner preservation, and replacement allowance isolation in `tests/integration/gateway-lifecycle.test.ts`.
- [ ] T020 [P] [US2] Add the simulated process E2E sequence for owner deletion, matching-association cleanup, replacement creation, and unaffected second-room association in `tests/e2e/worker-voice-state.test.ts`.

### Implementation for User Story 2

- [X] T021 [US2] Clear owner-permission state and inactivity work together with only the matching association on confirmed external deletion or stale-room discovery in `src/application/manage-temporary-room.ts`.
- [ ] T022 [US2] Make the User Story 2 unit, integration, and simulated E2E deletion/replacement scenarios pass in `tests/unit/manage-temporary-room.test.ts`, `tests/integration/gateway-lifecycle.test.ts`, and `tests/e2e/worker-voice-state.test.ts`.

**Checkpoint**: Deleting one owned room never corrupts another association, and the deleted room's former owner receives a room-scoped allowance only on their normal replacement room.

---

## Phase 5: User Story 3 - Continue Safely When Owner Setup Fails (Priority: P3)

**Goal**: An owner-allowance failure is observable and contained; the created room remains under ordinary lifecycle management and duplicate creation is impossible.

**Independent Test**: Force allowance application to fail after creation, repeat the creator request, and demonstrate worker availability, no configured-success state, no duplicate room, and unchanged reconciliation/lifecycle behavior.

### Tests for User Story 3

- [ ] T023 [P] [US3] Add failing unit cases for `failed`/`missing` owner-allowance outcomes, retained association, no duplicate creation, no false configured state, and no background or failure-triggered retry in `tests/unit/manage-temporary-room.test.ts`.
- [ ] T024 [P] [US3] Add failing integration cases for bounded allowance/restoration failure observations, lifecycle continuity, and independent room processing in `tests/integration/gateway-lifecycle.test.ts`.
- [ ] T025 [P] [US3] Add the simulated process E2E failure-containment sequence with bounded outcome assertions and no duplicate room in `tests/e2e/worker-voice-state.test.ts`.

### Implementation for User Story 3

- [X] T026 [US3] Persist only transient `applied`/`failed` owner-permission state (mapping `missing` to `failed`), contain failed/missing allowance outcomes, retain lifecycle state, prohibit background or failure-triggered retries while allowing only restoration-induced idempotent reapplication, and prevent duplicate or conflicting allowance attempts in `src/application/manage-temporary-room.ts`.
- [X] T027 [US3] Contain restoration failures and missing-room races without clearing an association unless existing stale-state handling independently confirms deletion in `src/application/manage-temporary-room.ts` and `src/infrastructure/discord/discord-gateway-event-source.ts`.
- [ ] T028 [US3] Make the User Story 3 unit, integration, and simulated E2E failure-containment scenarios pass in `tests/unit/manage-temporary-room.test.ts`, `tests/integration/gateway-lifecycle.test.ts`, and `tests/e2e/worker-voice-state.test.ts`.

**Checkpoint**: Owner setup and restoration failures are private, observable, non-fatal, and cannot create duplicate rooms or falsely represent a room as owner-configured.

---

## Phase 6: Polish and Cross-Cutting Concerns

**Purpose**: Document the security trade-off and operation, finalize review evidence, and prove the repository quality gate.

- [X] T029 [P] Update native owner capability scope, server-wide exclusions, bot Administrator prerequisite, and dedicated-category restoration guidance in `README.md` and `.env.example`.
- [X] T030 [P] Update bot role guidance, two-owner native permission smoke testing, deletion/replacement, category-move restoration, and safe diagnostics in `docs/local-discord-development.md`.
- [X] T031 [P] Document transient owner-permission state, channel-scoped port ownership, restoration events, reconciliation boundaries, and privacy-safe observations in `docs/architecture.md` and `docs/testing.md`.
- [ ] T032 Update feature-documentation assertions for all owner-permission documentation requirements in `tests/integration/documentation.test.ts`.
- [X] T033 Complete the credential-free quickstart scenarios and record validation evidence in `specs/006-temporary-room-owner-permissions/quickstart.md`.
- [X] T034 Run `pnpm check` and resolve feature-related validation failures in `package.json` and the affected feature files.

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately. T001 is a required security/governance gate; T002–T003 may proceed in parallel.
- **Foundational (Phase 2)**: Depends on T001–T003 and blocks all user stories. T005–T006 may run in parallel after T004; T007–T009 follow their required port/test seams.
- **US1 (Phase 3)**: Depends on the completed foundation and delivers the P1 owner-management MVP.
- **US2 (Phase 4)**: Depends on US1 because deletion must clear the owner-permission association created by that story.
- **US3 (Phase 5)**: Depends on US1's creation/allowance flow and foundation; it may be developed after US1 independently of US2 implementation details.
- **Polish (Phase 6)**: Depends on all user-story behavior; T034 is the final quality gate.

### User Story Dependencies

- **US1 (P1)**: Requires T004–T009; no dependency on later stories.
- **US2 (P2)**: Requires US1's association and owner-allowance state.
- **US3 (P3)**: Requires US1's allowance attempt and parent-restoration operations; it does not require US2's replacement assertions.

### Parallel Opportunities

- T002–T003 target different files and can run in parallel after the governance decision.
- After T004, T005 and T006 can run in parallel because they target separate adapter and observability/test seams.
- Within US1, the parallel-marked T010, T012, and T013 target distinct test layers; likewise T018–T020 and T023–T025 for US2/US3.
- T029–T031 can run in parallel after behavior stabilizes; T032 reconciles their assertions.

## Parallel Example: User Story 1

```text
T010: tests/unit/manage-temporary-room.test.ts
T012: tests/integration/gateway-lifecycle.test.ts
T013: tests/e2e/worker-voice-state.test.ts
```

T011 follows T010 because both modify `tests/unit/manage-temporary-room.test.ts`. T012 and T013 target distinct layers and can be prepared in parallel with T010 before T014–T017 integrate the creation, policy, and restoration behavior.

## Implementation Strategy

### MVP First

1. Record the required security exception and complete the typed/simulated Discord foundation.
2. Complete T010–T017 and demonstrate one room-scoped owner allowance per creator, strict isolation, and category restoration.
3. Review the MVP security evidence before adding deletion/replacement and fault-containment depth.

### Incremental Delivery

1. Deliver isolated native room management and category restoration (US1).
2. Add external/native deletion cleanup and safe replacement (US2).
3. Add explicit owner-setup/restoration failure containment (US3).
4. Publish administrator guidance, execute the quickstart, and run the complete quality gate.

## Notes

- All 34 tasks use the required checkbox, sequential ID, optional parallel marker, story label where required, and exact target paths.
- Tests are mandatory because the specification explicitly requires unit, integration, and simulated E2E coverage and the constitution requires layered evidence.
- No task authorizes an owner role, owner Administrator permission, owner server-wide capability, ownership persistence/reconstruction, raw Discord logging, or reconciliation beyond the configured temporary-room category.
