# Feature Specification: Container Build, Publishing, and Northflank Deployment

**Feature Branch**: `007-container-deployment-pipeline`  
**Created**: 2026-08-31  
**Status**: Draft  
**Input**: User description: "Create the Container Build, Publishing, and Northflank Deployment feature."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Produce a Deployable Application Version (Priority: P1)

As a maintainer, when a change is merged to the main branch, I receive a production-ready Voicelet
application version that is safe to run and can be traced unambiguously to the source revision that
produced it.

**Why this priority**: A trustworthy, reproducible application artifact is the prerequisite for
every deployment and rollback operation.

**Independent Test**: Merge a passing source revision and verify that a production application
version is available in the designated registry with an immutable revision identifier, discoverable
source association, and no embedded environment secrets.

**Acceptance Scenarios**:

1. **Given** a change has been merged to the main branch and all required quality checks pass,
   **When** publishing completes, **Then** an immutable Voicelet application version associated with
   that exact source revision is available in the GitHub Container Registry.
2. **Given** an operator has a clean repository checkout and its dependency lockfile,
   **When** they build and start the documented production application container locally with
   runtime configuration supplied separately, **Then** Voicelet starts through its normal
   production entrypoint and exposes its liveness, readiness, and metrics endpoints.
3. **Given** a pull request or a main-branch revision whose required quality checks fail,
   **When** its build workflow runs, **Then** no deployable production version is published.

---

### User Story 2 - Intentionally Deploy a Selected Version (Priority: P2)

As an operator, I can explicitly choose a previously published immutable Voicelet version and
deploy that exact version to the configured Northflank service without silently selecting a newer
version.

**Why this priority**: Separating publication from deployment preserves operator control over
production changes.

**Independent Test**: Manually request deployment of a known published version and verify that the
service is instructed to use that exact version, the request output identifies it, and deployment
does not expose credentials.

**Acceptance Scenarios**:

1. **Given** one or more retained immutable Voicelet versions are published, **When** an authorized
   operator manually triggers deployment and supplies one version, **Then** the workflow validates
   that version exists before changing the Northflank service.
2. **Given** the selected version exists, **When** Northflank is updated, **Then** the service uses
   exactly the selected version and the workflow reports the requested version and deployment
   outcome without disclosing secrets.
3. **Given** the selected version does not exist or Northflank rejects or cannot complete the
   update, **When** deployment runs, **Then** the workflow fails clearly and does not report a
   successful deployment.

---

### User Story 3 - Verify and Roll Back a Deployment (Priority: P3)

As an operator, I can determine whether a selected deployment became operational and can restore a
previous retained application version without rebuilding its source revision.

**Why this priority**: A deployment request is useful only when its operational result is known and
recovery remains straightforward.

**Independent Test**: Deploy a selected version, confirm bounded operational verification, then
select an earlier retained version and verify it can be deployed by the same flow.

**Acceptance Scenarios**:

1. **Given** Northflank accepts a selected application version, **When** post-deployment verification
   runs, **Then** the workflow waits for the service's expected operational state within a bounded
   period and fails if that state is not reached.
2. **Given** the deployment environment can distinguish a running process from an application that
   is not ready to serve, **When** verification runs, **Then** it uses readiness as part of the
   success determination.
3. **Given** an earlier immutable version remains retained in the registry, **When** an operator
   selects it in the deployment workflow, **Then** it can be deployed as a rollback without a new
   build of that source revision.

### Edge Cases

- Re-running publication for the same source revision must preserve one unambiguous immutable
  version-to-revision association rather than creating competing version identities.
- A mutable convenience label may change as main advances, but it must never be the only means to
  select a deployment version.
- A build must not receive a deployable publication if tests, linting, formatting, type checks,
  build validation, or production-container validation fail.
- Missing, invalid, or unavailable deployment credentials must fail safely without appearing in
  logs, image metadata, or artifacts.
- A deployment that is accepted but never reaches readiness must time out and fail rather than wait
  indefinitely or claim success.
- If the prior running version can be obtained safely, deployment output must identify it alongside
  the requested version; inability to obtain it must not cause a different version to be deployed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Voicelet MUST be buildable and runnable as a reproducible Docker production container
  from the repository and its dependency lockfile.
- **FR-002**: The production container MUST start Voicelet using its existing normal production
  entrypoint and expose the existing liveness, readiness, and metrics operational endpoints.
- **FR-003**: The production container MUST include only runtime-required application content and
  dependencies; development-only tools and dependencies MUST be excluded unless demonstrably needed
  while running Voicelet.
- **FR-004**: Application secrets and environment-specific configuration MUST NOT be embedded in
  container build inputs, image layers, image metadata, or published artifacts. Voicelet MUST accept
  its environment-specific runtime configuration without source modification.
- **FR-005**: A GitHub Actions workflow for a main-branch merge MUST run the repository's required
  tests, linting, formatting validation, type checking, build validation, and production-container
  validation before a production artifact can be published. Failure of any required check MUST
  prevent publication.
- **FR-006**: Pull-request builds MAY validate the production container but MUST NOT publish a
  production deployment artifact unless an explicitly documented future policy authorizes it.
- **FR-007**: Successful main-branch publication MUST store the Voicelet image in GitHub Container
  Registry and assign an immutable version that uniquely identifies its source revision.
- **FR-008**: Every published immutable version MUST expose a discoverable association with its
  source Git commit. A mutable current-main convenience version MAY be provided but MUST NOT be the
  exclusive deployment selection method.
- **FR-009**: Container publishing and Northflank deployment MUST be separate GitHub Actions
  workflows. Publishing a new image MUST NOT automatically deploy it.
- **FR-010**: The Northflank GitHub Actions deployment workflow MUST require an explicit user
  trigger and an operator-supplied, previously published immutable Voicelet version.
- **FR-011**: Before updating Northflank, deployment MUST validate that the requested exact version
  exists in GitHub Container Registry, report the selected version safely, and use that exact version
  throughout the deployment.
- **FR-012**: Deployment MUST update the configured Northflank Voicelet service while leaving its
  runtime configuration and secrets independently managed by Northflank.
- **FR-013**: Deployment credentials MUST use GitHub-supported secret management, remain absent
  from the repository and container, and never be printed in workflow output. Publishing and
  deployment automation MUST use only permissions necessary for their respective responsibilities.
- **FR-014**: Following a deployment request, the workflow MUST perform bounded verification that
  the Northflank Voicelet service reaches its expected operational state; where available, readiness
  MUST distinguish an operational Voicelet instance from one unable to connect to Discord.
- **FR-015**: A failed update or failed verification MUST fail the deployment workflow clearly and
  provide safe operator-facing output identifying the requested version and whether deployment
  succeeded.
- **FR-016**: Retained immutable versions MUST remain selectable for deployment, including rollback
  to an older version, without rebuilding the older source revision.
- **FR-017**: Repository documentation MUST explain local production-container build and run,
  versioning, publication timing and location, commit-to-version discovery, manual deployment,
  version selection, rollback, required secret/configuration names without values, and the boundary
  between build-time content and Northflank-managed runtime configuration.

### Key Entities

- **Published container version**: A retained Voicelet production image identified by an immutable
  version and associated with exactly one source revision.
- **Deployment request**: An operator-initiated request naming one published immutable version for
  the configured Northflank Voicelet service.
- **Deployment result**: The safe operational record of the requested version, previously running
  version when available, update outcome, and bounded verification outcome.
- **Runtime configuration**: Secrets and environment-specific values supplied by Northflank at run
  time and deliberately excluded from the application image.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For 100% of successful main-branch publications, operators can identify one immutable
  application version and its exact source revision from the published artifact information.
- **SC-002**: In local documented validation, 100% of tested production containers start successfully
  with separately supplied runtime configuration and make all three operational endpoint categories
  available within 60 seconds.
- **SC-003**: In validation runs where any required quality or production-container check fails, 0
  deployable production artifacts are published.
- **SC-004**: In deployment validation, 100% of accepted requests use the exact operator-selected
  immutable version; no request silently substitutes a mutable or newer version.
- **SC-005**: Every deployment verification completes with success or a clear failure within a
  documented bounded period, and no verification waits indefinitely.
- **SC-006**: An operator can complete a rollback to any retained earlier immutable version using the
  documented deployment flow without rebuilding that version's source revision.

## Assumptions

- A Northflank project and Voicelet service already exist; provisioning them is outside this feature.
- Northflank can expose sufficient deployment and service-status information to make bounded
  verification possible, while the exact verification mechanism is chosen during planning.
- GitHub repository settings can grant the publishing workflow the least privileges needed to write
  to the repository's GitHub Container Registry package, and authorized operators can access manual
  workflow dispatch.
- The existing application runtime supports configuration through environment values and already
  supplies the operational endpoints named in this specification.
- Retention policy for published versions is managed outside this feature; rollback is supported for
  every version retained in GitHub Container Registry.

## Out of Scope

- Automatic deployment after a main-branch merge.
- Automatic semantic-version release management or automatic production rollback.
- Staging, multiple environments, blue/green, or canary deployment strategies.
- Northflank infrastructure provisioning or initial project/service creation.
- Discord server configuration or application feature development.
