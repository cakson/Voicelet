# Tasks: Guild Administration UI

**Input**: Design documents from `/specs/010-guild-administration-ui/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, and
`quickstart.md`

**Tests**: Required by the feature specification and constitution. Write each story's tests first and
confirm they fail for the intended reason before implementing that story.

**Organization**: Tasks are grouped by user story so each operator journey remains independently
testable. Shared model, persistence, active-worker semantics, and build tooling are foundational.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets different files and has no dependency on an
  incomplete task in the same phase.
- **[Story]**: Maps the task to the corresponding prioritized user story in `spec.md`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the root-package React/Vite/shadcn and test/build toolchain without creating a
second deployable application.

- [X] T001 Add React, Vite, Tailwind 4, shadcn-required primitives/utilities, `@fastify/static`, Testing Library, jsdom, Playwright, `concurrently`, and `cross-env` through the root `package.json` and `pnpm-lock.yaml`
- [X] T002 [P] Create the Vite React entrypoint and `/admin/` base/proxy/alias configuration in `admin/index.html`, `admin/vite.config.ts`, `admin/tsconfig.json`, `admin/src/app/main.tsx`, and `admin/src/styles.css`
- [X] T003 Create and retain the shadcn configuration and only Button, Badge, Table, Dialog, AlertDialog, Input, Label, Switch, Skeleton, and Alert source in `admin/components.json`, `admin/src/lib/utils.ts`, and `admin/src/components/ui/*.tsx`
- [X] T004 [P] Add frontend TypeScript, jsdom test, lint, and format coverage in `admin/tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, and `.prettierignore`
- [X] T005 [P] Configure Chromium browser E2E startup, base URL, isolation, and artifact retention in `playwright.config.ts`
- [X] T006 Add backend/frontend dev, typecheck, component-test, browser-test, and combined production-build commands while preserving existing worker commands in `package.json`

**Checkpoint**: The frontend scaffold compiles from the root package and no production Vite process
has been introduced.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the domain, provider-neutral ports/adapters, active-worker behavior, and
composition required by every administration story.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [X] T007 [P] Write failing snowflake, registration, V2 enabled/revision, legacy-V1, and configuration invariant tests in `tests/unit/guild-registration.test.ts` and `tests/unit/guild-config.test.ts`
- [X] T008 Implement canonical snowflake validation, `GuildRegistration`, configuration enabled/revision fields, and V1-to-V2 parsing in `src/domain/guild-registration.ts` and `src/domain/guild-config.ts`
- [X] T009 [P] Write compile-time/provider-boundary contract tests for administration and enabled-config result unions in `tests/unit/guild-administration-boundary.test.ts`
- [X] T010 Define narrow registration, configuration-creation, configuration-mutation, deletion, and enabled-reader repository capability ports plus bounded operation results in `src/ports/guild-administration-repository.ts` and `src/ports/enabled-guild-config-repository.ts`, retaining the old repository port until its consumers are migrated
- [X] T011 [P] Write failing deterministic memory-adapter tests for separate registration/config records, enabled active-read filtering, V1/V2 parsing, and fault controls in `tests/unit/in-memory-guild-repository.test.ts`
- [X] T012 Add registration/config storage plus the `EnabledGuildConfigRepository` read methods in `src/infrastructure/memory/in-memory-guild-repository.ts`, retaining `src/infrastructure/memory/in-memory-guild-config-repository.ts` as a temporary compatibility adapter until all consumers migrate in T023
- [X] T013 [P] Write failing Firestore-emulator tests for separate V1 registration records, V2/legacy configuration translation, enabled active reads, orphan gating, and bounded provider errors in `tests/integration/firestore-guild-repository.test.ts`
- [X] T014 Add shared record translation plus `EnabledGuildConfigRepository` read methods in `src/infrastructure/firestore/firestore-guild-repository.ts`, retaining `src/infrastructure/firestore/firestore-guild-config-repository.ts` as a temporary compatibility adapter until all consumers migrate in T023
- [X] T015 Update isolated reset/seed helpers to manage registrations and configurations without production access in `tests/support/firestore-emulator.ts` and `src/infrastructure/firestore/seed-guild-config.ts`
- [X] T016 [P] Write failing worker tests proving unregistered, unconfigured, disabled, deleted, invalid, and unavailable guilds safely skip while registered/enabled guilds behave normally in `tests/unit/manage-temporary-room.test.ts`, `tests/unit/reconcile-temporary-rooms.test.ts`, and `tests/integration/gateway-lifecycle.test.ts`
- [X] T017 Migrate room creation, reconciliation, and Gateway configuration reads to `EnabledGuildConfigRepository` in `src/application/manage-temporary-room.ts`, `src/application/reconcile-temporary-rooms.ts`, and `src/infrastructure/discord/discord-gateway-event-source.ts`
- [X] T018 [P] Write failing configuration-lifecycle notification tests for schedule start, interval reschedule, disable cancellation, delete cancellation, and restart reconstruction in `tests/unit/guild-config-change-notifier.test.ts`
- [X] T019 Define the provider-neutral change notifier and adapt reconciliation lifecycle controls in `src/ports/guild-config-change-notifier.ts`, `src/application/reconcile-temporary-rooms.ts`, and `src/infrastructure/discord/discord-gateway-event-source.ts`
- [X] T020 [P] Extend observability tests with bounded registration/configuration outcomes and assertions excluding identifiers, submitted values, Discord data, provider details, and secrets in `tests/unit/observability.test.ts`
- [X] T021 Add privacy-safe administration outcome metrics/logging and persistence-readiness transitions in `src/infrastructure/logging/observability.ts`
- [X] T022 Wire one shared guild repository into worker readers, reconciliation notification, and disposal in `src/composition/root.ts` and update deterministic seed IPC behavior in `src/main.ts`
- [X] T023 After T015, T017, and T022 migrate their consumers, migrate or remove every remaining legacy repository importer and test, update Gateway/E2E fixtures to explicit registration plus enabled configuration, then remove `src/application/guild-config-service.ts`, `src/ports/guild-config-repository.ts`, `src/infrastructure/memory/in-memory-guild-config-repository.ts`, and `src/infrastructure/firestore/firestore-guild-config-repository.ts`; cover `tests/unit/guild-config-service.test.ts`, `tests/unit/guild-config-boundary.test.ts`, `tests/integration/firestore-guild-config-seed.test.ts`, `tests/integration/firestore-guild-config-repository.test.ts`, `tests/integration/gateway-lifecycle.test.ts`, `tests/e2e/worker-guild-config.test.ts`, and `tests/e2e/worker-voice-state.test.ts`

**Checkpoint**: Persistence can represent unconfigured registrations, the worker consumes only
registered/enabled configuration, and all existing Discord behavior is regression-safe.

---

## Phase 3: User Story 1 - Register and Understand Guilds (Priority: P1) 🎯 MVP

**Goal**: Serve the administration page, list authoritative guild states, and register exactly one
valid guild either unconfigured or with atomic initial configuration.

**Independent Test**: Open the compiled page against empty isolated persistence, reject an invalid ID,
register a guild without configuration, verify its Unconfigured/Inactive row, reject its duplicate,
and separately register guilds with valid initial configuration using both the default-enabled and
explicitly-disabled creation paths.

### Tests for User Story 1

- [ ] T024 [P] [US1] Write failing application tests for list, retrieve, invalid registration, duplicate/concurrent registration, unconfigured registration, and atomic initial configuration that defaults enabled but honors explicit disabled creation in `tests/unit/guild-administration-service.test.ts`
- [ ] T025 [P] [US1] Write failing HTTP contract tests for `GET/POST /admin/api/guilds` and `GET /admin/api/guilds/:guildId`, including 400/404/409/503 safe errors, in `tests/integration/admin-http.test.ts`
- [ ] T026 [P] [US1] Write failing React tests for loading, empty, error, configured/unconfigured list states, status badges, responsive table semantics, and row actions in `tests/unit/admin/guild-list.test.tsx`
- [ ] T027 [P] [US1] Write failing React tests for guild-ID validation, duplicate-submit prevention, cancel, register-only, optional initial configuration with a default-on enabled control and explicit disabled selection, conflict, and uncertain-result refresh in `tests/unit/admin/register-guild-dialog.test.tsx`
- [ ] T028 [P] [US1] Write failing emulator tests for persisted registration, duplicate/concurrent rejection, registration without configuration, and atomic registration with default-enabled or explicitly-disabled configuration in `tests/integration/firestore-guild-repository.test.ts`
- [ ] T029 [P] [US1] Write failing static-delivery tests for `/admin`, `/admin/`, hashed assets, non-API fallback, missing assets, and health endpoint independence in `tests/integration/admin-static-assets.test.ts`

### Implementation for User Story 1

- [X] T030 [US1] Implement the registration capability port with transaction-equivalent list, retrieve, duplicate-safe register, and optional atomic initial configuration that defaults enabled but preserves explicit disabled selection in both guild repository adapters and `src/application/guild-administration-service.ts`
- [X] T031 [US1] Implement provider-neutral Zod HTTP DTOs and stable safe error mapping for the OpenAPI contract in `src/infrastructure/http/admin-api-schemas.ts` and `src/infrastructure/http/admin-error-response.ts`
- [X] T032 [US1] Register list, retrieve, and create routes under `/admin/api/guilds` and compose the completed administration service/routes in `src/infrastructure/http/admin-api-routes.ts`, `src/infrastructure/http/operational-server.ts`, and `src/composition/root.ts`
- [X] T033 [P] [US1] Implement typed API DTOs, snowflake/config form validation, and centralized fetch/error handling in `admin/src/features/guilds/types.ts`, `admin/src/features/guilds/validation.ts`, and `admin/src/features/guilds/api/guild-admin-api.ts`
- [X] T034 [P] [US1] Implement the accessible guild table, status badges, empty/error/loading states, and action affordances in `admin/src/features/guilds/components/guild-list.tsx`
- [X] T035 [P] [US1] Implement the shared controlled configuration fields, including a default-on enabled Switch shown for creation but excluded from editing, needed by atomic registration and later create/edit flows in `admin/src/features/guilds/components/guild-config-form.tsx`
- [X] T036 [US1] Implement the multi-step registration Dialog with register-only and register-with-configuration completion, including explicit disabled initial configuration, in `admin/src/features/guilds/components/register-guild-dialog.tsx`
- [X] T037 [US1] Compose the page title, description, refresh lifecycle, registration flow, and list in `admin/src/app/app.tsx`
- [X] T038 [US1] Serve `dist/admin` with asset cache policy and direct-load fallback without intercepting API/health paths in `src/infrastructure/http/admin-static-routes.ts` and `src/infrastructure/http/operational-server.ts`
- [X] T039 [US1] Add a credential-free Playwright MVP scenario for opening the compiled page and registration/list flows, including an explicitly disabled initial configuration, in `tests/e2e/admin-guild-management.spec.ts and tests/support/admin-test-server.ts`

**Checkpoint**: User Story 1 is a deployable MVP: operators can understand and establish the guild
inventory without raw persistence access.

---

## Phase 4: User Story 2 - Create and Inspect Configuration (Priority: P1)

**Goal**: Add valid configuration to an existing registered guild and inspect the complete persisted
values Voicelet uses.

**Independent Test**: Seed an unconfigured registration, add configuration, verify success and list
state, then open a read-only view showing every persisted setting and Enabled status.

### Tests for User Story 2

- [ ] T040 [P] [US2] Add failing application tests for configuration retrieval, create-only semantics, default-enabled and explicitly-disabled creation, validation, not-found, and unavailable preservation in `tests/unit/guild-administration-service.test.ts`
- [ ] T041 [P] [US2] Add failing HTTP contract tests for default-enabled and explicitly-disabled configuration creation through `PUT /admin/api/guilds/:guildId/configuration`, including 201/400/404/409/503, in `tests/integration/admin-http.test.ts`
- [ ] T042 [P] [US2] Add failing emulator tests for create-only configuration, required registration, normalized defaults, explicit disabled creation, invalid no-write, and read-after-restart in `tests/integration/firestore-guild-repository.test.ts`
- [ ] T043 [P] [US2] Write failing React tests for required fields, default-on enabled control, explicit disabled creation, invalid-value preservation, successful create refresh, and read-only display of all persisted values in `tests/unit/admin/guild-config-dialog.test.tsx`

### Implementation for User Story 2

- [X] T044 [US2] Implement the configuration-creation capability port with required registration, normalized defaults, explicit disabled preservation, and create-only conflict behavior in `src/infrastructure/memory/in-memory-guild-repository.ts`, `src/infrastructure/firestore/firestore-guild-repository.ts`, and `src/application/guild-administration-service.ts`
- [X] T045 [US2] Implement the configuration PUT route and 201 create response in `src/infrastructure/http/admin-api-routes.ts`
- [X] T046 [P] [US2] Implement the read-only configuration presentation and Enabled/Disabled badge in `admin/src/features/guilds/components/guild-config-view.tsx`
- [X] T047 [US2] Implement shared create/view Dialog modes with a default-on creation Switch, explicit disabled submission, persisted-data loading, cancel, success, and safe error feedback in `admin/src/features/guilds/components/guild-config-dialog.tsx`
- [X] T048 [US2] Wire Add Configuration and View Configuration row actions to server-authoritative refresh in `admin/src/app/app.tsx` and `admin/src/features/guilds/components/guild-list.tsx`
- [X] T049 [US2] Extend the Playwright scenario through add-configuration and view-verification using isolated persistence in `tests/e2e/admin-guild-management.spec.ts`

**Checkpoint**: User Story 2 independently turns an unconfigured registration into a verifiably
configured guild.

---

## Phase 5: User Story 3 - Edit and Activate Configuration (Priority: P1)

**Goal**: Edit from persisted values and safely disable/re-enable configuration without losing data,
including immediate reconciliation lifecycle updates.

**Independent Test**: Load a configured guild, edit one value, reject a stale/invalid edit without
loss, disable it, restart and verify all values plus Disabled state, then re-enable and verify normal
worker behavior resumes.

### Tests for User Story 3

- [ ] T050 [P] [US3] Add failing application tests for complete revision-checked replacement, preserved enabled state, cancel/no-call expectations, stale conflicts, enable, disable, unchanged-value preservation, and notification outcomes in `tests/unit/guild-administration-service.test.ts`
- [ ] T051 [P] [US3] Add failing HTTP tests for replace and `PATCH /admin/api/guilds/:guildId/configuration/enabled`, including revision conflict and safe current-state refresh, in `tests/integration/admin-http.test.ts`
- [ ] T052 [P] [US3] Add failing emulator tests for complete replacement atomicity, omitted-field rejection, enabled-state preservation, concurrent revision conflict, disabled-value retention, re-enable, and enabled state across repository restart in `tests/integration/firestore-guild-repository.test.ts`
- [ ] T053 [P] [US3] Add failing worker tests for no behavior while disabled, normal behavior after enable, and start/reschedule/cancel notification effects in `tests/unit/manage-temporary-room.test.ts`, `tests/unit/reconcile-temporary-rooms.test.ts`, and `tests/integration/gateway-lifecycle.test.ts`
- [ ] T054 [P] [US3] Write failing React tests for persisted edit population, cancel/no mutation, invalid/API failure preservation, conflict refresh, non-optimistic switch, retained values, and accessible feedback in `tests/unit/admin/guild-config-dialog.test.tsx` and `tests/unit/admin/guild-list.test.tsx`

### Implementation for User Story 3

- [ ] T055 [US3] Implement the configuration-mutation capability port with complete revision-checked replacement and enabled-state persistence/application use cases with lifecycle notification in `src/infrastructure/memory/in-memory-guild-repository.ts`, `src/infrastructure/firestore/firestore-guild-repository.ts`, and `src/application/guild-administration-service.ts`
- [ ] T056 [US3] Complete PUT replacement and PATCH enabled-state mappings from the OpenAPI contract in `src/infrastructure/http/admin-api-routes.ts`
- [ ] T057 [US3] Implement edit mode using the shared persisted configuration form and conflict-safe refresh in `admin/src/features/guilds/components/guild-config-dialog.tsx`
- [ ] T058 [US3] Implement the accessible persisted-result Switch and distinct edit/view actions in `admin/src/features/guilds/components/guild-list.tsx`
- [ ] T059 [US3] Wire edit, enable, disable, and failure refresh flows without optimistic state in `admin/src/app/app.tsx`
- [X] T060 [US3] Extend emulator-backed worker E2E coverage for disabled restart persistence and re-enabled room behavior in `tests/e2e/worker-guild-config.test.ts`
- [ ] T061 [US3] Extend the Playwright scenario through edit, disable, retained-value verification, restart, and re-enable in `tests/e2e/admin-guild-management.spec.ts`

**Checkpoint**: User Story 3 provides reversible activation control while persisted configuration and
existing enabled worker behavior remain correct.

---

## Phase 6: User Story 4 - Permanently Delete a Guild (Priority: P2)

**Goal**: Explicitly confirm and atomically delete a selected registration plus configuration without
touching Discord or any other guild.

**Independent Test**: Seed two guilds in different configuration states, cancel one deletion, confirm
the other, verify only its Voicelet records disappear, verify no Discord operation occurs, and
re-register it as new/unconfigured.

### Tests for User Story 4

- [ ] T062 [P] [US4] Add failing application tests for unconfigured/configured/disabled deletion, not-found/unavailable results, notifier cancellation, isolation, and re-registration in `tests/unit/guild-administration-service.test.ts`
- [ ] T063 [P] [US4] Add failing HTTP contract tests for `DELETE /admin/api/guilds/:guildId`, 204/400/404/503 mapping, and refreshed failure state in `tests/integration/admin-http.test.ts`
- [ ] T064 [P] [US4] Add failing emulator tests for transactional registration/config deletion, configured-state variants, provider failure rollback, guild isolation, and clean re-registration in `tests/integration/firestore-guild-repository.test.ts`
- [ ] T065 [P] [US4] Write failing React tests for destructive styling, required confirmation copy, cancel, duplicate-submit prevention, success removal, and failure retention in `tests/unit/admin/delete-guild-dialog.test.tsx`
- [ ] T066 [P] [US4] Add failing simulated-Discord assertions that deletion invokes no Discord guild/channel/category/room mutation in `tests/integration/gateway-lifecycle.test.ts`

### Implementation for User Story 4

- [ ] T067 [US4] Implement the deletion capability port with atomic delete and bounded result mapping in `src/infrastructure/memory/in-memory-guild-repository.ts` and `src/infrastructure/firestore/firestore-guild-repository.ts`
- [ ] T068 [US4] Implement delete use-case validation, post-commit cancellation notification, and isolation guarantees in `src/application/guild-administration-service.ts`
- [ ] T069 [US4] Implement the DELETE route with safe 204/400/404/503 responses in `src/infrastructure/http/admin-api-routes.ts`
- [ ] T070 [US4] Implement the destructive AlertDialog with explicit Voicelet-data and no-Discord-resource copy in `admin/src/features/guilds/components/delete-guild-dialog.tsx`
- [ ] T071 [US4] Wire confirmed deletion, cancel, pending state, failure retention, and authoritative list refresh in `admin/src/app/app.tsx` and `admin/src/features/guilds/components/guild-list.tsx`
- [ ] T072 [US4] Complete the Playwright journey through cancel/confirm deletion, isolated guild preservation, disappearance, and clean re-registration in `tests/e2e/admin-guild-management.spec.ts`

**Checkpoint**: All four user stories work independently and the complete administration lifecycle is
available without Discord-side deletion.

---

## Phase 7: Polish and Cross-Cutting Concerns

**Purpose**: Complete accessibility, security, performance, delivery, documentation, and the full
evidence required for release.

- [ ] T073 [P] Add keyboard/focus, label, status announcement, and tablet overflow coverage plus a loopback Playwright budget measuring the median of five warm 100-row request-to-render loads and confirmed mutations against the Firestore emulator in `tests/unit/admin/accessibility.test.tsx` and `tests/e2e/admin-performance.spec.ts`
- [X] T074 [P] Add security regression checks proving no Firebase browser SDK, Vite-exposed secret, raw provider error, credential, raw Discord data, or identifier-bearing telemetry reaches assets/responses/logs in `tests/integration/admin-security.test.ts`
- [X] T075 [P] Add API/static route resilience tests proving admin persistence or asset failures do not change `/livez`, `/readyz`, or `/metrics` behavior in `tests/integration/operational-http.test.ts`
- [ ] T076 Integrate frontend compilation and `dist/admin` into the existing build/prune/runtime stages, exclude frontend source maps and development-only content, and smoke-test `/admin`, an asset, API, and operational endpoints in `Dockerfile`, `.dockerignore`, and `package.json`
- [ ] T077 [P] Update CI and publication assertions so frontend type/lint/test/build, Playwright/emulator E2E, one image, and the existing GHCR pipeline gate delivery in `.github/workflows/ci.yml`, `.github/workflows/publish-container.yml`, and `tests/integration/deployment-artifacts.test.ts`
- [ ] T078 [P] Document local backend/Vite/emulator startup, `/admin` access, frontend structure, shadcn maintenance, API boundary, production build, and operator workflows for register, configure, view, edit, enable, disable, and permanent deletion including its no-Discord-resource effect in `README.md`, `CONTRIBUTING.md`, and `docs/local-discord-development.md`
- [ ] T079 [P] Document the React → HTTP adapter → application → ports → persistence flow and same-process Discord worker in `docs/architecture.md`
- [ ] T080 [P] Document component/API/persistence/browser test commands and isolated credentials-free fixtures in `docs/testing.md`
- [ ] T081 [P] Document same-image Northflank deployment, prominent unauthenticated `/admin` and `/admin/api` VPN/private-network requirements, V2 rollback limits, roll-forward recovery, and verified-backup restoration in `docs/deployment.md` and `.env.example`
- [X] T082 Add documentation and package-contract assertions for all admin commands, security warnings, shadcn ownership, and unchanged worker workflows in `tests/integration/documentation.test.ts` and `tests/integration/configuration-startup.test.ts`
- [ ] T083 Run every scenario in `specs/010-guild-administration-ui/quickstart.md`, then run `pnpm check`, `pnpm test:persistence:integration`, `pnpm test:persistence:e2e`, `pnpm test:admin:e2e`, and `pnpm container:smoke`; record any environment-specific failure honestly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: Starts immediately; T003 depends on T001 and T002, and T006 follows T001,
  T002, T004, and T005.
- **Phase 2 — Foundational**: Depends on Phase 1 and blocks all stories. Within it, tests precede
  their active-read/scaffolding implementations: T007→T008, T009→T010, T011→T012,
  T013→T014→T015,
  T016→T017, T018→T019, and T020→T021; T022 follows the ports/adapters/notifier, and T023 follows
  T015, T017, and T022 so the legacy port, service, and compatibility adapters are removed only
  after every production, helper, fixture, and test consumer is migrated.
- **Phase 3 — US1**: Depends on Foundation. Test tasks T024–T029 can be written in parallel; T028
  precedes the registration repository/application work in T030, service precedes routes/composition,
  shared client/components precede page composition, and all precede T039.
- **Phase 4 — US2**: Depends on the US1 registration/list foundation but can be tested independently
  from seeded registration. T040–T043 precede repository/application creation work in T044 and then
  T045–T048; T049 completes the story.
- **Phase 5 — US3**: Depends on persisted configuration from US2. T050–T054 precede repository,
  application, route, worker, and UI changes; T060 and T061 validate backend and browser behavior.
- **Phase 6 — US4**: Depends only on Foundation for backend semantics and US1 for the visible list;
  it may start in parallel with US2/US3 using seeded fixtures. T062–T066 precede T067–T071, then
  T072 validates the story.
- **Phase 7 — Polish**: Depends on all selected stories. Parallel checks/docs precede T082 contract
  assertions and T083 final validation.

### User Story Dependency Graph

```text
Setup → Foundation → US1 Register/List (MVP) → US2 Create/View Config → US3 Edit/Enable/Disable
                    └──────────────────────────→ US4 Delete
All selected stories → Polish/Delivery
```

### Parallel Opportunities

- Setup configuration tasks T002, T004, and T005 can proceed in parallel after dependency selection.
- Each foundational test task marked `[P]` targets a distinct boundary; implementation follows its
  corresponding failing test.
- Within US1, application, HTTP, frontend list/dialog, persistence, and static tests can be authored
  concurrently before implementation.
- Within US2 and US3, application, HTTP, emulator, worker, and component tests are independent.
- US4 backend/API/persistence/UI/Discord-safety tests can be written in parallel and US4 can proceed
  alongside US2/US3 once the Foundation and visible list exist.
- Documentation tasks T078–T081 and cross-cutting tests T073–T075/T077 target separate files.

## Parallel Execution Examples

### User Story 1

```text
T024 Application registration tests in tests/unit/guild-administration-service.test.ts
T025 Admin HTTP list/register tests in tests/integration/admin-http.test.ts
T026 Guild list component tests in tests/unit/admin/guild-list.test.tsx
T027 Registration dialog tests in tests/unit/admin/register-guild-dialog.test.tsx
T028 Firestore registration tests in tests/integration/firestore-guild-repository.test.ts
T029 Static asset route tests in tests/integration/admin-static-assets.test.ts
```

### User Story 2

```text
T040 Application configuration-create tests in tests/unit/guild-administration-service.test.ts
T041 HTTP configuration-create tests in tests/integration/admin-http.test.ts
T042 Firestore configuration-create tests in tests/integration/firestore-guild-repository.test.ts
T043 Configuration dialog/view tests in tests/unit/admin/guild-config-dialog.test.tsx
```

### User Story 3

```text
T050 Application edit/toggle tests in tests/unit/guild-administration-service.test.ts
T051 HTTP replace/enabled tests in tests/integration/admin-http.test.ts
T052 Firestore revision/restart tests in tests/integration/firestore-guild-repository.test.ts
T053 Worker active-state tests in tests/unit and tests/integration
T054 React edit/toggle tests in tests/unit/admin
```

### User Story 4

```text
T062 Application deletion tests in tests/unit/guild-administration-service.test.ts
T063 HTTP DELETE tests in tests/integration/admin-http.test.ts
T064 Firestore transactional deletion tests in tests/integration/firestore-guild-repository.test.ts
T065 Delete dialog tests in tests/unit/admin/delete-guild-dialog.test.tsx
T066 Discord no-mutation tests in tests/integration/gateway-lifecycle.test.ts
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundation, including active-worker filtering and regression migration.
2. Complete User Story 1 through T039.
3. Validate the compiled page, invalid/duplicate handling, unconfigured registration, optional atomic
   configuration, and list refresh independently.
4. Demo the MVP locally without production credentials; do not deploy publicly because the endpoint
   is unauthenticated.

### Incremental Delivery

1. **US1** establishes a trustworthy persisted guild inventory and the deployable page/API shell.
2. **US2** makes an existing registration configurable and inspectable.
3. **US3** adds safe editing and reversible activation with live worker synchronization.
4. **US4** adds explicitly confirmed permanent removal and clean re-registration.
5. Polish completes the full browser journey, container/Northflank path, docs, and release gates.

### Parallel Team Strategy

After Setup/Foundation, one developer can own backend application/API work, one can own React
components, and one can own emulator/browser coverage. Coordinate edits to shared files
`guild-administration-service.ts`, `admin-api-routes.ts`, `app.tsx`, and the Firestore adapter so tests
land before the implementation they govern.

## Notes

- Keep generated shadcn primitives separate from Voicelet-specific components and add no unused
  component.
- Never use a fake configuration to represent Unconfigured and never let a configuration document
  imply registration.
- All client displays after mutation come from confirmed API state; do not persist configuration in
  browser storage or apply an optimistic enabled toggle.
- Do not log guild IDs, channel/category IDs, request bodies, Discord data, credentials, or provider
  errors.
- No task introduces authentication, SSR, a router, Redux/global state, browser Firebase, a second
  Node process, frontend artifact, or deployment service.
- Do not commit implementation changes until the user explicitly approves a focused commit.
