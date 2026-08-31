---
description: "Dependency-ordered implementation tasks for container build, publishing, and Northflank deployment"
---

# Tasks: Container Build, Publishing, and Northflank Deployment

**Input**: Design documents from `specs/007-container-deployment-pipeline/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [deployment workflow contract](./contracts/deployment-workflow.md),
and [quickstart.md](./quickstart.md)

**Tests**: Workflow/container contract coverage, local production-container smoke validation, and the
existing full `pnpm check` suite are mandatory under the specification and constitution.

**Organization**: Tasks are grouped by user story so each delivery increment is independently
testable. The deployment workflow depends on a published image, but an older retained image may be
used for its independent validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its stated dependencies and when target files do not overlap.
- **[Story]**: Identifies the user story served by the task.
- Every task includes its exact target path.

## Phase 1: Setup and Operations Contract

**Purpose**: Establish the repository guardrails and local validation seam before changing delivery
artifacts.

- [X] T001 Add focused container/workflow/documentation contract assertions for immutable SHA tags,
  least-privilege permissions, PR non-publication, manual deployment input validation, bounded
  verification, and secret-safe documentation in `tests/integration/deployment-artifacts.test.ts`.
- [X] T002 Add a credential-free production-container smoke-test helper using the simulated
  Gateway and endpoint assertions in `tests/integration/deployment-artifacts.test.ts`.
- [X] T003 [P] Record the required GitHub secrets, variables, Northflank RBAC scope, existing GHCR
  pull-credential prerequisite, and safe operator evidence in `docs/deployment.md`.

---

## Phase 2: Foundational Container Artifacts (Blocking Prerequisites)

**Purpose**: Create a reproducible, secret-safe production image and a CI surface that every user
story relies on.

**⚠️ CRITICAL**: Complete this phase before publishing or deployment workflows are enabled.

- [X] T004 Define the multi-stage Node 24 production build, frozen-lockfile install, compiled
  entrypoint, production-only runtime dependencies, non-root user, and operational HTTP healthcheck
  in `Dockerfile`.
- [X] T005 [P] Exclude `.env` variants, Git metadata, local dependencies, build output, coverage,
  logs, and other non-runtime context in `.dockerignore`.
- [X] T006 Add a local Docker build/run and simulated-Gateway endpoint validation command to
  `package.json` without exposing runtime secrets.
- [X] T007 Make the new container contract and smoke-test coverage pass in
  `tests/integration/deployment-artifacts.test.ts`.
- [X] T008 Run `pnpm check` and the documented local Docker smoke scenario; resolve container-related
  failures in `Dockerfile`, `.dockerignore`, `package.json`, and
  `tests/integration/deployment-artifacts.test.ts`.

**Checkpoint**: A clean checkout can build a production image and run it with separately supplied
configuration; `/livez`, `/readyz`, and `/metrics` are reachable in simulated mode.

---

## Phase 3: User Story 1 - Produce a Deployable Application Version (Priority: P1) 🎯 MVP

**Goal**: Main revisions that clear every quality gate publish one traceable, immutable GHCR image;
pull requests validate the image without publishing it.

**Independent Test**: Inspect the workflow and run its local-equivalent commands to verify full
quality gating, production-image validation, SHA-tag/OCI metadata construction, and the absence of
pull-request publication credentials or publish steps.

### Tests for User Story 1

- [X] T009 [US1] Add publisher workflow contract cases for pull-request non-publication,
  main-only GHCR publication, full-SHA immutable tags, OCI source/revision labels, pinned actions,
  and minimum permissions in `tests/integration/deployment-artifacts.test.ts`.
- [X] T010 [US1] Add a repository contract case confirming documentation distinguishes mutable
  convenience tags from immutable deployable versions in `tests/integration/deployment-artifacts.test.ts`.

### Implementation for User Story 1

- [X] T011 [US1] Create the pull-request/main GitHub Actions quality, production-image-build, and
  GHCR-publish workflow with `pnpm check`, main-only authenticated publishing, full-SHA tags, OCI
  labels, optional `main` tag, and least-privilege permissions in `.github/workflows/publish-container.yml`.
- [X] T012 [US1] Update existing CI trigger/permission behavior only as needed to avoid duplicate
  conflicting quality enforcement while preserving reproducible PR and main checks in
  `.github/workflows/ci.yml`.
- [X] T013 [US1] Make the User Story 1 workflow/documentation contract cases pass in
  `tests/integration/deployment-artifacts.test.ts`.

**Checkpoint**: A passing main revision produces `sha-<40-character-commit-sha>` in GHCR; a pull
request never produces a deployable package, and publication never triggers Northflank.

---

## Phase 4: User Story 2 - Intentionally Deploy a Selected Version (Priority: P2)

**Goal**: An operator manually supplies a retained immutable SHA version, which is validated and
resolved to a digest before the existing Northflank service is changed.

**Independent Test**: Inspect or dry-run the workflow with a malformed version and a known retained
version, verifying the former fails before update and the latter is converted to a digest-qualified
reference while preserving Northflank runtime configuration.

### Tests for User Story 2

- [X] T014 [US2] Add deployment workflow contract cases for `workflow_dispatch`, strict
  `image_version` validation, GHCR tag existence/digest resolution, no mutable tag deployment,
  read-only GHCR permissions, and secret-safe output in `tests/integration/deployment-artifacts.test.ts`.
- [X] T015 [US2] Add contract assertions that deployment reads the previous Northflank image and
  changes only the external image reference while retaining runtime configuration in
  `tests/integration/deployment-artifacts.test.ts`.

### Implementation for User Story 2

- [X] T016 [US2] Create the manually dispatched Northflank deployment workflow with documented
  repository configuration, required readiness URL validation, strict SHA-tag input rejection, GHCR
  descriptor inspection, prior-image capture, digest-qualified image update through the current
  Northflank service deployment API, and least-privilege permissions in
  `.github/workflows/deploy-northflank.yml`.
- [X] T017 [US2] Make the User Story 2 workflow contract cases pass in
  `tests/integration/deployment-artifacts.test.ts`.

**Checkpoint**: The only way to update Northflank is an explicit workflow dispatch selecting a valid
retained SHA version; the workflow cannot silently use `main`, `latest`, or another image tag.

---

## Phase 5: User Story 3 - Verify and Roll Back a Deployment (Priority: P3)

**Goal**: Deployment succeeds only after bounded platform and readiness evidence, and selecting an
older retained SHA version performs a rollback without rebuilding it.

**Independent Test**: Validate the workflow's safe summary and failure paths for terminal deployment
status, failed containers, readiness failure, and timeout; then use an earlier retained SHA input as
the rollback case.

### Tests for User Story 3

- [X] T018 [US3] Add workflow contract cases for five-minute bounded polling, terminal
  Northflank/container failure, readiness success/failure, safe requested/digest/previous-version
  summaries, and no secret/API-response logging in `tests/integration/deployment-artifacts.test.ts`.
- [X] T019 [US3] Add rollback contract cases showing any retained older SHA version follows the
  same validation and digest deployment path without a build in
  `tests/integration/deployment-artifacts.test.ts`.

### Implementation for User Story 3

- [X] T020 [US3] Add bounded Northflank service/container polling, required configured `/readyz`
  verification, clear failure exits, and safe requested/digest/previous-image/final-state summaries in
  `.github/workflows/deploy-northflank.yml`.
- [X] T021 [US3] Make the User Story 3 verification and rollback contract cases pass in
  `tests/integration/deployment-artifacts.test.ts`.

**Checkpoint**: A Northflank update acceptance alone cannot report success; a retained earlier SHA
version can be selected to roll back through the same workflow.

---

## Phase 6: Polish and Cross-Cutting Concerns

**Purpose**: Complete operator documentation and final repository evidence.

- [X] T022 [P] Document production Docker build/run, endpoint checks, immutable SHA versioning,
  GHCR discovery, manual deployment, exact-version selection, Git commit lookup, rollback, and
  build-time versus Northflank runtime configuration in `README.md`.
- [X] T023 [P] Finalize secure deployment prerequisites, Northflank configuration boundary,
  operator troubleshooting, expected safe workflow output, and rollback instructions in
  `docs/deployment.md`.
- [X] T024 Update architecture/testing documentation for the operations boundary and container/
  workflow validation evidence in `docs/architecture.md` and `docs/testing.md`.
- [X] T025 Run the complete quickstart validation and resolve documentation-contract gaps in
  `specs/007-container-deployment-pipeline/quickstart.md`, `README.md`, `docs/deployment.md`, and
  `tests/integration/deployment-artifacts.test.ts`.
- [X] T026 Run `pnpm check` and the documented production Docker smoke test; resolve all
  feature-related failures in `package.json`, `Dockerfile`, `.dockerignore`, `.github/workflows/`,
  `tests/integration/deployment-artifacts.test.ts`, `README.md`, and `docs/`.

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately. T001 supplies the shared contract suite; T002 and T003
  can proceed in parallel.
- **Foundational (Phase 2)**: Depends on T001–T003 and blocks all story workflows. T004–T006 can
  proceed in parallel; T007–T008 validate their integration.
- **US1 (Phase 3)**: Depends on the completed production image from Phase 2.
- **US2 (Phase 4)**: Depends on US1, which makes the selected published version available.
- **US3 (Phase 5)**: Depends on US2's update workflow.
- **Polish (Phase 6)**: Depends on the desired story phases; T026 is the final quality gate.

### User Story Dependencies

- **US1 (P1)**: Needs the foundational container artifacts; it is the independently useful MVP.
- **US2 (P2)**: Needs a published image contract from US1 but can validate its logic against a
  retained image rather than a new build.
- **US3 (P3)**: Extends US2 with bounded verification and rollback evidence.

### Parallel Opportunities

- T002 and T003 modify different artifacts and can proceed with T001.
- T004, T005, and T006 target Docker build, build context, and local validation seams separately.
- T009–T010, T014–T015, and T018–T019 are sequenced contract assertions because each pair shares
  `tests/integration/deployment-artifacts.test.ts`; they precede the corresponding workflow work.
- T022 and T023 can proceed in parallel once workflow behavior is stable; T024 reconciles the
  architecture and testing documentation afterward.

## Parallel Example: User Story 1

```text
T009: tests/integration/deployment-artifacts.test.ts (publisher workflow contract)
T010: tests/integration/deployment-artifacts.test.ts (immutable-version documentation contract)
```

T009 and T010 should be authored as distinct test cases; because they share one file, apply them
serially in a single worktree despite their logically independent coverage.

## Implementation Strategy

### MVP First

1. Establish the contract coverage and reproducible production image.
2. Complete T009–T013 to publish safe, immutable GHCR versions after main quality gates.
3. Validate publication behavior before giving any workflow Northflank credentials.

### Incremental Delivery

1. Deliver local container execution and GHCR publication (US1).
2. Add explicit digest-selected deployment that preserves Northflank runtime configuration (US2).
3. Add bounded verification and rollback evidence (US3).
4. Finalize operator documentation and execute the complete repository quality gate.

## Notes

- All 26 tasks use the required checkbox, sequential ID, optional parallel marker, story label where
  required, and exact target paths.
- The implementation must never add Discord, Northflank, or GHCR credentials to the Docker build,
  image, repository, or safe workflow output.
- The tasks intentionally omit automatic deployment, semantic release management, multi-environment
  delivery, infrastructure provisioning, and automatic rollback.
- Final local `pnpm check` passed with elevated permissions; `pnpm container:smoke` was attempted but
  Docker is unavailable in the current environment (`docker: command not found`).

## Phase 7: Convergence

These follow-up tasks capture implementation gaps found after the initial implementation pass. Existing
tasks remain unchanged and retain their original traceability.

- [X] T027 Pin both Node base-image references in `Dockerfile` to immutable digests while retaining
  the documented Node 24 runtime, and add a contract assertion for digest-pinned `FROM` lines in
  `tests/integration/deployment-artifacts.test.ts` (FR-001, plan: reproducible image decision)
  (partial).
- [X] T028 Pin every third-party action reference in `.github/workflows/ci.yml` to a full commit SHA
  and extend `tests/integration/deployment-artifacts.test.ts` to enforce this across all repository
  workflows (plan: workflow security constraint, Constitution VI) (partial).
- [X] T029 Extend `.github/workflows/deploy-northflank.yml` to list and validate Northflank service
  containers after deployment, requiring the expected running task state and rejecting failed or
  missing replicas, with safe contract coverage in `tests/integration/deployment-artifacts.test.ts`
  (FR-014, US3/AC1, plan: service/container verification decision) (partial).

## Phase 8: Convergence

- [X] T030 Execute `pnpm container:build` and `pnpm container:smoke` in a Docker-enabled environment,
  verify the production container exposes `/livez`, `/readyz`, and `/metrics` with simulated runtime
  configuration, and resolve any failures in `Dockerfile`, `.dockerignore`, or `package.json`
  (FR-001, FR-002, SC-002, US1/AC2, plan: local production-container smoke test) (partial).

## Phase 9: Convergence

- [ ] T031 Add secret-safe failure summaries to `.github/workflows/deploy-northflank.yml` for every
  deployment failure path, identifying the requested version, resolved digest and prior reference
  when safely available, and a failed outcome without exposing tokens or raw API responses; add
  contract coverage in `tests/integration/deployment-artifacts.test.ts` (FR-015, US2/AC3,
  plan: actionable observability) (partial).
