# Data Model: Container Build, Publishing, and Northflank Deployment

## Published container version

| Field | Description | Validation |
| --- | --- | --- |
| `tag` | Operator-facing image version. | Exactly `sha-` plus a lowercase 40-character Git SHA. |
| `sourceRevision` | Git commit that produced the image. | Must equal the SHA portion of `tag`. |
| `digest` | Registry-resolved immutable content identifier. | Must be obtained from GHCR before deployment. |
| `imageReference` | Full GHCR image reference used by Northflank. | Must be digest-qualified; tags alone are not deployed. |
| `sourceUrl` | Repository association carried by image metadata. | Must identify the Voicelet repository. |

**Lifecycle**: main revision passes quality gates → image builds → version is published → a manual
deployment selects the retained tag → GHCR resolves it to a digest → Northflank runs that digest.
The mutable `main` tag is never a selection input.

## Deployment request

| Field | Description | Validation |
| --- | --- | --- |
| `requestedVersion` | Manual workflow input. | Required; must match the published-version tag grammar. |
| `resolvedImageReference` | Exact digest-qualified GHCR reference. | Required after registry validation, before Northflank update. |
| `previousImageReference` | Image observed on the service before update. | Best-effort; safe to report only as an image reference. |
| `status` | Safe outcome reported to the operator. | `rejected`, `updating`, `verifying`, `succeeded`, or `failed`. |

**State transitions**: malformed, missing, or unavailable tags are `rejected`. Valid requests become
`updating` after GHCR resolution and `verifying` after Northflank accepts the change. They are
`succeeded` only after bounded service, container, and readiness checks; all other outcomes are
`failed`. Selecting an older retained tag is the rollback operation.

## Runtime configuration boundary

| Item | Owner | Rule |
| --- | --- | --- |
| Application image and OCI metadata | Repository publishing workflow | Must not contain secrets or environment-specific values. |
| Discord and Voicelet environment values | Northflank service | Must remain unchanged by deployment image updates. |
| Northflank API token | GitHub Actions secret | Must have only necessary service-read/update access and never be logged. |
| Private-GHCR pull credential | Northflank configuration | Remains on Northflank; its identifier may be configured separately from secrets. |
