---

description: "Dependency-ordered implementation tasks for the engineering foundation"
---

# Tasks: Engineering Foundation

**Input**: Design documents from `specs/001-engineering-foundation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [health contract](./contracts/health.md), and
[quickstart.md](./quickstart.md)

**Tests**: Unit, integration, and end-to-end tests are required by the specification and
constitution. Write the story tests before their corresponding implementation tasks.

**Organization**: Tasks are grouped by user story so each increment has a clear independent
validation path.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its stated dependencies are complete.
- **[Story]**: Identifies the user story served by that task.
- Every task includes its exact target path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the reproducible Node.js/TypeScript repository baseline.

- [ ] T001 Create the Node 24 and Corepack/pnpm project manifest, package-manager pin, and engines in `package.json`
- [ ] T002 Create the reproducible dependency configuration and committed lockfile in `pnpm-lock.yaml`
- [ ] T003 [P] Configure strict TypeScript compilation and build output in `tsconfig.json`
- [ ] T004 [P] Configure ESLint flat rules for TypeScript in `eslint.config.mjs`
- [ ] T005 [P] Configure Prettier formatting and ignore rules in `.prettierrc.json` and `.prettierignore`
- [ ] T006 [P] Configure Vitest commands, include patterns, and coverage settings in `vitest.config.ts`
- [ ] T007 Create repository ignore rules and safe configuration examples in `.gitignore` and `.env.example`
- [ ] T008 Create the planned source, test, documentation, and CI directory structure in `src/`, `tests/`, `docs/`, and `.github/workflows/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared abstractions required by all stories without coupling domain logic to
Discord, HTTP, configuration, or logging implementations.

**⚠️ CRITICAL**: Complete this phase before starting user-story implementation.

- [ ] T009 Define worker ports for Gateway events, readiness, clock, safe observations, and `DiscordClientFactory` in `src/ports/index.ts`
- [ ] T010 Define transient readiness, normalized voice-state, and safe outcome domain models in `src/domain/voice-state.ts`
- [ ] T011 [P] Add unit tests for valid, malformed, join, leave, and move voice-state normalization in `tests/unit/normalize-voice-state.test.ts`
- [ ] T012 [P] Add unit tests for safe handled and rejected outcomes with no identifiers in observations in `tests/unit/handle-voice-state.test.ts`
- [ ] T013 Implement boundary validation and normalization for raw voice-state input in `src/domain/normalize-voice-state.ts`
- [ ] T014 Implement a pure voice-state handling use case that emits only safe outcomes in `src/application/handle-voice-state.ts`
- [ ] T015 Implement validated environment loading with redaction-safe failure messages in `src/config/load-config.ts`
- [ ] T016 Implement structured safe observation logging and bounded worker metrics in `src/infrastructure/logging/observability.ts`
- [ ] T017 Create a deterministic simulated Discord client that implements the `DiscordClientFactory` contract and emits ready, voice-state, disconnect, and reconnect signals in `tests/support/gateway-simulator/index.ts`
- [ ] T018 Add shared fixture builders with synthetic non-production Discord identifiers in `tests/support/fixtures/voice-state.ts`

**Checkpoint**: The service boundaries, safe domain behavior, configuration rules, and test support
are ready for independent story work.

---

## Phase 3: User Story 1 - Start and Verify the Background Worker (Priority: P1) 🎯 MVP

**Goal**: Start the worker locally, receive a Discord Gateway voice-state event, expose liveness and
readiness, and produce a privacy-safe observable handling result.

**Independent Test**: Launch the compiled worker with the simulated Gateway, observe `/livez`, send a
ready signal and test voice-state event, verify `/readyz` and safe handling evidence, then verify
that disconnect makes readiness return `503`.

### Tests for User Story 1

- [ ] T019 [P] [US1] Add HTTP contract integration tests for `/livez`, `/readyz`, and `/metrics` in `tests/integration/operational-http.test.ts`
- [ ] T020 [P] [US1] Add integration tests that exercise `src/infrastructure/discord/discord-gateway-event-source.ts` through the injected simulated Discord client, assert ready state within 30 seconds, and verify disconnect, reconnect, and safe configuration failure in `tests/integration/gateway-lifecycle.test.ts`
- [ ] T021 [P] [US1] Add a process-level E2E test that launches the worker in simulated-Gateway mode, asserts `/readyz` succeeds within 30 seconds, and verifies a test voice-state event produces safe handling evidence within 5 seconds in `tests/e2e/worker-voice-state.test.ts`

### Implementation for User Story 1

- [ ] T022 [US1] Implement the Discord Gateway adapter with only the `GuildVoiceStates` intent and lifecycle translation in `src/infrastructure/discord/discord-gateway-event-source.ts`
- [ ] T023 [US1] Implement liveness, readiness, and privacy-safe metrics endpoints per the contract in `src/infrastructure/http/operational-server.ts`
- [ ] T024 [US1] Compose the gateway, handler, observability, and HTTP adapters in `src/composition/root.ts`
- [ ] T025 [US1] Implement worker startup, readiness transitions, and bounded graceful shutdown in `src/main.ts`
- [ ] T026 [US1] Add the local worker start and targeted worker-validation scripts in `package.json`

**Checkpoint**: A developer can run the worker and prove its representative Discord voice-state
event flow with no real Discord credentials in automated tests.

---

## Phase 4: User Story 2 - Verify Change Quality (Priority: P2)

**Goal**: Run the exact formatting, linting, type-checking, testing, and build gates locally and in
continuous integration.

**Independent Test**: From a clean checkout, run `pnpm check`; intentionally introduce one failure
per quality category and confirm both the local command and CI reject it.

### Tests for User Story 2

- [ ] T027 [P] [US2] Add a quality-command integration test that exercises the aggregate check command against the fixture project in `tests/integration/quality-commands.test.ts`
- [ ] T028 [P] [US2] Add CI workflow validation fixtures for failing format, lint, type, test, and build categories in `tests/support/quality-fixtures/`

### Implementation for User Story 2

- [ ] T029 [US2] Define formatter, linter, type-check, per-layer test, build, and aggregate `check` scripts in `package.json`
- [ ] T030 [US2] Implement frozen-lockfile installation and `pnpm check` quality gates in `.github/workflows/ci.yml`
- [ ] T031 [US2] Add repository secret-detection configuration and CI invocation in `.gitleaks.toml` and `.github/workflows/ci.yml`
- [ ] T032 [US2] Verify the committed dependency lockfile resolves with the pinned package manager in `pnpm-lock.yaml`

**Checkpoint**: Local and CI quality gates execute the same required checks and reject known bad
changes without requiring secrets.

---

## Phase 5: User Story 3 - Understand and Contribute Safely (Priority: P3)

**Goal**: Give new engineers and AI coding agents complete, current instructions for setup,
architecture, testing, and contribution.

**Independent Test**: A contributor unfamiliar with the repository follows the documentation to set
up, start, validate, and prepare a change without oral guidance.

### Tests for User Story 3

- [ ] T033 [P] [US3] Add a documentation link and required-command verification test in `tests/integration/documentation.test.ts`
- [ ] T034 [P] [US3] Add an AI-agent instruction completeness check in `tests/integration/agent-instructions.test.ts`

### Implementation for User Story 3

- [ ] T035 [P] [US3] Document prerequisites, safe environment setup, startup, and common commands in `README.md`
- [ ] T036 [P] [US3] Document component responsibilities, one-way dependency flow, and operational endpoints in `docs/architecture.md`
- [ ] T037 [P] [US3] Document unit, integration, end-to-end, simulator, and quality-gate workflows in `docs/testing.md`
- [ ] T038 [P] [US3] Document contribution, review, CI, and definition-of-done workflow in `CONTRIBUTING.md`
- [ ] T039 [US3] Add repository-specific AI coding-agent operating and validation instructions in `AGENTS.md`

**Checkpoint**: A new contributor and an AI coding agent can perform all required workflows using
repository documentation alone.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the foundation as a releasable whole and keep specifications synchronized.

- [ ] T040 [P] Verify all quality commands and the complete CI-equivalent suite from the repository root in `package.json`
- [ ] T041 [P] Run and record a timed clean-environment walkthrough of README setup, worker startup, and `/readyz` verification; confirm completion within 15 minutes in `specs/001-engineering-foundation/quickstart.md`
- [ ] T042 [P] Reconcile implementation documentation with the final architecture and test behavior in `README.md`, `docs/architecture.md`, and `docs/testing.md`
- [ ] T043 Confirm every functional requirement and constitution quality gate has implementation and test evidence in `specs/001-engineering-foundation/spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately; T001 and T002 unblock the installed-tooling tasks.
- **Phase 2 (Foundational)**: Depends on Phase 1; it blocks all user-story implementation.
- **Phase 3 (US1)**: Depends on Phase 2; it establishes the MVP worker and its required test layers.
- **Phase 4 (US2)**: Depends on Phase 1 and benefits from Phase 3 test scripts; it can finish after
  the baseline scripts exist and before Phase 6.
- **Phase 5 (US3)**: Depends on Phase 1; its documentation tasks can proceed after paths and commands
  stabilize in Phases 3 and 4.
- **Phase 6 (Polish)**: Depends on all selected story phases being complete.

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational; no dependency on US2 or US3. This is the MVP.
- **US2 (P2)**: Depends on baseline tooling and uses the US1 test scripts; it does not change US1
  behavior.
- **US3 (P3)**: Depends on stable commands and paths from US1/US2 for final documentation accuracy.

### Parallel Opportunities

- T003–T006 can proceed in parallel after T001.
- T011–T012 can proceed in parallel after T010; T019–T021 can proceed in parallel after Phase 2.
- T027 and T028 can proceed in parallel; T035–T038 can proceed in parallel.
- Documentation drafts (T035–T038) may begin after Phase 1, then are finalized after the corresponding
  implementation commands and endpoints stabilize.

## Parallel Example: User Story 1

```text
T019: tests/integration/operational-http.test.ts
T020: tests/integration/gateway-lifecycle.test.ts
T021: tests/e2e/worker-voice-state.test.ts
```

These three story-test tasks have distinct files and can be authored in parallel after Phase 2. T022–T025
then implement the adapters and composition needed to make them pass.

## Implementation Strategy

### MVP First

1. Complete Phases 1 and 2.
2. Complete US1 tests and implementation (T019–T026); foundational unit tests T011–T012 are already
   complete before domain implementation.
3. Run its independent simulated-Gateway validation before moving on.

### Incremental Delivery

1. Add the local/CI quality gate layer (US2) once the MVP scripts exist.
2. Complete contributor and agent documentation (US3) after commands and architecture stabilize.
3. Run all Phase 6 validations before treating the foundation as complete.
