# Implementation Plan: Provider-Neutral Container Delivery

**Branch**: `008-agnostic-container-delivery` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-agnostic-container-delivery/spec.md`

## Summary

Make the repository's delivery boundary end at a quality-gated, immutable GHCR image. Remove the
provider-specific deployment workflow and all active documentation, architecture, testing, and
contract references to it. Retain local container validation and document that image pull
authorization, deployment, readiness verification, and rollback belong to the external container
environment.

## Technical Context

**Language/Version**: TypeScript on Node 24.20.0; Markdown and GitHub Actions YAML for this change.

**Primary Dependencies**: pnpm 10.15.0, Vitest integration tests, Docker, GitHub Actions, and GHCR.

**Storage**: N/A; the change does not add or modify persisted application data.

**Testing**: `pnpm check`, with focused Vitest contract tests in
`tests/integration/deployment-artifacts.test.ts`; local production-container smoke validation remains
documented where Docker is available.

**Target Platform**: GitHub-hosted Linux Actions runners for publication; any compatible external
OCI container environment for deployment.

**Project Type**: Existing Discord Gateway background worker; this feature changes operations
documentation and delivery automation only.

**Performance Goals**: No new runtime performance target. The documented local container smoke
scenario must continue to make `/livez`, `/readyz`, and `/metrics` available within 60 seconds in
simulated mode.

**Constraints**: CI validates, builds, and publishes only; a successful main revision publishes a
full-SHA GHCR tag plus optional mutable `main` tag. No runtime secrets, GHCR pull credentials, raw
Discord data, external deployment calls, readiness polling, or rollback automation may be embedded
in repository delivery automation.

**Scale/Scope**: One repository, one GHCR package, one publication workflow, one legacy
provider-specific workflow removal, and the active operational documents and contract tests that
describe it. Historical `specs/007-container-deployment-pipeline/` artifacts remain unchanged.

## Constitution Check

| Gate | Status | Evidence / plan response |
| --- | --- | --- |
| Testability | Pass | Replace the provider-deployment contract assertions with focused assertions for GHCR-only delivery and absence of provider automation. Run the full `pnpm check` gate. |
| Enforced quality gates | Pass | Preserve the existing quality-and-build job and main-only publish prerequisite; no quality gate is removed. |
| Explicit architecture | Pass | Changes stay at the operations and documentation boundary; no change to `domain ← application/ports ← infrastructure/composition`. |
| Documentation as deliverable | Pass | Update README, deployment, architecture, and testing documentation together and validate their terminology through integration contract tests. |
| Explicit API contracts | Pass | Replace the former provider deployment workflow contract with a repository container-delivery boundary contract. No public application API changes. |
| Security by default | Pass | Delete provider credentials and calls from repository automation; retain secret-free image and safe-output assertions. |
| Actionable observability | Pass | Clarify that deployment observability is owned by the external platform; retain publish and local container validation evidence without raw Discord data. |
| Reproducible repository | Pass | Keep frozen-lockfile quality checks, Docker build validation, and documented local smoke procedure. |
| Definition of done | Pass | Tasks will require docs, contract-test updates, workflow removal, and `pnpm check`. |

**Post-design re-check**: Pass. The design removes an operations integration instead of adding a
new dependency or exception. External deployment behavior remains intentionally outside the
repository architecture.

## Project Structure

### Documentation (this feature)

```text
specs/008-agnostic-container-delivery/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── container-delivery.md
└── tasks.md              # Created by $speckit-tasks
```

### Source Code (repository root)

```text
.github/workflows/
├── ci.yml
└── publish-container.yml

docs/
├── architecture.md
├── deployment.md
└── testing.md

tests/integration/
└── deployment-artifacts.test.ts

README.md
```

**Structure Decision**: Use existing repository documentation, workflow, and integration-contract
locations. Delete `.github/workflows/deploy-northflank.yml`; do not introduce a replacement
deployment workflow because external platforms consume the GHCR artifact independently.

## Complexity Tracking

No constitution violations require tracking.
