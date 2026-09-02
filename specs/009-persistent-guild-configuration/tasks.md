# Tasks: Persistent Guild Configuration

**Input**: Design artifacts in `/specs/009-persistent-guild-configuration/`

**Tests**: Unit/application tests use memory storage; integration and E2E tests use the official
Firestore emulator; E2E retains the simulated Discord Gateway.

## Phase 1: Setup

- [ ] T001 Add official Firestore server SDK and pinned Firebase CLI dependencies in `package.json` and `pnpm-lock.yaml`
- [ ] T002 [P] Add Firestore-only emulator configuration in `firebase.json`
- [ ] T003 Add emulator lifecycle and persistence test scripts in `package.json`
- [ ] T004 [P] Add Java 21 and emulator execution to `.github/workflows/ci.yml`

## Phase 2: Foundational

- [ ] T005 [P] Write canonical configuration/default/version validation tests in `tests/unit/guild-config.test.ts`
- [ ] T006 Implement canonical `GuildConfig`, input normalization, V1 representation, and validation in `src/domain/guild-config.ts`
- [ ] T007 [P] Define repository results and `GuildConfigRepository` in `src/ports/guild-config-repository.ts`
- [ ] T008 [P] Implement deterministic memory repository and fault controls in `src/infrastructure/memory/in-memory-guild-config-repository.ts`
- [ ] T009 Add persistence runtime configuration and remove `TEMPORARY_ROOM_CONFIG` parsing in `src/config/load-config.ts`
- [ ] T010 [P] Write Firestore emulator adapter contract tests in `tests/integration/firestore-guild-config-repository.test.ts`
- [ ] T011 Implement Firestore client creation, emulator routing, disposal, and error classification in `src/infrastructure/firestore/firestore-client-factory.ts`
- [ ] T012 Implement Firestore document translation and `get`, `list`, and `save` in `src/infrastructure/firestore/firestore-guild-config-repository.ts`
- [ ] T013 [P] Define provider-neutral configured Discord-resource inspection in `src/ports/index.ts`
- [ ] T014 Implement configured-resource inspection in `src/infrastructure/discord/discord-client-factory.ts`
- [ ] T015 [P] Implement deterministic configured-resource inspection controls in `src/infrastructure/discord/simulated-client-factory.ts`
- [ ] T016 [P] Test production and simulated configured-resource inspection outcomes in `tests/unit/discord-client-factory.test.ts`
- [ ] T017 Wire Firestore repository selection and adapter disposal in `src/composition/root.ts`
- [ ] T018 Update persistence environment validation, redaction, and removed-map tests in `tests/integration/configuration-startup.test.ts`

**Checkpoint**: Canonical data, ports, adapters, provider config, and Discord inspection are ready.

## Phase 3: User Story 1 - Use a Guild's Saved Configuration (P1) 🎯 MVP

**Goal**: Use each guild's durable settings in room creation and reconciliation after restart.

**Independent Test**: Seed two configurations, process each guild with the simulated Gateway, restart
against the same emulator, and verify no cross-guild settings leak.

- [ ] T019 [P] [US1] Write configured, unconfigured, and isolation lookup tests in `tests/unit/guild-config-service.test.ts`
- [ ] T020 [P] [US1] Write repository-backed room lifecycle tests in `tests/unit/manage-temporary-room.test.ts`
- [ ] T021 [P] [US1] Write repository-backed reconciliation tests in `tests/unit/reconcile-temporary-rooms.test.ts`
- [ ] T022 [US1] Implement provider-neutral lookup orchestration in `src/application/guild-config-service.ts`
- [ ] T023 [US1] Resolve configuration per room event in `src/application/manage-temporary-room.ts`
- [ ] T024 [US1] Enumerate configured guilds for existing reconciliation scheduling in `src/application/reconcile-temporary-rooms.ts`
- [ ] T025 [US1] Wire repository-backed behavior into `src/infrastructure/discord/discord-gateway-event-source.ts`
- [ ] T026 [US1] Replace runtime-map worker wiring in `src/composition/root.ts`
- [ ] T027 [US1] Migrate map-based Gateway construction tests in `tests/integration/gateway-lifecycle.test.ts`
- [ ] T028 [US1] Migrate runtime-map E2E setup and add restart/isolation scenarios in `tests/e2e/worker-voice-state.test.ts` and `tests/e2e/worker-guild-config.test.ts`

## Phase 4: User Story 2 - Create or Update Guild Configuration (P1)

**Goal**: Create or replace one complete validated configuration through the internal service.

**Independent Test**: Save, retrieve, replace, and verify normalized complete values for one guild.

- [ ] T029 [P] [US2] Write create/replace/default/duplicate-normalization tests in `tests/unit/guild-config-service.test.ts`
- [ ] T030 [P] [US2] Write Firestore create/replace emulator tests in `tests/integration/firestore-guild-config-repository.test.ts`
- [ ] T031 [US2] Implement validated create-or-replace service outcomes in `src/application/guild-config-service.ts`
- [ ] T032 [US2] Add local-only configuration seed/setup entry point in `src/infrastructure/firestore/seed-guild-config.ts`
- [ ] T033 [US2] Add deterministic emulator seed/reset helpers in `tests/support/firestore-emulator.ts`
- [ ] T034 [US2] Test local seed/setup against the emulator in `tests/integration/firestore-guild-config-seed.test.ts`

## Phase 5: User Story 3 - Safely Handle Missing or Invalid Configuration (P1)

**Goal**: Safely skip missing, invalid, stale, or unavailable configuration and expose correct health.

**Independent Test**: Simulate every port and resource-inspection outcome; confirm no unsafe room
creation, liveness remains healthy, readiness fails then recovers, and diagnostics contain no IDs.

- [ ] T035 [P] [US3] Write missing, invalid, unavailable, and stale-resource safe-skip tests in `tests/unit/guild-config-service.test.ts`
- [ ] T036 [P] [US3] Write malformed-document rejection tests in `tests/integration/firestore-guild-config-repository.test.ts`
- [ ] T037 [P] [US3] Write persistence health failure/recovery tests in `tests/integration/operational-http.test.ts`
- [ ] T038 [US3] Add bounded persistence observations and readiness tracking in `src/infrastructure/logging/observability.ts`
- [ ] T039 [US3] Combine Gateway and persistence readiness without changing liveness in `src/infrastructure/http/operational-server.ts`
- [ ] T040 [US3] Propagate repository and resource-inspection outcomes into safe skips and recovery in `src/infrastructure/discord/discord-gateway-event-source.ts`
- [ ] T041 [US3] Add emulator plus simulated-Gateway failure/recovery E2E coverage in `tests/e2e/worker-guild-config.test.ts`

## Phase 6: Polish and Cross-Cutting Work

- [ ] T042 [P] Document repository boundary, Firestore adapter, and replacement seam in `docs/architecture.md`
- [ ] T043 [P] Replace runtime-map instructions with emulator setup and configuration categories in `README.md`
- [ ] T044 [P] Update persisted-configuration local Discord workflow in `docs/local-discord-development.md`
- [ ] T045 [P] Document emulator integration/E2E commands and isolation in `docs/testing.md`
- [ ] T046 [P] Remove runtime-map deployment guidance and document runtime secrets in `docs/deployment.md`
- [ ] T047 [P] Replace runtime-map example with safe persistence/emulator values in `.env.example`
- [ ] T048 Remove `TEMPORARY_ROOM_CONFIG` from container smoke and remaining active scripts/tests in `package.json`, `tests/e2e/worker-voice-state.test.ts`, and `tests/integration/configuration-startup.test.ts`
- [ ] T049 Add documentation assertions for the persistence boundary and retired runtime map in `tests/integration/documentation.test.ts`
- [ ] T050 Run `pnpm check` and every validation scenario in `specs/009-persistent-guild-configuration/quickstart.md`

## Dependencies and Parallel Work

- Complete Phase 1 then Phase 2 before all stories.
- T005/T010 precede their implementation tasks. T013–T016 precede stale-resource behavior.
- US1 is the MVP; US2 follows the shared repository service; US3 follows repository-backed behavior.
- Parallel tasks are marked `[P]`; avoid concurrent edits to shared service, adapter-test, and root files.

## Delivery Strategy

Deliver and validate US1 against the emulator first, then add US2 management/seed behavior and US3
safety/health behavior. Finish documentation and the full quality gate without adding listeners,
provider values outside infrastructure, production test credentials, or persistent room state.
