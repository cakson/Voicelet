# Production container deployment

Voicelet is published as a production Docker image and deployed to the existing Northflank Voicelet
service. Publishing and deployment are intentionally separate operations: merging to `main` creates
an image, but never deploys it.

## Required GitHub configuration

Configure these values in the repository or its environment without putting real values in source:

| Name                            | GitHub storage   | Purpose                                                                 |
| ------------------------------- | ---------------- | ----------------------------------------------------------------------- |
| `NORTHFLANK_API_TOKEN`          | Actions secret   | Scoped Northflank service read/update token.                            |
| `NORTHFLANK_PROJECT_ID`         | Actions variable | Existing Northflank project.                                            |
| `NORTHFLANK_SERVICE_ID`         | Actions variable | Existing Voicelet service.                                              |
| `NORTHFLANK_GHCR_CREDENTIAL_ID` | Actions variable | Northflank's saved GHCR pull credential ID when the package is private. |
| `NORTHFLANK_READINESS_URL`      | Actions variable | Required safe URL for the deployed Voicelet `/readyz` endpoint.         |

build-time content is limited to the application and its production dependencies; runtime
configuration is supplied by Northflank. The Northflank token should be issued to a project-scoped role with only service read and update
permissions. GHCR pull credentials remain configured in Northflank; they are never passed through the
Docker build or committed to GitHub. Never print tokens, headers, runtime configuration, or raw API
responses in a workflow log.

## Publication and version discovery

The `Publish container` workflow runs on pull requests and pushes to `main`. Both paths run the
repository quality checks and build the production image. Only a successful push to `main` logs in to
GitHub Container Registry (GHCR) and publishes:

```text
ghcr.io/<owner>/<repository>:sha-<40-character-git-commit>
```

The `sha-` tag is the immutable operator-facing version. Image metadata records the repository source
and Git revision, so the Git commit can be identified from the GHCR package. The workflow may also
update the mutable `main` convenience tag; deployment never selects `main` or `latest`.

Failed tests, linting, formatting, type checking, build validation, or Docker validation prevent
publication. Pull requests never publish a production artifact.

## Local production image

Install from the committed lockfile and run the full local gate first:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm container:build
```

Run without source changes or embedded environment values:

```sh
docker run --rm --publish 3000:3000 \
  --env HOST=0.0.0.0 \
  --env GATEWAY_MODE=simulated \
  --env TEMPORARY_ROOM_CONFIG='{}' \
  voicelet:local
```

Check `GET /livez`, `GET /readyz`, and `GET /metrics`. In a real deployment, Northflank supplies
`DISCORD_TOKEN`, `TEMPORARY_ROOM_CONFIG`, and other runtime configuration independently; none is
present in the image. `pnpm container:smoke` automates the credential-free local check.

## Manual deployment

1. Open GitHub Actions and select `Deploy Northflank`.
2. Choose **Run workflow** on the default branch.
3. Enter a retained immutable `image_version` in the form `sha-<40-character-git-commit>`.
4. The workflow validates the tag in GHCR, resolves it to a digest, reads the prior service image when
   safely available, and updates only the Northflank image reference.
5. It polls Northflank status and containers, then requires the configured readiness URL to return a
   successful response. The summary reports the requested tag, resolved digest, prior image when
   available, and final outcome.

The workflow fails before changing Northflank for malformed or missing versions. Update failures,
container failures, readiness failures, and the five-minute verification timeout also fail the
workflow; acceptance of an update alone is not success. Whether it succeeds or fails, the workflow
summary identifies the safely validated requested version, resolved and prior image references when
available, and the final outcome without exposing credentials or raw platform responses.

## Rollback

A rollback is the same manual workflow with an earlier retained `sha-` version. Select the older
version, allow the workflow to validate and resolve it, and verify readiness. No rebuild of the older
source revision is required. Keep the requested and previously running image references from the
workflow summary for troubleshooting.
