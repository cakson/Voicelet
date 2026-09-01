---
description: "Dependency-ordered implementation tasks for provider-neutral container delivery"
---

# Tasks: Provider-Neutral Container Delivery

**Input**: Design documents from `specs/008-agnostic-container-delivery/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [container delivery contract](./contracts/container-delivery.md),
and [quickstart.md](./quickstart.md)

**Tests**: Focused integration contract coverage and the full `pnpm check` suite are required by the
specification and constitution. Docker smoke validation remains required where Docker is available.

**Organization**: Tasks are grouped by user story so each delivery increment is independently
testable. The shared contract test and legacy workflow removal establish the boundary that all
stories rely on.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its stated dependencies and when target files do not overlap.
- **[Story]**: Identifies the user story served by the task.
- Every task includes its exact target path.

## Phase 1: Setup (Shared Contract)

**Purpose**: Establish a failing, provider-neutral repository delivery contract before changing
automation or documentation.

- [ ] T001 Replace the Northflank deployment assertions with GHCR-only publication, absence-of-provider-workflow, secret-boundary, and active-documentation consistency assertions in `tests/integration/deployment-artifacts.test.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Remove the repository-owned provider deployment surface that contradicts every user
story.

**⚠️ CRITICAL**: Complete this phase before considering any user story complete.

- [ ] T002 Document the pre-removal external GHCR-pull and immutable-image transition prerequisite in `docs/deployment.md` and add its focused assertion in `tests/integration/deployment-artifacts.test.ts`.
- [ ] T003 Delete the manual Northflank deployment workflow in `.github/workflows/deploy-northflank.yml` only after T002's documented transition prerequisite is in place, so CI has no deployment, verification, or rollback path.

**Checkpoint**: The only remaining delivery workflow is GHCR publication; the focused contract test
will still identify active documentation that needs alignment.

---

## Phase 3: User Story 1 - Understand the CI Delivery Boundary (Priority: P1) 🎯 MVP

**Goal**: Let maintainers determine from the deployment guide that successful CI ends with an
immutable GHCR image and never deploys it.

**Independent Test**: Run the focused deployment-artifact integration test and inspect
`docs/deployment.md`; it must describe quality-gated PR validation and main-only immutable GHCR
publication with no provider deployment instruction.

### Implementation for User Story 1

- [ ] T004 [US1] Rewrite the CI-flow, image-versioning, and local-container sections in `docs/deployment.md` so publication to GHCR is the final repository-managed action and no external deployment result is implied.
- [ ] T005 [US1] Make the provider-neutral CI-boundary assertions pass in `tests/integration/deployment-artifacts.test.ts` for `docs/deployment.md` and `.github/workflows/publish-container.yml`.

**Checkpoint**: A maintainer can rely on the deployment guide alone to understand the GHCR-only CI
boundary.

---

## Phase 4: User Story 2 - Deploy from the Registry on Any Compatible Platform (Priority: P2)

**Goal**: Give operators a platform-neutral handoff from an immutable GHCR image to their chosen
external container environment.

**Independent Test**: Review README and deployment guide together; both must identify immutable
image selection, separately supplied runtime configuration, and external registry authorization
without prescribing a hosting provider, deployment request, readiness check, or rollback process.

### Implementation for User Story 2

- [ ] T006 [US2] Add the platform-neutral external-image handoff, registry-pull authorization boundary, and separately supplied runtime-configuration guidance in `docs/deployment.md`.
- [ ] T007 [US2] Replace the manual Northflank deployment instructions with immutable GHCR handoff and external-environment responsibilities in `README.md`.
- [ ] T008 [US2] Make the README and deployment-guide platform-neutral handoff assertions pass in `tests/integration/deployment-artifacts.test.ts`.

**Checkpoint**: An operator can consume the published image on a compatible platform without
repository-specific platform credentials or automation.

---

## Phase 5: User Story 3 - Find Consistent Repository Guidance (Priority: P3)

**Goal**: Remove contradictory provider-specific delivery guidance from the remaining active
operations documentation and ensure it remains protected by regression coverage.

**Independent Test**: Search active README, operations documentation, and workflows for removed
provider deployment instructions; the focused delivery test must assert the workflow's absence
without itself being treated as operator guidance, while historical
`specs/007-container-deployment-pipeline/` records are unchanged.

### Implementation for User Story 3

- [ ] T009 [P] [US3] Replace the provider deployment architecture description with the GHCR-only repository boundary and external-platform responsibility in `docs/architecture.md`.
- [ ] T010 [P] [US3] Update delivery-test coverage documentation to name GHCR publication and provider-neutral contract validation in `docs/testing.md`.
- [ ] T011 [US3] Finalize active-documentation and workflow-absence regression assertions in `tests/integration/deployment-artifacts.test.ts` without scanning historical feature specifications.

**Checkpoint**: README, operational documentation, workflow inventory, and contract tests describe
one provider-neutral delivery model.

---

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: Produce final repository evidence and verify the documented validation path.

- [ ] T012 Run the quickstart review and reconcile any remaining wording or contract gaps in `specs/008-agnostic-container-delivery/quickstart.md`, `README.md`, `docs/deployment.md`, `docs/architecture.md`, `docs/testing.md`, and `tests/integration/deployment-artifacts.test.ts`.
- [ ] T013 Run `pnpm check` and, where Docker is available, `pnpm container:build` plus `pnpm container:smoke`; resolve feature-related failures in `.github/workflows/`, `tests/integration/deployment-artifacts.test.ts`, `README.md`, and `docs/`.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately and defines the expected provider-neutral boundary.
- **Foundational (Phase 2)**: Depends on T001; T002 documents the release transition prerequisite
  before T003 removes the legacy deployment workflow, and both block story completion.
- **US1 (Phase 3)**: Depends on T003 because the guide must not describe an active removed workflow.
- **US2 (Phase 4)**: Depends on T004; it extends the same guide and README with the external
  handoff boundary.
- **US3 (Phase 5)**: Depends on T006–T008 so all primary operator guidance is stable before
  architecture, testing, and final regression wording are aligned.
- **Polish (Phase 6)**: Depends on all user-story work; T013 is the final quality gate.

### User Story Dependencies

- **US1 (P1)**: Needs the provider workflow removed and establishes the independently useful MVP.
- **US2 (P2)**: Builds on the delivery guide established by US1, but is independently testable by
  comparing the guide and README against the external-environment boundary.
- **US3 (P3)**: Aligns remaining active repository materials after the operator-facing guidance is
  complete.

### Parallel Opportunities

- T009 and T010 can run in parallel because they modify different documentation files after US2.
- Documentation reviews may happen alongside contract-test execution, but edits to
  `tests/integration/deployment-artifacts.test.ts` (T001, T002, T005, T008, T011) must be serialized.
- The Docker smoke commands in T013 may run alongside a completed `pnpm check` only in an environment
  where Docker is available.

## Parallel Example: User Story 3

```text
T009: docs/architecture.md
T010: docs/testing.md
```

## Implementation Strategy

### MVP First

1. Complete T001–T003 to record the external transition prerequisite and make the GHCR-only automation boundary enforceable.
2. Complete T004–T005 so the deployment guide accurately describes that boundary.
3. Run the focused contract test; this is the smallest independently valuable delivery.

### Incremental Delivery

1. Deliver the GHCR-only guide (US1).
2. Add the operator-facing external handoff to the guide and README (US2).
3. Align architecture/testing documentation and final regression coverage (US3).
4. Run the complete quality and container-validation evidence (Phase 6).

## Notes

- All 13 tasks use the required checkbox, sequential ID, story label where applicable, and exact
  target paths.
- Historical artifacts under `specs/007-container-deployment-pipeline/` are intentionally not
  modified or tested as active operational guidance.
- The implementation must not add an external deployment workflow, provider credentials, runtime
  secrets, or raw Discord data to repository artifacts or logs.
