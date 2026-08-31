# Research: Container Build, Publishing, and Northflank Deployment

## Docker production image

**Decision**: Use a multi-stage Node 24 Docker build. Install from `pnpm-lock.yaml` with frozen
lockfile semantics, compile in the builder, and copy only compiled `dist/` and production
dependencies to a non-root runtime stage. Add a `.dockerignore` that excludes Git metadata, local
environment files, build output, dependency directories, coverage, and logs.

**Rationale**: This preserves the repository's pinned runtime and reproducible dependency graph while
excluding source and development tools from the running image. Runtime configuration is already read
from the process environment, so no credentials or environment values need build arguments.

**Alternatives considered**: A single-stage image retains development dependencies and build tooling.
Baking `.env` into the image violates the specification and constitution.

## GHCR identity and publication

**Decision**: Publish each successful main revision under `sha-<full-40-character-git-sha>`, apply
the OCI `source` and `revision` labels, and optionally update `main` as a convenience tag. Pin
third-party GitHub Actions by commit SHA. Give the publisher only `contents: read` and
`packages: write`; use the ephemeral `GITHUB_TOKEN` for GHCR authentication.

**Rationale**: The full source SHA creates a unique, discoverable human selection value. Resolving
that tag to an image digest before deployment protects against tag mutation and gives the service an
exact immutable reference.

**Alternatives considered**: `latest` only cannot support reliable selection or rollback. Semantic
release tags are explicitly out of scope. A stored long-lived GHCR credential is unnecessary.

**Sources**: [GitHub Docker publication tutorial](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), [GitHub Container Registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

## Manual version selection and tag validation

**Decision**: The deployment workflow uses `workflow_dispatch` with required string input
`image_version`. Accept only `sha-` followed by a lowercase 40-character Git SHA. Inspect the
requested image, resolve its descriptor digest, and deploy the digest-qualified image reference.

**Rationale**: A text input supports every retained version without a stale static list. The strict
format removes ambiguous mutable tags and malformed user input. Registry inspection verifies the
selected artifact exists before Northflank changes.

**Alternatives considered**: A static choice input cannot track published tags. Resolving `main` or
`latest` can silently deploy another revision.

**Sources**: [GitHub manual workflow triggers](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow), [GitHub Container Registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

## Northflank update and verification

**Decision**: Query the existing Northflank service to capture its current external image reference,
then use the current service-deployment update endpoint to change only the external image path to the
resolved GHCR digest. Store `NORTHFLANK_API_TOKEN` as a GitHub Actions secret. Store the existing
Northflank GHCR credential identifier as non-secret GitHub configuration if the service uses a private
GHCR package. Poll service and container state at 10-second intervals for at most 5 minutes, fail on
terminal failure, then require a safe `/readyz` HTTP success response.

**Rationale**: The current endpoint avoids deprecated deployment creation APIs. Changing only the
image protects Northflank-managed runtime environment and secrets. Service/container status proves
the update completed; readiness proves the worker connected to Discord rather than merely started.

**Alternatives considered**: Automatic dispatch after publishing is out of scope. Treating an
accepted update as success does not verify runtime health. Passing registry credentials from GitHub
breaks the runtime configuration boundary.

**Sources**: [Northflank update deployment service API](https://northflank.com/docs/v1/api/project/services/patch-deployment-service), [Northflank get service API](https://northflank.com/docs/v1/api/project/services/get-service), [Northflank list service containers API](https://northflank.com/docs/v1/api/project/services/list-service-containers), [Northflank health checks](https://northflank.com/docs/v1/application/observe/configure-health-checks), [Northflank RBAC API access](https://northflank.com/docs/v1/application/secure/grant-api-access).

## Workflow security and validation

**Decision**: Pull requests and main merges both run the full quality gate and production image build,
but only successful main workflows log in and push. The deployment workflow uses `contents: read` and
`packages: read`, with its Northflank token only in an environment variable. It writes a safe summary
containing version, digest, prior reference when available, bounded verification result, and no
authentication data.

**Rationale**: This provides locally reproducible quality evidence while preventing pull-request code
from producing production artifacts. Least-privilege separation limits credentials by responsibility.

**Alternatives considered**: Sharing publishing permissions with deployment is unnecessary because
deployment never writes GHCR. Printing API responses risks exposing service configuration.
