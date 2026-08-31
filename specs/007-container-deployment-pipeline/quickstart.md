# Validation Guide: Container Build, Publishing, and Northflank Deployment

This guide validates the feature after implementation. It uses the contracts in
[deployment-workflow.md](./contracts/deployment-workflow.md) and data rules in
[data-model.md](./data-model.md).

## Prerequisites

- Docker Engine running locally.
- Node 24 and pnpm 10 as pinned by the repository.
- A clean checkout with `pnpm-lock.yaml`.
- For local smoke testing only: no Discord credential; use the simulated Gateway configuration.
- For manual deployment: existing Northflank project/service and the configured GitHub secret and
  variables listed in the deployment workflow contract.

## Local quality and image validation

1. Run `pnpm install --frozen-lockfile` and `pnpm check`; both must succeed.
2. Build the documented production image from the repository root.
3. Start it with separately supplied runtime environment values including `HOST=0.0.0.0`,
   `GATEWAY_MODE=simulated`, and a safe local port mapping. Do not use or copy a real `.env` file.
4. Within 60 seconds, confirm `/livez`, `/readyz`, and `/metrics` return their expected responses.
5. Inspect the final image to confirm it contains no `.env`, Git metadata, source tree, or
   development-only dependencies/tooling.

## Publication validation

1. Open a pull request that changes the repository. Confirm the publishing workflow runs the full
   quality gate and production image build, but does not publish to GHCR.
2. Merge a passing revision to `main`. Confirm the workflow publishes a version formatted as
   `sha-<40-character-commit-sha>`.
3. In GHCR, verify that the version's source and revision metadata identify the merged commit. The
   optional mutable `main` tag is not used for deployment.
4. Cause a controlled quality or image-build failure in a non-production validation branch and
   confirm no deployable image is published.

## Manual deployment and rollback validation

1. In GitHub Actions, manually run the Northflank deployment workflow and enter a known retained
   `sha-<40-character-commit-sha>` version.
2. Confirm the workflow reports the requested tag and resolved digest, validates it before updating
   Northflank, and reports the previous image reference when safely available.
3. Confirm it finishes within five minutes and succeeds only after Northflank status, container
   state, and `/readyz` verification pass.
4. Enter a malformed or unknown version and confirm the workflow fails before updating the service.
5. To roll back, run the same workflow with an earlier retained SHA version. Confirm no rebuild is
   required and the final summary identifies that selected version and successful verification.

## Safe evidence

Retain workflow URLs, requested SHA tags, resolved digests, and success/failure summaries. Never
record `DISCORD_TOKEN`, `NORTHFLANK_API_TOKEN`, registry credentials, raw service configuration, or
raw Discord data in validation evidence.
