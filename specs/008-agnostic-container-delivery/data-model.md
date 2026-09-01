# Delivery Concepts

This documentation and workflow change introduces no persisted application data. The following
concepts define the operator-facing delivery boundary.

## Published container image

- **Identity**: `ghcr.io/<owner>/<repository>:sha-<40-character-source-commit>`.
- **Source association**: OCI revision metadata identifies the exact source commit.
- **Lifecycle**: Built after required quality checks; published only for a successful main-branch
  revision; then independently selected and consumed by an external environment.
- **Validation**: The immutable source-SHA identity is the operator-facing version. A mutable `main`
  tag may exist but cannot replace the immutable identity.

## Repository delivery flow

- **Inputs**: Pull-request or main-branch source revision and repository quality result.
- **Outcome for pull requests**: Container build validation only; no production image publication.
- **Outcome for successful main revisions**: An immutable GHCR image is published.
- **Terminal boundary**: Publication completes repository responsibility. No deployment request,
  platform status, health result, or rollback state is tracked by CI.

## External container environment

- **Responsibilities**: Registry pull authorization, image selection, runtime configuration,
  deployment, verification, observability, and rollback.
- **Boundary**: It receives the published image but is not provisioned, configured, called, or
  observed by repository code or workflows.
- **Security rule**: Its credentials and runtime values are not repository secrets, container build
  inputs, image content, metadata, or workflow output.
