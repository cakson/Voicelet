---

description: "Dependency-ordered implementation tasks for local Discord development onboarding"
---

# Tasks: Local Discord Development Onboarding

**Input**: Design documents from `specs/003-local-discord-onboarding/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md),
[local Discord configuration contract](./contracts/local-discord-configuration.md), and
[quickstart.md](./quickstart.md)

**Tests**: Documentation-contract integration coverage is required by the plan and constitution.
The existing simulated unit, integration, and E2E suites remain the regression evidence for worker
behavior; no CI task may use a real Discord credential or server.

**Organization**: Tasks are grouped by user story so each documentation increment can be reviewed
and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its stated dependencies are complete.
- **[Story]**: Identifies the user story served by that task.
- Every task includes its exact target path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish deterministic documentation-contract coverage before changing tracked
onboarding material.

- [X] T001 Add failing integration assertions for the local development guide, README entry point,
  safe `.env.example`, required configuration mapping, and no-token examples in
  `tests/integration/documentation.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No shared runtime, database, or architecture work is required. The existing
configuration loader, Gateway adapter, operational server, and `.env` ignore rule are the stable
foundation; T001 is the documentation contract that blocks story changes.

**⚠️ CRITICAL**: Complete T001 before modifying onboarding documentation or the safe example.

**Checkpoint**: The test suite has precise, credential-free acceptance checks for all tracked
onboarding artifacts.

---

## Phase 3: User Story 1 - Complete a Real Discord Smoke Test (Priority: P1) 🎯 MVP

**Goal**: A new developer can create a dedicated bot and test server, configure Voicelet locally,
and complete the create, move, reuse, and clean-shutdown temporary-room smoke test.

**Independent Test**: Starting with a repository checkout, a developer follows the local guide to
prepare a dedicated test server, reaches `/readyz`, sees the bot online, and completes all smoke-test
steps with a non-bot user without a public endpoint.

### Implementation for User Story 1

- [X] T002 [US1] Create the start-to-finish local Discord onboarding and numbered temporary-room
  smoke-test guide in `docs/local-discord-development.md`
- [X] T003 [US1] Add a discoverable Local Discord development entry point and link to the dedicated
  guide in `README.md`
- [X] T004 [US1] Document the boundary between simulated automated tests and the manual real-Discord
  smoke test in `docs/testing.md`

**Checkpoint**: The documentation alone takes a new developer from checkout to a real local
create/move/reuse smoke test and clean shutdown.

---

## Phase 4: User Story 2 - Configure Discord Safely and Correctly (Priority: P2)

**Goal**: Developers can safely obtain, classify, and configure development-only bot credentials
and Discord identifiers using a complete placeholder example.

**Independent Test**: A developer copies `.env.example`, follows the identifier mapping in the guide,
and a repository status check plus the documentation integration suite confirm that no real token or
production identifier is needed or tracked.

### Implementation for User Story 2

- [X] T005 [US2] Replace the empty room-mapping example with a complete fictional real-mode example
  and secret/non-secret comments in `.env.example`
- [X] T006 [US2] Extend `docs/local-discord-development.md` with Developer Portal application/bot
  setup, token-regeneration guidance, developer-mode identifier collection, guild installation, and
  the exact `TEMPORARY_ROOM_CONFIG` mapping
- [X] T007 [US2] Extend `docs/local-discord-development.md` with least-privilege View Channel,
  Manage Channels, Move Members, and Connect access; category/channel overrides; the standard
  `GuildVoiceStates` capability; and the no-privileged-toggle requirement
- [X] T008 [US2] Extend `tests/integration/documentation.test.ts` with assertions that the safe
  example and guide expose every required setting, distinguish secrets from identifiers, prohibit
  user credentials, and require guild installation without Administrator access

**Checkpoint**: Configuration is copyable, complete, development-only, and test-guarded without
putting a real credential in the repository.

---

## Phase 5: User Story 3 - Diagnose Local Connection and Room Failures (Priority: P3)

**Goal**: A developer can use local health evidence and symptom-based troubleshooting to recover
from the defined credential, installation, configuration, permission, event, creation, movement,
and Discord-availability failures.

**Independent Test**: A developer can follow the guide with an invalid credential or unavailable
connection to distinguish successful liveness from unsuccessful readiness, then locate the relevant
troubleshooting branch without exposing an endpoint publicly.

### Implementation for User Story 3

- [X] T009 [US3] Extend `docs/local-discord-development.md` with loopback liveness, readiness, and
  metrics inspection; outbound-Gateway/no-public-endpoint rationale; and clean-stop evidence
- [X] T010 [US3] Add symptom-to-remedy troubleshooting for all required credential, installation,
  mapping, permission, voice-state, room-creation, member-movement, and readiness failures in
  `docs/local-discord-development.md`
- [X] T011 [US3] Extend `tests/integration/documentation.test.ts` with assertions for local health
  endpoints, no-tunnel/public-callback guidance, and all required troubleshooting categories

**Checkpoint**: The guide distinguishes a locally live worker from a Discord-ready worker and gives
safe next actions for every required failure category.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Reconcile the documentation surface and capture final validation evidence.

- [X] T012 Reconcile links, configuration names, endpoint semantics, and security language across
  `README.md`, `.env.example`, `docs/local-discord-development.md`, and `docs/testing.md`
- [X] T013 Run the manual local-development quickstart and smoke-test checklist using only a
  developer-owned test bot/server, recording no tokens or Discord identifiers in
  `specs/003-local-discord-onboarding/quickstart.md`
- [X] T014 Run focused documentation integration coverage with `pnpm test:integration` from
  `tests/integration/documentation.test.ts`
- [X] T015 Run the complete repository quality gate with `pnpm check` from `package.json` and resolve
  any feature-related failure in its affected file

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately and defines the credential-free documentation contract.
- **Foundational (Phase 2)**: Depends on T001; its existing-runtime inventory blocks user-story edits
  until the assertions identify expected documentation content.
- **US1 (Phase 3)**: Depends on T001 and delivers the MVP real Discord setup and smoke journey.
- **US2 (Phase 4)**: Depends on US1's guide so it can add precise secure configuration and
  authorization guidance without duplicating the onboarding path.
- **US3 (Phase 5)**: Depends on US1 because health and troubleshooting are additions to the same
  local guide; it may begin after the guide is established.
- **Polish (Phase 6)**: Depends on all selected user stories and completes live manual validation and
  the full quality gate.

### User Story Dependencies

- **US1 (P1)**: Starts after T001; no dependency on later stories.
- **US2 (P2)**: Builds on the US1 guide but remains independently testable through the safe example,
  identifier mapping, and security checks.
- **US3 (P3)**: Builds on the US1 guide but remains independently testable through local health and
  troubleshooting checks.

### Parallel Opportunities

- After T001, T003 and T004 can proceed in parallel with the initial T002 guide because they modify
  different files; T002 must be completed before merging their links/references.
- In US2, T005 can proceed in parallel with T006 and T007; T008 follows their completed content.
- In US3, T009 and T010 can be drafted together but must be reconciled in the shared guide before
  T011 validates them.
- T014 and manual T013 can run in parallel after documentation is stable; T015 is the final gate.

## Parallel Example: User Story 2

```text
T005: .env.example
T006: docs/local-discord-development.md (Portal, secrets, identifiers, mapping)
T007: docs/local-discord-development.md (permissions and Gateway capability)
```

T005 may run independently. T006 and T007 can be drafted concurrently but require a single
reconciliation before T008 validates the guide.

## Implementation Strategy

### MVP First

1. Complete T001 to establish testable documentation expectations.
2. Complete T002–T004 for the end-to-end real Discord onboarding and smoke test.
3. Run the US1 independent test with a dedicated test bot/server, not a production environment.

### Incremental Delivery

1. Add US2 to make the example configuration and authorization model safe and precise.
2. Add US3 to make local readiness and operational failure recovery repeatable.
3. Reconcile all documentation, run the manual quickstart, then complete `pnpm check`.

## Notes

- All 15 tasks follow the required checklist format with sequential IDs and exact target paths.
- No task authorizes real credentials in test code, fixtures, generated artifacts, or commits.
- Worker implementation is intentionally unchanged; documentation tests protect the public
  operational/configuration contract instead.
