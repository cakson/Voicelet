# Deployment Workflow Contract

## Publish workflow

**Trigger**: pull request and push to `main`.

**Required behavior**:

1. Install dependencies from the lockfile and run `pnpm check`.
2. Build the production Docker image on both triggers.
3. On `main` only, publish `ghcr.io/<owner>/voicelet:sha-<full-git-sha>` after all gates succeed.
4. Apply OCI source and revision metadata. An optional `main` tag may be updated after the immutable
   tag is published.
5. Never expose a secret or publish from a pull request.

**Permissions**: `contents: read`, `packages: write`; add only narrowly scoped permissions required
by an explicitly implemented provenance feature.

## Deploy workflow

**Trigger**: `workflow_dispatch` on the default branch.

**Input**:

| Name | Type | Required | Contract |
| --- | --- | --- | --- |
| `image_version` | string | Yes | `sha-` plus exactly 40 lowercase hexadecimal characters. |

**Configuration**:

| Name | Secret | Purpose |
| --- | --- | --- |
| `NORTHFLANK_API_TOKEN` | Yes | Scoped Northflank service read/update credential. |
| `NORTHFLANK_PROJECT_ID` | No | Existing target project identifier. |
| `NORTHFLANK_SERVICE_ID` | No | Existing Voicelet service identifier. |
| `NORTHFLANK_GHCR_CREDENTIAL_ID` | No | Existing Northflank registry credential ID, required only for a private GHCR package. |
| `NORTHFLANK_READINESS_URL` | No | Required safe URL for the deployed service's `/readyz` endpoint. |

**Required behavior**:

1. Reject malformed `image_version` before external update.
2. Confirm the tag exists in GHCR and resolve it to a digest-qualified image reference.
3. Read and safely summarize the prior image reference where available.
4. Update only the external image reference for the configured service; preserve existing runtime
   environment, runtime files, secrets, resources, networking, and health configuration.
5. Poll bounded deployment and container status, failing on terminal failure or timeout.
6. Require an HTTP success response from `NORTHFLANK_READINESS_URL` after service and container
   checks; a missing or failed readiness verification fails deployment.
7. Output the requested tag, resolved digest, prior reference when available, and final outcome; do
   not output tokens, credential identifiers beyond their names, service configuration, or raw API
   responses.

**Permissions**: `contents: read`, `packages: read`; no GHCR write permission.

## Failure contract

| Condition | Required result |
| --- | --- |
| Quality gate or image build failure | Publish workflow fails; no image is published. |
| Pull request build | Image validation may run; production image is not published. |
| Missing or unknown tag | Deployment fails before changing Northflank. |
| Northflank update rejection or terminal container failure | Deployment fails and reports selected version safely. |
| Verification timeout or readiness failure | Deployment fails; it must not report success. |
