# Tasks: Persistent Guild Configuration

**Input**: Design artifacts in `/specs/009-persistent-guild-configuration/`

**Tests**: Unit/application tests use memory storage; integration and E2E tests use the official
Firestore emulator; E2E retains the simulated Discord Gateway.

## Phase 1: Setup

- [X] T001 Add official Firestore server SDK and pinned Firebase CLI dependencies in `package.json` and `pnpm-lock.yaml`
- [X] T002 [P] Add Firestore-only emulator configuration in `firebase.json`
- [X] T003 Add emulator lifecycle and persistence test scripts in `package.json`
- [X] T004 [P] Add Java 21 and emulator execution to `.github/workflows/ci.yml`

## Phase 2: Foundational

- [X] T005 [P] Write canonical configuration/default/version validation tests in `tests/unit/guild-config.test.ts`
- [X] T006 Implement canonical `GuildConfig`, input normalization, V1 representation, and validation in `src/domain/guild-config.ts`
- [X] T007 [P] Define repository results and `GuildConfigRepository` in `src/ports/guild-config-repository.ts`
- [X] T008 [P] Implement deterministic memory repository and fault controls in `src/infrastructure/memory/in-memory-guild-config-repository.ts`
- [X] T009 Add persistence runtime configuration and remove `TEMPORARY_ROOM_CONFIG` parsing in `src/config/load-config.ts`
- [X] T010 [P] Write Firestore emulator adapter contract tests in `tests/integration/firestore-guild-config-repository.test.ts`
- [X] T011 Implement Firestore client creation, emulator routing, disposal, and error classification in `src/infrastructure/firestore/firestore-client-factory.ts`
- [X] T012 Implement Firestore document translation and `get`, `list`, and `save` in `src/infrastructure/firestore/firestore-guild-config-repository.ts`
- [X] T013 [P] Define provider-neutral configured Discord-resource inspection in `src/ports/index.ts`
- [X] T014 Implement configured-resource inspection in `src/infrastructure/discord/discord-client-factory.ts`
- [X] T015 [P] Implement deterministic configured-resource inspection controls in `src/infrastructure/discord/simulated-client-factory.ts`
- [X] T016 [P] Test production and simulated configured-resource inspection outcomes in `tests/unit/discord-client-factory.test.ts`
- [X] T017 Wire Firestore repository selection and adapter disposal in `src/composition/root.ts`
- [X] T018 Update persistence environment validation, redaction, and removed-map tests in `tests/integration/configuration-startup.test.ts`

**Checkpoint**: Canonical data, ports, adapters, provider config, and Discord inspection are ready.

## Phase 3: User Story 1 - Use a Guild's Saved Configuration (P1) 🎯 MVP

**Goal**: Use each guild's durable settings in room creation and reconciliation after restart.

**Independent Test**: Seed two configurations, process each guild with the simulated Gateway, restart
against the same emulator, and verify no cross-guild settings leak.

- [X] T019 [P] [US1] Write configured, unconfigured, and isolation lookup tests in `tests/unit/guild-config-service.test.ts`
- [X] T020 [P] [US1] Write repository-backed room lifecycle tests in `tests/unit/manage-temporary-room.test.ts`
- [X] T021 [P] [US1] Write repository-backed reconciliation tests in `tests/unit/reconcile-temporary-rooms.test.ts`
- [X] T022 [US1] Implement provider-neutral lookup orchestration in `src/application/guild-config-service.ts`
- [X] T023 [US1] Resolve configuration per room event in `src/application/manage-temporary-room.ts`
- [X] T024 [US1] Enumerate configured guilds for existing reconciliation scheduling in `src/application/reconcile-temporary-rooms.ts`
- [X] T025 [US1] Wire repository-backed behavior into `src/infrastructure/discord/discord-gateway-event-source.ts`
- [X] T026 [US1] Replace runtime-map worker wiring in `src/composition/root.ts`
- [X] T027 [US1] Migrate map-based Gateway construction tests in `tests/integration/gateway-lifecycle.test.ts`
- [X] T028 [US1] Migrate runtime-map E2E setup and add restart/isolation scenarios in `tests/e2e/worker-voice-state.test.ts` and `tests/e2e/worker-guild-config.test.ts`

## Phase 4: User Story 2 - Create or Update Guild Configuration (P1)

**Goal**: Create or replace one complete validated configuration through the internal service.

**Independent Test**: Save, retrieve, replace, and verify normalized complete values for one guild.

- [X] T029 [P] [US2] Write create/replace/default/duplicate-normalization tests in `tests/unit/guild-config-service.test.ts`
- [X] T030 [P] [US2] Write Firestore create/replace emulator tests in `tests/integration/firestore-guild-config-repository.test.ts`
- [X] T031 [US2] Implement validated create-or-replace service outcomes in `src/application/guild-config-service.ts`
- [X] T032 [US2] Add local-only configuration seed/setup entry point in `src/infrastructure/firestore/seed-guild-config.ts`
- [X] T033 [US2] Add deterministic emulator seed/reset helpers in `tests/support/firestore-emulator.ts`
- [X] T034 [US2] Test local seed/setup against the emulator in `tests/integration/firestore-guild-config-seed.test.ts`

## Phase 5: User Story 3 - Safely Handle Missing or Invalid Configuration (P1)

**Goal**: Safely skip missing, invalid, stale, or unavailable configuration and expose correct health.

**Independent Test**: Simulate every port and resource-inspection outcome; confirm no unsafe room
creation, liveness remains healthy, readiness fails then recovers, and diagnostics contain no IDs.

- [X] T035 [P] [US3] Write missing, invalid, unavailable, and stale-resource safe-skip tests in `tests/unit/guild-config-service.test.ts`
- [X] T036 [P] [US3] Write malformed-document rejection tests in `tests/integration/firestore-guild-config-repository.test.ts`
- [X] T037 [P] [US3] Write persistence health failure/recovery tests in `tests/integration/operational-http.test.ts`
- [X] T038 [US3] Add bounded persistence observations and readiness tracking in `src/infrastructure/logging/observability.ts`
- [X] T039 [US3] Combine Gateway and persistence readiness without changing liveness in `src/infrastructure/http/operational-server.ts`
- [X] T040 [US3] Propagate repository and resource-inspection outcomes into safe skips and recovery in `src/infrastructure/discord/discord-gateway-event-source.ts`
- [X] T041 [US3] Add emulator plus simulated-Gateway failure/recovery E2E coverage in `tests/e2e/worker-guild-config.test.ts`

## Phase 6: Polish and Cross-Cutting Work

- [X] T042 [P] Document repository boundary, Firestore adapter, and replacement seam in `docs/architecture.md`
- [X] T043 [P] Replace runtime-map instructions with emulator setup and configuration categories in `README.md`
- [X] T044 [P] Update persisted-configuration local Discord workflow in `docs/local-discord-development.md`
- [X] T045 [P] Document emulator integration/E2E commands and isolation in `docs/testing.md`
- [X] T046 [P] Remove runtime-map deployment guidance and document runtime secrets in `docs/deployment.md`
- [X] T047 [P] Replace runtime-map example with safe persistence/emulator values in `.env.example`
- [X] T048 Remove `TEMPORARY_ROOM_CONFIG` from container smoke and remaining active scripts/tests in `package.json`, `tests/e2e/worker-voice-state.test.ts`, and `tests/integration/configuration-startup.test.ts`
- [X] T049 Add documentation assertions for the persistence boundary and retired runtime map in `tests/integration/documentation.test.ts`
- [X] T050 Run `pnpm check` and every validation scenario in `specs/009-persistent-guild-configuration/quickstart.md`

## Dependencies and Parallel Work

- Complete Phase 1 then Phase 2 before all stories.
- T005/T010 precede their implementation tasks. T013–T016 precede stale-resource behavior.
- US1 is the MVP; US2 follows the shared repository service; US3 follows repository-backed behavior.
- Parallel tasks are marked `[P]`; avoid concurrent edits to shared service, adapter-test, and root files.

## Delivery Strategy

Deliver and validate US1 against the emulator first, then add US2 management/seed behavior and US3
safety/health behavior. Finish documentation and the full quality gate without adding listeners,
provider values outside infrastructure, production test credentials, or persistent room state.

## Phase 7: Convergence

- [X] T051 Add isolated Firestore-emulator E2E coverage for restart persistence, guild isolation, and configured/unconfigured behavior per Constitution I and FR-017 (missing)
- [X] T052 Add deterministic Firestore emulator seed/reset support and `worker-guild-config.test.ts` scenarios for invalid, unavailable, stale, and recovered configuration per Constitution I and FR-018 (missing)
- [X] T053 Expand Firestore adapter integration coverage for list, replacement, invalid saves, malformed records, provider-error mapping, and emulator lifecycle per FR-018 and SC-005 (partial)
- [X] T054 Add operational readiness transition tests proving persistence failure returns not-ready, liveness remains healthy, and the next successful read restores readiness per FR-013a and FR-013b (missing)
- [X] T055 Implement and test the local Firestore guild-configuration seed/setup workflow per FR-005a (partial)
- [X] T056 Complete configured Discord-resource inspection tests and privacy-safe safe-skip assertions for stale, missing, wrong-type, and unavailable resources per FR-006a and FR-014 (partial)
- [X] T057 Add Firestore client-factory tests for emulator routing, isolated project configuration, and resource disposal per plan: client creation/emulator routing (partial)
- [X] T058 Complete local development documentation with a concrete deterministic seed/reset example and remove remaining legacy map-oriented wording per FR-019 and quickstart.md (partial)

## Phase 8: Convergence

- [X] T059 Strengthen Firestore-backed E2E assertions for unconfigured no-creation behavior, guild isolation, restart retrieval, and invalid/unavailable/recovery outcomes per FR-018 and Constitution I (partial)
- [X] T060 Add worker/source integration coverage that drives repository read failure and subsequent successful read, proving readiness recovery while liveness remains healthy per FR-013a and FR-013b (partial)
- [X] T061 Add unavailable and simulated configured-resource inspection tests plus manager-level privacy-safe safe-skip/no-creation assertions per FR-006a and FR-014 (partial)
- [X] T062 Add Firestore client-factory tests for emulator host parsing, isolated project routing, malformed host handling, and disposal per plan: emulator routing (partial)
- [X] T063 Add explicit invalid-save adapter coverage and a test contract proving the emulator lifecycle scripts execute emulator-backed integration and E2E suites per FR-018 and SC-005 (partial)
- [X] T064 Add documentation assertions for deterministic seed/reset behavior and the local-only configuration management boundary per FR-019 and quickstart.md (partial)

## Phase 9: Convergence

- [ ] T065 Add application-boundary guild identifier validation for lookups and tests proving invalid IDs never invoke persistence per FR-006a edge cases (partial)
- [ ] T066 Add an emulator-backed worker health scenario for datastore unavailability and later successful read, asserting `/livez` remains healthy and `/readyz` recovers per FR-013a, FR-013b, and Constitution I (partial)
- [ ] T067 Add manager/source assertions for bounded no-identifier observability across missing, wrong-type, and unavailable configured Discord resources per FR-006a and FR-014 (partial)
