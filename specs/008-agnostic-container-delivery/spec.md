# Feature Specification: Provider-Neutral Container Delivery

**Feature Branch**: `008-agnostic-container-delivery`
**Created**: 2026-09-01
**Status**: Draft
**Input**: User description: "Revise deployment documentation and delivery expectations so CI builds and publishes a container image to GHCR only; an external platform independently pulls and deploys the published image without a Northflank-specific repository flow."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand the CI Delivery Boundary (Priority: P1)

As a maintainer, I can read the deployment guide and determine that the repository's CI delivery
responsibility ends when a validated, immutable container image is published to GHCR.

**Why this priority**: A correct delivery boundary prevents operators from expecting CI to perform
platform deployment or to require a particular hosting provider.

**Independent Test**: Review the deployment guide after a main-branch publication and verify it
describes image build, validation, and GHCR publication without instructions for configuring or
triggering a provider deployment.

**Acceptance Scenarios**:

1. **Given** a maintainer reads the production deployment guide, **When** they follow the CI flow,
   **Then** the last repository-managed step is publication of an immutable GHCR image.
2. **Given** a main-branch revision passes the required quality checks, **When** its delivery
   workflow completes, **Then** documentation states that the image is available in GHCR and that
   no hosting-platform deployment is initiated by the repository.
3. **Given** a pull request or a revision that fails a required quality check, **When** its workflow
   runs, **Then** documentation clearly states that no production image is published.

---

### User Story 2 - Deploy from the Registry on Any Compatible Platform (Priority: P2)

As an operator, I can use a published immutable GHCR image with a compatible container platform
without relying on instructions, credentials, or workflows for a named hosting provider.

**Why this priority**: Platform-neutral documentation keeps image consumers free to select and
operate their own deployment environment.

**Independent Test**: Inspect the guide and confirm that it identifies the immutable image and its
source revision, describes separately supplied runtime configuration, and leaves platform-specific
pull, rollout, verification, and rollback steps to the external environment.

**Acceptance Scenarios**:

1. **Given** an operator has access to a retained immutable GHCR image, **When** they prepare an
   external container deployment, **Then** the repository documentation provides the image naming
   and runtime-configuration boundary needed to consume it without naming a required platform.
2. **Given** a published image is private, **When** an operator configures their deployment
   environment to pull it, **Then** documentation makes clear that registry pull authorization is
   configured outside the repository's CI flow and is not embedded in the image.

---

### User Story 3 - Find Consistent Repository Guidance (Priority: P3)

As a new engineer, I can read the README and related operational documentation without finding
contradictory statements about provider-managed deployment, provider credentials, or an in-repository
manual deployment workflow.

**Why this priority**: Consistent documentation prevents unsafe configuration work and support
confusion after the delivery model changes.

**Independent Test**: Search repository-facing deployment documentation and delivery workflow
descriptions for the former provider-specific terminology; verify that remaining deployment guidance
is platform-neutral and agrees with the deployment guide.

**Acceptance Scenarios**:

1. **Given** an engineer reads the README's production-container section, **When** they compare it
   with the deployment guide, **Then** both describe the same GHCR-only CI boundary.
2. **Given** a repository workflow or operational document previously described provider deployment,
   **When** this feature is complete, **Then** it no longer presents a named provider as part of the
   repository delivery flow.

### Edge Cases

- A mutable convenience tag may be available, but documentation must continue to identify the
  full-source-SHA tag as the immutable artifact for operators to select.
- An external deployment platform may require registry credentials, health checks, version selection,
  rollback, or platform-specific configuration; those requirements must not be represented as CI
  responsibilities or repository-managed secrets.
- Existing provider-specific history may remain in archived feature specifications, but active
  operational documentation and automation must not direct operators to use it.
- Documentation must not imply that an image's publication guarantees the health, completion, or
  outcome of an external deployment.
- Before the legacy repository deployment workflow is removed, the release owner must confirm that
  the chosen external environment can authorize a GHCR pull and is configured to run a selected
  immutable image; this transition check is a release prerequisite, not a CI deployment action.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Repository documentation MUST define the CI delivery boundary as validation, container
  image build, and publication to GitHub Container Registry (GHCR).
- **FR-002**: Repository documentation MUST state that a successful main-branch publication makes
  an immutable image available in GHCR and does not initiate or verify deployment on any hosting
  platform.
- **FR-003**: Repository documentation MUST identify the immutable full-source-SHA image tag and
  its association with the corresponding source revision; a mutable convenience tag MAY be described
  but MUST NOT be presented as the only operator-facing version identity.
- **FR-004**: The production deployment guide and README MUST describe runtime configuration as
  supplied separately by the environment that runs the container, without prescribing a specific
  hosting provider.
- **FR-005**: The production deployment guide and README MUST remove provider-specific deployment
  instructions, provider-specific credential/configuration names, provider readiness checks, and
  repository-managed rollback procedures.
- **FR-006**: Repository delivery automation and its active documentation MUST not provide a manual
  provider-deployment path or imply that external deployment is controlled, verified, or rolled back
  by repository CI.
- **FR-007**: Documentation MUST state that registry pull authorization and all platform-specific
  deployment operations are configured and performed outside the repository delivery flow.
- **FR-008**: Affected architecture, testing, workflow, and documentation references MUST use the
  same provider-neutral delivery boundary, while historical specifications remain unchanged as a
  record of the earlier plan.
- **FR-009**: Documentation and workflow output guidance MUST preserve the existing security
  boundary: no runtime secrets, registry pull credentials, or raw Discord data may be embedded in
  the image, committed, or logged.
- **FR-010**: Before the legacy repository deployment workflow is removed, the deployment guide
  MUST document a transition prerequisite for the release owner to confirm that an external
  environment is configured to authorize a GHCR pull and use a selected immutable image. This
  prerequisite MUST NOT add external deployment control or verification to CI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The deployment guide identifies the GHCR-only CI delivery endpoint and immutable
  image naming, with no provider-deployment step required.
- **SC-002**: A search of active README, deployment, architecture, testing, and delivery-workflow
  documentation finds zero instructions that require the former named hosting provider.
- **SC-003**: In 100% of documented successful main-branch delivery cases, the stated repository
  outcome is a published immutable GHCR image and not an external deployment result.
- **SC-004**: An operator can determine from the README and deployment guide that runtime
  configuration and registry pull authorization are external-environment responsibilities without
  finding contradictory instructions.

## Assumptions

- GitHub Container Registry remains the repository's image registry and continues to support
  immutable source-SHA image tags.
- A compatible external container environment will independently pull and deploy the published
  image; selecting, configuring, verifying, and rolling back that environment are outside this
  feature.
- The existing local production-container build and credential-free smoke guidance remains relevant
  and should be retained unless it contradicts the provider-neutral boundary.
- Historical feature artifacts under `specs/007-container-deployment-pipeline/` are retained
  unchanged to preserve traceability of the replaced delivery expectation.

## Out of Scope

- Provisioning, configuring, or operating any external container-hosting platform.
- Adding CI automation that deploys, verifies, or rolls back an image after GHCR publication.
- Defining a universal deployment procedure, health-check policy, or rollback process for external
  platforms.
- Changing the application container's runtime behavior or Discord functionality.
