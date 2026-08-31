# Implementation Plan: Container Build, Publishing, and Northflank Deployment

**Branch**: `007-container-deployment-pipeline` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-container-deployment-pipeline/spec.md`

## Summary

Package the Node background worker in a reproducible multi-stage Docker image, with only compiled
output and production dependencies in the final stage. A separate publish workflow runs the full
existing quality gate and publishes main-branch images to GHCR with a full-Git-SHA tag, OCI
source/revision labels, and an optional `main` convenience tag. A manually dispatched deployment
workflow accepts only that immutable tag format, resolves it to an image digest, records the previous
Northflank image, instructs the existing service to use the digest-qualified image, and performs
bounded Northflank-state, container-state, and `/readyz` verification. Runtime configuration remains
with Northflank throughout.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 24.20.0; Docker build uses Node 24.

**Primary Dependencies**: discord.js 14, Fastify 5, Pino 9, prom-client 15, Zod 4; pnpm 10.15;
GitHub Actions, GitHub Container Registry, and Northflank API.

**Storage**: N/A; no application data is persisted. Images are retained by GHCR according to its
package retention policy.

**Testing**: `pnpm check` (format, lint, typecheck, unit, integration, E2E, build); workflow and
container-structure contract tests; local production-container smoke test using simulated Gateway;
manual Northflank deployment verification through the workflow.

**Target Platform**: Linux OCI container on Northflank; GitHub-hosted Linux Actions runners.

**Project Type**: Discord Gateway background worker with operational HTTP endpoints.

**Performance Goals**: A locally started production container exposes `/livez`, `/readyz`, and
`/metrics` within 60 seconds in simulated mode; deployment verification is bounded to 5 minutes.

**Constraints**: Frozen lockfile builds; no secrets or environment-specific values in context, image,
metadata, or logs; runtime image excludes source and development tooling; full immutable source-SHA
tag is selected by operators and deployed by digest; publication never deploys; automation uses
least-privilege permissions and pinned third-party Action revisions.

**Scale/Scope**: One existing Northflank Voicelet service and one production image per successful
main revision; no environment provisioning, staging, canary, or automatic rollback.

## Constitution Check

| Gate | Status | Evidence / plan response |
| --- | --- | --- |
| Testability | Pass | Add container/workflow contract tests; preserve unit, integration, and E2E gates through `pnpm check`; document a reproducible manual deployment validation. |
| Enforced quality gates | Pass | Publishing is downstream of the full `pnpm check` and secret scan; PR builds validate but cannot publish. |
| Explicit architecture | Pass | Container, CI, and deployment artifacts stay at the composition/operations boundary; no domain/application dependency changes. |
| Documentation as deliverable | Pass | README and a dedicated deployment guide cover local operation, version discovery, secrets/configuration names, deployment, and rollback. |
| Explicit API contracts | Pass | Define the manual workflow input/output and Northflank update/verification contract before implementation. |
| Security by default | Pass | Use `GITHUB_TOKEN` only for package publishing, a scoped Northflank token stored as a GitHub secret, a Northflank-managed registry credential, masked inputs, and no build secrets. |
| Actionable observability | Pass | Workflow summary records selected tag, resolved digest, previous image when available, deployment state, and readiness outcome without secrets or raw Discord data. |
| Reproducible repository | Pass | Docker build uses the committed lockfile and documented local commands; CI uses frozen installation. |
| Definition of done | Pass | Tasks will require docs, focused contract coverage, local image smoke evidence, and `pnpm check`. |

**Post-design re-check**: Pass. The design introduces no exception or reverse dependency. Northflank
runtime secret and registry configuration remains a platform concern rather than application state.

## Project Structure

### Documentation (this feature)

```text
specs/007-container-deployment-pipeline/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── deployment-workflow.md
└── tasks.md              # Created by $speckit-tasks
```

### Source Code (repository root)

```text
src/
├── composition/
├── config/
├── infrastructure/
└── main.ts

tests/
├── e2e/
├── integration/
└── unit/

.github/workflows/
├── ci.yml
├── publish-container.yml
└── deploy-northflank.yml

docs/
└── deployment.md

Dockerfile
.dockerignore
```

**Structure Decision**: Keep Voicelet as a single background-worker project. Add only root container
artifacts, separate operations workflows, deployment documentation, and focused contract tests; do
not alter the established `domain ← application/ports ← infrastructure/composition` direction.

## Complexity Tracking

No constitution violations require tracking.
