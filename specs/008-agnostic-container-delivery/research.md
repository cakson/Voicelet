# Research: Provider-Neutral Container Delivery

## Decision: CI delivery ends after GHCR publication

**Rationale**: The required operational boundary is a validated, immutable container image in GHCR.
Keeping deployment outside the repository lets any compatible container platform pull and run the
artifact without coupling CI to a provider account, API, credentials, readiness policy, or rollback
behavior.

**Alternatives considered**:

- Keep a manually dispatched provider deployment workflow: rejected because it still makes the
  repository provider-dependent and contradicts the specified CI boundary.
- Replace it with a generic deployment workflow: rejected because generic deployment inputs,
  credentials, rollout checks, and rollback semantics would still prescribe an external platform.

## Decision: Delete the legacy provider-specific workflow

**Rationale**: A retained, runnable deployment workflow would continue to expose provider-specific
configuration and imply that repository CI owns deployment. Removing it makes the active automation
match the documented boundary and removes no-longer-needed credential references.

**Alternatives considered**:

- Disable or archive the workflow in place: rejected because a runnable repository artifact and
  its provider terminology would remain misleading active guidance.
- Retain the workflow without documentation: rejected because undocumented automation is unsafe and
  conflicts with the requirement that active delivery automation not offer provider deployment.

## Decision: Preserve immutable source-SHA publication and local container validation

**Rationale**: The full source-SHA tag and OCI source/revision metadata provide an unambiguous
artifact identity for external operators. The existing local Docker smoke scenario validates the
image independently of any deployment platform.

**Alternatives considered**:

- Publish only a mutable `main` tag: rejected because it cannot reliably identify the source
  revision an external platform runs.
- Remove local container validation with platform deployment: rejected because it would eliminate
  the repository-owned evidence that the published artifact can start with separately supplied
  runtime configuration.

## Decision: Use documentation contract tests for cross-document consistency

**Rationale**: The existing integration suite already inspects workflows and documentation. Updating
that focused suite can ensure active materials retain GHCR and runtime-boundary guidance while
excluding the removed provider workflow and terminology.

**Alternatives considered**:

- Rely only on manual review: rejected because terminology regressions across README, operations
  docs, architecture, testing notes, and workflows are easy to reintroduce.
- Search all historical specs: rejected because historical planning records are intentionally
  retained and are not active operational guidance.
