# Quickstart: Validate Provider-Neutral Container Delivery

## Prerequisites

- Node 24.20.0 and pnpm 10.15.0 via the repository's Volta configuration.
- Docker for local image validation; Docker-enabled CI for the publication workflow.
- No deployment-platform account, credentials, or runtime secrets are required for repository
  validation.

## Validate the repository boundary

1. Install dependencies and run the complete quality gate:

   ```sh
   pnpm install --frozen-lockfile
   pnpm check
   ```

2. Build and smoke-test the local production container where Docker is available:

   ```sh
   pnpm container:build
   pnpm container:smoke
   ```

   Expected: the credential-free simulated runtime reaches `/livez`, `/readyz`, and `/metrics`.

3. Run the focused delivery-contract test through the repository test command or inspect its
   assertions in `tests/integration/deployment-artifacts.test.ts`.

   Expected: the GHCR publication workflow remains quality-gated and immutable; no
   provider-specific deployment workflow is present; and active documentation has a consistent
   external-platform boundary.

4. Review [the container delivery contract](./contracts/container-delivery.md) alongside
   `README.md` and `docs/deployment.md`.

   Expected: the final repository-managed outcome is a GHCR image. A container platform separately
   authorizes its pull and owns deployment, health verification, and rollback.

## Published-image handoff

After a successful main-branch publication, identify the immutable source-SHA image in GHCR and
provide that reference to the chosen external container environment. Do not add platform
credentials, runtime configuration, deployment verification, or rollback commands to repository CI.
