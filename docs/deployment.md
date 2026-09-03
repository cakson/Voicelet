# Production container delivery

Voicelet's repository delivery flow validates and publishes a production Docker image to GitHub
Container Registry (GHCR). Publication and deployment are separate operations: a successful merge to
`main` creates an image, but the repository does not deploy, verify, or roll it back on a container
platform.

## Repository configuration

The publication workflow uses GitHub's package-publishing permission and does not require deployment
platform credentials. Runtime configuration and registry pull authorization are supplied by the
external environment that runs the image; do not put either in source, build context, image metadata,
or workflow output. Never print tokens, runtime configuration, raw Discord data, or raw provider API
responses in repository logs.

## Publication and version discovery

The `Publish container` workflow runs on pull requests and pushes to `main`. Both paths run the
repository quality checks and build the production image. Only a successful push to `main` publishes
to GHCR:

```text
ghcr.io/<owner>/<repository>:sha-<40-character-git-commit>
```

The `sha-` tag is the immutable operator-facing version. Image metadata records the repository
source and Git revision, so the source commit can be identified from the GHCR package. The workflow
may also publish a mutable `main` convenience tag; external environments should select the immutable
source-SHA tag.

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
  voicelet:local
```

Check `GET /livez`, `GET /readyz`, and `GET /metrics`. `pnpm container:smoke` automates the
credential-free local check. A real environment supplies `DISCORD_TOKEN`, `PERSISTENCE_PROVIDER`,
`FIRESTORE_PROJECT_ID`, and datastore credentials through runtime secrets/configuration; none is
present in the image. Guild configuration is stored in Firestore, not in application environment.

## External deployment handoff

After a successful main-branch publication, provide the selected immutable GHCR image reference to
the compatible container environment of your choice. That environment independently configures its
GHCR pull authorization, runtime configuration, rollout, health checks, observability, and rollback.
The repository does not provide a universal deployment command or assume a named hosting provider.

Before removing the legacy repository deployment workflow, the release owner must confirm that the
chosen external environment has GHCR pull authorization and is configured to run the selected
immutable image. Record this transition prerequisite outside repository CI; it is release-readiness
evidence, not a repository deployment action.

# Deployment

The production container includes the compiled React administration assets and serves them at `/admin`.
The endpoint and `/admin/api` are unauthenticated. Do not expose them directly to the public internet:
place the existing service ingress behind a VPN or equivalent private-network boundary.

The same immutable GitHub Container Registry image (`sha-...`) is handed to the external deployment
provider. No deployment credential, Discord token, or datastore credential is bundled into the UI.

## Northflank service

Deploy the immutable GHCR image to the existing Northflank Voicelet service; the same container runs
the Discord Gateway worker and serves the administration UI. Configure `/livez` and `/readyz` as the
service health endpoints. Keep `/admin` and `/admin/api` reachable only through a VPN or equivalent
private network boundary; the administration UI has no authentication.
