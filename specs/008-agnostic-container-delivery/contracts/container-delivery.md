# Container Delivery Boundary Contract

## Repository responsibilities

1. For every pull request, validate repository quality and build the production container without
   publishing a production image.
2. For a successful push to `main`, publish the production image to GHCR using the immutable
   `sha-<40-character-source-commit>` tag and source/revision metadata.
3. Preserve secret-safe build context, image content, and workflow output.

## Explicit non-responsibilities

The repository does not accept a deployment version input or configure, invoke, poll, verify, or
roll back any external container environment. It does not contain provider-specific deployment
credentials, platform identifiers, or registry pull credentials.

## External consumer responsibilities

An external container environment independently authorizes its GHCR pull, selects an immutable
published image, supplies runtime configuration, and owns deployment health, observability, and
rollback procedures.

## Verification contract

Integration contract coverage must establish all of the following:

- the publication workflow remains quality-gated, PR-safe, main-only for GHCR publication, and
  uses immutable source-SHA versions with OCI source/revision metadata;
- no provider-specific deployment workflow exists under `.github/workflows/`;
- active README and operations documentation explain the same GHCR-only boundary;
- active documents and workflow artifacts do not require the removed provider terminology or
  provider deployment credentials; and
- the image and workflow guidance continue to exclude runtime secrets, registry pull credentials,
  and raw Discord data.
